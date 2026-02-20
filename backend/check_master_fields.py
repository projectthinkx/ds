
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    r = await db.item_master.find({}).to_list(5)
    for i in r:
        print(f"Name: {i.get('name')}")
        print(f"  min_stock_level: {i.get('min_stock_level')}")
        print(f"  low_stock_threshold: {i.get('low_stock_threshold')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
