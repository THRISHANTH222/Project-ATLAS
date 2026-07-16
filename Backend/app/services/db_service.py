import asyncio
import google.api_core.exceptions as gcp_exceptions
from typing import Any, Dict, List, Optional
from firebase_admin import firestore
from google.cloud.firestore_v1.base_query import FieldFilter

from app.config.settings import Settings
from app.services.base import IDatabaseService
from app.utils.exceptions import ConflictError, DatabaseError, NotFoundError
from app.utils.logger import get_logger

logger = get_logger("app.services.db")


def map_firestore_exception(e: Exception) -> Exception:
    """Maps Google Cloud API exceptions to domain-specific custom exceptions."""
    if isinstance(e, gcp_exceptions.NotFound):
        return NotFoundError(f"Firestore resource not found: {str(e)}")
    if isinstance(e, gcp_exceptions.AlreadyExists):
        return ConflictError(f"Firestore resource conflict (already exists): {str(e)}")
    if isinstance(e, gcp_exceptions.InvalidArgument):
        return DatabaseError(f"Invalid argument passed to Firestore: {str(e)}")
    if isinstance(e, gcp_exceptions.GoogleAPICallError):
        return DatabaseError(f"GCP API call failed: {str(e)}")
    return DatabaseError(f"Database operation failed: {str(e)}")


from app.utils.firebase import initialize_firebase


