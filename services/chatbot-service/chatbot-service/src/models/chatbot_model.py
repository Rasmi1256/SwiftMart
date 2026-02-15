# ai-ml/chatbot-service/src/models/chatbot_model.py
import re
from typing import Dict, Any, Optional
from ..services.order_fetcher import order_fetcher

class ChatbotModel:

    async def get_response(
        self,
        user_message: str,
        user_id: Optional[str] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:

        user_message_clean = user_message.strip()

        # 1. Greeting
        if re.search(r'\b(hello|hi|hey)\b', user_message_clean, re.IGNORECASE):
            return {"response": "Hello there! How can I assist you with SwiftMart today?"}

        # 2. Order tracking
        if re.search(r'\b(track|status|where is)\b.*\border\b', user_message_clean, re.IGNORECASE):

            order_id_match = re.search(
                r'([a-f0-9]{24}|[a-f0-9\-]{36})',
                user_message_clean,
                re.IGNORECASE
            )
            order_id = order_id_match.group(0) if order_id_match else None

            if not order_id:
                return {"response": "Sure — please share your order ID so I can check the status."}

            if not auth_token:
                return {"response": "Please log in to track your order."}

            # ✅ ASYNC CALL
            order_details = await order_fetcher.fetch_order_details(order_id, auth_token)

            if not order_details:
                return {
                    "response": (
                        "I couldn't retrieve that order. "
                        "Please verify the ID or try again later."
                    )
                }

            status = order_details.get("status", "unknown")
            total_amount = order_details.get("totalAmount", 0)
            created_at = order_details.get("createdAt", "an unknown date")

            response_text = (
                f"Order {order_id[:8]}... is currently {status.upper()}.\n"
                f"It was placed on {created_at} for a total of ${total_amount:.2f}.\n"
                "Thank you for shopping with SwiftMart!"
            )

            return {
                "response": response_text,
                "orderId": order_id,
                "orderStatus": status
            }

        # 3. Help
        if re.search(r'\b(help|support|can you do)\b', user_message_clean, re.IGNORECASE):
            return {
                "response": (
                    "I can help you track orders and answer general questions "
                    "about SwiftMart."
                )
            }

        # 4. Fallback
        return {
            "response": (
                "I'm sorry, I didn't understand that. "
                "I can help with order tracking or general inquiries."
            )
        }

chatbot_model = ChatbotModel()
