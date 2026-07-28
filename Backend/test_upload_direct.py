import requests
import json

BASE_URL = "http://localhost:8000"
HEADERS = {"Authorization": "Bearer mock-token-audit-user123__comp-atlas"}

# 1. Register test
res_reg = requests.post(f"{BASE_URL}/auth/register", headers=HEADERS, json={"email": "test.register@example.com", "password": "Password123!", "display_name": "Test User"})
print("1. Register status:", res_reg.status_code)
print("   Response:", res_reg.text)

# 2. Upload test
pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 12 Tf 72 712 Td (Atlas Security Policy Document) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n320\n%%EOF\n"
files = {"file": ("Company_Security_Policy.pdf", pdf_content, "application/pdf")}
res_up = requests.post(f"{BASE_URL}/uploads", headers=HEADERS, files=files, data={"folder": "compliance"})
print("\n2. Upload status:", res_up.status_code)
print("   Response:", res_up.text)
