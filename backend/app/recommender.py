import pickle
import numpy as np
import json
import time
import scipy.sparse as sp
from sklearn.metrics.pairwise import cosine_similarity
from db.mongo_client import logs_col


# ---------------------------
# LOAD ARTIFACTS (ONCE)
# ---------------------------

# Load TF-IDF vectorizer
with open("data/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

# Load sparse job vectors
# job_vectors = np.load("data/job_vectors.npy") ---> sparse matrix takes more space as the below is an optimised method
job_vectors = sp.load_npz("data/job_vectors.npz")

# Load job metadata (order aligned with vectors)
with open("data/job_metadata.json", "r") as f:
    jobs = json.load(f)

# verify size
print("Job vectors shape:", job_vectors.shape)
print("Metadata length:", len(jobs))

# ---------------------------
# BUILD SHIFT INDEX MAP
# ---------------------------

shift_index_map = {}

for idx, job in enumerate(jobs):
    shift = str(job.get("shift_type", "")).lower()
    if shift not in shift_index_map:
        shift_index_map[shift] = []
    shift_index_map[shift].append(idx)


# ---------------------------
# BUILD JOB POPULARITY MAP
# ---------------------------

job_popularity = {}

logs = logs_col.find({}, {"_id": 0})

for log in logs:
    job_id = log.get("job_id")
    if job_id:
        job_popularity[job_id] = job_popularity.get(job_id, 0) + 1


# ---------------------------
# RECOMMENDATION FUNCTION
# ---------------------------

def recommend_jobs(profile):
    """
    Hybrid Recommender:
    - TF-IDF Content Similarity
    - Shift Pre-filtering
    - Popularity Boosting
    """

    start = time.perf_counter()

    # 1️⃣ Build profile text
    profile_text = f"{profile['skills']} {profile['preferred_shift']}"
# For checking how much time it takes for api to return
    t0 = time.perf_counter()

    student_vector = tfidf.transform([profile_text])
    t1 = time.perf_counter()

  # 2️⃣ SHIFT PRE-FILTER
    preferred_shift = profile["preferred_shift"].lower()

    candidate_indices = shift_index_map.get(
        preferred_shift,
        list(range(len(jobs)))  # fallback if shift not found
    )

    filtered_vectors = job_vectors[candidate_indices]
    t2 = time.perf_counter()

    similarities = cosine_similarity(student_vector, filtered_vectors)[0]
    t3 = time.perf_counter()

    print("Vector transform:", (t1 - t0) * 1000)
    print("Index filtering:", (t2 - t1) * 1000)
    print("Cosine similarity:", (t3 - t2) * 1000)

    student_vector = tfidf.transform([profile_text])

    # # 2️⃣ SHIFT PRE-FILTER
    # preferred_shift = profile["preferred_shift"].lower()

    # candidate_indices = shift_index_map.get(
    #     preferred_shift,
    #     list(range(len(jobs)))  # fallback if shift not found
    # )

    filtered_vectors = job_vectors[candidate_indices]

    # 3️⃣ Compute cosine similarity only on filtered jobs
    similarities = cosine_similarity(student_vector, filtered_vectors)[0]

    # Get top 10 within filtered set
    top_local_indices = similarities.argsort()[-20:][::-1]

    recommendations = []

    popularity_weight = 0.02  # tune between 0.01–0.05

    # 🔥 SINGLE AGGREGATION QUERY (IMPORTANT)
    # ---------------------------------------

    candidate_job_ids = [
        jobs[candidate_indices[i]]["job_id"]
        for i in top_local_indices
    ]

    # pipeline = [
    #     {"$match": {"job_id": {"$in": candidate_job_ids}}},
    #     {"$group": {"_id": "$job_id", "count": {"$sum": 1}}}
    # ]

    # popularity_results = logs_col.aggregate(pipeline)
    # popularity_map = {doc["_id"]: doc["count"] for doc in popularity_results}
    
   

    for local_idx in top_local_indices:
        global_idx = candidate_indices[local_idx]
        job = jobs[global_idx]  # prevent modifying original

        base_score = similarities[local_idx]

        # 4️⃣ Dynamic Popularity Query but use in memory popularity cache(no db call)
        job_id = job.get("job_id")
        popularity = job_popularity.get(job_id, 0)

        boosted_score = base_score + (popularity_weight * popularity)

        recommendations.append({
            "job_id": job.get("job_id"),
            "job_title": job.get("job_title"),
            "shop_type": job.get("shop_type"),
            "shift_type": job.get("shift_type"),
            "salary_per_day": job.get("salary_per_day"),
            "score": float(boosted_score)
        })
        # popularity = logs_col.count_documents({"job_id": job_id})

        # boosted_score = base_score + (popularity_weight * popularity)

        # job["score"] = float(boosted_score)

        # recommendations.append(job)

        # Final re-rank after boosting
    recommendations = sorted(
        recommendations,
        key=lambda x: x["score"],
        reverse=True
    )[:10]

    duration = time.perf_counter() - start
    print(f"Inference time: {duration*1000:.2f} ms")

    return recommendations
   
