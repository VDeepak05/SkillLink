import os


import pandas as pd
from pymongo import MongoClient
from urllib.parse import quote_plus

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

# ---------- Load CSV ----------

CSV_PATH = "../data/jobrec_final_dataset.csv"
print("CSV exists:", os.path.exists(CSV_PATH))
print("CSV absolute path:", os.path.abspath(CSV_PATH))
df = pd.read_csv(CSV_PATH)

print(f"Loaded {len(df)} rows from CSV")

# ---------- Clean NaNs ----------
df = df.fillna("")

# ---------- Convert to dict ----------
records = df.to_dict(orient="records")

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

else:
    print("No records found!")

print("DONE")

