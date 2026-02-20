
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    # 1. Find the "Rnr" godown
    rnr_godown = await db.godowns.find_one({"name": {"$regex": "rnr", "$options": "i"}})
    print("--- RNR GODOWN DATA ---")
    print(json.dumps(rnr_godown, indent=2, default=str))
    
    # 2. Find the "Thirunagar" branch
    thirunagar = await db.branches.find_one({"name": {"$regex": "thirunagar", "$options": "i"}})
    print("\n--- THIRUNAGAR BRANCH DATA ---")
    print(json.dumps(thirunagar, indent=2, default=str))

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
