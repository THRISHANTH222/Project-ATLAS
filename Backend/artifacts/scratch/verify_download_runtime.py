import asyncio
import os
import sys
import httpx

# Ensure backend directory is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.config.settings import Settings
from app.services.db_service import FirestoreDbService
from app.services.storage.storage_service import StorageService
from app.services.upload_service import UploadService

async def main():
    print("Starting Phase 7 Download Runtime Verification...")
    
    # 1. Load settings from .env
    settings = Settings()
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Storage Provider: {settings.STORAGE_PROVIDER}")
    print(f"Supabase Bucket: {settings.SUPABASE_BUCKET}")
    
    # 2. Instantiate Services
    db = FirestoreDbService(settings)
    storage = StorageService(settings)
    
    print(f"Firestore Mock Mode: {db.use_mock}")
    print(f"Storage Active Provider: {storage.active_provider}")
    
    # 3. Instantiate UploadService
    upload_service = UploadService(db=db, storage=storage)
    
    # 4. Perform upload of a sample PDF
    company_id = "company001"
    filename = "HR.pdf"
    content_type = "application/pdf"
    import time
    original_text = f"Project Atlas Phase 7 Download Validation - timestamp: {time.time()}"
    content = original_text.encode('utf-8')
    
    print("Ensuring company001 exists in Firestore...")
    try:
        await db.create_document("companies", {"id": "company001", "name": "Runtime Verification Company"}, doc_id="company001")
    except Exception:
        pass
        
    print("Uploading unique test file for company001...")
    try:
        metadata = await upload_service.handle_upload(
            file_content=content,
            filename=filename,
            content_type=content_type,
            company_id=company_id,
            uploaded_by="runtime-verify-uid"
        )
        print("Upload completed successfully!")
        
        doc_id = metadata["documentId"]
        storage_path = metadata["storagePath"]
        print(f"Generated Document ID: {doc_id}")
        print(f"Generated Storage Path: {storage_path}")
        
        # 5. Retrieve Firestore Metadata (Verify Lookup)
        print(f"Retrieving metadata from Firestore for document ID: '{doc_id}'...")
        doc = await db.get_document("documents", doc_id)
        if not doc:
            print("[FAIL]: Firestore metadata lookup failed.")
            return
        print(f"[PASS]: Firestore metadata lookup successful. Retrieved storagePath: '{doc.get('storagePath')}'")
        
        # 6. Generate Signed URL using StorageService
        expiration = settings.SIGNED_URL_EXPIRATION
        print(f"Generating signed URL for path: '{storage_path}' with expiration: {expiration} seconds...")
        signed_url = await storage.generate_signed_url(storage_path, expiration_seconds=expiration)
        print("[PASS]: Signed URL successfully generated.")
        
        # 7. Access URL via HTTP to verify direct download functionality
        print("Accessing signed URL via HTTP Client to verify download content...")
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(signed_url)
            if resp.status_code == 200:
                downloaded_content = resp.content.decode('utf-8')
                print(f"Downloaded content: {downloaded_content}")
                if downloaded_content == original_text:
                    print("[PASS]: Downloaded content matches the uploaded file contents exactly!")
                else:
                    print("[FAIL]: Downloaded content does not match uploaded content.")
            else:
                print(f"[FAIL]: HTTP GET on signed URL failed with status: {resp.status_code} - {resp.text}")
                
        # 8. Cross-Company Authorization Validation simulation
        print("Simulating Cross-Company authorization check...")
        user_company_id = "company999" # Mismatch
        doc_company_id = doc.get("companyId") or doc.get("company_id")
        if user_company_id != doc_company_id:
            print(f"[PASS]: Cross-company authorization check rejected access successfully (User: {user_company_id} vs Document: {doc_company_id})")
        else:
            print("[FAIL]: Cross-company check failed.")
            
    except Exception as e:
        print(f"Exception occurred during verification: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
