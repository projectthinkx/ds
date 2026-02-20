
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json
import uuid

load_dotenv()

def safe_float(val, default=0.0):
    try: return float(val) if val is not None else default
    except: return default

def safe_int(val, default=0):
    try: return int(float(val)) if val is not None else default
    except: return default

async def get_consolidated_stock_internal(db):
    # Simplified version of the one in server.py to avoid imports
    stock_map = {}
    item_master_map = {}
    
    # 0. Item Master
    all_masters = await db.item_master.find({}).to_list(1000)
    for i in all_masters:
        item_master_map[i["name"].strip()] = {
            "status": i.get("item_status", "ACTIVE"),
            "min_stock_level": safe_int(i.get("low_stock_threshold") or i.get("min_stock_level"), 0),
            "unit": i.get("unit", "")
        }

    # 1. Medicines
    medicines_data = await db.medicines.find({"purpose": {"$in": ["for_sale", None, ""]}}).to_list(1000)
    for med in medicines_data:
        name = str(med.get("name", "")).strip()
        batch = str(med.get("batch_number", "")).strip()
        raw_mrp = med.get("mrp") or med.get("unit_price")
        mrp = round(safe_float(raw_mrp, 0), 2)
        med_branch = med.get("branch_id")
        med_godown = med.get("godown_id")
        if med_branch == "default" or not med_branch: med_branch = None
        
        loc_id = med_godown or med_branch or "unknown"
        key = f"{name}|{batch}|{mrp:.2f}|{loc_id}"
        
        if key not in stock_map:
            master = item_master_map.get(name, {"status": "ACTIVE", "min_stock_level": 0, "unit": ""})
            stock_map[key] = {
                "id": str(uuid.uuid4()),
                "name": name,
                "batch_number": batch,
                "mrp": mrp,
                "stock_quantity": 0,
                "min_stock_level": master["min_stock_level"] or safe_int(med.get("min_stock_level"), 0),
                "unit": med.get("unit") or master["unit"],
                "branch_id": med_branch,
                "godown_id": med_godown,
                "item_status": med.get("item_status") or master["status"]
            }
        stock_map[key]["stock_quantity"] += safe_int(med.get("stock_quantity"), 0)

    # 2. Filter Low Stock
    low_stock_items = [v for v in stock_map.values() if v["stock_quantity"] <= v["min_stock_level"] and v["min_stock_level"] > 0]
    
    # 3. Resolve names
    branch_ids = {m["branch_id"] for m in low_stock_items if m["branch_id"]}
    godown_ids = {m["godown_id"] for m in low_stock_items if m["godown_id"]}
    
    branches = await db.branches.find({"id": {"$in": list(branch_ids)}}).to_list(100)
    godowns = await db.godowns.find({"id": {"$in": list(godown_ids)}}).to_list(100)
    
    branch_map = {b["id"]: b["name"] for b in branches}
    godown_map = {g["id"]: g for g in godowns}
    
    for med in low_stock_items:
        bid = med.get("branch_id")
        gid = med.get("godown_id")
        if bid: med["branch_name"] = branch_map.get(bid)
        if gid:
            g = godown_map.get(gid)
            if g:
                med["godown_name"] = g["name"]
                if not bid and g.get("branch_id"):
                    med["branch_id"] = g["branch_id"]
                    med["branch_name"] = branch_map.get(med["branch_id"]) or "Resolved Branch"
        
        if gid: med["location_type"] = "godown"
        elif bid: med["location_type"] = "branch"
    
    return low_stock_items

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    res = await get_consolidated_stock_internal(db)
    print(json.dumps(res, indent=2, default=str))

    client.close()

if __name__ == "__main__":
    asyncio.run(check())
