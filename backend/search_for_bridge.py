
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    rnr_id = "e079c40f-7933-4dd7-b3aa-8ad924108dcb"
    
    print(f"--- Medicine records with Godown '{rnr_id}' ---")
    meds = await db.medicines.find({"godown_id": rnr_id}).to_list(100)
    for m in meds:
        if m.get("branch_id"):
            print(f"Item: {m.get('name')}, Branch: {m.get('branch_id')}")

    print(f"\n--- Purchase records with Godown '{rnr_id}' ---")
    purchases = await db.purchase_entries.find({"godown_id": rnr_id}).to_list(100)
    for p in purchases:
        if p.get("branch_id"):
            print(f"Invoice: {p.get('invoice_number')}, Branch: {p.get('branch_id')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
