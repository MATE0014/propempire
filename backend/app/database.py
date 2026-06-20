import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger("uvicorn.error")

MONGODB_URI = os.getenv("MONGODB_URI")
rooms_collection = None
db_client = None

if MONGODB_URI and MONGODB_URI.strip():
    try:
        # Initialize the motor client with a 5-second server selection timeout to prevent hanging
        db_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # We can extract the database name from the URI or default to "propempire"
        db = db_client.get_database("propempire")
        rooms_collection = db.get_collection("rooms")
        logger.info("MongoDB client initialized successfully. Connecting to collection 'rooms'...")
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB client: {e}")
        logger.warning("PropEmpire backend will fall back to local in-memory room management.")
else:
    logger.warning("MONGODB_URI environment variable is not set. PropEmpire backend will fall back to local in-memory room management.")
