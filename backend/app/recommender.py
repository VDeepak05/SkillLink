import pickle
import numpy as np
import json
import time
import scipy.sparse as sp
from sklearn.metrics.pairwise import cosine_similarity
from db.mongo_client import logs_col, jobs_col
from datetime import datetime, timezone
from scipy.sparse import csr_matrix
import threading
import time as time_module


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
    shift_index_map.setdefault(shift, []).append(idx)
    # if shift not in shift_index_map:
    #     shift_index_map[shift] = []
    # shift_index_map[shift].append(idx)

# job_id → job dictionary
job_lookup = {job["job_id"]: job for job in jobs}

# ---------------------------
# BUILD JOB POPULARITY MAP
# ---------------------------

job_popularity = {}

for log in logs_col.find({}, {"job_id": 1, "_id": 0}):
    job_id = log.get("job_id")
    if job_id:
        job_popularity[job_id] = job_popularity.get(job_id, 0) + 1

# ---------------------------
# BUILD CREATED_AT CACHE
# ---------------------------

job_created_at = {}

for doc in jobs_col.find({}, {"job_id": 1, "created_at": 1, "_id": 0}):
    job_created_at[doc["job_id"]] = doc.get("created_at")

# ---------------------------
# BUILD COLLABORATIVE MATRIX
# ---------------------------

def rebuild_collaborative_matrix():
    global interaction_matrix, item_similarity_matrix
    global student_ids, student_index

    print("Building collaborative filtering matrix...")

    student_ids = list({log["student_id"] for log in logs_col.find({}, {"student_id": 1})})
    job_ids = [job["job_id"] for job in jobs]

    student_index = {sid: i for i, sid in enumerate(student_ids)}
    job_index = {jid: i for i, jid in enumerate(job_ids)}

    rows, cols, data = [], [], []

    for log in logs_col.find({}, {"student_id": 1, "job_id": 1, "event_type": 1}):

        sid = log["student_id"]
        jid = log["job_id"]

        if sid not in student_index or jid not in job_index:
            continue

        weight = 5 if log["event_type"] == "apply" else 3 if log["event_type"] == "save" else 1

        rows.append(student_index[sid])
        cols.append(job_index[jid])
        data.append(weight)

    if rows:
        interaction_matrix = csr_matrix(
            (data, (rows, cols)),
            shape=(len(student_ids), len(job_ids))
        )

        item_similarity_matrix = cosine_similarity(
            interaction_matrix.T,
            dense_output=False
        )
    else:
        interaction_matrix = None
        item_similarity_matrix = None

    print("Collaborative matrix built.")

rebuild_collaborative_matrix()


# ---------------------------
# CF AUTO REFRESH SETTINGS
# ---------------------------

last_cf_update = datetime.now(timezone.utc)
CF_REFRESH_INTERVAL = 300  # seconds (5 minutes)

def cf_background_worker():
    while True:
        time_module.sleep(CF_REFRESH_INTERVAL)
        print("🔄 Background CF rebuild started...")
        rebuild_collaborative_matrix()
        print("✅ Background CF rebuild finished.")

# Start background thread
cf_thread = threading.Thread(target=cf_background_worker, daemon=True)
cf_thread.start()


# ---------------------------
# RECOMMENDATION FUNCTION
# ---------------------------

def recommend_jobs(profile):
    """
    Hybrid Recommender:
    - TF-IDF Content Similarity
    - Shift Pre-filtering
    - Popularity Boosting
    - User Personalized Category Boost
    - Recency Boost
    """

    start = time.perf_counter()

    global last_cf_update

    if (datetime.now(timezone.utc) - last_cf_update).seconds > CF_REFRESH_INTERVAL:
        rebuild_collaborative_matrix()
        last_cf_update = datetime.now(timezone.utc)


    student_id = profile["student_id"]

    # -----------------------------------
    # 1️⃣ GEO FILTER + DISTANCE FETCH
    # -----------------------------------

    geo_filtered = None
    distance_map = {}

    student_lat = profile.get("latitude")
    student_lon = profile.get("longitude")
    max_distance = profile.get("max_distance_km")

    if student_lat and student_lon and max_distance:

        pipeline = [
            {
                "$geoNear": {
                    "near": {
                        "type": "Point",
                        "coordinates": [student_lon, student_lat]
                    },
                    "distanceField": "distance",
                    "maxDistance": max_distance * 1000,
                    "spherical": True
                }
            },

            {"$project": {"job_id": 1, "distance": 1}}
        ]

        results = list(jobs_col.aggregate(pipeline))

        if not results:
            return []

        geo_filtered = {doc["job_id"] for doc in results}

        # Store distance in km
        for doc in results:
            distance_map[doc["job_id"]] = doc["distance"] / 1000




    # 1️⃣ Build profile text
    profile_text = f"{profile['skills']} {profile['preferred_shift']}"
# # For checking how much time it takes for api to return
#     t0 = time.perf_counter()

#     student_vector = tfidf.transform([profile_text])
#     t1 = time.perf_counter()

#   # 2️⃣ SHIFT PRE-FILTER
#     preferred_shift = profile["preferred_shift"].lower()

#     candidate_indices = shift_index_map.get(
#         preferred_shift,
#         list(range(len(jobs)))  # fallback if shift not found
#     )

#     filtered_vectors = job_vectors[candidate_indices]
#     t2 = time.perf_counter()

#     similarities = cosine_similarity(student_vector, filtered_vectors)[0]
#     t3 = time.perf_counter()

