# AI-Powered eLibrary SaaS Platform

A comprehensive SaaS AI-powered eLibrary web application that enables users to upload, read, search, and chat with their book files (PDF, EPUB, TXT). The app is modular, robust, scalable, and secure.

## Core Features

- **Document Management**: Upload, view, and manage PDF, EPUB, and TXT documents
- **AI-powered Search**: Semantic search across your entire library
- **AI Chat**: Have conversations with your documents using AI
- **Text Selection Assistant**: Select text in documents to get AI insights
- **Annotations**: Add bookmarks, highlights, and notes to your documents
- **User Authentication**: Secure login and registration
- **Subscription Management**: Integrated with Stripe for subscription billing
- **Admin Dashboard**: Manage users, view usage, and moderate content
- **Dark/Light Mode**: Toggle between dark and light themes

## Tech Stack

### Frontend
- React + TypeScript
- Tailwind CSS + DaisyUI for styling
- React Router v6 for routing
- React Query for data fetching
- React Hook Form + Zod for form validation
- Stripe Checkout + Customer Portal UI

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL database
- JWT authentication
- Google Gemini API for AI chat assistant
- LangChain for AI integration
- Weaviate/ChromaDB for vector storage
- Celery + Redis for background tasks
- Stripe for billing

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.11+)
- PostgreSQL
- Redis
- Google Gemini API Key (for AI chat features)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

4. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

5. Copy `.env.example` to `.env` and fill in the required values:
   ```
   cp .env.example .env
   ```

6. **Important**: Add your Google Gemini API key to the `.env` file:
   ```
   GOOGLE_API_KEY="your-gemini-api-key"
   ```
   You can get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

7. Initialize the database:
   ```
   alembic upgrade head
   ```

8. Start the backend server:
   ```
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Features Guide

### Text Selection AI Assistant

When viewing a book in the reader:
1. Select/highlight text in the document
2. A floating AI chat widget will appear
3. Ask questions about the highlighted text
4. The AI will respond with contextual insights

If the text selection feature doesn't work automatically:
- Use the "Test AI Chat" button to simulate text selection
- Check browser console for any error messages
- Ensure your Google Gemini API key is correctly set in the backend `.env` file

## Development

- Backend API documentation: http://localhost:8000/api/docs
- Frontend development server: http://localhost:5173

## License

This project is licensed under the MIT License - see the LICENSE file for details. 