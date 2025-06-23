# AI-Powered eLibrary SaaS Platform

A comprehensive SaaS AI-powered eLibrary web application that enables users to upload, read, search, and chat with their book files (PDF, EPUB, TXT). The app is modular, robust, scalable, and secure.

## Core Features

- **Document Management**: Upload, view, and manage PDF, EPUB, and TXT documents
- **AI-powered Search**: Semantic search across your entire library using FAISS/ChromaDB
- **AI Chat**: Have conversations with your documents using OpenAI/Google Gemini
- **Text Selection Assistant**: Select text in documents to get AI insights
- **Annotations**: Add bookmarks, highlights, and notes to your documents
- **User Authentication**: Secure JWT-based login and registration
- **Subscription Management**: Integrated with Stripe for subscription billing
- **Admin Dashboard**: Manage users, view usage, and moderate content
- **Dark/Light Mode**: Toggle between dark and light themes
- **Modern PDF Viewer**: Built with PDF.js for seamless document viewing

## Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** + **DaisyUI** for styling
- **React Router v7** for routing
- **TanStack Query (React Query)** for data fetching
- **PDF.js** for document viewing
- **Framer Motion** + **GSAP** for animations
- **Axios** for HTTP requests

### Backend
- **FastAPI** (Python 3.11+)
- **SQLAlchemy 2.0** ORM with **AsyncPG**
- **PostgreSQL** database
- **JWT** authentication
- **Google Gemini API** + **OpenAI** for AI chat
- **LangChain** for AI integration
- **FAISS** + **ChromaDB** for vector storage
- **Celery** + **Redis** for background tasks
- **Stripe** for billing
- **Alembic** for database migrations

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js** (v18+ recommended)
- **Python** (3.11+ required)
- **PostgreSQL** (v14+ recommended)
- **Redis** (v7+ recommended)
- **Git**

## Step-by-Step Setup Guide

### 1. Clone the Repository

```bash
git clone <repository-url>
cd AI_library
```

### 2. Backend Setup

#### 2.1 Navigate to Backend Directory
```bash
cd backend
```

#### 2.2 Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

#### 2.3 Install Dependencies
```bash
pip install -r requirements.txt
```

#### 2.4 Create Environment File
```bash
# Copy the example environment file
cp ../.env.example ../.env
```

#### 2.5 Configure Environment Variables
Edit the `.env` file in the project root with your actual values:

```env
# App Configuration
APP_NAME="AI_Library"
APP_ENV="development"
DEBUG=True
SECRET_KEY="your-super-secret-key-min-32-chars"
JWT_SECRET_KEY="your-jwt-secret-key-min-32-chars"

# Database Configuration (Update with your PostgreSQL credentials)
DATABASE_URL="postgresql+asyncpg://username:password@localhost/ai_library"

# Redis Configuration
REDIS_URL="redis://localhost:6379/0"

# AI API Keys (Get these from respective providers)
OPENAI_API_KEY="your_openai_api_key_here"
GOOGLE_API_KEY="your_google_api_key_here"

# Stripe Configuration (for payment processing)
STRIPE_SECRET_KEY="your_stripe_secret_key_here"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret_here"
STRIPE_PRICE_ID="your_stripe_price_id_here"

# File Storage
UPLOAD_DIR="uploads"
VECTOR_DB_PATH="vector_db"
```

#### 2.6 Set Up PostgreSQL Database

1. **Install PostgreSQL** if not already installed
2. **Create the database**:
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database
   CREATE DATABASE ai_library;
   
   -- Create user (optional, or use existing user)
   CREATE USER ai_library_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE ai_library TO ai_library_user;
   ```

3. **Update your DATABASE_URL** in `.env` with the correct credentials

#### 2.7 Run Database Migrations
```bash
# Make sure you're in the backend directory and venv is activated
alembic upgrade head
```

#### 2.8 Create Required Directories
```bash
mkdir -p uploads
mkdir -p vector_db
```

### 3. Frontend Setup

#### 3.1 Navigate to Frontend Directory
```bash
cd ../frontend
```

#### 3.2 Install Dependencies
```bash
npm install
```

#### 3.3 Create Frontend Environment File (Optional)
```bash
# Create .env.local for frontend if needed
echo "VITE_API_URL=http://localhost:8000/api" > .env.local
```

### 4. API Keys Setup

#### 4.1 OpenAI API Key
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file as `OPENAI_API_KEY`

#### 4.2 Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GOOGLE_API_KEY`

#### 4.3 Stripe Keys (Optional, for payments)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Get your secret key and webhook secret
3. Add them to your `.env` file

### 5. Running the Application

