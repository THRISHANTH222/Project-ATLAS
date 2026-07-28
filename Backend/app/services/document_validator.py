import io
import zipfile
import xml.etree.ElementTree as ET
import pypdf
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.services.base import IAIService
from app.utils.logger import get_logger

logger = get_logger("app.services.document_validator")


class DocumentValidationResult(BaseModel):
    """Result properties representing classification output."""
    accepted: bool = Field(..., description="Whether the document is organizational/company knowledge")
    category: str = Field(..., description="Categorized classification tag")
    confidence: float = Field(..., description="Model confidence decimal score from 0.0 to 1.0")
    reason: str = Field(..., description="Reasoning or description for the classification output")


class DocumentValidator:
    """
    RAG ingestion validation agent.
    Safeguards the pipeline from ingestion of non-company documentation by classifying
    the extracted text via Groq beforehand.
    """

    def __init__(self, ai_service: IAIService):
        self.ai = ai_service

    async def validate_document(
        self, file_content: bytes, filename: str, content_type: str
    ) -> DocumentValidationResult:
        """
        Extracts up to 5000 characters from the document and requests
        Groq classification to check for company knowledge compliance.
        """
        logger.info(f"Classifying incoming document: '{filename}' (MIME: {content_type})")

        extracted_text = ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        try:
            if content_type == "application/pdf" or ext == "pdf":
                extracted_text = self._extract_pdf_text(file_content)
            elif ext == "docx":
                extracted_text = self._extract_docx_text(file_content)
            elif ext in ("txt", "csv", "log"):
                extracted_text = file_content.decode("utf-8", errors="ignore")[:5000]
            else:
                extracted_text = file_content.decode("utf-8", errors="ignore")[:5000]
        except Exception as e:
            logger.error(f"Failed parsing text for validation from '{filename}': {e}")
            extracted_text = ""

        extracted_text = extracted_text.strip()[:5000]

        if not extracted_text:
            return DocumentValidationResult(
                accepted=False,
                category="Unknown/Empty",
                confidence=1.0,
                reason="The document is empty or text could not be extracted for classification."
            )

        system_instruction = (
            "You are a document classifier for Project Atlas. "
            "Determine whether this document is intended to serve as company or organizational knowledge.\n\n"
            "Accept categories such as:\n"
            "- SOP\n"
            "- HR Policy\n"
            "- Employee Handbook\n"
            "- Company Policy\n"
            "- Product Manual\n"
            "- Technical Documentation\n"
            "- Finance Policy\n"
            "- Compliance\n"
            "- Legal\n"
            "- Operations\n"
            "- Sales\n"
            "- Internal Knowledge Base\n\n"
            "Reject categories such as:\n"
            "- Study Notes\n"
            "- Academic PDFs\n"
            "- Assignments\n"
            "- Textbooks\n"
            "- Fiction\n"
            "- Personal Documents\n\n"
            "Return JSON matching the schema parameters exactly."
        )

        try:
            # Handle mock fallback behavior
            if getattr(self.ai, "use_mock", False):
                text_lower = extracted_text.lower()
                filename_lower = filename.lower()
                
                # Check for explicit academic/rejected keywords in filename or content
                academic_keywords = ("assignment", "homework", "lecture", "textbook", "essay", "physics", "syllabus", "coursework", "college", "study", "academic", "fiction", "personal", "notes")
                if any(x in text_lower or x in filename_lower for x in academic_keywords):
                    return DocumentValidationResult(
                        accepted=False,
                        category="Academic PDFs",
                        confidence=0.95,
                        reason="This appears to be academic study material. Atlas only accepts company knowledge documents."
                    )
                
                # Infer accepted category
                category = "Company Policy"
                if "policy" in text_lower or "leave" in text_lower:
                    category = "HR Policy"
                elif "sop" in text_lower:
                    category = "SOP"
                elif "handbook" in text_lower:
                    category = "Employee Handbook"
                elif "manual" in text_lower:
                    category = "Product Manual"
                
                return DocumentValidationResult(
                    accepted=True,
                    category=category,
                    confidence=0.96,
                    reason="Business policy document."
                )

            # Query real Groq engine
            response = await self.ai.generate_json(
                prompt=extracted_text,
                response_schema=DocumentValidationResult,
                system_instruction=system_instruction
            )
            return DocumentValidationResult(**response)

        except Exception as e:
            logger.error(f"Groq document validation crashed: {e}")
            return DocumentValidationResult(
                accepted=False,
                category="Validation Error",
                confidence=1.0,
                reason=f"System failed to classify the file content due to service error: {str(e)}"
            )

    def _extract_pdf_text(self, content_bytes: bytes) -> str:
        pdf_text = []
        try:
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            pages_to_read = min(3, len(reader.pages))
            for i in range(pages_to_read):
                text = reader.pages[i].extract_text()
                if text:
                    pdf_text.append(text)
        except Exception as e:
            logger.warning(f"pypdf extraction failed, falling back to raw text decode: {e}")
        
        extracted = "\n".join(pdf_text).strip()
        if not extracted:
            try:
                extracted = content_bytes.decode("utf-8", errors="ignore")
            except Exception:
                extracted = ""
        return extracted

    def _extract_docx_text(self, content_bytes: bytes) -> str:
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                xml_content = z.read("word/document.xml")
            root = ET.fromstring(xml_content)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for p in root.findall(".//w:p", ns):
                text_runs = [t.text for t in p.findall(".//w:t", ns) if t.text]
                if text_runs:
                    paragraphs.append("".join(text_runs))
            return "\n".join(paragraphs)
        except Exception as e:
            logger.warning(f"DOCX extraction parsing failed, falling back to raw text decode: {e}")
            try:
                return content_bytes.decode("utf-8", errors="ignore")
            except Exception:
                return ""

