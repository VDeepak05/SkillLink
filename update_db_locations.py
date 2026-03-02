import sys
import os
sys.path.append(os.getcwd())
from backend.db.mongo_client import jobs_col

print("Updating locations...")
result = jobs_col.update_many({"area": "Bangalore"}, {"$set": {"area": "Palakkad"}})
print(f"Modified {result.modified_count} jobs.")
print("Done")
