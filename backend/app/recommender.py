import pickle
import numpy as np
import json
import time
import scipy.sparse as sp
from sklearn.metrics.pairwise import cosine_similarity
from backend.db.mongo_client import logs_col, jobs_col
from datetime import datetime, timezone
from scipy.sparse import csr_matrix
import threading
import time as time_module

# =========================================================
# LOAD ARTIFACTS (ONCE AT STARTUP)
# =========================================================

with open("backend/data/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

job_vectors = sp.load_npz("backend/data/job_vectors.npz")

with open("backend/data/job_metadata.json", "r") as f:
    jobs = json.load(f)

print("Job vectors shape:", job_vectors.shape)
print("Metadata length:", len(jobs))

# =========================================================
# PRECOMPUTED LOOKUPS
# =========================================================

shift_index_map = {}
for idx, job in enumerate(jobs):
    shift = str(job.get("shift_type", "")).lower()
    shift_index_map.setdefault(shift, []).append(idx)

job_lookup = {job["job_id"]: job for job in jobs}

# =========================================================
# POPULARITY CACHE
# =========================================================

job_popularity = {}
for log in logs_col.find({}, {"job_id": 1, "_id": 0}):
    jid = log.get("job_id")
    if jid:
        job_popularity[jid] = job_popularity.get(jid, 0) + 1

# =========================================================
# CREATED_AT CACHE
# =========================================================

job_created_at = {}
for doc in jobs_col.find({}, {"job_id": 1, "created_at": 1, "_id": 0}):
    job_created_at[doc["job_id"]] = doc.get("created_at")

# =========================================================
# COLLABORATIVE FILTERING
# =========================================================

interaction_matrix = None
item_similarity_matrix = None
student_index = {}
job_index = {}

def rebuild_collaborative_matrix():
    global interaction_matrix, item_similarity_matrix
    global student_index, job_index

    print("Building collaborative matrix...")

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

        weight = 5 if log["event_type"] == "apply" else \
                 3 if log["event_type"] == "save" else 1

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
    if interaction_matrix is not None:
        print("Interaction matrix shape:", interaction_matrix.shape)
        print("Item similarity shape:", item_similarity_matrix.shape)
    else:
        print("No interactions found. Collaborative filtering disabled.")
rebuild_collaborative_matrix()

# =========================================================
# AUTO REFRESH CF (BACKGROUND THREAD)
# =========================================================

CF_REFRESH_INTERVAL = 300  # 5 minutes

def cf_background_worker():
    while True:
        time_module.sleep(CF_REFRESH_INTERVAL)
        rebuild_collaborative_matrix()

cf_thread = threading.Thread(target=cf_background_worker, daemon=True)
cf_thread.start()

# =========================================================
# RECOMMENDER
# =========================================================

def recommend_jobs(profile, evaluation_mode=False):

    start = time.perf_counter()
    student_id = profile["student_id"]

    # -------------------------
    # GEO FILTER
    # -------------------------

    geo_filtered = None
    distance_map = {}

    if not evaluation_mode:

        lat = profile.get("latitude")
        lon = profile.get("longitude")
        max_distance = profile.get("max_distance_km")

        if lat and lon and max_distance:

            pipeline = [
                {
                    "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": [lon, lat]
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
            for doc in results:
                distance_map[doc["job_id"]] = doc["distance"] / 1000

    # -------------------------
    # CONTENT VECTOR
    # -------------------------

    profile_text = f"{profile.get('skills','')} {profile.get('preferred_shift','')}"
    student_vector = tfidf.transform([profile_text])

    # -------------------------
    # SHIFT FILTER (DISABLED IN EVAL)
    # -------------------------

    if evaluation_mode:
        candidate_indices = list(range(len(jobs)))
    else:
        preferred_shift = profile.get("preferred_shift","").lower()
        candidate_indices = shift_index_map.get(
            preferred_shift,
            list(range(len(jobs)))
        )

    # GEO FILTER APPLICATION
    if geo_filtered is not None:
        candidate_indices = [
            idx for idx in candidate_indices
            if jobs[idx]["job_id"] in geo_filtered
        ]
        if not candidate_indices:
            return []

    filtered_vectors = job_vectors[candidate_indices]

    similarities = cosine_similarity(student_vector, filtered_vectors)[0]

    # Normalize content
    norm_content = similarities / similarities.max() if similarities.max() > 0 else similarities

    # -------------------------
    # COLLABORATIVE
    # -------------------------

    collab_scores = np.zeros(len(candidate_indices))

    if interaction_matrix is not None and student_id in student_index:

        s_idx = student_index[student_id]
        student_cf_vector = interaction_matrix[s_idx]

        # Multiply (1 x N) with (N x N)
        cf_raw = student_cf_vector @ item_similarity_matrix

        # Convert sparse safely
        if hasattr(cf_raw, "toarray"):
            cf_raw = cf_raw.toarray().flatten()
        else:
            cf_raw = np.array(cf_raw).flatten()

        # Extract only candidate job scores
        for i, idx in enumerate(candidate_indices):
            jid = jobs[idx]["job_id"]
            if jid in job_index:
                collab_scores[i] = cf_raw[job_index[jid]]

        norm_collab = collab_scores / collab_scores.max() if collab_scores.max() > 0 else collab_scores

    # -------------------------
    # PERSONAL SIGNAL
    # -------------------------

    category_preference = {}

    if not evaluation_mode:
        user_logs = logs_col.find(
            {"student_id": student_id},
            {"job_id": 1, "event_type": 1, "_id": 0}
        )

        for log in user_logs:
            job = job_lookup.get(log["job_id"])
            if not job:
                continue

            category = job.get("shop_type")
            weight = 5 if log["event_type"] == "apply" else \
                     3 if log["event_type"] == "save" else 1

            category_preference[category] = category_preference.get(category, 0) + weight

    max_personal = max(category_preference.values()) if category_preference else 1
    max_popularity = max(job_popularity.values()) if job_popularity else 1

    # -------------------------
    # ADAPTIVE WEIGHTING
    # -------------------------

    user_interactions = logs_col.count_documents({"student_id": student_id})

    if user_interactions < 5:
        alpha, beta = 0.60, 0.10
    else:
        alpha, beta = 0.35, 0.30

    gamma = 0.10   # popularity
    delta = 0.10   # personal
    epsilon = 0.10 # recency
    zeta = 0.05    # distance

    # -------------------------
    # RANKING
    # -------------------------

    top_indices = norm_content.argsort()[-30:][::-1]

    recommendations = []

    for local_idx in top_indices:

        global_idx = candidate_indices[local_idx]
        job = jobs[global_idx]
        job_id = job["job_id"]

        base_score = norm_content[local_idx]
        collab_score = norm_collab[local_idx]

        popularity = job_popularity.get(job_id, 0)
        norm_pop = popularity / max_popularity if max_popularity > 0 else 0

        personal = category_preference.get(job.get("shop_type"), 0)
        norm_personal = personal / max_personal if max_personal > 0 else 0

        created_dt = job_created_at.get(job_id)
        if created_dt:
            now = datetime.now(timezone.utc)
            days_old = (now - created_dt).days
            recency_score = 1 / (1 + max(days_old, 0))
        else:
            recency_score = 0

        distance_score = 0
        if geo_filtered is not None:
            d = distance_map.get(job_id)
            if d:
                distance_score = 1 / (1 + d)

        final_score = (
            alpha * base_score
            + beta * collab_score
            + gamma * norm_pop
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
            "job_id": job_id,
            "job_title": job.get("job_title"),
            "shop_type": job.get("shop_type"),
            "shift_type": job.get("shift_type"),
            "salary_per_day": job.get("salary_per_day"),
            "shop_name": job.get("shop_name"),
            "full_address": full_address if full_address else None,
            "score": float(final_score)
        })

    recommendations = sorted(recommendations, key=lambda x: x["score"], reverse=True)[:10]

    duration = time.perf_counter() - start
    if not evaluation_mode:
        print(f"Inference time: {duration*1000:.2f} ms")
    return recommendations