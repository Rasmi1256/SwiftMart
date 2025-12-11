# ai-ml/chatbot-service/src/models/chatbot_model.py
import re
from typing import Dict, Any, Tuple, Optional
from ..services.order_fetcher import order_fetcher

class ChatbotModel:
    """
    A placeholder for the actual chatbot logic.
    For MVP, it will handle basic greetings and order status queries.
    """

    async def get_response(self, user_message: str, user_id: Optional[str] = None, auth_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Processes a user message and returns a chatbot response.
        """
        user_message_lower = user_message.lower().strip()

        # 1. Intent Recognition (simple regex for MVP)
        if re.search(r'\b(hello|hi|hey)\b', user_message_lower):
            return {"response": "Hello there! How can I assist you with SwiftMart today?"}
        
        if re.search(r'\b(track|status|where is)\b.*\border\b', user_message_lower):
            # Extract order ID (simple pattern matching for MVP)
            order_id_match = re.search(r'([a-f0-9]{24}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})', user_message_lower) # For MongoDB ObjectID or UUID
            order_id = order_id_match.group(0) if order_id_match else None

            if order_id:
                if not auth_token:
                    return {"response": "I need you to be logged in to track your order. Please ensure you are logged in."}
                
                # Fetch order details from Order Management Service
                order_details = order_fetcher.fetch_order_details(order_id, auth_token)

                if order_details:
                    status = order_details.get('status', 'unknown')
                    total_amount = order_details.get('totalAmount', 0)
                    created_at = order_details.get('createdAt')
                    
                    response_text = (
                        f"Order {order_id.substring(0, 8)}... is currently **{status.upper()}**.\n"
                        f"It was placed on {created_at} for a total of ${total_amount:.2f}.\n"
                        "Thank you for shopping with SwiftMart!"
                    )
                    return {"response": response_text, "orderId": order_id, "orderStatus": status}
                else:
                    return {"response": "I couldn't find an order with that ID, or it doesn't belong to your account. Please double-check the ID."}
            else:
                return {"response": "Sure, I can help you track your order! What is your order ID?"}

        if re.search(r'\b(help|support|can you do)\b', user_message_lower):
            return {"response": "I can help with tracking orders and answering general questions about SwiftMart. How can I assist you?"}

        # 2. Default/Fallback Response
        return {"response": "I'm sorry, I didn't understand that. I can help with order tracking or general inquiries about SwiftMart."}

chatbot_model = ChatbotModel()