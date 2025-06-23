"""Add cover image support to books

Revision ID: add_cover_image
Revises: df204afbb40b
Create Date: 2025-06-14 19:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'add_cover_image'
down_revision: Union[str, None] = 'df204afbb40b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add cover_image_url column to books table."""
    op.add_column('books', sa.Column('cover_image_url', sa.String(255), nullable=True))


def downgrade() -> None:
    """Remove cover_image_url column from books table."""
    op.drop_column('books', 'cover_image_url') 