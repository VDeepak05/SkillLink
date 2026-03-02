import sys
import os
sys.path.append(os.getcwd())
from backend.db.mongo_client import jobs_col

print("Updating coordinates...")
result = jobs_col.update_many(
    {}, 
    {"$set": {"latitude": 10.7867, "longitude": 76.6548}}
)
print(f"Modified {result.modified_count} jobs.")
print("Done")
