import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def inspect():
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'dentalsuthra')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Connecting to {mongo_url}, DB: {db_name}")
    
    # Check for satheesh
    patients = await db.patients.find({"name": {"$regex": "satheesh", "$options": "i"}}).to_list(10)
    print("\n--- Patients found ---")
    for p in patients:
        print(f"Name: {p.get('name')}, ID: {p.get('id')}, Patient_ID: {p.get('patient_id')}")
        
    # Check bills
    bills = await db.bills.find({"patient_name": {"$regex": "satheesh", "$options": "i"}}).to_list(10)
    print("\n--- Bills found ---")
    for b in bills:
        print(f"Patient Name: {b.get('patient_name')}, Patient_ID: {b.get('patient_id')}, Total: {b.get('total_amount')}")

    # Check walkins
    walkins = await db.walkins.find({"patient_name": {"$regex": "satheesh", "$options": "i"}}).to_list(10)
    print("\n--- Walkins found ---")
    for w in walkins:
        print(f"Patient Name: {w.get('patient_name')}, Patient_ID (stored): {w.get('patient_id')}")

if __name__ == "__main__":
    asyncio.run(inspect())
