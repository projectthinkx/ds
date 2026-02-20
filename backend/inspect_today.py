import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from dotenv import load_dotenv

async def inspect():
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client.dentalsuthra
    
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    start_of_day = today + "T00:00:00"
    end_of_day = today + "T23:59:59"
    
    query = {"created_at": {"$gte": start_of_day, "$lte": end_of_day}}
    
    print(f"Inspecting for {today}...")
    
    bills = await db.bills.find(query).to_list(100)
    print(f"\nBills found: {len(bills)}")
    for b in bills:
        print(f"Bill ID: {b.get('id')}, Patient: {b.get('patient_name')}, Total: {b.get('total_amount')}, Paid: {b.get('paid_amount')}, Mode: '{b.get('payment_mode')}'")
        
    sales = await db.pharmacy_sales.find(query).to_list(100)
    print(f"\nPharmacy Sales found: {len(sales)}")
    for s in sales:
        print(f"Sale ID: {s.get('id')}, Patient: {s.get('patient_name')}, Total: {s.get('total_amount')}, Paid: {s.get('paid_amount')}, Mode: '{s.get('payment_mode')}'")

    # Check credit-payments
    credit_payments = await db.credit_payments.find({"payment_date": today}).to_list(100)
    print(f"\nCredit Payments found: {len(credit_payments)}")
    for cp in credit_payments:
        print(f"Payment ID: {cp.get('id')}, Amount: {cp.get('amount')}, Mode: '{cp.get('payment_mode')}'")

if __name__ == "__main__":
    asyncio.run(inspect())
