# 🚀 Project Atlas – AI-Powered Enterprise Knowledge Assistant

Project Atlas is an AI-powered Enterprise Knowledge Management System that enables organisations to securely interact with their internal documents using Natural Language Processing (NLP) and Retrieval-Augmented Generation (RAG).

Instead of manually searching through PDFs, policies, SOPs, manuals, or company documentation, employees can simply ask questions in natural language and receive accurate, citation-backed answers generated only from their organisation's uploaded documents.

---

# 🌟 Features

## 🔐 Secure Authentication
- Firebase Authentication
- Email & Password Login
- Protected API Routes
- JWT-based Authentication
- Multi-tenant Company Isolation

## 📄 Company Brain
- Upload company documents
- PDF support
- DOCX support
- TXT support
- Automatic document processing
- Metadata management

## 🧠 AI Knowledge Retrieval
- Retrieval-Augmented Generation (RAG)
- Semantic Search
- Vector Embeddings
- Intelligent Chunking
- Citation-based Responses
- Confidence Scoring

## 💬 AI Chat Assistant
- Natural language conversations
- Context-aware responses
- Source citations
- Hallucination prevention
- Company-specific answers only

## ☁️ Cloud Infrastructure
- Firebase Authentication
- Cloud Firestore
- Supabase Storage
- Groq LLM Integration

---

# 🏗️ System Architecture

```
                    User
                      │
                      ▼
             Next.js Frontend
                      │
          HTTPS Authenticated Requests
                      │
                      ▼
              FastAPI Backend
                      │
      ┌───────────────┼────────────────┐
      │               │                │
      ▼               ▼                ▼
 Firebase Auth   Firestore DB   Supabase Storage
                      │
                      ▼
          Retrieval-Augmented Generation
                      │
                      ▼
                 Groq LLM API
                      │
                      ▼
              AI Generated Response
```

---

# ⚙️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Python
- Pydantic
- Uvicorn

### AI & Machine Learning
- Groq LLM
- Embedding Generation
- Retrieval-Augmented Generation (RAG)
- Semantic Search

### Database
- Cloud Firestore

### Storage
- Supabase Storage

### Authentication
- Firebase Authentication

### Deployment
- Vercel (Frontend)
- Render / Railway (Backend)

---

# 📂 Project Structure

```
Project-Atlas
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   └── pages/
│
├── Backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── utils/
│   │
│   ├── uploads/
│   └── requirements.txt
│
└── README.md
```

---

# 🔄 Workflow

1. User logs in securely using Firebase Authentication.
2. Company documents are uploaded to the Company Brain.
3. Documents are stored securely in cloud storage.
4. Text is extracted from uploaded documents.
5. Documents are split into semantic chunks.
6. Vector embeddings are generated.
7. Embeddings are stored for semantic retrieval.
8. User asks a question in natural language.
9. Relevant chunks are retrieved using semantic search.
10. Retrieved context is sent to the Groq LLM.
11. AI generates an accurate, citation-backed response.
12. The answer and supporting sources are displayed to the user.

---

# 🛡️ Hallucination Prevention

Project Atlas uses Retrieval-Augmented Generation (RAG) guardrails to minimise hallucinations.

The AI:

- Answers only from uploaded company documents.
- Returns citations for every supported answer.
- Refuses to answer when sufficient evidence is unavailable.
- Prevents unsupported or fabricated responses.

---

# 🎯 Use Cases

- Enterprise Knowledge Management
- HR Policy Assistant
- Employee Onboarding
- IT Helpdesk Knowledge Base
- Internal Documentation Search
- Compliance Documentation
- Standard Operating Procedures
- Corporate Training
- Research Knowledge Repository

---

# 📸 Screenshots

Add screenshots here:

- Login Page
- Dashboard
- Company Brain
- Upload Documents
- AI Chat
- Source Citations
- Confidence Indicator

---

# 🚀 Getting Started

## Clone the Repository

```bash
git clone https://github.com/your-username/project-atlas.git

cd project-atlas
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Runs on:

```
http://localhost:3000
```

---

## Backend Setup

```bash
cd Backend

python -m venv venv

venv\Scripts\activate
```

Install dependencies

```bash
pip install -r requirements.txt
```

Run the backend

```bash
uvicorn app.main:app --reload
```

Runs on:

```
http://localhost:8000
```

---

# 🔑 Environment Variables

### Frontend

Create a `.env.local` file inside the `frontend` directory.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_BASE_URL=
```

### Backend

Create a `.env` file inside the `Backend` directory.

```env
GROQ_API_KEY=

FIREBASE_PROJECT_ID=
FIREBASE_CREDENTIALS_PATH=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET_NAME=
```

---

# 📈 Future Enhancements

- Multi-document summarisation
- Voice-based AI assistant
- OCR support for scanned PDFs
- Microsoft Teams integration
- Slack integration
- Role-based access control (RBAC)
- Analytics dashboard
- AI-generated document summaries
- Workflow automation
- Agentic AI capabilities

---

# 👨‍💻 Contributors

- **Thrishanth Reddy** – Project Developer

---

# 📄 Licence

This project is intended for educational, research, and demonstration purposes.

---

# ⭐ Acknowledgements

This project uses the following technologies:

- Next.js
- FastAPI
- Firebase Authentication
- Cloud Firestore
- Supabase
- Groq
- Tailwind CSS
- React
- TypeScript

---

# 💡 Project Vision

**"Empowering organisations to transform static documents into an intelligent, secure, and conversational knowledge ecosystem."**
