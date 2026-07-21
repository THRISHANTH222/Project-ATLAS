import json
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config.settings import Settings
from app.services.base import IAIService
from app.utils.exceptions import AIServiceError
from app.utils.logger import get_logger

logger = get_logger("app.services.ai")


class GeminiAIService(IAIService):
    """
    Gemini AI integration service.
    Implements structured text generation, JSON schema validation, and embeddings generation.
    Supports a mock fallback for developer offline usage.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_mock = (
            settings.ENVIRONMENT.lower() == "development"
            and (not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "mock-gemini-api-key")
        )

        if not self.use_mock:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.model = genai.GenerativeModel(settings.GEMINI_MODEL_NAME)
                logger.info(f"Gemini AI service initialized with model: {settings.GEMINI_MODEL_NAME}")
            except Exception as e:
                logger.error(f"Failed to configure Gemini AI: {e}. Switching to mock service.")
                self.use_mock = True
        else:
            logger.info("Gemini AI service started in MOCK mode for development.")

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        if self.use_mock:
            logger.debug(f"Mock Gemini generating text for prompt: '{prompt[:40]}...'")
            return f"Mock response for prompt: {prompt}. (System instruction: {system_instruction})"

        try:
            # Recreate model with specific system instruction if provided
            model = self.model
            if system_instruction:
                model = genai.GenerativeModel(
                    self.settings.GEMINI_MODEL_NAME,
                    system_instruction=system_instruction
                )

            # Support chat history if provided
            if history:
                chat = model.start_chat(history=history)
                response = chat.send_message(prompt)
            else:
                response = model.generate_content(prompt)

            return response.text
        except Exception as e:
            raise AIServiceError(f"Gemini content generation failed: {str(e)}")

    async def generate_json(
        self,
        prompt: str,
        response_schema: Any,
        system_instruction: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates structured JSON conforming to the response_schema (Pydantic model or schema dict).
        """
        if self.use_mock:
            logger.debug(f"Mock Gemini generating JSON for prompt: '{prompt[:40]}...'")
            # Return basic structure based on schema helper or empty dict
            mock_res = {"status": "success", "mock": True, "message": f"Mock JSON response for: {prompt[:30]}"}
            if hasattr(response_schema, "model_fields"):
                # If it's a Pydantic model class, return dummy values for its fields
                for field_name, field_info in response_schema.model_fields.items():
                    annotation = field_info.annotation
                    if annotation is str:
                        mock_res[field_name] = f"mock_{field_name}"
                    elif annotation is int:
                        mock_res[field_name] = 42
                    elif annotation is float:
                        mock_res[field_name] = 3.14
                    elif annotation is bool:
                        mock_res[field_name] = True
                    elif annotation is list or getattr(annotation, "__origin__", None) is list:
                        mock_res[field_name] = []
            return mock_res

        try:
            # We construct custom GenerativeModel if system instruction is specified
            model = self.model
            if system_instruction:
                model = genai.GenerativeModel(
                    self.settings.GEMINI_MODEL_NAME,
                    system_instruction=system_instruction
                )

            # Set up the response MIME type to json and set response schema
            config = GenerationConfig(
                response_mime_type="application/json",
                response_schema=response_schema
            )

            response = model.generate_content(prompt, generation_config=config)
            
            # Parse response text as dict
            return json.loads(response.text)
        except json.JSONDecodeError as jde:
            raise AIServiceError(f"Gemini returned invalid JSON structure: {str(jde)}")
        except Exception as e:
            raise AIServiceError(f"Gemini JSON generation failed: {str(e)}")

    async def embed_content(self, text: str) -> List[float]:
        if self.use_mock:
            logger.debug(f"Mock Gemini embedding: '{text[:20]}...'")
            # Return dummy 768-dim mock vector
            return [0.1] * 768

        try:
            # Using text-embedding-004 standard model
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result["embedding"]
        except Exception as e:
            raise AIServiceError(f"Gemini embedding generation failed: {str(e)}")
