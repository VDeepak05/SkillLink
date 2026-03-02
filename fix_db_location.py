import sys
import os
sys.path.append(os.getcwd())
from backend.db.mongo_client import jobs_col
from bson import ObjectId

result = jobs_col.update_many({"area": "Bangalore"}, {"$set": {"area": "Palakkad"}})
print(f"Updated {result.modified_count} jobs.")

# Additional check for case-insensitivity
result2 = jobs_col.update_many({"area": {"$regex": "^bangalore$", "$options": "i"}}, {"$set": {"area": "Palakkad"}})
print(f"Updated additional {result2.modified_count} jobs.")
