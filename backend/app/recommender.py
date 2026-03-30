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
# SUPPLEMENT WITH NEW MONGODB JOBS (not in JSON snapshot)
# =========================================================

known_ids = {j["job_id"] for j in jobs}
# Fast indexed query: only fetch UI-posted retailer jobs (tagged at creation)
# This avoids the extremely slow $nin scan across all 49K+ CSV job IDs
new_mongo_jobs = list(jobs_col.find(
    {"source": "retailer_created", "status": {"$ne": "closed"}},
    {"_id": 0}
))
# Ensure we don't double-add jobs already in the JSON snapshot
new_mongo_jobs = [j for j in new_mongo_jobs if j.get("job_id") not in known_ids]

if new_mongo_jobs:
    print(f"Found {len(new_mongo_jobs)} new MongoDB jobs to inject into RAM...")
    from scipy.sparse import vstack as sp_vstack
    new_vectors_list = []
    for job in new_mongo_jobs:
        # Coerce skills to list if stored as string
        raw_skills = job.get("skills", [])
        if isinstance(raw_skills, str):
            raw_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
            job["skills"] = raw_skills
        skills_text = " ".join(raw_skills)
        text = f"{job.get('job_title', '')} {job.get('description', '')} {skills_text}"
        vec = tfidf.transform([text])
        new_vectors_list.append(vec)
        jobs.append(job)
    job_vectors = sp_vstack([job_vectors] + new_vectors_list)
    print(f"Matrix expanded to {job_vectors.shape[0]} jobs.")

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

