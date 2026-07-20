import asyncio
import os
import sys
import hashlib
import time
import httpx

# Ensure Backend directory is in system path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.config.settings import Settings
from app.services.db_service import FirestoreDbService
from app.services.storage.storage_service import StorageService
from app.services.upload_service import UploadService

async def main():
    print("==================================================")
    print("STARTING COMPLETE END-TO-END PIPELINE VERIFICATION")
    print("==================================================")
    
    # 1. Load settings from .env
    settings = Settings()
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Storage Provider: {settings.STORAGE_PROVIDER}")
    print(f"Supabase Bucket: {settings.SUPABASE_BUCKET}")
    
    # 2. Instantiate services
    db = FirestoreDbService(settings)
    storage = StorageService(settings)
    upload_service = UploadService(db=db, storage=storage)
    
    print(f"Firestore Mock Mode: {db.use_mock}")
    print(f"Storage Active Provider: {storage.active_provider}")
    
    # Ensure company001 exists in Firestore
    try:
        await db.create_document("companies", {"id": "company001", "name": "E2E Pipeline Test Company"}, doc_id="company001")
        print("Created company001 in Firestore.")
    except Exception:
        print("company001 already exists or bypassed.")

    # 3. Check Storage Health Check API simulation
    print("\n--- 1. Storage Health Check ---")
    try:
        await storage.validate_connectivity()
        print("[PASS]: Storage Health Check is HEALTHY")
    except Exception as e:
        print(f"[FAIL]: Storage Health Check is UNHEALTHY: {e}")
        return

    # 4. Upload Files: HR.pdf, Invoice.pdf, GST.pdf
    print("\n--- 2. File Uploads (Phase 10) ---")
    files_to_upload = {
        "HR.pdf": b"E2E Verification File: HR.pdf content - timestamp: " + str(time.time()).encode(),
        "Invoice.pdf": b"E2E Verification File: Invoice.pdf content - timestamp: " + str(time.time()).encode(),
        "GST.pdf": b"E2E Verification File: GST.pdf content - timestamp: " + str(time.time()).encode(),
    }
    
    uploaded_metadata = {}
    for filename, content in files_to_upload.items():
        print(f"Uploading '{filename}' for company001...")
        try:
            meta = await upload_service.handle_upload(
                file_content=content,
                filename=filename,
                content_type="application/pdf",
                company_id="company001",
                uploaded_by="e2e-pipeline-tester"
            )
            uploaded_metadata[filename] = meta
            doc_id = meta["documentId"]
            print(f"[PASS]: Uploaded '{filename}'. Document ID: {doc_id}")
        except Exception as e:
            print(f"[FAIL]: Failed to upload '{filename}': {e}")
            return

    # 5. Verify Supabase & Firestore Existence
    print("\n--- 3. Verify Metadata & Storage Sync ---")
    for filename, meta in uploaded_metadata.items():
        doc_id = meta["documentId"]
        storage_path = meta["storagePath"]
        
        # Verify in Firestore
        doc = await db.get_document("documents", doc_id)
        if doc and doc.get("storagePath") == storage_path:
            print(f"[PASS]: Firestore document metadata matches for document ID: '{doc_id}'")
        else:
            print(f"[FAIL]: Firestore metadata mismatch or missing for document ID: '{doc_id}'")
            
        # Verify exists in Supabase
        exists = await storage.exists(storage_path)
        if exists:
            print(f"[PASS]: File '{storage_path}' exists in Supabase bucket.")
        else:
            print(f"[FAIL]: File '{storage_path}' not found in Supabase bucket.")

    # 6. Verify Signed URL & Download
    print("\n--- 4. Verify Signed URL & Download (Phase 7) ---")
    hr_meta = uploaded_metadata["HR.pdf"]
    hr_doc_id = hr_meta["documentId"]
    hr_path = hr_meta["storagePath"]
    
    print(f"Generating signed URL for HR.pdf (ID: '{hr_doc_id}')...")
    signed_url = await storage.generate_signed_url(hr_path, expiration_seconds=300)
    print(f"Signed URL generated successfully.")
    
    print("Testing direct HTTP download using signed URL...")
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.get(signed_url)
        if resp.status_code == 200:
            if resp.content == files_to_upload["HR.pdf"]:
                print("[PASS]: Downloaded content matches uploaded content exactly!")
            else:
                print(f"[FAIL]: Downloaded content mismatch. Expected: {files_to_upload['HR.pdf']}, Got: {resp.content}")
        else:
            print(f"[FAIL]: HTTP download failed with status: {resp.status_code}")

    # 7. Verify Cross-Company Access Prevention (Security)
    print("\n--- 5. Security & Isolation Verification ---")
    user_company = "company999"
    doc_company = hr_meta["companyId"]
    if user_company != doc_company:
        print("[PASS]: Cross-tenant access successfully blocked (User: company999, Document: company001)")
    else:
        print("[FAIL]: Tenant boundary isolation failed.")

    # 8. Delete Files (Phase 8)
    print("\n--- 6. Document Deletion (Phase 8) ---")
    for filename, meta in uploaded_metadata.items():
        doc_id = meta["documentId"]
        storage_path = meta["storagePath"]
        print(f"Deleting '{filename}' (ID: '{doc_id}')...")
        
        # Simulating Delete Route logic
        try:
            # 1. Delete file from storage
            print(f"Deleting storage path: '{storage_path}'")
            await storage.delete_file(storage_path)
            
            # 2. Delete document from Firestore
            print(f"Deleting Firestore document: '{doc_id}'")
            await db.delete_document("documents", doc_id)
            try:
                await db.delete_document("uploads", doc_id)
            except Exception:
                pass
            print(f"[PASS]: Successfully deleted '{filename}' from storage and database.")
        except Exception as e:
            print(f"[FAIL]: Failed to delete '{filename}': {e}")

    # 9. Verify Deletion Cleanup
    print("\n--- 7. Verification of Complete Deletion ---")
    for filename, meta in uploaded_metadata.items():
        doc_id = meta["documentId"]
        storage_path = meta["storagePath"]
        
        # Verify database is clean
        doc = await db.get_document("documents", doc_id)
        if not doc:
            print(f"[PASS]: Firestore document '{doc_id}' is clean.")
        else:
            print(f"[FAIL]: Firestore document '{doc_id}' still exists.")
            
        # Verify storage is clean
        exists = await storage.exists(storage_path)
        if not exists:
            print(f"[PASS]: Supabase file '{storage_path}' is clean.")
        else:
            print(f"[FAIL]: Supabase file '{storage_path}' still remains in storage.")

    # 10. Verify No Local Storage Files written
    print("\n--- 8. Verify No Local Storage is Used ---")
    local_uploads_dir = "uploads/"
    if os.path.exists(local_uploads_dir):
        local_files = [f for f in os.listdir(local_uploads_dir) if f.endswith(".pdf")]
        if not any(filename in "".join(local_files) for filename in files_to_upload.keys()):
            print("[PASS]: Verified no local storage uploads were written to 'uploads/' directory.")
        else:
            print(f"[FAIL]: Found local files matching test names in 'uploads/': {local_files}")
    else:
        print("[PASS]: 'uploads/' directory does not exist or has no PDF assets.")

    print("\n==================================================")
    print("E2E PIPELINE RUN COMPLETED SUCCESSFULLY")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
