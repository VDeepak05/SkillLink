import os
from datetime import datetime, timezone, timedelta
try:
    from backend.db.mongo_client import jobs_col
except ImportError:
    from mongo_client import jobs_col
import pandas as pd
from pymongo import MongoClient
from urllib.parse import quote_plus
import random

# ---------- MongoDB Config ----------
USERNAME = "User1"
PASSWORD = quote_plus("PASSuser1")
CLUSTER = "cluster0.n17tg.mongodb.net"

MONGO_URI = (
    f"mongodb+srv://{USERNAME}:{PASSWORD}@{CLUSTER}/"
    "job_recommendation?retryWrites=true&w=majority"
)

# ---------- Connect ----------
client = MongoClient(MONGO_URI)
db = client["job_recommendation"]
jobs_col = db["jobs"]

# Create Geo Index (runs safely even if exists)
jobs_col.create_index([("location", "2dsphere")])
jobs_col.create_index("job_id")

# ---------- Load CSV ----------

CSV_PATH = "backend/data/final_safe_jobs_dataset.csv"
print("CSV exists:", os.path.exists(CSV_PATH))
print("CSV absolute path:", os.path.abspath(CSV_PATH))
df = pd.read_csv(CSV_PATH)

print(f"Loaded {len(df)} rows from CSV")
print("Unique job_ids:", df["job_id"].nunique())

# ---------- Clean NaNs ----------
df = df.fillna("")

# ---------- Convert to dict ----------
records = df.to_dict(orient="records")

# ---------- Add Realistic created_at ----------
today = datetime.now(timezone.utc)

for job in records:
    # Distribute jobs over last 60 days
    days_ago = random.randint(0, 60)
    job["created_at"] = today - timedelta(days=days_ago)

    # Add GeoJSON location field (empty for now)
    job["location"] = None

    # Optional: Ensure address fields exist
    job.setdefault("shop_name", None)
    job.setdefault("address_line", None)
    job.setdefault("area", None)
    job.setdefault("city", None)
    job.setdefault("state", None)
    job.setdefault("pincode", None)
# ---------- Insert ----------
if records:
    BATCH_SIZE = 1000  # safe for Atlas free tier

    total = len(records)
    inserted = 0

    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        jobs_col.insert_many(batch)
        inserted += len(batch)
        print(f"Inserted {inserted}/{total} jobs")

    print("All jobs inserted successfully!")
    print("Documents in Mongo after insert:", jobs_col.count_documents({}))

else:
    print("No records found!")

print("DONE")

