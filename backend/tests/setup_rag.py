#!/usr/bin/env python3
"""
Setup script for the LangChain RAG system
"""

import subprocess
import sys
import os
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"📦 {description}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"Error: {e.stderr}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up LangChain RAG System")
    print("=" * 50)
    
    # Check if we're in the right directory
    backend_dir = Path(__file__).parent
    requirements_file = backend_dir / "requirements.txt"
    
    if not requirements_file.exists():
        print("❌ Error: requirements.txt not found. Make sure you're in the backend directory.")
        sys.exit(1)
    
    # Install dependencies
    print("\n1. Installing Python dependencies...")
    install_cmd = f"{sys.executable} -m pip install -r {requirements_file}"
    if not run_command(install_cmd, "Installing dependencies"):
        print("⚠️  Failed to install some dependencies. Please check the errors above.")
    
    # Check environment variables
    print("\n2. Checking environment variables...")
    env_file = backend_dir.parent / ".env"
    
    if env_file.exists():
        print("✅ .env file found")
        # Load and check for required variables
        with open(env_file, 'r') as f:
            env_content = f.read()
            
        required_vars = ['OPENAI_API_KEY', 'DATABASE_URL', 'SECRET_KEY', 'JWT_SECRET_KEY']
        missing_vars = []
        
        for var in required_vars:
            if var not in env_content or f"{var}=" not in env_content:
                missing_vars.append(var)
        
        if missing_vars:
            print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
            print("Please add them to your .env file")
        else:
            print("✅ All required environment variables found")
    else:
        print("⚠️  .env file not found. Please create one with the required variables:")
        print("   - OPENAI_API_KEY")
        print("   - DATABASE_URL")
        print("   - SECRET_KEY")
        print("   - JWT_SECRET_KEY")
    
    # Create necessary directories
    print("\n3. Creating necessary directories...")
    directories = [
        backend_dir / "chroma_db",
        backend_dir / "uploads",
        backend_dir / "vector_db"
    ]
    
    for directory in directories:
        directory.mkdir(exist_ok=True)
        print(f"✅ Created/verified directory: {directory.name}")
    
    # Test the system
    print("\n4. Testing the RAG system...")
    test_script = backend_dir / "test_rag_system.py"
    
    if test_script.exists():
        print("🧪 Running RAG system test...")
        test_cmd = f"{sys.executable} {test_script}"
        if run_command(test_cmd, "RAG system test"):
            print("🎉 RAG system is working correctly!")
        else:
            print("⚠️  RAG system test failed. Check the errors above.")
    else:
        print("⚠️  Test script not found, skipping test")
    
    print("\n" + "=" * 50)
    print("✅ Setup completed!")
    print("\nNext steps:")
    print("1. Start the backend server: uvicorn app.main:app --reload")
    print("2. The RAG endpoints will be available at:")
    print("   - POST /api/rag/embed - Embed documents")
    print("   - POST /api/rag/ask - Ask questions")
    print("   - POST /api/rag/books/{book_id}/embed - Embed books")
    print("   - POST /api/rag/books/{book_id}/ask - Ask about books")
    print("3. The frontend will automatically use the new RAG system")

if __name__ == "__main__":
    main() 