
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    print("--- BRANCHES ---")
    branches = await db.branches.find({}).to_list(100)
    for b in branches:
        print(f"Name: {b.get('name')}, ID: {b.get('id')}, Location: {b.get('location')}")
        
    print("\n--- GODOWNS ---")
    godowns = await db.godowns.find({}).to_list(100)
    for g in godowns:
        print(f"Name: {g.get('name')}, ID: {g.get('id')}, Branch ID: {g.get('branch_id')}, Location: {g.get('location')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
