

#MONGO_URI = "mongodb+srv://user1:PASSuser1@cluster0.n17tg.mongodb.net/?appName=Cluster0"
#MONGO_URI = (
#    "mongodb+srv://user1:PASSuser1@cluster0.n17tg.mongodb.net/"
#    "job_recommendation?retryWrites=true&w=majority"
#)

print("Starting MongoDB connection test...")

from pymongo import MongoClient
from urllib.parse import quote_plus

USERNAME = "User1"
PASSWORD = quote_plus("PASSuser1")

MONGO_URI = (
    f"mongodb+srv://{USERNAME}:{PASSWORD}"
    "@cluster0.n17tg.mongodb.net/"
    "job_recommendation?retryWrites=true&w=majority"
)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

print("Connected successfully!")

db = client["job_recommendation"]
db = client["job_recommendation"]
jobs_col = db["jobs"]

jobs_col.insert_one({
    "job_id": "INIT001",
    "job_title": "Initialization Job",
    "salary_per_day": 400
})

print("Inserted initial job document")

print("Databases:", client.list_database_names())
print("DONE")

