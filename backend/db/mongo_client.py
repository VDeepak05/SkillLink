import os
from pymongo import MongoClient
from urllib.parse import quote_plus
from dotenv import load_dotenv
load_dotenv()


# Load from environment variables
USERNAME = os.getenv("MONGO_USERNAME")
PASSWORD = quote_plus(os.getenv("MONGO_PASSWORD"))
CLUSTER = os.getenv("MONGO_CLUSTER")

MONGO_URI = (
    f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/"
    "job_recommendation?retryWrites=true&w=majority"
)

client = MongoClient(MONGO_URI)

db = client["job_recommendation"]

users_col = db["users"]
students_col = db["students"]
retailers_col = db["retailers"]
jobs_col = db["jobs"]
logs_col = db["interaction_logs"]

# ---------------------------
# INDEXES
# ---------------------------

logs_col.create_index("student_id")
logs_col.create_index("job_id")
logs_col.create_index([("student_id", 1), ("job_id", 1)])

jobs_col.create_index("job_id")
students_col.create_index("student_id")
retailers_col.create_index("retailer_id")
jobs_col.create_index("created_at")
jobs_col.create_index([("location", "2dsphere")])
