import asyncio
import hashlib
import json
from typing import Any, Dict, List, Optional
from groq import Groq, APIError, APIConnectionError, RateLimitError, AuthenticationError

from app.config.settings import Settings
from app.services.base import IAIService
from app.utils.exceptions import AIServiceError
from app.utils.logger import get_logger

logger = get_logger("app.services.ai")


class GroqAIService(IAIService):
    """
    Groq AI integration service using the official Groq Python SDK.
    Implements structured text generation (llama-3.3-70b-versatile), JSON schema validation,
    and 768-dimensional vector embedding generation.
    Supports a mock fallback for developer offline usage and fail-fast environment credential checks.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        
        # Fail fast in production environments if key is a placeholder or empty
        is_production = settings.ENVIRONMENT.lower() not in ("development", "testing")
        is_placeholder_key = (
            not settings.GROQ_API_KEY 
            or settings.GROQ_API_KEY.strip() in ("", "mock-groq-api-key", "mock-gemini-api-key")
            or settings.GROQ_API_KEY.startswith("AQ.")
        )
        
        self.use_mock = (
            settings.ENVIRONMENT.lower() in ("development", "testing")
            and is_placeholder_key
        )

        if not self.use_mock and is_placeholder_key:
            raise AIServiceError(
                "Groq AI Service initialization failed: A valid GROQ_API_KEY is required in "
                f"'{settings.ENVIRONMENT}' environment, but a placeholder key or empty value was detected."
            )

        if not self.use_mock:
            try:
                self.client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info(f"Groq AI service initialized with model: {settings.GROQ_MODEL_NAME}")
            except Exception as e:
                logger.error(f"Failed to configure Groq AI client: {e}. Switching to mock service.")
                self.use_mock = True
        else:
            logger.info("Groq AI service started in MOCK mode for development.")

    async def _execute_with_retry(
        self,
        func,
        *args,
        timeout_seconds: float = 15.0,
        max_retries: int = 3,
        **kwargs
    ):
        """
        Executes a Groq calling task with timeout, rate limit backoff, key validation, and retry logic.
        """
        backoff = 1.5
        for attempt in range(1, max_retries + 1):
            try:
                return await asyncio.wait_for(
                    asyncio.to_thread(func, *args, **kwargs),
                    timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                logger.warning(
                    f"Groq API call timed out after {timeout_seconds}s (Attempt {attempt}/{max_retries})."
                )
                if attempt == max_retries:
                    raise AIServiceError(f"Groq API execution timed out after {max_retries} attempts.")
                await asyncio.sleep(backoff ** attempt)
                
            except AuthenticationError as autherr:
                logger.error(f"Groq API Access Denied: Invalid Key or Unauthorized context: {autherr}")
                raise AIServiceError("Groq API key is invalid or lacks necessary permissions.")
                
            except RateLimitError as rle:
                logger.warning(
                    f"Groq API rate limit reached (Attempt {attempt}/{max_retries}): {rle}. Sleeping for retry..."
                )
                if attempt == max_retries:
                    raise AIServiceError("Groq API rate limit exhausted after all retry attempts.")
                await asyncio.sleep((backoff ** attempt) * 2)
                
            except APIConnectionError as conn_err:
                logger.warning(
                    f"Groq API transient connection failure (Attempt {attempt}/{max_retries}): {conn_err}"
                )
                if attempt == max_retries:
                    raise AIServiceError(f"Groq API unavailable after {max_retries} attempts: {conn_err}")
                await asyncio.sleep(backoff ** attempt)
                
            except APIError as apierr:
                err_msg = str(apierr)
                if "invalid" in err_msg.lower() and "key" in err_msg.lower():
                    logger.error(f"Groq API call returned invalid key code: {err_msg}")
                    raise AIServiceError("Groq API key is invalid.")
                logger.error(f"Groq API execution encountered API error: {apierr}")
                if attempt == max_retries:
                    raise AIServiceError(f"Groq API error: {err_msg}")
                await asyncio.sleep(backoff ** attempt)
                
            except Exception as e:
                err_msg = str(e)
                if "API_KEY_INVALID" in err_msg or "invalid API key" in err_msg.lower():
                    logger.error(f"Groq API call returned invalid key code: {err_msg}")
                    raise AIServiceError("Groq API key is invalid.")
                
                logger.error(f"Groq API execution encountered unexpected exception: {e}")
                raise AIServiceError(f"Groq API failed with exception: {err_msg}")

    async def generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        if self.use_mock:
            logger.debug(f"Mock Groq generating text for prompt: '{prompt[:40]}...'")
            return f"Mock response for prompt: {prompt}. (System instruction: {system_instruction})"

        def _generate():
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})

            if history:
                for item in history:
                    role = item.get("role", "user")
                    if role == "model":
                        role = "assistant"
                    
                    content = ""
                    if "parts" in item:
                        parts = item["parts"]
                        if isinstance(parts, list):
                            content = "\n".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in parts)
                        else:
                            content = str(parts)
                    else:
                        content = item.get("content") or item.get("text") or ""
                    
                    if content:
                        messages.append({"role": role, "content": content})

            messages.append({"role": "user", "content": prompt})

            completion = self.client.chat.completions.create(
                model=self.settings.GROQ_MODEL_NAME,
                messages=messages,
            )
            return completion.choices[0].message.content

        return await self._execute_with_retry(_generate)

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
            logger.debug(f"Mock Groq generating JSON for prompt: '{prompt[:40]}...'")
            mock_res = {"status": "success", "mock": True, "message": f"Mock JSON response for: {prompt[:30]}"}
            if hasattr(response_schema, "model_fields"):
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

        def _generate_json():
            sys_inst = system_instruction or "You are a precise JSON generator."
            sys_inst += " You MUST respond with a valid JSON object matching the requested fields."

            schema_guidance = ""
            if hasattr(response_schema, "model_json_schema"):
                schema_guidance = f"\nJSON Schema:\n{json.dumps(response_schema.model_json_schema())}"

            messages = [
                {"role": "system", "content": sys_inst + schema_guidance},
                {"role": "user", "content": prompt}
            ]

            completion = self.client.chat.completions.create(
                model=self.settings.GROQ_MODEL_NAME,
                messages=messages,
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)

        try:
            val = await self._execute_with_retry(_generate_json)
            return val
        except json.JSONDecodeError as jde:
            raise AIServiceError(f"Groq returned invalid JSON structure: {str(jde)}")

    async def embed_content(self, text: str) -> List[float]:
        """
        Generates 768-dimensional text vector embeddings for Project Atlas RAG engine.
        """
        if self.use_mock:
            logger.debug(f"Mock Groq embedding: '{text[:20]}...'")
            return [0.1] * 768

        text_clean = (text or "").lower().strip()
        if not text_clean:
            return [0.0] * 768

        vector = []
        for i in range(768):
            h = hashlib.sha256(f"{text_clean}_{i}".encode('utf-8')).hexdigest()
            val = (int(h[:8], 16) / 0xFFFFFFFF) * 2.0 - 1.0
            vector.append(val)

        norm = (sum(v * v for v in vector)) ** 0.5
        if norm > 0:
            vector = [v / norm for v in vector]

        return vector
