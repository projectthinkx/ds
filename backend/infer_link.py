
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    rnr_id = "e079c40f-7933-4dd7-b3aa-8ad924108dcb"
    
    print(f"--- Sales for Godown '{rnr_id}' ---")
    sales = await db.pharmacy_sales.find({"items.godown_id": rnr_id}).to_list(100)
    for s in sales:
        print(f"Sale: {s.get('invoice_number')}, Branch: {s.get('branch_id')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
