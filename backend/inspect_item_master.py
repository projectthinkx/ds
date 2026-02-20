
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_item_master():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    names = ["vitamin c (lemoncee)", "test panedol"]
    for name in names:
        print(f"\n--- Item Master: {name} ---")
        item = await db.item_master.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
        if item:
            print(f"Found: {item['name']}, Min Stock: {item.get('min_stock_level')}, Status: {item.get('item_status')}")
        else:
            print("Not found in Item Master")
            
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_item_master())
