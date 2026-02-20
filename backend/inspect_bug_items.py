
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def debug_items():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    
    items_to_check = ["vitamin c (lemoncee)", "test panedol"]
    
    for name in items_to_check:
        print(f"\n--- Checking: {name} ---")
        
        # 1. Check Medicines collection
        meds = await db.medicines.find({"name": {"$regex": name, "$options": "i"}}).to_list(100)
        print(f"Medicines records: {len(meds)}")
        for m in meds:
            print(f"  ID: {m['id']}, Batch: {m.get('batch_number')}, MRP: {m.get('mrp')}, Stock: {m.get('stock_quantity')}, Branch: {m.get('branch_id')}")
            
        # 2. Check Purchase Entries
        pes = await db.purchase_entries.find({"items.medicine_name": {"$regex": name, "$options": "i"}}).to_list(100)
        print(f"Purchase Entries: {len(pes)}")
        for pe in pes:
            for item in pe.get("items", []):
                if name.lower() in item.get("medicine_name", "").lower():
                    print(f"  PE ID: {pe['id']}, Batch: {item.get('batch_number')}, Qty: {item.get('quantity')}, Received: {pe.get('items_received_date')}")
                    
        # 3. Check Pharmacy Sales
        sales = await db.pharmacy_sales.find({"items.medicine_name": {"$regex": name, "$options": "i"}}).to_list(100)
        print(f"Pharmacy Sales: {len(sales)}")
        for s in sales:
            for item in s.get("items", []):
                if name.lower() in item.get("medicine_name", "").lower():
                    print(f"  Sale ID: {s['id']}, Batch: {item.get('batch_number')}, Qty: {item.get('quantity')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(debug_items())
