
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_negative_stock():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    print("\n--- Negative Stock Medicines ---")
    meds = await db.medicines.find({"stock_quantity": {"$lt": 0}}).to_list(1000)
    for m in meds:
        print(f"Name: {m['name']}, Batch: {m.get('batch_number')}, Stock: {m.get('stock_quantity')}, Branch: {m.get('branch_id')}")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_negative_stock())
