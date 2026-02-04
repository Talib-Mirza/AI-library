# 📚 AI-Powered eLibrary Platform

> An open-source, full-stack AI-powered digital library that lets you upload, read, and chat with your documents using cutting-edge RAG (Retrieval-Augmented Generation) technology.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 19](https://img.shields.io/badge/react-19-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)

## ✨ Features

### 📖 Document Management
- Upload and manage **PDF, EPUB, and TXT** documents
- Modern, responsive **PDF viewer** powered by PDF.js
- Organize books with tags and metadata
- Cover image support with automatic extraction

### 🤖 AI-Powered Reading Assistant
- **RAG-based Q&A**: Ask questions about your documents and get contextual answers
- **Text Selection AI**: Highlight any text to get instant AI insights
- **Semantic Search**: Find information across all your documents using natural language
- Powered by **OpenAI GPT** and **FAISS** vector database

### 🎯 Smart Features
- **Text-to-Speech (TTS)**: Listen to your books with Google Cloud TTS
- **Speech-to-Text (STT)**: Voice-enabled queries
- **Conversation Mode**: Natural chat interface with your documents
- **Usage Analytics**: Track your reading and query patterns

### 🔐 Authentication & Billing
- Secure **JWT-based authentication**
- **Google OAuth** integration
- **Stripe** subscription management
- Password reset with email verification
- Role-based access control (User/Admin)

### 🎨 User Experience
- **Dark/Light mode** toggle
- Responsive design for all devices
- Real-time updates
- Admin dashboard for user management

## 🛠 Tech Stack

### Frontend
- **React 19** with **TypeScript**
- **Vite** for blazing-fast development
- **Tailwind CSS** for styling
- **React Router v7** for navigation
- **PDF.js** for document rendering
- **Axios** for API communication

### Backend
- **FastAPI** (Python 3.11+) - Modern, high-performance API framework
- **SQLAlchemy 2.x** with AsyncPG for async database operations
- **PostgreSQL** - Robust relational database
- **Redis** - Caching and session management
- **Alembic** - Database migrations
- **FAISS** - Fast vector similarity search
- **OpenAI API** - GPT models for AI capabilities
- **Stripe API** - Payment processing
- **Google Cloud APIs** - TTS/STT services

### DevOps
- **Docker** & **Docker Compose** for containerization
- **Nginx** ready for reverse proxy
- **Alembic** for schema migrations

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v18+ recommended) - [Download](https://nodejs.org/)
- **Python** (3.11+ required) - [Download](https://www.python.org/downloads/)
- **PostgreSQL** (v14+ recommended) - [Download](https://www.postgresql.org/download/)
- **Redis** (v7+ recommended) - [Download](https://redis.io/download/)
- **Git** - [Download](https://git-scm.com/downloads)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AI-library.git
cd AI-library
```
> Replace `YOUR_USERNAME` with your GitHub username if you forked the repo

2. **Set up environment variables**
```bash
cp .env.example .env
```
Edit `.env` and fill in your configuration values. See [Configuration Guide](#-configuration) for details.

3. **Set up the backend**
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Create uploads directory
mkdir -p uploads
```

4. **Set up the frontend**
```bash
cd ../frontend
npm install
```

5. **Run the application**

**Option A: Local Development (Recommended for development)**

Terminal 1 (Backend):
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

**Option B: Docker (Recommended for quick testing)**
```bash
docker-compose up --build
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## ⚙️ Configuration

### Required API Keys

You'll need to obtain API keys for the following services:

1. **OpenAI API** - For AI chat and embeddings
   - Sign up at https://platform.openai.com/
   - Get your API key from https://platform.openai.com/account/api-keys

2. **Google Cloud** (Optional, for TTS/STT)
   - Create a project at https://console.cloud.google.com/
   - Enable Text-to-Speech and Speech-to-Text APIs
   - Create a service account and download the JSON key file
   - Save as `gcp-key.json` (this file is gitignored)

3. **Stripe** (Optional, for payments)
   - Sign up at https://stripe.com/
   - Get your API keys from https://dashboard.stripe.com/apikeys
   - Set up webhook endpoints for subscription management

4. **Email SMTP** (Optional, for email verification)
   - Use Gmail, SendGrid, or any SMTP provider
   - Configure SMTP settings in `.env`

### Database Setup

The application uses PostgreSQL. You can either:

1. **Install PostgreSQL locally** and create a database:
```bash
createdb ai_library
```

2. **Use Docker** (already configured in docker-compose.yml):
```bash
docker-compose up db
```

3. **Use a cloud provider** like Railway, Neon, or Supabase

Update `DATABASE_URL` in your `.env` file accordingly.

## 📖 Documentation

- **[RAG System Guide](RAG_SYSTEM_GUIDE.md)** - Detailed guide on the RAG implementation
- **[PDF Worker Setup](frontend/PDF_WORKER_FIX.md)** - PDF.js configuration
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when running)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔒 Security

- **Never commit sensitive files** like `.env`, `gcp-key.json`, or any credentials
- All sensitive data should be in `.env` (which is gitignored)
- Use strong, randomly generated secrets for production
- Enable HTTPS in production
- Review the [Security Best Practices](#production-deployment) before deploying

## 🐳 Docker Deployment

The application is fully containerized and ready for deployment:

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🚀 Production Deployment

Before deploying to production:

1. **Environment Setup**
   - Set `APP_ENV=production`
   - Set `DEBUG=False`
   - Generate strong random secrets for `SECRET_KEY` and `JWT_SECRET_KEY`
   - Configure `CORS_ORIGINS` to only allow your frontend domain

2. **Database**
   - Use a managed PostgreSQL service (Railway, Neon, AWS RDS)
   - Enable SSL/TLS connections (`DB_SSL_VERIFY=True`)
   - Set up automated backups

3. **File Storage**
   - Consider using cloud storage (S3, Cloudflare R2) instead of local files
   - Set `STORAGE_BACKEND=r2` and configure R2 credentials

4. **Security**
   - Enable HTTPS (use Nginx with Let's Encrypt)
   - Set up rate limiting
   - Enable CSRF protection
   - Configure proper CORS policies

5. **Monitoring**
   - Set up error tracking with Sentry (`SENTRY_DSN`)
   - Monitor resource usage
   - Set up health check endpoints

## 📊 Database Migrations

The project uses Alembic for database migrations:

```bash
# Create a new migration
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [OpenAI](https://openai.com/) - AI capabilities
- [FAISS](https://github.com/facebookresearch/faiss) - Vector similarity search
- [PDF.js](https://mozilla.github.io/pdf.js/) - PDF rendering
- [React](https://reactjs.org/) - Frontend framework

## 💬 Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions

## 🗺 Roadmap

- [ ] Support for more document formats (DOCX, Markdown)
- [ ] Multi-language support
- [ ] Advanced book annotations and highlights
- [ ] Mobile app (React Native)
- [ ] Collaborative features (book sharing)
- [ ] Custom AI model fine-tuning
- [ ] Browser extension for web article saving

---

**Star ⭐ this repository if you find it helpful!** 