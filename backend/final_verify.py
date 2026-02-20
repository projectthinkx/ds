import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def verify():
    # Load env from backend dir
    backend_dir = r"c:\bug fix 3\DentalSuthra\backend"
    load_dotenv(os.path.join(backend_dir, ".env"))
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "dentalsuthra")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to {db_name}...")

    # 1. Check Item Type
    treatment_type = await db.item_types.find_one({"name": "Treatment"})
    if not treatment_type:
        print("FAIL: 'Treatment' item type not found!")
        return
    
    tt_id = treatment_type["id"]
    print(f"SUCCESS: Found 'Treatment' item type with ID: {tt_id}")

    # 2. Check Categories
    cat_count = await db.categories.count_documents({"item_type_id": tt_id})
    print(f"Categories with Treatment type: {cat_count}")
    
    # 3. Check Subcategories (this is indirect since subcategories link to categories)
    # But in my migration I added item_type_id to subcategories too if possible, 
    # or I should check if their categories are treatment type.
    # Actually, the model I updated in server.py for Subcategory DOES have item_type_id?
    # No, I didn't add it to Subcategory model, only Category and ItemMaster.
    
    # 4. Check Items
    item_count = await db.item_master.count_documents({"item_type_id": tt_id})
    print(f"Items with Treatment type: {item_count}")
    
    if item_count > 0:
        sample_item = await db.item_master.find_one({"item_type_id": tt_id})
        print(f"Sample Treatment Item: {sample_item.get('name')}")
        print(f"  Charges: {sample_item.get('charges')}")
        print(f"  Duration: {sample_item.get('duration_minutes')}")
        print(f"  GST Applicable: {sample_item.get('gst_applicable')}")
        print(f"  MRP: {sample_item.get('mrp')}")

    # 5. Check if old collections are empty
    old_cats = await db.treatment_categories.count_documents({})
    old_subs = await db.treatment_subcategories.count_documents({})
    old_treatments = await db.treatments.count_documents({})
    
    print(f"Old Treatment Categories count: {old_cats}")
    print(f"Old Treatment Subcategories count: {old_subs}")
    print(f"Old Treatments count: {old_treatments}")

    if old_cats == 0 and old_subs == 0 and old_treatments == 0:
        print("SUCCESS: Old collections are empty (migrated).")
    else:
        print("WARNING: Old collections still contain data.")

if __name__ == "__main__":
    asyncio.run(verify())