class FirestoreDbService(IDatabaseService):
    """
    Firestore Database concrete implementation.
    Supports Firestore client actions, generic batch operations, connection closures,
    and fallback mock logic for developer environments.
    """

    def __init__(self, settings: Settings):
        self.settings = settings
        # Initialize Firebase Admin SDK eagerly if not already done
        initialized = initialize_firebase(settings)
        self.use_mock = not initialized
        self.db = None

        if not self.use_mock:
            try:
                # Firestore client wraps default app
                self.db = firestore.client()
                logger.info("Firestore connection established successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to Firestore: {e}. Falling back to mock database.")
                self.use_mock = True
                self._init_mock_db()
        else:
            logger.info("Firestore service started in MOCK mode.")
            self._init_mock_db()

    def _init_mock_db(self) -> None:
        """Initializes mock state dict."""
        self.mock_db: Dict[str, Dict[str, Dict[str, Any]]] = {}

    async def close_connection(self) -> None:
        """Closes the active Firestore connection client cleanly."""
        if self.use_mock or not self.db:
            return
        try:
            await asyncio.to_thread(self.db.close)  # type: ignore
            logger.info("Firestore client connection closed cleanly.")
        except Exception as e:
            logger.error(f"Error while closing Firestore client connection: {e}")

    async def get_document(self, collection: str, doc_id: str) -> Optional[Dict[str, Any]]:
        if self.use_mock:
            return self.mock_db.get(collection, {}).get(doc_id)

        try:
            def _get():
                doc_ref = self.db.collection(collection).document(doc_id)  # type: ignore
                doc = doc_ref.get()
                if doc.exists:
                    return doc.to_dict()
                return None

            return await asyncio.to_thread(_get)
        except Exception as e:
            raise map_firestore_exception(e)

    async def create_document(self, collection: str, data: Dict[str, Any], doc_id: Optional[str] = None) -> str:
        if self.use_mock:
            import uuid
            final_id = doc_id or str(uuid.uuid4())
            if collection not in self.mock_db:
                self.mock_db[collection] = {}
            self.mock_db[collection][final_id] = {**data, "id": final_id}
            return final_id

        try:
            def _create():
                col_ref = self.db.collection(collection)  # type: ignore
                if doc_id:
                    doc_ref = col_ref.document(doc_id)
                    # Verify conflict first
                    if doc_ref.get().exists:
                        raise ConflictError(f"Document with ID {doc_id} already exists in {collection}")
                    doc_ref.set(data)
                    return doc_id
                else:
                    _, doc_ref = col_ref.add(data)
                    return doc_ref.id

            return await asyncio.to_thread(_create)
        except Exception as e:
            raise map_firestore_exception(e)

    async def update_document(self, collection: str, doc_id: str, data: Dict[str, Any]) -> None:
        if self.use_mock:
            if collection not in self.mock_db or doc_id not in self.mock_db[collection]:
                raise NotFoundError(f"Document {doc_id} not found in collection {collection}")
            self.mock_db[collection][doc_id].update(data)
            return

        try:
            def _update():
                doc_ref = self.db.collection(collection).document(doc_id)  # type: ignore
                if not doc_ref.get().exists:
                    raise NotFoundError(f"Document {doc_id} not found in collection {collection}")
                doc_ref.update(data)

            await asyncio.to_thread(_update)
        except Exception as e:
            raise map_firestore_exception(e)

    async def delete_document(self, collection: str, doc_id: str) -> None:
        if self.use_mock:
            if collection in self.mock_db and doc_id in self.mock_db[collection]:
                del self.mock_db[collection][doc_id]
            return

        try:
            def _delete():
                doc_ref = self.db.collection(collection).document(doc_id)  # type: ignore
                if not doc_ref.get().exists:
                    raise NotFoundError(f"Document {doc_id} not found in collection {collection}")
                doc_ref.delete()

            await asyncio.to_thread(_delete)
        except Exception as e:
            raise map_firestore_exception(e)

    async def query_documents(
        self, collection: str, field_path: str, op_string: str, value: Any
    ) -> List[Dict[str, Any]]:
        if self.use_mock:
            results = []
            col_data = self.mock_db.get(collection, {})
            for doc in col_data.values():
                val = doc.get(field_path)
                if op_string == "==" and val == value:
                    results.append(doc)
                elif op_string == "!=" and val != value:
                    results.append(doc)
                elif op_string == ">" and val is not None and val > value:
                    results.append(doc)
                elif op_string == "<" and val is not None and val < value:
                    results.append(doc)
                elif op_string == "in" and isinstance(value, list) and val in value:
                    results.append(doc)
            return results

        try:
            def _query():
                query = self.db.collection(collection).where(  # type: ignore
                    filter=FieldFilter(field_path, op_string, value)
                )
                docs = query.stream()
                return [{**doc.to_dict(), "id": doc.id} for doc in docs]

            return await asyncio.to_thread(_query)
        except Exception as e:
            raise map_firestore_exception(e)

    async def execute_batch(self, operations: List[Dict[str, Any]]) -> None:
        """
        Executes multiple write operations (create, update, delete) as a single atomic batch transaction.
        """
        if self.use_mock:
            for op in operations:
                col = op["collection"]
                doc_id = op["id"]
                op_type = op["type"]
                if op_type == "create":
                    if col not in self.mock_db:
                        self.mock_db[col] = {}
                    self.mock_db[col][doc_id] = {**op["data"], "id": doc_id}
                elif op_type == "update":
                    if col in self.mock_db and doc_id in self.mock_db[col]:
                        self.mock_db[col][doc_id].update(op["data"])
                elif op_type == "delete":
                    if col in self.mock_db and doc_id in self.mock_db[col]:
                        del self.mock_db[col][doc_id]
            return

        try:
            def _batch():
                batch = self.db.batch()  # type: ignore
                for op in operations:
                    col = op["collection"]
                    doc_id = op["id"]
                    op_type = op["type"]
                    doc_ref = self.db.collection(col).document(doc_id)  # type: ignore

                    if op_type == "create":
                        batch.set(doc_ref, op["data"])
                    elif op_type == "update":
                        batch.update(doc_ref, op["data"])
                    elif op_type == "delete":
                        batch.delete(doc_ref)

                batch.commit()

            await asyncio.to_thread(_batch)
        except Exception as e:
            raise map_firestore_exception(e)
