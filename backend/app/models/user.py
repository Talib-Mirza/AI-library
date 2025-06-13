from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base

class User(Base):
    """User model for database representation."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    # Stripe subscription information
    stripe_customer_id = Column(String(255), nullable=True)
    subscription_status = Column(String(50), nullable=True)  # active, trialing, past_due, canceled, etc.
    subscription_tier = Column(String(50), nullable=True)  # basic, premium, etc.
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    books = relationship("Book", back_populates="owner", cascade="all, delete-orphan")
    
    @property
    def has_active_subscription(self) -> bool:
        """Check if user has an active subscription."""
        return self.subscription_status in ["active", "trialing"] 