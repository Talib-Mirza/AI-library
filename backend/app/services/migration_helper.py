import os
import asyncio
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.book import Book
from app.services.file_manager import FileManager


class MigrationHelper:
    """Helper service to migrate existing books to new file structure."""
    
    def __init__(self):
        self.file_manager = FileManager()
    
    async def migrate_existing_books(self) -> None:
        """
        Migrate all existing books to the new file structure.
        This should be run once after the pdf_id field is added.
        """
        print("Starting migration of existing books to new file structure...")
        
        async with async_session_factory() as session:
            # Get all books that don't have pdf_id or have empty pdf_id
            result = await session.execute(
                select(Book).where(
                    (Book.pdf_id == None) | (Book.pdf_id == "")
                )
            )
            books = result.scalars().all()
            
            print(f"Found {len(books)} books to migrate")
            
            for book in books:
                try:
                    await self._migrate_single_book(book, session)
                except Exception as e:
                    print(f"Error migrating book {book.id}: {str(e)}")
                    continue
            
            await session.commit()
        
        print("Migration completed!")
    
    async def _migrate_single_book(self, book: Book, session: AsyncSession) -> None:
        """
        Migrate a single book to the new structure.
        
        Args:
            book: Book object to migrate
            session: Database session
        """
        print(f"Migrating book {book.id}: {book.title}")
        
        # Generate PDF ID if not exists
        if not book.pdf_id:
            book.pdf_id = self.file_manager.generate_pdf_id()
            print(f"Generated pdf_id: {book.pdf_id}")
        
        # Check if old file exists
        if not book.file_path or not os.path.exists(book.file_path):
            print(f"Warning: File not found for book {book.id} at {book.file_path}")
            return
        
        try:
            # Migrate file to new structure
            new_file_path = self.file_manager.migrate_existing_file(
                old_file_path=book.file_path,
                user_id=book.user_id,
                pdf_id=book.pdf_id
            )
            
            # Update the file path in database
            book.file_path = new_file_path
            print(f"Migrated file to: {new_file_path}")
            
        except Exception as e:
            print(f"Error migrating file for book {book.id}: {str(e)}")
            raise
    
    async def cleanup_old_files(self) -> None:
        """
        Clean up old files that are not in the organized structure.
        WARNING: This will delete files, use with caution!
        """
        print("Starting cleanup of old files...")
        
        uploads_dir = self.file_manager.uploads_dir
        
        # Get all files directly in uploads directory (old structure)
        if not uploads_dir.exists():
            print("Uploads directory does not exist")
            return
        
        old_files = []
        for item in uploads_dir.iterdir():
            if item.is_file():
                old_files.append(item)
        
        print(f"Found {len(old_files)} old files to clean up")
        
        for old_file in old_files:
            try:
                print(f"Deleting old file: {old_file}")
                old_file.unlink()
            except Exception as e:
                print(f"Error deleting {old_file}: {str(e)}")
        
        print("Cleanup completed!")
    
    async def verify_migration(self) -> None:
        """
        Verify that all books have been properly migrated.
        """
        print("Verifying migration...")
        
        async with async_session_factory() as session:
            # Check for books without pdf_id
            result = await session.execute(
                select(Book).where(
                    (Book.pdf_id == None) | (Book.pdf_id == "")
                )
            )
            books_without_pdf_id = result.scalars().all()
            
            if books_without_pdf_id:
                print(f"WARNING: {len(books_without_pdf_id)} books still don't have pdf_id:")
                for book in books_without_pdf_id:
                    print(f"  Book {book.id}: {book.title}")
            else:
                print("✓ All books have pdf_id")
            
            # Check file existence
            result = await session.execute(select(Book))
            all_books = result.scalars().all()
            
            missing_files = []
            for book in all_books:
                if not os.path.exists(book.file_path):
                    missing_files.append(book)
            
            if missing_files:
                print(f"WARNING: {len(missing_files)} books have missing files:")
                for book in missing_files:
                    print(f"  Book {book.id}: {book.title} -> {book.file_path}")
            else:
                print("✓ All book files exist")
        
        print("Verification completed!")


async def run_migration():
    """Run the migration process."""
    migration_helper = MigrationHelper()
    
    print("=== STARTING BOOK MIGRATION ===")
    await migration_helper.migrate_existing_books()
    
    print("\n=== VERIFYING MIGRATION ===")
    await migration_helper.verify_migration()
    
    print("\n=== MIGRATION COMPLETE ===")
    print("You can now run cleanup_old_files() if you want to remove old files")


if __name__ == "__main__":
    asyncio.run(run_migration()) 