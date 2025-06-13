#!/usr/bin/env python3
"""
Test script for the new FAISS RAG system
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.faiss_rag_service import faiss_rag_service

async def test_rag_system():
    """Test the RAG system with sample text"""
    
    print("🧪 Testing FAISS RAG System")
    print("=" * 50)
    
    # Test document
    sample_text = """
    The Great Gatsby is a novel by F. Scott Fitzgerald. The story is set in the summer of 1922 
    and follows Nick Carraway, a young bond salesman who moves to West Egg, Long Island. 
    Nick becomes neighbors with the mysterious millionaire Jay Gatsby, who throws lavish 
    parties at his mansion in hopes of attracting his lost love, Daisy Buchanan.
    
    Daisy is married to Tom Buchanan, a wealthy but brutish man who lives across the bay 
    in the more fashionable East Egg. The novel explores themes of the American Dream, 
    social class, and the moral decay hidden beneath the glittering surface of the Jazz Age.
    
    The green light at the end of Daisy's dock becomes a symbol of Gatsby's yearning 
    and the broader theme of the elusive nature of the American Dream. Fitzgerald's 
    masterpiece captures the excess and disillusionment of the 1920s.
    """
    
    # Test 1: Initialize service
    print("1. Initializing FAISS RAG service...")
    if faiss_rag_service.initialize():
        print("✅ Service initialized successfully")
    else:
        print("❌ Failed to initialize service")
        return
    
    # Test 2: Embed document
    print("\n2. Embedding test document...")
    document_id = "test_great_gatsby"
    metadata = {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald", 
        "genre": "Fiction",
        "test": True
    }
    
    success = faiss_rag_service.embed_document(
        text=sample_text,
        document_id=document_id,
        metadata=metadata
    )
    
    if success:
        print("✅ Document embedded successfully")
    else:
        print("❌ Failed to embed document")
        return
    
    # Test 3: Get document stats
    print("\n3. Getting document statistics...")
    stats = faiss_rag_service.get_document_stats(document_id)
    if "error" not in stats:
        print(f"✅ Document stats: {stats['chunk_count']} chunks")
        print(f"   Metadata: {stats['metadata']}")
    else:
        print(f"❌ Failed to get stats: {stats['error']}")
    
    # Test 4: Ask questions
    print("\n4. Testing question answering...")
    
    test_questions = [
        "Who is the main character?",
        "What is the setting of the story?",
        "What does the green light symbolize?",
        "Who is Daisy Buchanan?",
        "What themes does the novel explore?"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n   Question {i}: {question}")
        
        result = faiss_rag_service.ask_question(
            question=question,
            document_id=document_id
        )
        
        if "error" not in result:
            print(f"   ✅ Answer: {result['answer']}")
            print(f"   📚 Sources: {len(result['sources'])} relevant chunks found")
        else:
            print(f"   ❌ Error: {result['error']}")
    
    # Test 5: Conversation history
    print("\n5. Testing conversation with history...")
    
    conversation_history = [
        {"role": "user", "content": "Who is the main character?"},
        {"role": "assistant", "content": "The main character is Nick Carraway, a young bond salesman who moves to West Egg, Long Island."}
    ]
    
    followup_question = "Where does he live?"
    print(f"   Follow-up question: {followup_question}")
    
    result = faiss_rag_service.ask_question(
        question=followup_question,
        document_id=document_id,
        conversation_history=conversation_history
    )
    
    if "error" not in result:
        print(f"   ✅ Answer: {result['answer']}")
    else:
        print(f"   ❌ Error: {result['error']}")
    
    # Test 6: List documents
    print("\n6. Listing embedded documents...")
    documents = faiss_rag_service.list_documents()
    print(f"   ✅ Found {len(documents)} embedded documents: {documents}")
    
    # Test 7: Clean up
    print("\n7. Cleaning up test document...")
    if faiss_rag_service.delete_document_embeddings(document_id):
        print("   ✅ Test document deleted successfully")
    else:
        print("   ❌ Failed to delete test document")
    
    print("\n" + "=" * 50)
    print("🎉 FAISS RAG System test completed!")

if __name__ == "__main__":
    asyncio.run(test_rag_system()) 