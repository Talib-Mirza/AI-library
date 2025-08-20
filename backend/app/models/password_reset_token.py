from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship, backref

from app.db.session import Base

class PasswordResetToken(Base):
	__tablename__ = "password_reset_tokens"

	id = Column(Integer, primary_key=True, index=True)
	user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
	token_hash = Column(String(128), nullable=False, unique=True, index=True)
	expires_at = Column(DateTime, nullable=False)
	used = Column(Boolean, default=False, nullable=False)
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

	user = relationship(
		"User",
		backref=backref("password_reset_tokens", passive_deletes=True, cascade="all, delete-orphan")
	) 