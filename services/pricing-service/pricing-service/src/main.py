# ai-ml/pricing-service/src/main.py
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any

from .config.config import config
from .models.pricing_model import pricing_model

app = FastAPI(
    title="SwiftMart Dynamic Pricing Service",
    description="AI/ML powered dynamic pricing for products.",
    version="1.0.0",
)

# CORS Middleware (Crucial for local development with separate frontends)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust this in production to specific frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for request body
class DynamicPriceRequest(BaseModel):
    product_ids: List[str]

# Pydantic model for response data (per product price)
class DynamicPriceResponseItem(BaseModel):
    productId: str
    dynamicPrice: Optional[float] # Use Optional as price might not be found

@app.on_event("startup")
async def startup_event():
    """Load product base prices on application startup."""
    print("Pricing Service starting up...", flush=True)
    await pricing_model._load_products_data()

@app.get("/")
async def root():
    return {"message": "SwiftMart Dynamic Pricing Service is running!"}

@app.post("/prices/dynamic", response_model=List[DynamicPriceResponseItem])
async def get_dynamic_prices(request: DynamicPriceRequest):
    """
    Endpoint to get dynamic prices for a list of product IDs.
    """
    if not request.product_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Product IDs are required.")

    try:
        dynamic_prices = await pricing_model.get_dynamic_prices(request.product_ids)
        
        response_list = []
        for product_id in request.product_ids:
            response_list.append({
                "productId": product_id,
                "dynamicPrice": dynamic_prices.get(product_id)
            })
        
        return response_list
    except Exception as e:
        print(f"Error in dynamic pricing endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal server error during dynamic pricing.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)