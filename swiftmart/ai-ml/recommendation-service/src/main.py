# ai-ml/recommendation-service/src/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

from .config.config import config
from .models.recommendation_model import recommendation_model

app = FastAPI(
    title="SwiftMart Recommendation Service",
    description="AI/ML powered product recommendations for SwiftMart.",
    version="1.0.0",
)

# CORS Middleware (Crucial for local development with separate frontends)
# In production, specify exact origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust this in production to specific frontend origins (e.g., "http://localhost:3000")
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for request body (if needed, e.g., for specific user features)
class RecommendationRequest(BaseModel):
    user_id: str
    num_recommendations: int = 5

# Pydantic model for response data
class RecommendedProduct(BaseModel):
    _id: str
    name: str
    price: Dict[str, Any] # Price object as per Product Catalog Service
    unit: str
    imageUrl: str
    category: str

@app.on_event("startup")
async def startup_event():
    """Load products on application startup."""
    print("Recommendation Service starting up...", flush=True)
    await recommendation_model._load_products() # Pre-load products

@app.get("/")
async def root():
    return {"message": "SwiftMart Recommendation Service is running!"}

@app.post("/recommendations/personalized", response_model=List[RecommendedProduct])
async def get_personalized_recommendations(request: RecommendationRequest):
    """
    Endpoint to get personalized product recommendations for a user.
    """
    try:
        recommendations = await recommendation_model.get_personalized_recommendations(
            user_id=request.user_id,
            num_recommendations=request.num_recommendations
        )
        if not recommendations:
            return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "No recommendations found."})
        return recommendations
    except Exception as e:
        print(f"Error in personalized recommendations endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal server error while fetching recommendations.")

# You can add more endpoints here, e.g., /recommendations/trending, /recommendations/bestsellers
@app.get("/recommendations/popular", response_model=List[RecommendedProduct])
async def get_popular_recommendations(num_recommendations: int = 5):
    """
    Endpoint to get popular products (non-personalized).
    For MVP, this is same as personalized due to random logic.
    """
    try:
        recommendations = await recommendation_model.get_personalized_recommendations(
            user_id="anonymous", # Dummy user_id for non-personalized
            num_recommendations=num_recommendations
        )
        if not recommendations:
            return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"message": "No popular products found."})
        return recommendations
    except Exception as e:
        print(f"Error in popular recommendations endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal server error while fetching popular recommendations.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)