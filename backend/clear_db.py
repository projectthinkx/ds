from pymongo import MongoClient
import os
from dotenv import load_dotenv

def clear_database():
    # Load environment variables
    load_dotenv()
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "dentalsuthra")
    
    print(f"Connecting to {mongo_url}...")
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    # Collections to PRESERVE (Master Data and Settings)
    # Collections to PRESERVE (Based on user request + system essentials)
    preserve = [
        'users',
        'doctors',          # Doctors Master
        'role_permissions', # Part of user management
        'user_permissions', # Permissions
        'settings',         # System configuration
        'branches',         # Branch Master
        'godowns',          # Godown Master
        'bank_accounts',    # Bank Account Master
        'categories',       # Item Categories
        'subcategories',    # Item Subcategories
        'item_master',      # Items
        'suppliers',        # Supplier Master
        'patients',         # Patient Master
        'treatments',       # Treatment Master
        'treatment_categories',
        'treatment_subcategories',
        'medicines',        # Inventory Master
        'dental_labs',      # LAB Master
        'lab_materials',
        'lab_work_types',
        
        # Essential/Static Configs
        'gst_slabs',
        'item_units',
        'serial_numbers'
    ]
    
    print(f"Selective clearing of database: {db_name}")
    collections = db.list_collection_names()
    for coll_name in collections:
        if coll_name not in preserve:
            print(f"Clearing collection: {coll_name}")
            db[coll_name].delete_many({})
        else:
            print(f"Preserving collection: {coll_name}")
            
    print("Database transactional data cleared successfully.")

if __name__ == "__main__":
    clear_database()
