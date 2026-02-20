import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['dentalsuthra']
    collections = await db.list_collection_names()
    print(collections)

if __name__ == "__main__":
    asyncio.run(run())
