import firebase_admin
from firebase_admin import credentials, auth
from typing import Any, Dict, Optional

from app.config.settings import Settings
from app.services.base import IAuthService
from app.utils.exceptions import AuthenticationError
from app.utils.logger import get_logger

logger = get_logger("app.services.auth")


class FirebaseAuthService(IAuthService):
    """
    Firebase Authentication concrete implementation.
    Supports real Firebase SDK authentication and fallback mock mode for local development/testing.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        self.use_mock = (
            settings.ENVIRONMENT.lower() in ("development", "testing")
            and not settings.FIREBASE_CREDENTIALS_PATH
            and not settings.FIREBASE_CREDENTIALS_JSON
        )

        if not self.use_mock:
            if not firebase_admin._apps:
                try:
                    if settings.FIREBASE_CREDENTIALS_JSON:
                        import json
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
                except Exception as e:
                    logger.error(f"Failed to initialize Firebase Admin SDK: {e}. Switching to mock mode.")
                    self.use_mock = True
        else:
            logger.info("Firebase Auth service started in MOCK mode.")

    async def verify_token(self, token: str) -> Dict[str, Any]:
        if self.use_mock:
            if token.startswith("mock-token-"):
                uid = token.replace("mock-token-", "")
                tenant_id = None
                if "__" in uid:
                    uid, tenant_id = uid.split("__", 1)
                
                claims = {
                    "uid": uid,
                    "email": f"{uid}@example.com",
                    "name": uid.capitalize(),
                    "email_verified": True,
                    "auth_time": 1234567890,
                    "firebase": {"sign_in_provider": "password"},
                }
                if tenant_id:
                    claims["tenant_id"] = tenant_id
                    claims["company_id"] = tenant_id
                return claims
            raise AuthenticationError("Invalid mock token format. Must start with 'mock-token-'")

        try:
            # check_revoked is set to True to verify status on active sessions
            decoded_token = auth.verify_id_token(token, check_revoked=True)
            return decoded_token
        except auth.RevokedIdTokenError:
            raise AuthenticationError("Authentication token has been revoked.")
        except auth.ExpiredIdTokenError:
            raise AuthenticationError("Authentication token has expired.")
        except auth.InvalidIdTokenError:
            raise AuthenticationError("Invalid authentication token.")
        except Exception as e:
            raise AuthenticationError(f"Token verification failed: {str(e)}")

    async def get_user(self, uid: str) -> Dict[str, Any]:
        if self.use_mock:
            return {
                "uid": uid,
                "email": f"{uid}@example.com",
                "display_name": uid.capitalize(),
                "disabled": False,
            }

        try:
            user_record = auth.get_user(uid)
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
                "disabled": user_record.disabled,
            }
        except auth.UserNotFoundError:
            raise AuthenticationError(f"User with UID {uid} does not exist.")
        except Exception as e:
            raise AuthenticationError(f"Failed to retrieve user: {str(e)}")

    async def create_user(self, email: str, display_name: Optional[str] = None) -> Dict[str, Any]:
        if self.use_mock:
            uid = f"user_{email.split('@')[0]}"
            return {
                "uid": uid,
                "email": email,
                "display_name": display_name or email.split("@")[0].capitalize(),
            }

        try:
            user_record = auth.create_user(email=email, display_name=display_name)
            return {
                "uid": user_record.uid,
                "email": user_record.email,
                "display_name": user_record.display_name,
            }
        except auth.EmailAlreadyExistsError:
            raise AuthenticationError("An account with this email address already exists.")
        except Exception as e:
            raise AuthenticationError(f"Failed to create user: {str(e)}")

    async def delete_user(self, uid: str) -> None:
        if self.use_mock:
            logger.info(f"Mock delete user: {uid}")
            return

        try:
            auth.delete_user(uid)
        except auth.UserNotFoundError:
            raise AuthenticationError(f"User with UID {uid} not found.")
        except Exception as e:
            raise AuthenticationError(f"Failed to delete user: {str(e)}")
