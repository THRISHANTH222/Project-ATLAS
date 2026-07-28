import pytest
import asyncio
from groq import RateLimitError, AuthenticationError
from app.config.settings import Settings
from app.services.ai_service import GroqAIService
from app.utils.exceptions import AIServiceError

# Standard test settings
test_settings = Settings(
    ENVIRONMENT="development",
    FIREBASE_PROJECT_ID="mock-project",
    GROQ_API_KEY="gsk_valid_key_format_12345", # Ensure use_mock is False
    GROQ_MODEL_NAME="llama-3.3-70b-versatile"
)


@pytest.mark.asyncio
async def test_groq_retry_success() -> None:
    """Verifies that a successful API call returns immediately without retrying."""
    ai = GroqAIService(test_settings)
    ai.use_mock = False # force real code path
    
    call_count = 0
    
    def dummy_success():
        nonlocal call_count
        call_count += 1
        return "success-result"
        
    result = await ai._execute_with_retry(dummy_success)
    assert result == "success-result"
    assert call_count == 1


@pytest.mark.asyncio
async def test_groq_retry_on_rate_limit() -> None:
    """Verifies that API rate limits trigger retries with backoff."""
    ai = GroqAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_rate_limit():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            # Create dummy httpx response for Groq RateLimitError
            import httpx
            request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
            response = httpx.Response(429, request=request)
            raise RateLimitError("Rate limit exceeded", response=response, body=None)
        return "success-after-retries"

    # Inject mock sleep to keep tests fast
    async def mock_sleep(seconds):
        pass
    
    import app.services.ai_service as ai_service_module
    original_sleep = ai_service_module.asyncio.sleep
    ai_service_module.asyncio.sleep = mock_sleep
    
    try:
        result = await ai._execute_with_retry(dummy_rate_limit, max_retries=3)
        assert result == "success-after-retries"
        assert call_count == 3
    finally:
        ai_service_module.asyncio.sleep = original_sleep


@pytest.mark.asyncio
async def test_groq_invalid_key_fails_immediately() -> None:
    """Verifies that invalid API Key errors abort retries instantly."""
    ai = GroqAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_invalid_key():
        nonlocal call_count
        call_count += 1
        import httpx
        request = httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions")
        response = httpx.Response(401, request=request)
        raise AuthenticationError("Invalid API Key", response=response, body=None)
        
    with pytest.raises(AIServiceError) as exc_info:
        await ai._execute_with_retry(dummy_invalid_key, max_retries=3)
        
    assert "key is invalid" in str(exc_info.value)
    # Verify no standard retries happened
    assert call_count == 1


@pytest.mark.asyncio
async def test_groq_timeout_recovery() -> None:
    """Verifies that transient API timeouts are retried."""
    ai = GroqAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_timeout():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            import time
            time.sleep(0.5)
        return "success-after-timeout"

    # Inject mock sleep to keep tests fast
    async def mock_sleep(seconds):
        pass
        
    import app.services.ai_service as ai_service_module
    original_sleep = ai_service_module.asyncio.sleep
    ai_service_module.asyncio.sleep = mock_sleep
    
    try:
        result = await ai._execute_with_retry(dummy_timeout, timeout_seconds=0.1, max_retries=2)
        assert result == "success-after-timeout"
        assert call_count == 2
    finally:
        ai_service_module.asyncio.sleep = original_sleep
