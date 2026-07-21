import pytest
import asyncio
import google.api_core.exceptions as g_exceptions
from app.config.settings import Settings
from app.services.ai_service import GeminiAIService
from app.utils.exceptions import AIServiceError

# Standard test settings
test_settings = Settings(
    ENVIRONMENT="development",
    FIREBASE_PROJECT_ID="mock-project",
    GEMINI_API_KEY="valid-key-format-12345", # Ensure use_mock is False
    GEMINI_MODEL_NAME="gemini-1.5-flash"
)


@pytest.mark.asyncio
async def test_gemini_retry_success() -> None:
    """Verifies that a successful API call returns immediately without retrying."""
    ai = GeminiAIService(test_settings)
    ai.use_mock = False # force real code path (with mock call targets)
    
    call_count = 0
    
    def dummy_success():
        nonlocal call_count
        call_count += 1
        return "success-result"
        
    result = await ai._execute_with_retry(dummy_success)
    assert result == "success-result"
    assert call_count == 1


@pytest.mark.asyncio
async def test_gemini_retry_on_rate_limit() -> None:
    """Verifies that API rate limits trigger retries with backoff."""
    ai = GeminiAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_rate_limit():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            # First and second attempt fail with rate limits
            raise g_exceptions.ResourceExhausted("Rate limit exceeded")
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
async def test_gemini_invalid_key_fails_immediately() -> None:
    """Verifies that invalid API Key errors abort retries instantly."""
    ai = GeminiAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_invalid_key():
        nonlocal call_count
        call_count += 1
        raise g_exceptions.PermissionDenied("API_KEY_INVALID")
        
    with pytest.raises(AIServiceError) as exc_info:
        await ai._execute_with_retry(dummy_invalid_key, max_retries=3)
        
    assert "key is invalid" in str(exc_info.value)
    # Verify no standard retries happened
    assert call_count == 1


@pytest.mark.asyncio
async def test_gemini_timeout_recovery() -> None:
    """Verifies that transient API timeouts are retried."""
    ai = GeminiAIService(test_settings)
    ai.use_mock = False
    
    call_count = 0
    
    def dummy_timeout():
        nonlocal call_count
        call_count += 1
        if call_count < 2:
            # Let the first call block to exceed mock timeout setup
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
