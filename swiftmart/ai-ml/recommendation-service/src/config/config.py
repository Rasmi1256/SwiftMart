# ai-ml/recommendation-service/src/config/config.py
import os
from dotenv import load_dotenv

load_dotenv() # Load environment variables from .env file

class Config:
    PORT = int(os.getenv("PORT", 3005))
    PRODUCT_CATALOG_SERVICE_URL = os.getenv("PRODUCT_CATALOG_SERVICE_URL", "http://localhost:3002/api")

# Basic validation
if not Config.PRODUCT_CATALOG_SERVICE_URL:
    print("FATAL ERROR: PRODUCT_CATALOG_SERVICE_URL must be defined in environment variables.", flush=True)
    exit(1)

config = Config()

print(f"Recommendation Service Configuration Loaded: Port={config.PORT}, ProductCatalogServiceURL={config.PRODUCT_CATALOG_SERVICE_URL}", flush=True)