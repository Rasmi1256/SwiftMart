# ai-ml/chatbot-service/src/main.py
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from .config.config import config
from .models.chatbot_model import chatbot_model

app = FastAPI(
    title="SwiftMart Chatbot Service",
    description="AI-powered chatbot for customer support.",
    version="1.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust in production to frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request and response
class ChatMessage(BaseModel):
    user_message: str
    userId: Optional[str] = None # User ID for personalized queries (optional for initial general queries)
    authToken: Optional[str] = None # User's JWT token for secure lookups (e.g., order history)

class ChatResponse(BaseModel):
    response: str
    orderId: Optional[str] = None
    orderStatus: Optional[str] = None

@app.get("/")
async def root():
    return {"message": "SwiftMart Chatbot Service is running!"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_bot(message: ChatMessage):
    """
    Endpoint for user interaction with the chatbot.
    """
    try:
        response_data = await chatbot_model.get_response(
            user_message=message.user_message,
            user_id=message.userId,
            auth_token=message.authToken
        )
        return response_data
    except Exception as e:
        print(f"Error in chatbot endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal server error while processing chat message.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)