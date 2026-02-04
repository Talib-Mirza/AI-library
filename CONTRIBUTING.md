# Contributing to AI-Library

First off, thank you for considering contributing to AI-Library! It's people like you that make this project such a great tool for everyone.

## 🌟 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
- **Description**: Clear and concise description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce the behavior
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable
- **Environment**:
  - OS: [e.g., macOS 12.0, Windows 11, Ubuntu 22.04]
  - Python Version: [e.g., 3.11.0]
  - Node Version: [e.g., 18.0.0]
  - Browser: [e.g., Chrome 120, Firefox 115]

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title** describing the enhancement
- **Detailed description** of the proposed functionality
- **Use cases** explaining why this would be useful
- **Possible implementation** if you have ideas

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding standards** described below
3. **Write clear commit messages**
4. **Update documentation** as needed
5. **Test your changes** thoroughly
6. **Submit a pull request** with a clear description

## 🔧 Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Git

### Initial Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/AI-library.git
cd AI-library
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements.dev.txt  # Development dependencies
```

3. **Set up the frontend**
```bash
cd ../frontend
npm install
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your local configuration
```

5. **Set up the database**
```bash
# Start PostgreSQL and Redis (or use Docker)
docker-compose up db redis -d

# Run migrations
cd backend
alembic upgrade head
```

6. **Run the application**
```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## 📝 Coding Standards

### Python (Backend)

- **Style Guide**: Follow [PEP 8](https://pep8.org/)
- **Type Hints**: Use type hints for function parameters and return values
- **Docstrings**: Use Google-style docstrings for functions and classes
- **Formatting**: Use `black` for code formatting
- **Linting**: Use `ruff` or `flake8`

```python
# Good example
async def get_book_by_id(
    book_id: int,
    db: AsyncSession,
    user: User
) -> Optional[Book]:
    """
    Retrieve a book by its ID.
    
    Args:
        book_id: The unique identifier of the book
        db: Database session
        user: Current authenticated user
        
    Returns:
        Book object if found, None otherwise
        
    Raises:
        PermissionError: If user doesn't have access to the book
    """
    # Implementation here
    pass
```

**Run linters before committing:**
```bash
cd backend
black .
ruff check .
mypy app/
```

### TypeScript/React (Frontend)

- **Style Guide**: Follow [Airbnb React Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- **Type Safety**: Always use TypeScript, avoid `any` types
- **Components**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Props**: Define interfaces for component props

```typescript
// Good example
interface BookCardProps {
  book: Book;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  onDelete, 
  isLoading = false 
}) => {
  // Implementation here
  return <div>...</div>;
};
```

**Run linters before committing:**
```bash
cd frontend
npm run lint
npm run type-check
```

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(rag): add support for EPUB documents

Implement EPUB parsing and indexing in the RAG system.
Supports table of contents extraction and chapter-based chunking.

Closes #123
```

```
fix(auth): resolve JWT token expiration issue

Token refresh was failing due to incorrect expiry validation.
Now properly handles timezone-aware datetime comparisons.

Fixes #456
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest tests/
pytest tests/ -v  # Verbose output
pytest tests/ --cov=app  # With coverage
```

**Writing Tests:**
```python
import pytest
from app.services.book import BookService

@pytest.mark.asyncio
async def test_create_book(db_session, test_user):
    """Test book creation with valid data."""
    book_data = {
        "title": "Test Book",
        "author": "Test Author"
    }
    book = await BookService.create_book(db_session, test_user, book_data)
    assert book.title == "Test Book"
    assert book.user_id == test_user.id
```

### Frontend Tests

```bash
cd frontend
npm test
npm test -- --coverage  # With coverage
```

**Writing Tests:**
```typescript
import { render, screen } from '@testing-library/react';
import { BookCard } from './BookCard';

describe('BookCard', () => {
  it('renders book title and author', () => {
    const book = {
      id: 1,
      title: 'Test Book',
      author: 'Test Author'
    };
    
    render(<BookCard book={book} onDelete={() => {}} />);
    
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });
});
```

## 📦 Database Migrations

When modifying database models:

1. **Create migration:**
```bash
cd backend
alembic revision --autogenerate -m "description of changes"
```

2. **Review the migration** in `alembic/versions/`
3. **Test the migration:**
```bash
alembic upgrade head  # Apply
alembic downgrade -1  # Rollback
alembic upgrade head  # Apply again
```

4. **Commit both** the model changes and migration file

## 🔍 Code Review Process

All submissions require review. We use GitHub pull requests for this purpose:

1. **Self-review** your code before requesting review
2. **Respond to feedback** promptly and courteously
3. **Make requested changes** in new commits (don't force-push)
4. **Squash commits** before merge if requested

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No sensitive data or credentials committed
- [ ] No unnecessary dependencies added
- [ ] Performance considerations addressed
- [ ] Security implications considered

## 🚫 What NOT to Commit

**Never commit:**
- `.env` files or any environment configuration with secrets
- API keys, passwords, or credentials
- `gcp-key.json` or similar service account files
- Large binary files (>10MB)
- `node_modules/` or `venv/` directories
- Database files or dumps with real data
- Personal development artifacts

**Use `.gitignore`** - it's already configured, but double-check!

## 🐛 Debugging Tips

### Backend Debugging

1. **Enable debug mode** in `.env`:
```
DEBUG=True
APP_ENV=development
```

2. **Use FastAPI interactive docs**: http://localhost:8000/docs

3. **Add logging**:
```python
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Processing book: {book_id}")
```

### Frontend Debugging

1. **Use React DevTools** browser extension

2. **Console logging**:
```typescript
console.log('Current state:', state);
```

3. **Network tab** in browser DevTools for API calls

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 💬 Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussions
- **Pull Request Comments**: Code-specific discussions

## 🎯 Good First Issues

Look for issues labeled `good first issue` - these are great starting points for new contributors!

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI-Library! 🎉
