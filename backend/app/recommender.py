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

# =====================================================
# LOAD ARTIFACTS
# =====================================================

with open("data/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

job_vectors = sp.load_npz("data/job_vectors.npz")

with open("data/job_metadata.json", "r") as f:
    jobs = json.load(f)

print("Job vectors shape:", job_vectors.shape)
print("Metadata length:", len(jobs))

# =====================================================
# SHIFT INDEX
# =====================================================

shift_index_map = {}
for idx, job in enumerate(jobs):
    shift = str(job.get("shift_type", "")).lower()
    shift_index_map.setdefault(shift, []).append(idx)

job_lookup = {job["job_id"]: job for job in jobs}

# =====================================================
# POPULARITY CACHE
# =====================================================

job_popularity = {}
for log in logs_col.find({}, {"job_id": 1, "_id": 0}):
    jid = log.get("job_id")
    if jid:
        job_popularity[jid] = job_popularity.get(jid, 0) + 1

max_popularity = max(job_popularity.values()) if job_popularity else 1

# =====================================================
# CREATED_AT CACHE
# =====================================================

job_created_at = {}
for doc in jobs_col.find({}, {"job_id": 1, "created_at": 1, "_id": 0}):
    job_created_at[doc["job_id"]] = doc.get("created_at")

# =====================================================
# COLLABORATIVE FILTERING
# =====================================================

interaction_matrix = None
item_similarity_matrix = None
student_index = {}
job_index = {}
last_cf_update = datetime.now(timezone.utc)
CF_REFRESH_INTERVAL = 300  # seconds

def rebuild_collaborative_matrix():
    global interaction_matrix, item_similarity_matrix
    global student_index, job_index, last_cf_update

    print("🔄 Rebuilding Collaborative Matrix...")

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

    last_cf_update = datetime.now(timezone.utc)
    print("✅ Collaborative Matrix Ready")

# Initial build
rebuild_collaborative_matrix()

# Background auto refresh
def cf_background_worker():
    while True:
        time_module.sleep(CF_REFRESH_INTERVAL)
        rebuild_collaborative_matrix()

threading.Thread(target=cf_background_worker, daemon=True).start()

# =====================================================
# NORMALIZATION
# =====================================================

def min_max(arr):
    if len(arr) == 0:
        return arr
    mn, mx = np.min(arr), np.max(arr)
    if mx - mn == 0:
        return np.zeros_like(arr)
    return (arr - mn) / (mx - mn)

# =====================================================
# RECOMMENDER
# =====================================================

def recommend_jobs(profile):

    start = time.perf_counter()

    student_id = profile["student_id"]
    lat = profile.get("latitude")
    lon = profile.get("longitude")
    max_distance = profile.get("max_distance_km")

    # -------------------------------------------------
    # GEO FILTER (WITH AUTO EXPAND)
    # -------------------------------------------------

    geo_filtered = None
    distance_map = {}

    if lat and lon and max_distance:

        max_distance_m = max_distance * 1000

        for attempt in range(2):  # auto expand once

            pipeline = [{
                "$geoNear": {
                    "near": {"type": "Point", "coordinates": [lon, lat]},
                    "distanceField": "distance",
                    "maxDistance": max_distance_m,
                    "spherical": True
                }
            }]

            results = list(jobs_col.aggregate(pipeline))

            if results:
                geo_filtered = {doc["job_id"] for doc in results}
                for doc in results:
                    distance_map[doc["job_id"]] = doc["distance"] / 1000
                break
            else:
                max_distance_m *= 2  # expand radius

    # -------------------------------------------------
    # CONTENT
    # -------------------------------------------------

    profile_text = f"{profile['skills']} {profile['preferred_shift']}"
    student_vector = tfidf.transform([profile_text])

    preferred_shift = profile["preferred_shift"].lower()
    candidate_indices = shift_index_map.get(preferred_shift, list(range(len(jobs))))

    if geo_filtered is not None:
        candidate_indices = [
            idx for idx in candidate_indices
            if jobs[idx]["job_id"] in geo_filtered
        ]
        if not candidate_indices:
            return []

    filtered_vectors = job_vectors[candidate_indices]
    content_scores = cosine_similarity(student_vector, filtered_vectors)[0]

    # -------------------------------------------------
    # COLLABORATIVE
    # -------------------------------------------------

    collab_scores = np.zeros(len(candidate_indices))
    user_interactions = 0

    if interaction_matrix is not None and student_id in student_index:

        s_idx = student_index[student_id]
        user_vector = interaction_matrix[s_idx]
        user_interactions = user_vector.count_nonzero()

        cf_raw = user_vector @ item_similarity_matrix
        cf_raw = np.array(cf_raw).flatten()

        collab_scores = np.array([
            cf_raw[job_index[jobs[idx]["job_id"]]]
            if jobs[idx]["job_id"] in job_index else 0
            for idx in candidate_indices
        ])

    # -------------------------------------------------
    # PERSONALIZATION
    # -------------------------------------------------

    category_pref = {}
    for log in logs_col.find({"student_id": student_id}, {"job_id": 1, "event_type": 1}):
        job = job_lookup.get(log["job_id"])
        if not job:
            continue
        category = job.get("shop_type")
        if not category:
            continue
        weight = 5 if log["event_type"] == "apply" else 3 if log["event_type"] == "save" else 1
        category_pref[category] = category_pref.get(category, 0) + weight

    max_personal = max(category_pref.values()) if category_pref else 1

    # -------------------------------------------------
    # BUILD ALL SIGNALS
    # -------------------------------------------------

    popularity_scores = []
    recency_scores = []
    distance_scores = []

    now = datetime.now(timezone.utc)

    for idx in candidate_indices:
        job_id = jobs[idx]["job_id"]

        # popularity
        popularity_scores.append(job_popularity.get(job_id, 0) / max_popularity)

        # recency
        created = job_created_at.get(job_id)
        if created:
            days_old = (now - created).days
            recency_scores.append(1 / (1 + max(days_old, 0)))
        else:
            recency_scores.append(0)

        # distance
        dist = distance_map.get(job_id)
        if dist is not None:
            distance_scores.append(1 / (1 + dist))
        else:
            distance_scores.append(0)

    popularity_scores = np.array(popularity_scores)
    recency_scores = np.array(recency_scores)
    distance_scores = np.array(distance_scores)

    # -------------------------------------------------
    # NORMALIZE EVERYTHING
    # -------------------------------------------------

    content_scores = min_max(content_scores)
    collab_scores = min_max(collab_scores)
    recency_scores = min_max(recency_scores)
    distance_scores = min_max(distance_scores)

    # -------------------------------------------------
    # ADAPTIVE WEIGHTING
    # -------------------------------------------------

    if user_interactions < 5:
        alpha, beta = 0.6, 0.1
    else:
        alpha, beta = 0.35, 0.3

    gamma, delta, epsilon, zeta = 0.1, 0.1, 0.1, 0.05

    # -------------------------------------------------
    # FINAL SCORE
    # -------------------------------------------------

    final_scores = (
        alpha * content_scores
        + beta * collab_scores
        + gamma * popularity_scores
        + delta * recency_scores
        + zeta * distance_scores
    )

    # Remove seen jobs
    seen_jobs = {
        log["job_id"]
        for log in logs_col.find({"student_id": student_id}, {"job_id": 1})
    }

    results = []

    for i, idx in enumerate(candidate_indices):

        job_id = jobs[idx]["job_id"]
        if job_id in seen_jobs:
            continue

        job = jobs[idx]

        full_address = ", ".join(filter(None, [
            job.get("address_line"),
            job.get("area"),
            job.get("city"),
            job.get("state"),
            job.get("pincode")
        ]))

        results.append({
            "job_id": job_id,
            "job_title": job.get("job_title"),
            "shop_name": job.get("shop_name"),
            "full_address": full_address if full_address else None,
            "salary_per_day": job.get("salary_per_day"),
            "shift_type": job.get("shift_type"),
            "score": float(final_scores[i])
        })

    results = sorted(results, key=lambda x: x["score"], reverse=True)[:10]

    print(f"Inference time: {(time.perf_counter()-start)*1000:.2f} ms")
    return results
