
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    collections = await db.list_collection_names()
    for coll_name in collections:
        count = await db[coll_name].count_documents({"$or": [
            {"location": {"$regex": "ponmeni", "$options": "i"}},
            {"address": {"$regex": "ponmeni", "$options": "i"}}
        ]})
        if count > 0:
            print(f"Found {count} matches in {coll_name}")
            docs = await db[coll_name].find({"$or": [
                {"location": {"$regex": "ponmeni", "$options": "i"}},
                {"address": {"$regex": "ponmeni", "$options": "i"}}
            ]}).to_list(10)
            for d in docs:
                print(f"  Doc: {d.get('name') or d.get('full_name') or d.get('id')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
