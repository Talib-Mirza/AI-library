"""merge heads (usage+profiles+reset)

Revision ID: 368e2d63924f
Revises: add_password_reset_tokens, add_profile_fields_to_users, create_user_usage_periods
Create Date: 2025-08-08 18:57:18.656626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '368e2d63924f'
down_revision: Union[str, None] = ('add_password_reset_tokens', 'add_profile_fields_to_users', 'add_ai_query_counter')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
