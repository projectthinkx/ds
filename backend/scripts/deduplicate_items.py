import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def deduplicate_items():
    # Load env from parent directory
    env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(env_path)
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("Error: MONGO_URL or DB_NAME not found in .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to database: {db_name}")
    
    # Get all items
    items = await db.item_master.find({}).to_list(None)
    print(f"Total items found: {len(items)}")
    
    # Identify duplicates
    unique_names = {} # lowercase name -> item_id to keep
    to_delete = []
    
    # Sort items by created_at descending to keep the most recent one if available
    items.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    for item in items:
        name = item.get('name', '').strip().lower()
        if not name:
            to_delete.append(item.get('id') or item.get('_id'))
            continue
            
        if name in unique_names:
            # Duplicate found
            to_delete.append(item.get('id') or item.get('_id'))
        else:
            unique_names[name] = item.get('id') or item.get('_id')
            
    print(f"Unique items identified: {len(unique_names)}")
    print(f"Duplicates to delete: {len(to_delete)}")
    
    if to_delete:
        # Delete by 'id' field first if it exists, otherwise by '_id'
        # Since the app uses 'id' (UUID), we should be careful.
        # But motor returns documents with '_id' (OId).
        
        delete_count = 0
        for item_id in to_delete:
            res = await db.item_master.delete_one({"id": item_id})
            if res.deleted_count == 0:
                # Try _id if id didn't work
                await db.item_master.delete_one({"_id": item_id})
            delete_count += 1
            
        print(f"Successfully deleted {delete_count} duplicates.")
    else:
        print("No duplicates found to delete.")

if __name__ == "__main__":
    asyncio.run(deduplicate_items())
