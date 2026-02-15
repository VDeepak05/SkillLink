from pymongo import MongoClient
from urllib.parse import quote_plus

USERNAME = "User1"
PASSWORD = quote_plus("PASSuser1")
CLUSTER = "cluster0.n17tg.mongodb.net"

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
logs_col.create_index("job_id")
