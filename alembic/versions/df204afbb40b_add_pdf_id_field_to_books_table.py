"""Add pdf_id field to books table

Revision ID: df204afbb40b
Revises: 4cfa09dd1476
Create Date: 2025-06-13 15:20:52.289545

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df204afbb40b'
down_revision: Union[str, None] = '4cfa09dd1476'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add pdf_id column to books table
    op.add_column('books', sa.Column('pdf_id', sa.String(36), nullable=True))
    
    # Populate pdf_id for existing books with UUID values
    from uuid import uuid4
    connection = op.get_bind()
    
    # Get all existing books
    result = connection.execute(sa.text("SELECT id FROM books"))
    for row in result:
        book_id = row[0]
        pdf_id = str(uuid4())
        connection.execute(
            sa.text("UPDATE books SET pdf_id = :pdf_id WHERE id = :book_id"),
            {"pdf_id": pdf_id, "book_id": book_id}
        )
    
    # Now make the column non-nullable and add constraints
    op.alter_column('books', 'pdf_id', nullable=False)
    op.create_unique_constraint('uq_books_pdf_id', 'books', ['pdf_id'])
    op.create_index('ix_books_pdf_id', 'books', ['pdf_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove constraints and index
    op.drop_index('ix_books_pdf_id', 'books')
    op.drop_constraint('uq_books_pdf_id', 'books', type_='unique')
    
    # Remove the column
    op.drop_column('books', 'pdf_id')
