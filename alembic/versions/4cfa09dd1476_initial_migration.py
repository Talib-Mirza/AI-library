"""initial_migration

Revision ID: 4cfa09dd1476
Revises: 
Create Date: 2025-06-04 13:34:45.310623

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4cfa09dd1476'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: create base tables."""
    # users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # books (without pdf_id; added later by migration df204afbb40b)
    op.create_table(
        'books',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('author', sa.String(length=255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_path', sa.String(length=255), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('cover_image_url', sa.String(length=255), nullable=True),
        sa.Column('is_processed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('text_content', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_books_user_id', 'books', ['user_id'], unique=False)

    # bookmarks
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('page', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_bookmarks_book_id', 'bookmarks', ['book_id'], unique=False)

    # highlights
    op.create_table(
        'highlights',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('page', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('position_data', sa.Text(), nullable=True),
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_highlights_book_id', 'highlights', ['book_id'], unique=False)

    # annotations
    op.create_table(
        'annotations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('page', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('position_data', sa.Text(), nullable=True),
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_annotations_book_id', 'annotations', ['book_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema: drop base tables."""
    op.drop_index('ix_annotations_book_id', table_name='annotations')
    op.drop_table('annotations')

    op.drop_index('ix_highlights_book_id', table_name='highlights')
    op.drop_table('highlights')

    op.drop_index('ix_bookmarks_book_id', table_name='bookmarks')
    op.drop_table('bookmarks')

    op.drop_index('ix_books_user_id', table_name='books')
    op.drop_table('books')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
