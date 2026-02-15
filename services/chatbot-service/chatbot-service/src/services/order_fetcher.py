# ai-ml/chatbot-service/src/services/order_fetcher.py
import httpx
from typing import Dict, Any, Optional
from ..config.config import config

class OrderFetcher:
    def __init__(self):
        self.base_url = config.ORDER_MANAGEMENT_SERVICE_URL

    async def fetch_order_details(
        self,
        order_id: str,
        auth_token: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:

        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.base_url}/orders/{order_id}",
                    headers=headers
                )
                response.raise_for_status()
                return response.json().get("order")

        except httpx.HTTPStatusError as e:
            print(
                f"HTTP error fetching order {order_id}: "
                f"{e.response.status_code} - {e.response.text}",
                flush=True
            )
            return None

        except httpx.RequestError as e:
            print(
                f"Connection error fetching order {order_id}: {e}",
                flush=True
            )
            return None

order_fetcher = OrderFetcher()
