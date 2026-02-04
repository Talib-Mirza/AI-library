# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email to: **[your-email@example.com]**

Include the following information:
- Type of vulnerability
- Full paths of source file(s) related to the manifestation of the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

We'll acknowledge your email within 48 hours and send a more detailed response within 96 hours.

## Security Best Practices for Deployment

### Environment Variables

**Never commit these files:**
- `.env` - Contains all secrets
- `gcp-key.json` - Google Cloud credentials
- Any files ending in `-key.json`, `*.pem`, `*.key`

### Required Security Configurations

1. **Generate Strong Secrets**
```bash
# Generate random secrets for production
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Environment Settings**
```env
APP_ENV=production
DEBUG=False
DB_SSL_VERIFY=True
```

3. **CORS Configuration**
```env
# Only allow your frontend domain
CORS_ORIGINS=https://yourdomain.com
```

4. **Database Security**
- Use strong passwords
- Enable SSL/TLS connections
- Restrict network access
- Regular backups
- Keep PostgreSQL updated

5. **API Keys**
- Rotate keys regularly
- Use different keys for dev/staging/production
- Monitor API usage for anomalies

### Production Checklist

- [ ] All secrets moved to environment variables
- [ ] Strong random secrets generated (not defaults)
- [ ] DEBUG mode disabled
- [ ] CORS origins restricted to your domain
- [ ] Database SSL/TLS enabled
- [ ] HTTPS enabled (with valid certificates)
- [ ] Rate limiting configured
- [ ] Error tracking configured (Sentry)
- [ ] Database backups automated
- [ ] File uploads restricted (size, type, scanning)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using ORM)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] Dependency scanning enabled

### HTTPS Configuration

Always use HTTPS in production. Example Nginx config:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```python
# Example using slowapi (add to requirements.txt)
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(request: Request):
    # Login logic
    pass
```

### Input Validation

Always validate and sanitize user inputs:

```python
from pydantic import BaseModel, validator

class BookCreate(BaseModel):
    title: str
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Title cannot be empty')
        if len(v) > 500:
            raise ValueError('Title too long')
        return v.strip()
```

### File Upload Security

```python
ALLOWED_EXTENSIONS = {'pdf', 'epub', 'txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def validate_file(file):
    # Check file extension
    ext = file.filename.split('.')[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("File type not allowed")
    
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise ValueError("File too large")
    
    # Consider virus scanning for uploaded files
```

## Known Security Considerations

### API Keys
- OpenAI API keys should have usage limits set
- Stripe webhook secrets should be validated on all webhook endpoints
- Google Cloud service accounts should have minimal required permissions

### Database
- Uses parameterized queries via SQLAlchemy (protects against SQL injection)
- Password hashing using bcrypt or similar (check implementation)
- Session management with JWT tokens

### File Storage
- Uploaded files are stored with sanitized filenames
- Consider implementing virus scanning for production
- Use cloud storage (S3, R2) instead of local filesystem in production

## Security Updates

We regularly update dependencies to patch security vulnerabilities. To update:

```bash
# Backend
cd backend
pip install --upgrade -r requirements.txt

# Frontend
cd frontend
npm audit fix
npm update
```

## Dependency Scanning

Run security scans regularly:

```bash
# Python dependencies
pip install safety
safety check

# Node dependencies
npm audit

# Or use GitHub's Dependabot (enable in repository settings)
```

## Incident Response

If a security incident occurs:

1. **Immediate Actions**
   - Rotate all API keys and secrets
   - Review access logs
   - Disable compromised accounts
   - Take affected systems offline if necessary

2. **Investigation**
   - Identify the scope of the breach
   - Collect evidence
   - Document timeline

3. **Communication**
   - Notify affected users
   - Report to relevant authorities if required
   - Post public disclosure after remediation

4. **Remediation**
   - Fix the vulnerability
   - Deploy patches
   - Monitor for further issues

5. **Post-Incident**
   - Conduct post-mortem
   - Update security procedures
   - Improve monitoring

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security_warnings.html)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

---

**Remember: Security is a process, not a product. Stay vigilant!**
