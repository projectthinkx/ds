import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['dentalsuthra']
    units = await db.item_units.find().limit(5).to_list(10)
    # Convert ObjectId and other non-serializable fields
    for u in units:
        if '_id' in u: u['_id'] = str(u['_id'])
    print(json.dumps(units, indent=2))

if __name__ == "__main__":
    asyncio.run(run())
