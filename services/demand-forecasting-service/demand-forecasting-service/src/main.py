from fastapi import FastAPI,HTTPException,status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List,Dict,Any,Optional
from .config.config import config
from .models.forecasting_models import demand_forecasting_model
app = FastAPI(
    title="SwiftMart Demand Forecasting Service",
    description="AI-powered demand forecasting for inventory management.",
    version="1.0.0",)
# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Adjust in production to frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)
# Pydantic models for request and response
class ForecastRequest(BaseModel):
    product_ids: List[str]
    historical_data: Dict[str, List[float]] # e.g., {"product_id": [sales_data]}
    forecast_horizon: int
class ForecastResponse(BaseModel):
    product_id: str
    forecast: List[float]
@app.get("/")
async def root():
    return {"message": "SwiftMart Demand Forecasting Service is running!"}
@app.post("/forecast", response_model=List[ForecastResponse])
async def forecast_demand(request: ForecastRequest):
    """
    Endpoint for demand forecasting.
    """
    try:
        forecasts = await demand_forecasting_model.get_forecast(
            product_ids=request.product_ids,
            historical_data=request.historical_data,
            forecast_horizon=request.forecast_horizon
        )
        return forecasts
    except Exception as e:
        print(f"Error in demand forecasting endpoint: {e}", flush=True)
        raise HTTPException(status_code=500, detail="Internal server error while processing forecast request.")         
