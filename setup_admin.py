"""
DentalSuthra - Complete Setup Script v3.0
Run this ONCE after extracting the files
Creates admin user and initial data for local development
"""

import subprocess
import sys
import os

print("="*60)
print("   DENTALSUTHRA - COMPLETE SETUP")
print("="*60)

# Step 1: Install Python packages
print("\n[1/4] Installing Python packages...")
packages = ["pymongo", "bcrypt"]
for pkg in packages:
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])
print("      Done!")

from pymongo import MongoClient
import bcrypt
from datetime import datetime
import uuid

def hash_password(password):
    """Hash password using bcrypt directly."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Step 2: Connect to MongoDB
print("\n[2/4] Connecting to MongoDB...")
try:
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=5000)
    client.server_info()
    print("      Connected!")
except Exception as e:
    print("\n      ERROR: MongoDB is not running!")
    print("\n      To fix this:")
    print("      1. Press Windows + R")
    print("      2. Type: services.msc")
    print("      3. Press Enter")
    print("      4. Find 'MongoDB Server' in the list")
    print("      5. Right-click on it")
    print("      6. Click 'Start'")
    print("      7. Run this script again")
    input("\n      Press Enter to exit...")
    sys.exit(1)

# Step 3: Setup database
print("\n[3/4] Setting up database...")

db = client["dentalsuthra"]

# Check if admin already exists
existing_admin = db.users.find_one({"email": "admin@clinic.com"})
if existing_admin:
    print("      Admin user already exists. Skipping user creation...")
else:
    # Create admin user
    print("      Creating admin user...")
    admin_password = "admin123"
    admin_email = "admin@clinic.com"
    
    db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": admin_email,
        "full_name": "Admin",
        "hashed_password": hash_password(admin_password),
        "role": "admin",
        "branch_id": "",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    })

# Check if branch exists
existing_branch = db.branches.find_one({})
if not existing_branch:
    print("      Creating branch...")
    db.branches.insert_one({
        "id": str(uuid.uuid4()),
        "name": "Main Clinic",
        "address": "",
        "location": "",
        "phone": "",
        "email": "",
        "is_active": True,
        "created_at": datetime.utcnow().isoformat()
    })

# Check if GST slabs exist
if db.gst_slabs.count_documents({}) == 0:
    print("      Creating GST slabs...")
    db.gst_slabs.insert_many([
        {"id": str(uuid.uuid4()), "name": "No GST", "percentage": 0, "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "GST 5%", "percentage": 5, "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "GST 12%", "percentage": 12, "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "GST 18%", "percentage": 18, "created_at": datetime.utcnow().isoformat()},
    ])

# Check if units exist
if db.item_units.count_documents({}) == 0:
    print("      Creating units...")
    db.item_units.insert_many([
        {"id": str(uuid.uuid4()), "name": "Piece", "abbreviation": "PCS", "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "Strip", "abbreviation": "STRIP", "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "Box", "abbreviation": "BOX", "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "Tablet", "abbreviation": "TAB", "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "name": "Bottle", "abbreviation": "BTL", "created_at": datetime.utcnow().isoformat()},
    ])

print("      Done!")

# Step 4: Create .env files
print("\n[4/4] Creating configuration files...")

# Get script directory
script_dir = os.path.dirname(os.path.abspath(__file__))

# Backend .env
backend_env_path = os.path.join(script_dir, "backend", ".env")
with open(backend_env_path, "w") as f:
    f.write("MONGO_URL=mongodb://localhost:27017\n")
    f.write("DB_NAME=dentalsuthra\n")
    f.write("CORS_ORIGINS=*\n")
    f.write("JWT_SECRET_KEY=dentalsuthra-secret-key-2024\n")
print(f"      Created: backend\\.env")

# Frontend .env
frontend_env_path = os.path.join(script_dir, "frontend", ".env")
with open(frontend_env_path, "w") as f:
    f.write("REACT_APP_BACKEND_URL=http://localhost:8000\n")
print(f"      Created: frontend\\.env")

print("\n" + "="*60)
print("   SETUP COMPLETE!")
print("="*60)
print("""
   Login Credentials:
   ------------------
   Email:    admin@clinic.com
   Password: admin123

   Next Steps:
   -----------
   Option A: Double-click START.bat
   
   Option B: Manual startup
   
   1. Open Command Prompt #1 and run:
      cd backend
      uvicorn server:app --host 0.0.0.0 --port 8000 --reload

   2. Open Command Prompt #2 and run:
      cd frontend
      yarn start

   3. Open browser: http://localhost:3000

   4. Login with the credentials above
""")
print("="*60)
input("\nPress Enter to exit...")
