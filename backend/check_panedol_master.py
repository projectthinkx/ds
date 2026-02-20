
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    print("--- ITEM MASTER (test panedol) ---")
    r = await db.item_master.find_one({"name": {"$regex": "test panedol", "$options": "i"}})
    print(r)
    
    print("\n--- MEDICINES (test panedol) ---")
    r = await db.medicines.find({"name": {"$regex": "test panedol", "$options": "i"}}).to_list(100)
    for i in r:
        print(f"ID: {i.get('id')}, Branch: {i.get('branch_id')}, Godown: {i.get('godown_id')}, Stock: {i.get('stock_quantity')}, Min: {i.get('min_stock_level')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
