import asyncio
import logging
from app.services.faiss_rag_service import faiss_rag_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_complete_book_workflow():
    """Test the complete book embedding and query workflow"""
    print("🧪 Testing Complete Book RAG Workflow")
    print("=" * 60)
    
    # Initialize service
    if not faiss_rag_service.initialize():
        print("❌ Failed to initialize FAISS RAG service")
        return False
    print("✅ FAISS RAG service initialized")
    
    # Simulate book content (like what would come from a PDF)
    book_content = """
    Chapter 1: Introduction to Artificial Intelligence
    
    Artificial Intelligence (AI) is a branch of computer science that aims to create 
    machines capable of intelligent behavior. The field encompasses various subfields 
    including machine learning, natural language processing, computer vision, and robotics.
    
    The history of AI dates back to the 1950s when Alan Turing proposed the famous 
    Turing Test as a measure of machine intelligence. Since then, the field has evolved 
    dramatically with significant breakthroughs in deep learning and neural networks.
    
    Chapter 2: Machine Learning Fundamentals
    
    Machine learning is a subset of AI that focuses on algorithms that can learn from 
    and make predictions or decisions based on data. There are three main types of 
    machine learning: supervised learning, unsupervised learning, and reinforcement learning.
    
    Supervised learning uses labeled training data to learn a mapping from inputs to outputs.
    Common supervised learning tasks include classification and regression. Examples include
    email spam detection, image recognition, and price prediction.
    
    Chapter 3: Neural Networks and Deep Learning
    
    Neural networks are computing systems inspired by biological neural networks. 
    They consist of interconnected nodes (neurons) that process information using 
    connectionist approaches to computation.
    
    Deep learning uses neural networks with multiple layers (hence "deep") to model 
    and understand complex patterns in data. This approach has revolutionized fields 
    like computer vision, natural language processing, and speech recognition.
    """
    
    # Test data
    book_id = 999
    document_id = f"user_1_book_{book_id}"
    metadata = {
        "book_id": book_id,
        "title": "Introduction to AI Engineering",
        "author": "Test Author",
        "created_at": "2025-06-11T01:00:00",
        "file_type": "pdf",
        "user_id": 1
    }
    
    print(f"\n📚 Testing book embedding for '{metadata['title']}'...")
    
    # Step 1: Embed the book
    success = faiss_rag_service.embed_document(book_content, document_id, metadata)
    if not success:
        print("❌ Book embedding failed")
        return False
    print("✅ Book embedded successfully")
    
    # Step 2: Get stats
    print(f"\n📊 Getting embedding stats...")
    stats = faiss_rag_service.get_document_stats(document_id)
    if "error" in stats:
        print(f"❌ Stats error: {stats['error']}")
        return False
    
    print(f"✅ Book stats: {stats['chunk_count']} chunks embedded")
    print(f"   Metadata: {stats['metadata'].get('title', 'N/A')}")
    
    # Step 3: Test various types of questions
    questions = [
        "What is artificial intelligence?",
        "What are the three types of machine learning?",
        "Who proposed the Turing Test?",
        "What is deep learning?",
        "What are some examples of supervised learning tasks?"
    ]
    
    print(f"\n❓ Testing question answering...")
    for i, question in enumerate(questions, 1):
        print(f"\n{i}. Question: {question}")
        
        result = faiss_rag_service.ask_question(question, document_id)
        
        if "error" in result:
            print(f"   ❌ Error: {result['error']}")
            continue
        
        answer = result["answer"]
        sources_count = len(result["sources"])
        
        print(f"   ✅ Answer: {answer[:100]}...")
        print(f"   📄 Sources: {sources_count} relevant chunks found")
        
        # Show source preview
        if result["sources"]:
            source = result["sources"][0]
            print(f"   📖 Top source: {source['content'][:80]}...")
    
    # Step 4: Test conversation history
    print(f"\n💬 Testing conversation with history...")
    
    conversation = [
        {"role": "user", "content": "What is machine learning?"},
        {"role": "assistant", "content": "Machine learning is a subset of AI that focuses on algorithms that can learn from and make predictions based on data."}
    ]
    
    follow_up = "What are its main types?"
    result = faiss_rag_service.ask_question(follow_up, document_id, conversation)
    
    if "error" not in result:
        print(f"   ✅ Follow-up answer: {result['answer'][:100]}...")
    else:
        print(f"   ❌ Follow-up error: {result['error']}")
    
    # Step 5: Test cleanup
    print(f"\n🧹 Testing cleanup...")
    cleanup_success = faiss_rag_service.delete_document_embeddings(document_id)
    
    if cleanup_success:
        print("✅ Cleanup successful")
    else:
        print("❌ Cleanup failed")
    
    print(f"\n🎉 Complete workflow test completed successfully!")
    return True

if __name__ == "__main__":
    asyncio.run(test_complete_book_workflow()) 