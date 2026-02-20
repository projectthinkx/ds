
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    names = ["test panedol", "vitamin c (lemoncee)"]
    for name in names:
        print(f"--- ENTRIES FOR {name.upper()} ---")
        items = await db.medicines.find({"name": {"$regex": name, "$options": "i"}}, {"_id": 0}).to_list(100)
        print(json.dumps(items, indent=2, default=str))

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