#     print("Vector transform:", (t1 - t0) * 1000)
#     print("Index filtering:", (t2 - t1) * 1000)
#     print("Cosine similarity:", (t3 - t2) * 1000)

    student_vector = tfidf.transform([profile_text])

    # 2️⃣ SHIFT PRE-FILTER
    preferred_shift = profile["preferred_shift"].lower()

    candidate_indices = shift_index_map.get(
        preferred_shift,
        list(range(len(jobs)))  # fallback if shift not found
    )

    # -----------------------------------
    # 4️⃣ APPLY GEO FILTER ON INDICES
    # -----------------------------------

    if geo_filtered is not None:
        candidate_indices = [
            idx for idx in candidate_indices
            if jobs[idx]["job_id"] in geo_filtered
        ]

        if not candidate_indices:
            return []



    filtered_vectors = job_vectors[candidate_indices]

    # 3️⃣ Compute cosine similarity only on filtered jobs
    similarities = cosine_similarity(student_vector, filtered_vectors)[0]

    # Normalize content
    norm_content = similarities / similarities.max() if similarities.max() > 0 else similarities

    # ---------------------------
    # COLLABORATIVE SCORE
    # ---------------------------

    collab_scores = np.zeros(len(candidate_indices))

    if interaction_matrix is not None and student_id in student_index:

        s_idx = student_index[student_id]

        # Jobs this student interacted with
        student_vector_cf = interaction_matrix[s_idx]

        # Multiply with item similarity
        cf_raw_scores = student_vector_cf @ item_similarity_matrix

        cf_raw_scores = np.array(cf_raw_scores).flatten()

        # Extract candidate indices only
        collab_scores = np.array([
            cf_raw_scores[job_index[jobs[idx]["job_id"]]]
            if jobs[idx]["job_id"] in job_index else 0
            for idx in candidate_indices
        ])

    norm_collab = collab_scores / collab_scores.max() if collab_scores.max() > 0 else collab_scores

    # ===========================
    # USER PERSONALIZATION SIGNAL
    # ===========================

    category_preference = {}

    user_logs = logs_col.find(
        {"student_id": student_id},
        {"job_id": 1, "event_type": 1, "_id": 0}
    )

    for log in user_logs:
        job = job_lookup.get(log["job_id"])
        if not job:
            continue

        category = job.get("shop_type")
        if not category:
            continue

        weight = 5 if log["event_type"] == "apply" else 3 if log["event_type"] == "save" else 1
        category_preference[category] = category_preference.get(category, 0) + weight

    max_personal = max(category_preference.values()) if category_preference else 1
    max_popularity = max(job_popularity.values()) if job_popularity else 1



    # ===========================
    # RANKING WITH MULTIPLE SIGNALS
    # ===========================

    recommendations = []

    # ---------------------------
    # ADAPTIVE WEIGHTING
    # ---------------------------

    user_interaction_count = logs_col.count_documents({"student_id": student_id})

    if user_interaction_count < 5:
        # Cold start user
        alpha = 0.60   # content
        beta = 0.10    # collaborative
    else:
        # Active user
        alpha = 0.35
        beta = 0.30

    gamma = 0.10   # popularity
    delta = 0.10   # personal
    epsilon = 0.10 # recency
    zeta = 0.05    # distance

    # # SINGLE AGGREGATION QUERY
    # # ---------------------------------------

    # candidate_job_ids = [
    #     jobs[candidate_indices[i]]["job_id"]
    #     for i in top_local_indices
    # ]

    # # pipeline = [
    # #     {"$match": {"job_id": {"$in": candidate_job_ids}}},
    # #     {"$group": {"_id": "$job_id", "count": {"$sum": 1}}}
    # # ]

    # # popularity_results = logs_col.aggregate(pipeline)
    # # popularity_map = {doc["_id"]: doc["count"] for doc in popularity_results}
    #Instead of single aggregation query from db, in memory popularity cache is used to make it faster
   
    top_local_indices = norm_content.argsort()[-20:][::-1]

    for local_idx in top_local_indices:
        global_idx = candidate_indices[local_idx]
        job = jobs[global_idx]  # prevent modifying original
        job_id = job["job_id"]
        
        base_score = norm_content[local_idx]
        collab_score = norm_collab[local_idx] if len(norm_collab) > 0 else 0


        # 4️⃣ Dynamic Popularity Query but use in memory popularity cache(no db call)
        popularity = job_popularity.get(job_id, 0)
        norm_popularity = popularity / max_popularity if max_popularity > 0 else 0

         # Personal category boost
        category = job.get("shop_type")
        personal_boost = category_preference.get(category, 0)
        norm_personal = personal_boost / max_personal if max_personal > 0 else 0

        # Recency Boost
        created_dt = job_created_at.get(job_id)

        if created_dt:
            now = datetime.now(timezone.utc)
            days_old = (now - created_dt).days
            recency_score = 1 / (1 + max(days_old, 0))
        else:
            recency_score = 0
            
        # ---------------------------
        # DISTANCE BOOST
        # ---------------------------
        distance_score = 0

        if geo_filtered is not None:
            job_distance = distance_map.get(job_id)

            if job_distance is not None:
                # Closer = higher score
                distance_score = 1 / (1 + job_distance)


        final_score = (
            alpha * base_score
            + beta * collab_score
            + gamma * norm_popularity
            + delta * norm_personal
            + epsilon * recency_score
            + zeta * distance_score
        )
        full_address = ", ".join(
            filter(None, [
                job.get("address_line"),
                job.get("area"),
                job.get("city"),
                job.get("state"),
                job.get("pincode")
            ])
        )

        recommendations.append({
            "job_id": job.get("job_id"),
            "job_title": job.get("job_title"),
            "shop_type": job.get("shop_type"),
            "shift_type": job.get("shift_type"),
            "salary_per_day": job.get("salary_per_day"),
            "shop_name": job.get("shop_name"),
            "full_address": full_address if full_address else None,
            "score": float(final_score)
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
   
