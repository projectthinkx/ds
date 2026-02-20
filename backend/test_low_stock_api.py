
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    # Simulate current_user as admin to get all data
    # or just call the logic
    
    # 0. Item Master
    item_master_map = {}
    all_items = await db.item_master.find({}, {"name": 1, "item_status": 1, "min_stock_level": 1, "_id": 0}).to_list(10000)
    for i in all_items:
        if i.get("name"):
            item_master_map[i["name"].strip()] = {
                "status": i.get("item_status", "ACTIVE"),
                "min_stock_level": int(float(i.get("min_stock_level", 0)))
            }

    # 1. Consolidated Stock
    from server import get_consolidated_stock_internal
    # Mocking db for server function if needed, but easier to just use the logic
    
    # We call it without branch_id like the Dashboard does
    stock_map = await get_consolidated_stock_internal() # Wait, server.py needs to be importable
    
    low_stock_items = []
    for item in stock_map.values():
        if item.get("item_status") == "INACTIVE": continue
        qty = item.get("stock_quantity", 0)
        min_level = item.get("min_stock_level", 0)
        if qty <= min_level and min_level > 0:
            low_stock_items.append(item)
            
    print(f"Total Low Stock Items: {len(low_stock_items)}")
    
    # Resolve names like in server.py
    branch_ids = {m.get("branch_id") for m in low_stock_items if m.get("branch_id")}
    godown_ids = {m.get("godown_id") for m in low_stock_items if m.get("godown_id")}
    
    branches_list = await db.branches.find({"id": {"$in": list(branch_ids)}}, {"_id": 0}).to_list(1000)
    godowns_list = await db.godowns.find({"id": {"$in": list(godown_ids)}}, {"_id": 0}).to_list(1000)
    
    branch_map = {b["id"]: b["name"] for b in branches_list}
    godown_map = {g["id"]: g for g in godowns_list}
    
    for med in low_stock_items:
        bid = med.get("branch_id")
        gid = med.get("godown_id")
        if bid: med["branch_name"] = branch_map.get(bid, "Unknown Branch")
        if gid:
            godown = godown_map.get(gid)
            if godown:
                med["godown_name"] = godown.get("name", "Unknown Godown")
                # ... propagation logic from server.py ...
                if not bid and godown.get("branch_id"):
                    med["branch_id"] = godown["branch_id"]
                    med["branch_name"] = branch_map.get(med["branch_id"]) or "Resolved Branch"
        
        print(f"Item: {med['name']}, BranchID: {med.get('branch_id')}, BranchName: {med.get('branch_name')}, GodownID: {med.get('godown_id')}, Qty: {med['stock_quantity']}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
