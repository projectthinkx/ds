import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import uuid

# Define safe_int/safe_float as they are in server.py
def safe_int(val, default=0):
    try:
        if val is None or val == "": return default
        return int(float(val))
    except:
        return default

def safe_float(val, default=0.0):
    try:
        if val is None or val == "": return default
        return float(val)
    except:
        return default

async def test():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['dentalsuthra']
    
    # 0. Pre-fetch Units
    unit_map = {}
    all_units = await db.item_units.find({}, {"id": 1, "name": 1, "_id": 0}).to_list(1000)
    for u in all_units:
        if u.get("id"):
            unit_map[u["id"]] = u.get("name")

    # 1. Pre-fetch Item Master
    item_master_map = {}
    all_items = await db.item_master.find({}, {"name": 1, "item_status": 1, "discontinued_reason": 1, "min_stock_level": 1, "unit_id": 1, "_id": 0}).to_list(10000)
    for i in all_items:
        if i.get("name"):
            uid = i.get("unit_id")
            unit_name = unit_map.get(uid, "") if uid else ""
            item_master_map[i["name"].strip()] = {
                "status": i.get("item_status", "ACTIVE"),
                "reason": i.get("discontinued_reason"),
                "min_stock_level": safe_int(i.get("min_stock_level"), 0),
                "unit": unit_name
            }

    # 1. Fetch data from purchase_entries
    stock_map = {}
    purchases = await db.purchase_entries.find({"items_received_date": None}, {"_id": 0}).to_list(1000)
    
    for purchase in purchases:
        for item in purchase.get("items", []):
            name = str(item.get("medicine_name", "")).strip()
            if not name: continue
            
            batch = str(item.get("batch_number", "")).strip()
            mrp = round(safe_float(item.get("mrp"), 0), 2)
            
            pid_branch = purchase.get("branch_id")
            pid_godown = purchase.get("godown_id")
            loc_id = pid_godown or pid_branch or "unknown"
            
            key = f"{name}|{batch}|{mrp:.2f}|{loc_id}"
            
            if key not in stock_map:
                master_info = item_master_map.get(name, {"status": "ACTIVE", "reason": None, "min_stock_level": 0, "unit": ""})
                stock_map[key] = {
                    "name": name,
                    "stock_quantity": 0,
                    "quantity": 0,
                    "min_stock_level": master_info["min_stock_level"],
                    "unit": master_info["unit"],
                    "branch_id": pid_branch,
                    "godown_id": pid_godown
                }
            
            stock_map[key]["stock_quantity"] += safe_int(item.get("quantity"), 0) + safe_int(item.get("free_quantity", 0))
            stock_map[key]["quantity"] = stock_map[key]["stock_quantity"]

    # 2. Fetch data from medicines
    medicines_data = await db.medicines.find({"purpose": {"$in": ["for_sale", None, ""]}}, {"_id": 0}).to_list(1000)
    for med in medicines_data:
        name = str(med.get("name", "")).strip()
        if not name: continue
        
        batch = str(med.get("batch_number", "")).strip()
        mrp = round(safe_float(med.get("mrp") or med.get("unit_price"), 0), 2)
        
        med_branch = med.get("branch_id")
        med_godown = med.get("godown_id")
        loc_id = med_godown or med_branch or "unknown"
        
        key = f"{name}|{batch}|{mrp:.2f}|{loc_id}"
        
        if key not in stock_map:
            master_info = item_master_map.get(name, {"status": "ACTIVE", "reason": None, "min_stock_level": 0, "unit": ""})
            
            med_unit = med.get("unit")
            if not med_unit:
                uid = med.get("unit_id")
                med_unit = unit_map.get(uid) or master_info["unit"]

            stock_map[key] = {
                "name": name,
                "stock_quantity": 0,
                "quantity": 0,
                "min_stock_level": safe_int(med.get("min_stock_level"), master_info["min_stock_level"]),
                "unit": med_unit,
                "branch_id": med_branch,
                "godown_id": med_godown
            }
        
        stock_map[key]["stock_quantity"] += safe_int(med.get("stock_quantity"), 0)
        stock_map[key]["quantity"] = stock_map[key]["stock_quantity"]

    print(f"Total entries: {len(stock_map)}")
    
    # Check for items with missing quantity or units
    for i, (k, v) in enumerate(list(stock_map.items())[:10]):
        print(f"\n[{i}] {v['name']} ({v.get('branch_id') or v.get('godown_id')})")
        print(f"  SQ: {v['stock_quantity']}, Q: {v['quantity']}, Unit: '{v['unit']}', Min: {v['min_stock_level']}")

if __name__ == "__main__":
    asyncio.run(test())
