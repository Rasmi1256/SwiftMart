# ai-ml/demand-forecasting-service/src/models/forecasting_model.py
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from ..services.product_fetcher import product_fetcher

class DemandForecastingModel:
    """
    A placeholder for the actual demand forecasting logic.
    For MVP, it generates simulated demand data.
    """

    def __init__(self):
        self.products_df = pd.DataFrame() # DataFrame to hold product info

    async def _load_products_for_forecasting(self):
        """Loads product data needed for forecasting."""
        if self.products_df.empty:
            products_data = product_fetcher.fetch_all_products()
            if products_data:
                self.products_df = pd.DataFrame(products_data)
                # Ensure _id is string for consistency
                self.products_df['_id'] = self.products_df['_id'].astype(str)
                print(f"Loaded {len(self.products_df)} products for demand forecasting.", flush=True)
            else:
                print("No products loaded for demand forecasting.", flush=True)


    async def predict_demand(self, product_ids: List[str] = None, forecast_days: int = 7) -> List[Dict[str, Any]]:
        """
        Generates simulated demand forecasts for specified products or all products.
        For MVP: Simple sinusoidal pattern + randomness based on price.
        In future iterations:
        - Incorporate historical sales data, seasonality, promotions.
        - Use time-series models (ARIMA, Prophet, LSTM).
        - Factor in external events.
        """
        await self._load_products_for_forecasting()

        if self.products_df.empty:
            return []

        target_products_df = self.products_df
        if product_ids:
            target_products_df = self.products_df[self.products_df['_id'].isin(product_ids)]
            if target_products_df.empty:
                return []

        forecasts = []
        today = datetime.now().date()

        for index, product in target_products_df.iterrows():
            product_forecasts = []
            base_demand = 10 # Base units per day for a product
            
            # Make cheaper items have higher base demand for variety in demo
            if product.get('price') and product['price'].get('current'):
                base_demand = max(1, 20 - int(product['price']['current'])) # Example: $1 product has 19 base, $19 product has 1 base

            for i in range(forecast_days):
                forecast_date = today + timedelta(days=i)
                # Simulate a weekly seasonality + random noise
                day_of_week_factor = (np.sin(2 * np.pi * (forecast_date.weekday() / 7)) + 1) / 2 # Peaks mid-week
                daily_demand = int(base_demand * (1 + day_of_week_factor * 0.5 + np.random.uniform(-0.2, 0.2)))
                daily_demand = max(1, daily_demand) # Ensure at least 1 unit

                product_forecasts.append({
                    "date": forecast_date.isoformat(),
                    "predicted_units": daily_demand,
                })
            
            forecasts.append({
                "productId": product['_id'],
                "productName": product['name'],
                "forecasts": product_forecasts,
            })
        
        return forecasts

demand_forecasting_model = DemandForecastingModel()