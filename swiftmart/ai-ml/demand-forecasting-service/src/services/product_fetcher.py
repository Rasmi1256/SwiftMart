# ai-ml/demand-forecasting-service/src/services/product_fetcher.py
import requests
from ..config.config import config

class ProductFetcher:
    """
    Service to fetch product data from the Product Catalog Service.
    """
    def __init__(self):
        self.base_url = config.PRODUCT_CATALOG_SERVICE_URL

    def fetch_all_products(self, limit: int = 1000, page: int = 1): # Increased limit
        """Fetches a list of products from the product catalog."""
        all_products = []
        current_page = page
        while True:
            try:
                response = requests.get(f"{self.base_url}/products", params={"limit": limit, "page": current_page})
                response.raise_for_status()
                data = response.json()
                products_chunk = data.get('products', [])
                all_products.extend(products_chunk)
                
                if current_page >= data.get('totalPages', 1):
                    break
                current_page += 1
            except requests.exceptions.RequestException as e:
                print(f"Error fetching products from Product Catalog Service (page {current_page}): {e}", flush=True)
                break
        return all_products

    def fetch_product_by_id(self, product_id: str):
        """Fetches a single product by its ID."""
        try:
            response = requests.get(f"{self.base_url}/products/{product_id}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error fetching product {product_id}: {e}", flush=True)
            return None

product_fetcher = ProductFetcher()