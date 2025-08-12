# AI-Powered eLibrary SaaS Platform

A comprehensive SaaS AI-powered eLibrary web application that enables users to upload, read, search, and chat with their book files (PDF, EPUB, TXT). The app is modular, robust, scalable, and secure.

## Core Features

- **Document Management**: Upload, view, and manage PDF, EPUB, and TXT documents
- **RAG Q&A**: Retrieval-augmented chat over your books using FAISS (local) + OpenAI
- **Text Selection Assistant**: Select text in documents to get AI insights
- **User Authentication**: Secure JWT-based login and registration
- **Subscription Management**: Integrated with Stripe for subscription billing
- **Admin Dashboard**: Manage users, view usage, and moderate content
- **Dark/Light Mode**: Toggle between dark and light themes
- **Modern PDF Viewer**: Built with PDF.js for seamless document viewing

## Tech Stack

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS for styling
- React Router v7 for routing
- PDF.js for document viewing
- Axios for HTTP requests

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy 2.x ORM with AsyncPG
- PostgreSQL database
- JWT authentication
- OpenAI for AI chat; FAISS for local vector search
- Alembic for database migrations
- Stripe for billing

## Prerequisites

- Node.js (v18+ recommended)
- Python (3.11+ required)
- PostgreSQL (v14+ recommended)
- Redis (v7+ recommended)
- Git

## Setup

### 1) Clone
```bash
git clone <repository-url>
cd AI-library
```

### 2) Environment
Copy `.env.example` to `.env` in the project root and fill in values. The example is aligned with current app configuration (DB, Redis, OpenAI/Google, Stripe, SMTP, initial admin).

### 3) Backend
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
# source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
mkdir -p uploads
```

### 4) Frontend
```bash
cd ../frontend
npm install
# optional:
echo "VITE_API_URL=http://localhost:8000/api" > .env.local
```

## Running

### Local (two terminals)
- Terminal 1 (backend):
```bash
cd backend
venv\Scripts\activate  # or source venv/bin/activate
uvicorn app.main:app --reload
```
- Terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

### Docker
```bash
docker-compose up --build
```
Notes:
- Compose loads environment from `.env` at the project root (`env_file`), so set `DATABASE_URL`, `REDIS_URL`, and other needed vars there.
- The backend runs without `--reload` in compose by default; use local dev for hot reload.

## Migrations
Common Alembic commands:
```bash
alembic revision --autogenerate -m "change"
alembic upgrade head
alembic history
```

## Production Notes
- Set `APP_ENV=production` and `DEBUG=False` in `.env`
- Configure strict CORS origins
- Use strong secret keys and production DB/Redis URLs
- Serve behind HTTPS (e.g., reverse proxy)
- Consider externalizing `uploads/` to persistent storage

## License
MIT 