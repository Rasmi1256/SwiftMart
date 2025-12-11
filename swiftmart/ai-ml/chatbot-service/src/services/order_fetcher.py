# ai-ml/chatbot-service/src/services/order_fetcher.py
import requests
from typing import Dict, Any, Optional
from ..config.config import config

class OrderFetcher:
    """
    Service to fetch order data from the Order Management Service.
    """
    def __init__(self):
        self.base_url = config.ORDER_MANAGEMENT_SERVICE_URL

    def fetch_order_details(self, order_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Fetches a single order by its ID."""
        headers = {}
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'

        try:
            # Note: This calls the user's personal order endpoint, which requires their JWT.
            # In a real system, the chatbot might have its own service account/token
            # to query orders, or the user's token is passed securely.
            response = requests.get(f"{self.base_url}/orders/{order_id}", headers=headers)
            response.raise_for_status()
            return response.json().get('order')
        except requests.exceptions.HTTPError as e:
            print(f"HTTP Error fetching order {order_id}: {e.response.status_code} - {e.response.text}", flush=True)
            return None
        except requests.exceptions.RequestException as e:
            print(f"Error fetching order {order_id}: {e}", flush=True)
            return None

order_fetcher = OrderFetcher()