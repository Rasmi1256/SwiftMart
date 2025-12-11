# ai-ml/pricing-service/src/models/pricing_model.py
from typing import List, Dict, Any, Optional
import random
from datetime import datetime
from ..services.product_fetcher import product_fetcher

class PricingModel:
    """
    A placeholder for the dynamic pricing logic.
    For MVP, it applies a simple rule-based adjustment.
    """

    def __init__(self):
        self.products_data = {} # Cache for product base prices

    async def _load_products_data(self):
        """Loads product base prices from the Product Catalog Service."""
        if not self.products_data:
            products_list = product_fetcher.fetch_all_products()
            if products_list:
                self.products_data = {p['_id']: p.get('price', {}).get('current') for p in products_list if '_id' in p and p.get('price', {}).get('current') is not None}
                print(f"Loaded base prices for {len(self.products_data)} products.", flush=True)
            else:
                print("No products loaded for pricing.", flush=True)

    async def get_dynamic_prices(self, product_ids: List[str]) -> Dict[str, float]:
        """
        Calculates dynamic prices for a list of product IDs.
        For MVP: Applies a simple time-based discount/markup.
        In future iterations:
        - Incorporate demand forecast, inventory levels (from Inventory Service).
        - Use competitive pricing data.
        - Employ reinforcement learning or other ML models.
        """
        await self._load_products_data()

        dynamic_prices = {}
        current_hour = datetime.now().hour

        for product_id in product_ids:
            base_price = self.products_data.get(product_id)
            if base_price is None:
                dynamic_prices[product_id] = None # Indicate price not found
                continue

            adjusted_price = base_price

            # Simple dynamic rule for MVP:
            # - Apply a small discount during off-peak hours (e.g., 2 AM - 6 AM)
            # - Apply a small markup during peak hours (e.g., 6 PM - 9 PM)
            # - Add a small random fluctuation
            if 2 <= current_hour < 6: # Off-peak (e.g., early morning)
                adjusted_price *= 0.95 # 5% discount
            elif 18 <= current_hour < 21: # Peak (e.g., evening)
                adjusted_price *= 1.02 # 2% markup
            
            # Add a small random fluctuation
            adjusted_price *= random.uniform(0.99, 1.01) # +/- 1%

            dynamic_prices[product_id] = round(adjusted_price, 2) # Round to 2 decimal places

        return dynamic_prices

pricing_model = PricingModel()