#### 5.1 Start Redis
```bash
# Windows (if installed via installer)
redis-server

# macOS (with Homebrew)
brew services start redis

# Linux (with systemd)
sudo systemctl start redis
```

#### 5.2 Start Backend (Terminal 1)
```bash
cd backend
# Activate virtual environment if not already active
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

uvicorn app.main:app --reload
```
The backend will be available at: http://localhost:8000

#### 5.3 Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
The frontend will be available at: http://localhost:5173

#### 5.4 Start Celery Worker (Terminal 3) - Optional
```bash
cd backend
# Activate virtual environment if not already active
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

celery -A app.worker.celery worker --loglevel=info
```

### 6. Docker Setup (Alternative)

If you prefer using Docker:

#### 6.1 Prerequisites
- **Docker** and **Docker Compose** installed

#### 6.2 Run with Docker
```bash
# From project root
docker-compose up --build
```

This will start:
- Backend API (http://localhost:8000)
- Frontend (http://localhost:5173)
- PostgreSQL database
- Redis
- Celery worker

### 7. Database Management with Alembic

#### 7.1 Common Alembic Commands
```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# View migration history
alembic history

# Downgrade to previous migration
alembic downgrade -1
```

#### 7.2 Important Notes
- Always review auto-generated migrations before applying
- The `alembic.ini` file contains the database connection for migrations
- Migrations are stored in `alembic/versions/`

### 8. Project Structure

```
AI_library/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   │   ├── auth/           # Authentication
│   │   │   ├── core/           # Configuration
│   │   │   ├── db/             # Database setup
│   │   │   ├── models/         # SQLAlchemy models
│   │   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── services/       # Business logic
│   │   │   └── main.py         # FastAPI app
│   │   ├── requirements.txt    # Python dependencies
│   │   ├── alembic/           # Database migrations
│   │   └── uploads/           # File storage
│   ├── frontend/               # React frontend
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── pages/         # Page components
│   │   │   ├── services/      # API services
│   │   │   └── utils/         # Utilities
│   │   ├── package.json       # Node.js dependencies
│   │   └── public/            # Static files
│   ├── .env                   # Environment variables
│   ├── .gitignore            # Git ignore rules
│   └── docker-compose.yml    # Docker configuration
```

### 9. Important Files and Directories

#### Files to Keep Private (Already in .gitignore)
- `.env` - Contains sensitive API keys and passwords
- `backend/uploads/` - User uploaded files
- `backend/vector_db/` - AI embeddings and vector data
- `node_modules/` - Node.js dependencies
- `backend/venv/` - Python virtual environment

#### Files You May Need to Create
- `.env` (copy from `.env.example` and fill in real values)
- PostgreSQL database
- Required directories: `uploads/`, `vector_db/`

### 10. Testing the Setup

#### 10.1 Backend API Test
Visit http://localhost:8000/docs for the interactive API documentation

#### 10.2 Frontend Test
Visit http://localhost:5173 to access the application

#### 10.3 Database Test
```bash
# From backend directory
python -c "from app.db.session import engine; print('Database connection successful')"
```

### 11. Common Issues and Solutions

#### 11.1 Database Connection Issues
- Ensure PostgreSQL is running
- Verify database credentials in `.env`
- Check if the database exists

#### 11.2 Python Package Issues
- Ensure you're using Python 3.11+
- Make sure virtual environment is activated
- Try upgrading pip: `pip install --upgrade pip`

#### 11.3 Node.js Issues
- Ensure Node.js 18+ is installed
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

#### 11.4 PDF.js Worker Issues
- The project includes local PDF.js workers in `frontend/public/pdfjs/`
- If PDF viewing fails, check browser console for errors

### 12. Development

#### 12.1 API Documentation
- FastAPI docs: http://localhost:8000/docs
- Alternative docs: http://localhost:8000/redoc

#### 12.2 Development Features
- Hot reload enabled for both frontend and backend
- Debug mode enabled in development environment
- CORS configured for local development

### 13. Production Deployment Notes

When deploying to production:

1. **Environment Variables**:
   - Set `APP_ENV=production`
   - Set `DEBUG=False`
   - Use strong, unique secret keys
   - Use production database URLs

2. **Security**:
   - Enable HTTPS
   - Configure proper CORS origins
   - Use environment-specific API keys

3. **Database**:
   - Use managed PostgreSQL service
   - Set up regular backups
   - Configure connection pooling

4. **File Storage**:
   - Consider using cloud storage (AWS S3, etc.)
   - Set up proper file permissions

## License

This project is licensed under the MIT License - see the LICENSE file for details. 