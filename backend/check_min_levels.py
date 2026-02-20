
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check_distribution():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    pipeline = [
        {"$group": {"_id": "$min_stock_level", "count": {"$sum": 1}}}
    ]
    results = await db.item_master.aggregate(pipeline).to_list(100)
    for r in results:
        print(f"Min Stock Level: {r['_id']}, Count: {r['count']}")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(check_distribution())
