# from fastapi import APIRouter, Depends, HTTPException, Body, Query
# from typing import List, Dict, Any, Optional
# from pydantic import BaseModel
# import logging

# from app.auth.dependencies import get_current_user
# from app.models.user import User
# from app.services.vector_store import vector_store
# from app.core.config import settings
# from langchain_google_genai import ChatGoogleGenerativeAI
# from langchain.chains import ConversationalRetrievalChain
# from langchain.memory import ConversationBufferMemory

# # Create logger
# logger = logging.getLogger(__name__)

# router = APIRouter()

# # Define Pydantic models for request and response
# class ChatMessage(BaseModel):
#     role: str  # 'user' or 'assistant'
#     content: str

# class ChatRequest(BaseModel):
#     message: str
#     book_id: Optional[int] = None
#     context: Optional[str] = None
#     history: Optional[List[ChatMessage]] = []

# class ChatResponse(BaseModel):
#     response: str
#     history: List[ChatMessage]

# # Store active chat sessions in memory (in production, use Redis or another persistent store)
# chat_sessions = {}

# @router.post("", response_model=ChatResponse)
# async def chat_with_book(
#     request: ChatRequest = Body(...),
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Chat with an AI about a book using context from vector search.
    
#     This endpoint accepts a user message and optional context
#     and returns an AI-generated response.
#     """
#     try:
#         user_id = str(current_user.id)
#         session_id = f"{user_id}_{request.book_id}" if request.book_id else user_id
        
#         # Log the incoming request
#         logger.info(f"Chat request from user {user_id}, book_id: {request.book_id}")
#         logger.debug(f"Chat message: {request.message[:100]}...")
        
#         # Get or create chat session
#         if session_id not in chat_sessions:
#             # Initialize new session
#             logger.info(f"Creating new chat session for {session_id}")
#             chat_sessions[session_id] = {
#                 "memory": ConversationBufferMemory(
#                     memory_key="chat_history",
#                     return_messages=True
#                 ),
#                 "history": request.history or []
#             }
        
#         # Get session
#         session = chat_sessions[session_id]
        
#         # Prepare context for the LLM
#         context = request.context or ""
        
#         # If there's no explicit context provided, search the vector store
#         if not context and request.book_id:
#             logger.info(f"Searching vector database for context related to: {request.message[:50]}...")
#             try:
#                 search_results = vector_store.search(
#                     query=request.message,
#                     user_id=user_id,
#                     book_id=request.book_id,
#                     limit=3
#                 )
                
#                 # Format results as context
#                 if search_results:
#                     context = "\n\n".join([
#                         f"[Page {result.get('page', 0)}]: {result.get('content', '')}"
#                         for result in search_results
#                     ])
#                     logger.info(f"Found {len(search_results)} relevant passages for context")
#                     logger.debug(f"Context: {context[:200]}...")
#             except Exception as e:
#                 logger.error(f"Error searching vector store: {str(e)}")
#                 # Continue without context if search fails
        
#         # Initialize the LLM
#         try:
#             logger.info("Creating Gemini model with Google API key")
#             # Create LLM
#             llm = ChatGoogleGenerativeAI(
#                 model="gemini-pro",
#                 google_api_key=settings.GOOGLE_API_KEY,
#                 temperature=0.7,
#                 max_output_tokens=1024,
#                 top_p=0.95,
#                 top_k=40,
#                 verbose=True
#             )
            
#             # Add user message to history
#             user_message = ChatMessage(role="user", content=request.message)
#             session["history"].append(user_message)
            
#             # Build prompt with context
#             prompt = request.message
#             if context:
#                 prompt = f"{prompt}\n\nContext from the book:\n{context}"
            
#             logger.info(f"Sending message to LLM (length: {len(prompt)})")
            
#             # Get response from LLM
#             response = llm.predict(prompt)
            
#             # Clean up response if needed
#             response = response.strip()
            
#             # Add assistant response to history
#             assistant_message = ChatMessage(role="assistant", content=response)
#             session["history"].append(assistant_message)
            
#             # Update session history (keep last 20 messages to prevent context overflow)
#             if len(session["history"]) > 20:
#                 session["history"] = session["history"][-20:]
            
#             logger.info(f"Received response from LLM (length: {len(response)})")
#             logger.debug(f"Response: {response[:100]}...")
            
#             # Return response
#             return ChatResponse(
#                 response=response,
#                 history=session["history"]
#             )
            
#         except Exception as e:
#             logger.error(f"Error with LLM processing: {str(e)}")
#             raise HTTPException(
#                 status_code=500,
#                 detail=f"AI processing error: {str(e)}"
#             )
            
#     except Exception as e:
#         logger.error(f"General chat endpoint error: {str(e)}")
#         raise HTTPException(
#             status_code=500,
#             detail=f"Chat error: {str(e)}"
#         )

# @router.delete("/sessions/{book_id}")
# async def reset_chat_session(
#     book_id: int,
#     current_user: User = Depends(get_current_user)
# ):
#     """
#     Reset a chat session for a specific book.
#     """
#     user_id = str(current_user.id)
#     session_id = f"{user_id}_{book_id}"
    
#     if session_id in chat_sessions:
#         del chat_sessions[session_id]
#         return {"message": "Chat session reset successfully"}
    
#     return {"message": "No active chat session found"} 