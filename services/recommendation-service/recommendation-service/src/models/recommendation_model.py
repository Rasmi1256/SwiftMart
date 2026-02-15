# ai-ml/recommendation-service/src/models/recommendation_model.py
from typing import List, Dict, Any
import random
from services.product_fetcher import product_fetcher

class RecommendationModel:
    """
    A placeholder for the actual recommendation logic.
    For MVP, it will simply return a list of popular or random products.
    """

    def __init__(self):
        self.all_products = [] # Cache for products

    async def _load_products(self):
        """Loads all products from the Product Catalog Service."""
        if not self.all_products:
            try:
                # In a real scenario, this might involve fetching a large dataset
                # and potentially caching it or refreshing periodically.
                self.all_products = product_fetcher.fetch_all_products(limit=50, page=1)
                print(f"Loaded {len(self.all_products)} products for recommendations.", flush=True)
            except Exception as e:
                print(f"Failed to load products from Product Catalog Service: {e}. Service will continue without product data.", flush=True)
                self.all_products = []

    async def get_personalized_recommendations(self, user_id: str, num_recommendations: int = 5) -> List[Dict[str, Any]]:
        """
        Generates personalized recommendations for a given user.
        For MVP: Returns a random selection of products.
        In future iterations:
        - Use user_id to fetch past purchases/browsing history from User Service or a dedicated data store.
        - Implement collaborative filtering (user-item similarity).
        - Implement content-based filtering (item-item similarity).
        - Potentially use advanced ML models (matrix factorization, deep learning).
        """
        await self._load_products()

        if not self.all_products:
            return []

        # Simple MVP logic: return random unique products
        # In a real scenario, you'd filter out already purchased/viewed items
        # and ensure diversity, novelty, and relevance.
        recommended_products = random.sample(self.all_products, min(num_recommendations, len(self.all_products)))

        # Return only relevant product fields for the frontend
        return [{
            '_id': p.get('_id'),
            'name': p.get('name'),
            'price': p.get('price'),
            'unit': p.get('unit'),
            'imageUrl': p.get('imageUrl'),
            'category': p.get('category', {}).get('name') # Assuming category is populated
        } for p in recommended_products]

recommendation_model = RecommendationModel()