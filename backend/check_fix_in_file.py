
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# We need a token or we need to skip auth if possible
# Since I'm on the server, I can try to find a valid token or check if there's a way to bypass
# But easier to just mock the db call again if I can't call the endpoint directly
# Actually, I'll just check if the server.py file has been saved correctly

print("Verifying server.py content...")
with open("c:\\bug fix 4\\DentalSuthra\\backend\\server.py", "r") as f:
    content = f.read()
    if "low_stock_threshold" in content:
        print("FIX IS IN FILE.")
    else:
        print("FIX IS NOT IN FILE!")
