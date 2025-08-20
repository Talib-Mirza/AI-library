"""
add tags column to books

Revision ID: add_book_tags
Revises: 4ceaf7529655_post_reset_alignment
Create Date: 2025-08-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_book_tags'
down_revision = 'create_user_usage_periods'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('books', sa.Column('tags', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('books', 'tags') 