# ai-ml/chatbot-service/src/config/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 3009))
    ORDER_MANAGEMENT_SERVICE_URL = os.getenv("ORDER_MANAGEMENT_SERVICE_URL", "http://localhost:3003/api")

if not Config.ORDER_MANAGEMENT_SERVICE_URL:
    print("FATAL ERROR: ORDER_MANAGEMENT_SERVICE_URL must be defined in environment variables.", flush=True)
    exit(1)

config = Config()

print(f"Chatbot Service Configuration Loaded: Port={config.PORT}, OrderManagementServiceURL={config.ORDER_MANAGEMENT_SERVICE_URL}", flush=True)