
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    meds_count = await db.medicines.count_documents({})
    master_count = await db.item_master.count_documents({})
    print(f"Meds count: {meds_count}")
    print(f"Item Master count: {master_count}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
