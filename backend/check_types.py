
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    print("--- Medicine Field Types ---")
    docs = await db.medicines.find({}).to_list(100)
    for d in docs:
        bid = d.get("branch_id")
        gid = d.get("godown_id")
        print(f"Item: {d.get('name')}, BID: {bid} ({type(bid)}), GID: {gid} ({type(gid)})")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
