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
# LOAD ARTIFACTS
# =========================================================

with open("backend/data/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

job_vectors = sp.load_npz("backend/data/job_vectors.npz")

with open("backend/data/job_metadata.json", "r") as f:
    jobs = json.load(f)

print("Job vectors shape:", job_vectors.shape)
print("Metadata length:", len(jobs))

# =========================================================
# LOOKUPS
# =========================================================

shift_index_map = {}
for idx, job in enumerate(jobs):
    shift = str(job.get("shift_type", "")).lower()
    shift_index_map.setdefault(shift, []).append(idx)

job_lookup = {job["job_id"]: job for job in jobs}
job_ids = [job["job_id"] for job in jobs]
job_index = {jid: i for i, jid in enumerate(job_ids)}


# =========================================================
# POPULARITY CACHE
# =========================================================

job_popularity = {}
for log in logs_col.find({}, {"job_id": 1, "_id": 0}):
    jid = log.get("job_id")
    if jid:
        job_popularity[jid] = job_popularity.get(jid, 0) + 1

max_popularity = max(job_popularity.values()) if job_popularity else 1


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
cf_lock = threading.Lock()

def rebuild_collaborative_matrix():
    global interaction_matrix, item_similarity_matrix
    global student_index, job_index

    print("Building collaborative matrix...")

    student_ids = logs_col.distinct("student_id")
    job_ids = [job["job_id"] for job in jobs]

    new_student_index = {sid: i for i, sid in enumerate(student_ids)}
    new_job_index = {jid: i for i, jid in enumerate(job_ids)}

    rows, cols, data = [], [], []

    for log in logs_col.find({}, {"student_id": 1, "job_id": 1, "event_type": 1}):
        sid = log["student_id"]
        jid = log["job_id"]

        if sid not in new_student_index or jid not in new_job_index:
            continue

        weight = 5 if log["event_type"] == "apply" else \
                 3 if log["event_type"] == "save" else 1

        rows.append(new_student_index[sid])
        cols.append(new_job_index[jid])
        data.append(weight)

    if not rows:
        with cf_lock:
            interaction_matrix = None
            item_similarity_matrix = None
            student_index = new_student_index
            job_index = new_job_index
        print("No interactions found. CF disabled.")
        return

    new_interaction_matrix = csr_matrix(
        (data, (rows, cols)),
        shape=(len(student_ids), len(job_ids))
    )

    new_item_similarity_matrix = cosine_similarity(
        new_interaction_matrix.T,
        dense_output=False
    )

    with cf_lock:
        interaction_matrix = new_interaction_matrix
        item_similarity_matrix = new_item_similarity_matrix
        student_index = new_student_index
        job_index = new_job_index

    print("Collaborative matrix built.")

rebuild_collaborative_matrix()

# Auto refresh (PRODUCTION ONLY)
CF_REFRESH_INTERVAL = 300

def cf_background_worker():
    while True:
        time_module.sleep(CF_REFRESH_INTERVAL)
        rebuild_collaborative_matrix()

threading.Thread(target=cf_background_worker, daemon=True).start()

# =========================================================
# RECOMMENDER
# =========================================================

def recommend_jobs(profile, evaluation_mode=False, weights=None, train_logs=None):

    start = time.perf_counter()
    student_id = profile["student_id"]

    # -----------------------------------------------------
    # SHIFT FILTER (kept even in evaluation to maintain features)
    # -----------------------------------------------------

    preferred_shift = profile.get("preferred_shift", "").lower()
    
    candidate_indices = shift_index_map.get(
        preferred_shift,
        list(range(len(jobs)))
    )

    if not candidate_indices:
        return []

    # -----------------------------------------------------
    # GEO FILTER (disabled in evaluation)
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # CONTENT
    # -----------------------------------------------------

    profile_text = f"{profile.get('skills','')} {profile.get('preferred_shift','')}"
    student_vector = tfidf.transform([profile_text])

    if geo_filtered is not None:
        candidate_indices = [
            idx for idx in candidate_indices
            if jobs[idx]["job_id"] in geo_filtered
        ]
        if not candidate_indices:
            return []

    filtered_vectors = job_vectors[candidate_indices]
    similarities = cosine_similarity(student_vector, filtered_vectors)[0]
    norm_content = similarities / similarities.max() if similarities.max() > 0 else similarities

    # -----------------------------------------------------
    # COLLABORATIVE
    # -----------------------------------------------------

    collab_scores = np.zeros(len(candidate_indices))

    with cf_lock:
        current_interaction_matrix = interaction_matrix
        current_item_sim = item_similarity_matrix
        current_student_index = student_index
        current_job_index = job_index

    if current_interaction_matrix is not None and student_id in current_student_index:
        s_idx = current_student_index[student_id]
        cf_raw = current_interaction_matrix[s_idx] @ current_item_sim

        if hasattr(cf_raw, "toarray"):
            cf_raw = cf_raw.toarray().flatten()
        else:
            cf_raw = np.array(cf_raw).flatten()

        for i, idx in enumerate(candidate_indices):
            jid = jobs[idx]["job_id"]
            if jid in current_job_index:
                collab_scores[i] = cf_raw[current_job_index[jid]]

        if collab_scores.max() > 0:
            collab_scores /= collab_scores.max()
        norm_collab = collab_scores / collab_scores.max() if collab_scores.max() > 0 else collab_scores


    # ----------------------------
    # USER LOGS (shared for category + seen)
    # ----------------------------

    if train_logs is not None:
        user_logs = train_logs
    else:
        user_logs = list(logs_col.find(
            {"student_id": student_id},
            {"job_id": 1, "event_type": 1, "_id": 0}
        ))

    # -----------------------------------------------------
    # PERSONALIZATION (disabled in evaluation)
    # -----------------------------------------------------

    category_preference = {}
    seen_jobs = set(log["job_id"] for log in user_logs)

    for log in user_logs:
        job = job_lookup.get(log["job_id"])
        if not job:
            continue

        cat = job.get("shop_type")
        if not cat:
            continue

        weight = 5 if log["event_type"] == "apply" else 3 if log["event_type"] == "save" else 1
        category_preference[cat] = category_preference.get(cat, 0) + weight

    max_personal = max(category_preference.values()) if category_preference else 1


    # -----------------------------------------------------
    # WEIGHTS
    # -----------------------------------------------------

    if weights:
        alpha, beta, gamma, delta, epsilon, zeta = weights
    else:
        # Default weights from grid search optimization
        # (content, CF, pop, category, recency, distance)
        alpha = 0.30
        beta = 0.30
        gamma = 0.08
        delta = 0.07
        epsilon = 0.07
        zeta = 0.05

    # -----------------------------------------------------
    # RANKING
    # -----------------------------------------------------

    recommendations = []
    category_counts={}
    top_local_indices = norm_content.argsort()[-20:][::-1]

    for local_idx in top_local_indices:

        global_idx = candidate_indices[local_idx]
        job = jobs[global_idx]
        job_id = job["job_id"]

        base = norm_content[local_idx]
        cf_score = collab_scores[local_idx]

        pop = job_popularity.get(job_id, 0) / max_popularity
        cat = job.get("shop_type")
        personal = category_preference.get(job.get("shop_type"), 0) / max_personal

        created_dt = job_created_at.get(job_id)
        if created_dt:
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_old = (now - created_dt).days
            recency = 1 / (1 + max(days_old, 0))

        else:
            recency = 0

        distance = 0
        if geo_filtered:
            d = distance_map.get(job_id)
            if d:
                distance = 1 / (1 + d)

        score = (
            alpha * base +
            beta * cf_score +
            gamma * pop +
            delta * personal +
            epsilon * recency +
            zeta * distance 
        )

        # Seen job penalty (soft)
        if job_id in seen_jobs:
            score *= 0.2


        recommendations.append({
            "job_id": job_id,
            "job_title": job.get("job_title"),
            "shop_type": job.get("shop_type"),
            "shift_type": job.get("shift_type"),
            "salary_per_day": job.get("salary_per_day"),
            "score": float(score)
        })

        if len(recommendations) >= 100:
            break

    # -------------------------------------------
    # GREEDY DIVERSITY RE-RANKING
    # -------------------------------------------

    recommendations = sorted(
        recommendations,
        key=lambda x: x["score"],
        reverse=True
    )

    final_recs = []
    category_counts = {}

    for rec in recommendations:

        cat = rec["shop_type"]
        count = category_counts.get(cat, 0)

        # Allow max 3 per category
        if count < 3:
            final_recs.append(rec)
            category_counts[cat] = count + 1

        if len(final_recs) == 10:
            break

    recommendations = final_recs

    if not evaluation_mode:
        print(f"Inference time: {(time.perf_counter()-start)*1000:.2f} ms")

    return recommendations