def recommend_jobs(profile, evaluation_mode=False, weights=None, train_logs=None, skip=0, limit=20, extra_filters=None):

    start = time.perf_counter()
    student_id = profile["student_id"]

    # -----------------------------------------------------
    # SHIFT FILTER (kept even in evaluation to maintain features)
    # -----------------------------------------------------
    # We remove the rigid hard-filter on student profile shift so the Machine 
    # Learning TF-IDF algorithm can naturally boost the preferred shift via text 
    # cosine-similarity without outright hiding 100% of other shift jobs!
    candidate_indices = list(range(len(jobs)))

    # -----------------------------------------------------
    # GEO FILTER (disabled in evaluation)
    # -----------------------------------------------------

    geo_filtered = None
    distance_map = {}

    if not evaluation_mode:

        lat = profile.get("latitude")
        lon = profile.get("longitude")
        max_dist_threshold = profile.get("max_distance_km")

        if lat and lon and max_dist_threshold:
            # Real Geospatial Filter (if coordinates exist)
            pipeline = [
                {
                    "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": [lon, lat]
                        },
                        "distanceField": "distance",
                        "maxDistance": max_dist_threshold * 1000,
                        "spherical": True
                    }
                },
                {"$project": {"job_id": 1, "distance": 1}}
            ]

            results = list(jobs_col.aggregate(pipeline))
            if not results:
                return [], 0

            geo_filtered = {doc["job_id"] for doc in results}
            for doc in results:
                distance_map[doc["job_id"]] = doc["distance"] / 1000
        elif max_dist_threshold:
            # Fallback Distance Filter (using the pre-generated field)
            # This satisfies the user's request to use the "false generated" distances
            geo_filtered = {
                job["job_id"] for job in jobs 
                if float(job.get("max_distance_km", 0)) <= max_dist_threshold
            }
            if not geo_filtered:
                return [], 0
            for jid in geo_filtered:
                job = job_lookup.get(jid)
                distance_map[jid] = float(job.get("max_distance_km", 0))

    # -----------------------------------------------------
    # CONTENT
    # -----------------------------------------------------

    profile_text = f"{profile.get('skills','')}"
    if profile_text.strip():
        student_vector = tfidf.transform([profile_text])
        if geo_filtered is not None:
            candidate_indices = [
                idx for idx in candidate_indices
                if jobs[idx]["job_id"] in geo_filtered
            ]
            if not candidate_indices:
                return [], 0

        filtered_vectors = job_vectors[candidate_indices]
        similarities = cosine_similarity(student_vector, filtered_vectors)[0]
        norm_content = similarities / similarities.max() if similarities.max() > 0 else similarities
    else:
        # If no skills are provided, grant equal baseline content score
        if geo_filtered is not None:
            candidate_indices = [
                idx for idx in candidate_indices
                if jobs[idx]["job_id"] in geo_filtered
            ]
            if not candidate_indices:
                return [], 0
        norm_content = np.ones(len(candidate_indices)) * 0.5

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
    # Sort ALL candidates instead of capturing top 20
    top_local_indices = norm_content.argsort()[::-1]

    for local_idx in top_local_indices:
        base = norm_content[local_idx]
        
        global_idx = candidate_indices[local_idx]
        job = jobs[global_idx]
        job_id = job["job_id"]

        # -----------------------------------------------------
        # APPLY SERVER-SIDE FILTERS
        # -----------------------------------------------------
        if extra_filters:
            target_search = extra_filters.get("search", "").lower()
            if target_search:
                t1 = str(job.get("job_title", "")).lower()
                t2 = str(job.get("shop_name", "") or job.get("shop_type", "")).lower()
                t3 = str(job.get("area", "")).lower()
                if target_search not in t1 and target_search not in t2 and target_search not in t3:
                    continue
                    
            target_shifts = extra_filters.get("shifts")
            if target_shifts:
                allowed_shifts = set(s.strip().lower() for s in target_shifts.split(",") if s.strip())
                if allowed_shifts:
                    job_shift_str = str(job.get("shift_type", "")).lower()
                    job_shifts = set(s.strip() for s in job_shift_str.replace("and", "+").split("+") if s.strip())
                    if not allowed_shifts.issubset(job_shifts):
                        continue
                    
            target_type = extra_filters.get("shop_type")
            if target_type and target_type != "All Types":
                if job.get("shop_type") != target_type:
                    continue
                    
            min_sal = extra_filters.get("min_salary", 0)
            if min_sal > 0:
                try:
                    if float(job.get("salary_per_day", 0)) < min_sal:
                        continue
                except (ValueError, TypeError):
                    continue

        cf_score = collab_scores[local_idx]

        pop = job_popularity.get(job_id, 0) / max_popularity
        cat = job.get("shop_type")
        personal = category_preference.get(job.get("shop_type"), 0) / max_personal

        created_dt = job_created_at.get(job_id)
        if created_dt:
            if created_dt.tzinfo is None:
                created_dt = created_dt.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            hours_old = (now - created_dt).total_seconds() / 3600.0
            recency = 1 / (1 + max(hours_old / 24.0, 0))

        else:
            recency = 0
            hours_old = 9999

        distance = 0
        if geo_filtered:
            d = distance_map.get(job_id)
            if d:
                distance = 1 / (1 + d)
                
        # Manually compute Shift Bonus (since it was removed from TF-IDF)
        shift_bonus = 0.0
        pref_shift = profile.get("preferred_shift", "").lower()
        if pref_shift and pref_shift in str(job.get("shift_type", "")).lower():
            shift_bonus = 0.15

        score = (
            alpha * base +
            beta * cf_score +
            gamma * pop +
            delta * personal +
            epsilon * recency +
            zeta * distance +
            shift_bonus
        )

        target_skills = profile.get("skills", "")
        # Enforce heavy penalty if skills are provided but the job text had NO match
        if target_skills.strip() and base <= 0.0:
            score *= 0.05
            
        # Freshness + Accuracy Massive Boost 
        # If the job is exceptionally new (< 48h) and mathematically matches their skills, grant a 50% multiplier!
        if target_skills.strip() and base > 0.0 and hours_old < 48:
            score *= 1.5

        # Seen job penalty (soft)
        if job_id in seen_jobs:
            score *= 0.2


        recommendations.append({
            "job_id": job_id,
            "job_title": job.get("job_title"),
            "shop_type": job.get("shop_type"),
            "shift_type": job.get("shift_type"),
            "salary_per_day": job.get("salary_per_day"),
            "distance": float(job.get("max_distance_km", 0.0)),
            "score": float(score)
        })

    # -------------------------------------------
    # CATEGORY DIVERSITY PENALTY (MIXING)
    # -------------------------------------------

    recommendations = sorted(
        recommendations,
        key=lambda x: x["score"],
        reverse=True
    )

    category_seen = {}
    for i in range(len(recommendations)):
        cat = recommendations[i]["shop_type"]
        count = category_seen.get(cat, 0)
        
        # Exponentially decay score for redundant categories so other types float up
        recommendations[i]["score"] *= (0.85 ** count)
        category_seen[cat] = count + 1

    # Re-sort after decay!
    recommendations = sorted(
        recommendations,
        key=lambda x: x["score"],
        reverse=True
    )

    total_matched = len(recommendations)

    # Slice the valid results based on the scrolling pagination
    paged_recs = recommendations[skip : skip + limit]

    if not evaluation_mode:
        print(f"Inference time: {(time.perf_counter()-start)*1000:.2f} ms")

    return paged_recs, total_matched

# =========================================================
# DYNAMIC MATRIX INJECTION
# =========================================================

def add_new_job_to_recommender(job_dict):
    global jobs, job_vectors, shift_index_map, job_lookup, job_ids, job_index
    from scipy.sparse import vstack
    
    # Text to vectorize (combine title + description + shift + skills)
    skills_text = " ".join(job_dict.get("skills", []))
    text = f"{job_dict.get('job_title', '')} {job_dict.get('description', '')} {job_dict.get('shift_type', '')} {skills_text}"
    
    # Vectorize
    new_vector = tfidf.transform([text])
    
    # Append to RAM
    with cf_lock:
        jobs.append(job_dict)
        
        # vstack the sparse matrix gracefully
        job_vectors = vstack([job_vectors, new_vector])
        
        # Update lookups
        idx = len(jobs) - 1
        jid = job_dict["job_id"]
        
        shift = str(job_dict.get("shift_type", "")).lower()
        shift_index_map.setdefault(shift, []).append(idx)
        
        job_lookup[jid] = job_dict
        job_ids.append(jid)
        job_index[jid] = idx
        
        # Vital: Register the creation timestamp so recency is calculated!
        global job_created_at
        job_created_at[jid] = job_dict.get("created_at") or datetime.now(timezone.utc)
        
    print(f"Dynamically injected new job {jid} into memory arrays.")
    
    # Trigger CF rebuild in background so dimensions match
    threading.Thread(target=rebuild_collaborative_matrix, daemon=True).start()