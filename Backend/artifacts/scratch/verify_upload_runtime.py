import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.config.settings import Settings
from app.services.db_service import FirestoreDbService
from app.services.storage.storage_service import StorageService
from app.services.upload_service import UploadService

async def main():
    print("Starting Runtime Verification...")
    
    # 1. Load settings from .env
    settings = Settings()
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Storage Provider: {settings.STORAGE_PROVIDER}")
    print(f"Supabase Bucket: {settings.SUPABASE_BUCKET}")
    
    # 2. Instantiate Db and Storage Services
    db = FirestoreDbService(settings)
    storage = StorageService(settings)
    
    print(f"Firestore Mock Mode: {db.use_mock}")
    print(f"Storage Active Provider: {storage.active_provider}")
    
    # 3. Instantiate UploadService
    upload_service = UploadService(db=db, storage=storage)
    
    # 3.5 Ensure company001 exists in Firestore
    print("Ensuring company001 exists in Firestore...")
    try:
        await db.create_document("companies", {"id": "company001", "name": "Runtime Verification Company"}, doc_id="company001")
        print("Created company001 in Firestore.")
    except Exception as e:
        print(f"Company 'company001' already exists or creation bypassed: {e}")
    
    # 4. Perform upload of a sample PDF
    company_id = "company001"
    filename = "HR.pdf"
    content_type = "application/pdf"
    # Ensure unique file content by adding time to avoid collision/deduplication rejection
    import time
    content = f"%PDF-1.4 ... Dummy PDF for Project Atlas Phase 6 - timestamp: {time.time()} ...".encode('utf-8')
    
    print(f"Uploading {filename} for {company_id}...")
    try:
        metadata = await upload_service.handle_upload(
            file_content=content,
            filename=filename,
            content_type=content_type,
            company_id=company_id,
            uploaded_by="runtime-verify-uid"
        )
        print("Upload completed successfully!")
        print(f"Metadata generated: {metadata}")
        
        # 5. Verify file exists in storage provider
        storage_path = metadata["storagePath"]
        print(f"Verifying file existence in storage path: '{storage_path}'...")
        exists = await storage.exists(storage_path)
        if exists:
            print("[PASS]: File successfully stored in the configured storage bucket.")
        else:
            print("[FAIL]: File does not exist in storage.")
            
        # 6. Verify metadata exists in Firestore
        doc_id = metadata["documentId"]
        print(f"Verifying metadata in Firestore documents collection for ID: '{doc_id}'...")
        doc = await db.get_document("documents", doc_id)
        if doc:
            print("[PASS]: Firestore metadata document found.")
            if doc.get("storagePath") == storage_path:
                print("[PASS]: Firestore storagePath matches uploaded path exactly.")
            else:
                print("[FAIL]: Firestore storagePath mismatch.")
        else:
            print("[FAIL]: Firestore metadata document not found.")
            
    except Exception as e:
        print(f"Exception occurred during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
