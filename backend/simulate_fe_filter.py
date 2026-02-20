
import json

# Data captured from my reproduction script verify_server_fix.py
low_stock_api_response = [
  {
    "name": "vitamin c (lemoncee)",
    "branch_id": "3989b9a9-e2e8-448d-ab07-968352afe6aa",
    "branch_name": "Thirunagar",
    "godown_id": None,
    "stock_quantity": -10,
    "min_stock_level": 15
  },
  {
    "name": "test panedol",
    "branch_id": "3989b9a9-e2e8-448d-ab07-968352afe6aa",
    "branch_name": "Thirunagar",
    "godown_id": None,
    "stock_quantity": -10,
    "min_stock_level": 10
  },
  {
    "name": "test panedol",
    "branch_id": None,
    "branch_name": None,
    "godown_id": "e079c40f-7933-4dd7-b3aa-8ad924108dcb",
    "godown_name": "Rnr",
    "stock_quantity": 0,
    "min_stock_level": 10
  }
]

# Simulate selected filters (Branch Thirunagar checked, Godown Rnr UNCHECKED)
selectedBranches = ["3989b9a9-e2e8-448d-ab07-968352afe6aa"]
selectedGodowns = []

def filter_low_stock(items, branches, godowns):
    filtered = []
    for item in items:
        # Match Logic from Dashboard.js
        branchMatch = any(id == item["branch_id"] or id == item["branch_name"] for id in branches)
        godownMatch = any(id == item["godown_id"] or id == item["godown_name"] for id in godowns)
        
        if branchMatch or godownMatch:
            filtered.append(item)
    return filtered

results = filter_low_stock(low_stock_api_response, selectedBranches, selectedGodowns)

print(f"Items after filtering (Thirunagar Branch selected, Rnr Godown NOT selected):")
for r in results:
    print(f"  - {r['name']} ({r.get('branch_name') or 'No Branch'})")

print(f"\nTotal: {len(results)}")
