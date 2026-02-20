import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['dentalsuthra']
    
    # 1. Find the Godown ID for 'Rnr'
    godown = await db.godowns.find_one({'name': 'Rnr'})
    if not godown:
        print('Godown Rnr not found')
        return
    gid = godown.get('id')
    print(f'Godown Rnr ID: {gid}')

    # 2. Check Purchase Entries for ketoford DT in Rnr
    print(f'\n--- Purchase Entries matching Godown {gid} ---')
    pe_matches = await db.purchase_entries.find({'godown_id': gid}).to_list(100)
    for pe in pe_matches:
        for itm in pe.get('items', []):
            if 'ketoford' in itm.get('medicine_name', '').lower() or 'cefix' in itm.get('medicine_name', '').lower():
                print(f"  PE {pe.get('id')}: {itm.get('medicine_name')} | Qty={itm.get('quantity')}, Free={itm.get('free_quantity')}, Batch={itm.get('batch_number')}, MRP={itm.get('mrp')}")

    # 3. Check Medicine adjustments for ketoford DT and cefix in Rnr
    print(f'\n--- Medicine adjustments matching Godown {gid} ---')
    med_matches = await db.medicines.find({'godown_id': gid}).to_list(500)
    for med in med_matches:
        name = med.get('name', '')
        if 'ketoford' in name.lower() or 'cefix' in name.lower():
            print(f"  MED {med.get('id')}: {name} | Qty={med.get('stock_quantity')}, Purpose={med.get('purpose')}, Batch={med.get('batch_number')}, MRP={med.get('mrp')}")

    # 4. Check for any transfers involving 'ketoford' or 'cefix'
    print(f'\n--- Recent Stock Transfers ---')
    transfers = await db.stock_transfers.find().sort('created_at', -1).limit(10).to_list(10)
    for trf in transfers:
        for item in trf.get('items', []):
            if 'ketoford' in item.get('item_name', '').lower() or 'cefix' in item.get('item_name', '').lower():
                print(f"  TRF {trf.get('id')}: {item.get('item_name')} | Qty={item.get('quantity')}, From={trf.get('from_id')} ({trf.get('from_type')}), To={trf.get('to_id')} ({trf.get('to_type')})")

asyncio.run(check())
