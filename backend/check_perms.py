
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    print("--- USERS ---")
    users = await db.users.find({}).to_list(100)
    for u in users:
        print(f"User: {u.get('full_name')}, Role: {u.get('role')}, Branch: {u.get('branch_id')}")
        
    print("\n--- PERMISSIONS ---")
    perms = await db.user_permissions.find({}).to_list(100)
    for p in perms:
        if p.get("can_view"):
           print(f"UserID: {p.get('user_id')}, Module: {p.get('module')}, GodownID: {p.get('godown_id')}, BranchID: {p.get('branch_id')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
