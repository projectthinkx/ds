
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    godowns = await db.godowns.find({}).to_list(100)
    print("--- ALL GODOWNS ---")
    for g in godowns:
        print(f"Name: {g.get('name')}, Branch ID: '{g.get('branch_id')}'")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
