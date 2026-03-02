import sys
import os
import json
from bson import json_util
sys.path.append(os.getcwd())
from backend.db.mongo_client import jobs_col

jobs = list(jobs_col.find({}))
print(f"Total jobs: {len(jobs)}")
for j in jobs:
    print(json.dumps(j, default=json_util.default, indent=2))
