import sys
import os
import re
sys.path.append(os.getcwd())
from backend.db.mongo_client import jobs_col

print("Searching for bangalore...")
query = {
    "$or": [
        {"area": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
        {"city": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
        {"state": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
        {"full_address": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
        {"description": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
        {"location": {"$regex": re.compile("bangalore", re.IGNORECASE)}},
    ]
}

jobs = list(jobs_col.find(query))
print(f"Found {len(jobs)} matching jobs.")
for job in jobs:
    print(job)
    
print("Done")
