# import os
# from pymongo import MongoClient
# from urllib.parse import quote_plus
# from dotenv import load_dotenv
# load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))


# # Load from environment variables
# USERNAME = os.getenv("MONGO_USERNAME")
# PASSWORD = quote_plus(os.getenv("MONGO_PASSWORD"))
# CLUSTER = os.getenv("MONGO_CLUSTER")

# MONGO_URI = (
#     f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/"
#     "job_recommendation?retryWrites=true&w=majority"
# )

# client = MongoClient(MONGO_URI)

# db = client["job_recommendation"]

# users_col = db["users"]
# students_col = db["students"]
# retailers_col = db["retailers"]
# jobs_col = db["jobs"]
# logs_col = db["interaction_logs"]
# applications_col = db["applications"]
# messages_col = db["messages"]

# # ---------------------------
# # INDEXES
# # ---------------------------

# logs_col.create_index("student_id")
# logs_col.create_index("job_id")
# logs_col.create_index([("student_id", 1), ("job_id", 1)])

# jobs_col.create_index("job_id")
# students_col.create_index("student_id")
# retailers_col.create_index("retailer_id")
# jobs_col.create_index("created_at")
# jobs_col.create_index([("location", "2dsphere")])


import os
from pymongo import MongoClient
from urllib.parse import quote_plus
from dotenv import load_dotenv

# 1. Safely load .env only if we are running locally
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)

# 2. Fetch variables safely (checking for both UPPER and lower case just in case)
USERNAME = os.getenv("MONGO_USERNAME") or os.getenv("mongo_username")
RAW_PASSWORD = os.getenv("MONGO_PASSWORD") or os.getenv("mongo_password")
CLUSTER = os.getenv("MONGO_CLUSTER") or os.getenv("mongo_cluster")

# 3. Prevent the quote_plus(None) crash if variables are missing
if not USERNAME or not RAW_PASSWORD or not CLUSTER:
    print("CRITICAL WARNING: MongoDB Environment Variables are missing!")
    # We initialize a dummy client so the app doesn't crash on boot, 
    # but the specific route will fail gracefully and show you the real error.
    client = MongoClient() 
else:
    PASSWORD = quote_plus(RAW_PASSWORD)
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
applications_col = db["applications"]
messages_col = db["messages"]

# ---------------------------
# INDEXES REMOVED FOR SERVERLESS
# ---------------------------
# Vercel will time out if you try to build indexes on every API request.
# Since you already ran this code locally, MongoDB Atlas has already saved these indexes! 
# You do not need to run them again. If you ever need new indexes, create them 
# directly in the MongoDB Atlas UI.