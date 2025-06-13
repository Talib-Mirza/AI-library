from sqlalchemy import Column, Text
from sqlalchemy.schema import Table
from sqlalchemy.ext.declarative import declarative_base
from alembic import op
import sqlalchemy as sa

def migrate_add_text_content():
    """
    Migration script to add text_content column to books table.
    This can be run manually from a script or alembic.
    """
    # Add column
    op.add_column('books', sa.Column('text_content', sa.Text(), nullable=True))
    
    # Execute raw SQL for database that doesn't support above operation
    # op.execute("ALTER TABLE books ADD COLUMN text_content TEXT;")
    
    print("Migration complete: Added text_content column to books table")
    
if __name__ == "__main__":
    # This allows running the migration directly
    try:
        migrate_add_text_content()
    except Exception as e:
        print(f"Migration failed: {e}") 