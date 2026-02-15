# ai-ml/pricing-service/src/config/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    PORT = int(os.getenv("PORT", 3007))
    PRODUCT_CATALOG_SERVICE_URL = os.getenv("PRODUCT_CATALOG_SERVICE_URL", "http://localhost:3002/api")

if not Config.PRODUCT_CATALOG_SERVICE_URL:
    print("FATAL ERROR: PRODUCT_CATALOG_SERVICE_URL must be defined in environment variables.", flush=True)
    exit(1)

config = Config()

print(f"Pricing Service Configuration Loaded: Port={config.PORT}, ProductCatalogServiceURL={config.PRODUCT_CATALOG_SERVICE_URL}", flush=True)