import sys
import os
sys.path.append(os.getcwd())
from backend.db.mongo_client import users_col
print("finding user...")
print(users_col.find_one({"email": "nonexistent@example.com"}))
print("done")
