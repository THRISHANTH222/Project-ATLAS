import firebase_admin
from firebase_admin import credentials
import json
from app.config.settings import Settings
from app.utils.logger import get_logger

logger = get_logger("app.utils.firebase")

def initialize_firebase(settings: Settings) -> bool:
    """
    Centralized initialization function for Firebase Admin SDK.
    Ensures that the SDK is initialized exactly once, following the Singleton pattern.
    Returns True if successfully initialized (or already initialized), False if it falls back to mock.
    """
    if firebase_admin._apps:
        return True

    # Check if mock mode is forced by settings
    use_mock = (
        settings.ENVIRONMENT.lower() in ("development", "testing")
        and not settings.FIREBASE_CREDENTIALS_PATH
        and not settings.FIREBASE_CREDENTIALS_JSON
    )

    if use_mock:
        logger.info("Firebase Admin SDK startup: mock mode enabled by configuration.")
        return False

    try:
        if settings.FIREBASE_CREDENTIALS_JSON:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK successfully initialized via credentials JSON.")
        elif settings.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK successfully initialized via credentials file path.")
        else:
            firebase_admin.initialize_app()
            logger.info("Firebase Admin SDK successfully initialized using default credentials.")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}. Falling back to mock mode.")
        return False
