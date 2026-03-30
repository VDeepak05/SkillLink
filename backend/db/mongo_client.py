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

# 1. Print the exact path Python is looking at for your .env file
env_path = os.path.join(os.path.dirname(__file__), "../../.env")
print(f"---> DEBUG: Looking for .env file at: {os.path.abspath(env_path)}")

load_dotenv(dotenv_path=env_path)

# 2. Fetch variables safely
USERNAME = os.getenv("MONGO_USERNAME") or os.getenv("mongo_username")
RAW_PASSWORD = os.getenv("MONGO_PASSWORD") or os.getenv("mongo_password")
CLUSTER = os.getenv("MONGO_CLUSTER") or os.getenv("mongo_cluster")

# 3. Print what Python actually found (without revealing your password)
print(f"---> DEBUG: Username found? {bool(USERNAME)}")
print(f"---> DEBUG: Password found? {bool(RAW_PASSWORD)}")
print(f"---> DEBUG: Cluster found? {bool(CLUSTER)}")

# 4. Connect
if USERNAME and RAW_PASSWORD and CLUSTER:
    PASSWORD = quote_plus(RAW_PASSWORD)
    MONGO_URI = (
        f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/"
        "job_recommendation?retryWrites=true&w=majority"
    )
    print("---> DEBUG: Attempting to connect to MongoDB...")
    client = MongoClient(MONGO_URI)
    db = client["job_recommendation"]
    print("---> DEBUG: Connection successful!")
else:
    print("---> CRITICAL ERROR: Cannot connect. One or more variables are None.")
    client = MongoClient() # Dummy fallback so the app boots, but routes will fail
    db = client["job_recommendation"]

# Collections
users_col = db["users"]
students_col = db["students"]
retailers_col = db["retailers"]
jobs_col = db["jobs"]
logs_col = db["interaction_logs"]
applications_col = db["applications"]
messages_col = db["messages"]

# Indexes are commented out for Serverless compatibility!