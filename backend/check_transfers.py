
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    rnr_id = "e079c40f-7933-4dd7-b3aa-8ad924108dcb"
    thirunagar_id = "3989b9a9-e2e8-448d-ab07-968352afe6aa"
    
    print(f"--- Transfers involving Rnr ('{rnr_id}') ---")
    transfers = await db.stock_transfers.find({"$or": [{"from_location_id": rnr_id}, {"to_location_id": rnr_id}]}).to_list(100)
    for t in transfers:
        print(f"ID: {t.get('id')}, From: {t.get('from_location_id')}, To: {t.get('to_location_id')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
