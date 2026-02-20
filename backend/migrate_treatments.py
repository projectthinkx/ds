import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

async def migrate():
    mongo_url = "mongodb://localhost:27017"
    db_name = "dentalsuthra"
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("Starting migration...")

    # 1. Ensure "Treatment" Item Type exists
    item_type = await db.item_types.find_one({"name": "Treatment"})
    if not item_type:
        item_type_id = "treatment_type"
        item_type = {
            "id": item_type_id,
            "name": "Treatment",
            "description": "Clinical treatments and procedures",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.item_types.insert_one(item_type)
        print(f"Created Item Type: Treatment ({item_type_id})")
    else:
        item_type_id = item_type["id"]
        print(f"Using existing Item Type ID: {item_type_id}")

    # 2. Migrate Treatment Categories
    old_categories = await db.treatment_categories.find({}, {"_id": 0}).to_list(1000)
    cat_migrated = 0
    for old_cat in old_categories:
        exists = await db.categories.find_one({"name": old_cat["name"], "item_type_id": item_type_id})
        if not exists:
            new_cat = {
                "id": old_cat["id"],
                "name": old_cat["name"],
                "description": old_cat.get("description"),
                "item_type_id": item_type_id,
                "created_at": old_cat.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(new_cat)
            cat_migrated += 1
    print(f"Migrated {cat_migrated} categories.")

    # 3. Migrate Treatment Subcategories
    old_subcategories = await db.treatment_subcategories.find({}, {"_id": 0}).to_list(1000)
    sub_migrated = 0
    for old_sub in old_subcategories:
        exists = await db.subcategories.find_one({"name": old_sub["name"], "category_id": old_sub["category_id"]})
        if not exists:
            new_sub = {
                "id": old_sub["id"],
                "category_id": old_sub["category_id"],
                "name": old_sub["name"],
                "description": old_sub.get("description"),
                "created_at": old_sub.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            await db.subcategories.insert_one(new_sub)
            sub_migrated += 1
    print(f"Migrated {sub_migrated} subcategories.")

    # 4. Migrate Treatments to Item Master
    old_treatments = await db.treatments.find({}, {"_id": 0}).to_list(1000)
    items_migrated = 0
    for old_t in old_treatments:
        exists = await db.item_master.find_one({"name": old_t["name"], "item_type_id": item_type_id})
        if not exists:
            new_item = {
                "id": old_t["id"],
                "name": old_t["name"],
                "item_type_id": item_type_id,
                "category_id": old_t.get("category_id"),
                "subcategory_id": old_t.get("subcategory_id"),
                "charges": old_t.get("charges", 0),
                "mrp": old_t.get("charges", 0),
                "duration_minutes": old_t.get("duration_minutes"),
                "gst_applicable": old_t.get("gst_applicable", False),
                "gst_percentage": old_t.get("gst_percentage", 0),
                "description": old_t.get("description"),
                "created_at": old_t.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "purpose": "for_sale"
            }
            await db.item_master.insert_one(new_item)
            items_migrated += 1
    print(f"Migrated {items_migrated} treatments to Item Master.")

    print("Migration finished!")

if __name__ == "__main__":
    asyncio.run(migrate())
