import random
import math
import numpy as np

from backend.app.recommender import (
    recommend_jobs,
    interaction_matrix,
    student_index,
    job_index,
    job_lookup,
)

from backend.db.mongo_client import logs_col

K = 10


def precision_at_k(rec, actual, k=10):
    return len(set(rec[:k]) & set(actual)) / k


def recall_at_k(rec, actual, k=10):
    return len(set(rec[:k]) & set(actual)) / len(actual) if actual else 0


def dcg_at_k(rec, actual, k=10):
    score = 0
    for i, item in enumerate(rec[:k]):
        if item in actual:
            score += 1 / math.log2(i + 2)
    return score


def ndcg_at_k(rec, actual, k=10):
    ideal = dcg_at_k(actual, actual, k)
    if ideal == 0:
        return 0
    return dcg_at_k(rec, actual, k) / ideal


def evaluate():
    if interaction_matrix is None:
        print("No interaction data found. Cannot evaluate.")
        return

    students = list({log["student_id"] for log in logs_col.find({}, {"student_id": 1})})

    precision_scores = []
    recall_scores = []
    ndcg_scores = []

    for student_id in students:

        if student_id not in student_index:
            continue

        s_idx = student_index[student_id]

        # Find interacted jobs from matrix
        interacted_job_indices = interaction_matrix[s_idx].nonzero()[1]

        if len(interacted_job_indices) < 2:
            continue

        # Pick one test job
        test_local_index = random.choice(interacted_job_indices)
        test_job_id = list(job_index.keys())[test_local_index]

        # Build synthetic profile from remaining interactions
        remaining_indices = [j for j in interacted_job_indices if j != test_local_index]

        skills_text = []
        shifts = []

        for j_idx in remaining_indices:
            jid = list(job_index.keys())[j_idx]
            job = job_lookup.get(jid)
            if job:
                skills_text.append(job.get("required_skills", ""))
                shifts.append(job.get("shift_type", ""))

        preferred_shift = max(set(shifts), key=shifts.count) if shifts else ""

        profile = {
            "student_id": student_id,
            "skills": " ".join(skills_text),
            "preferred_shift": preferred_shift,
            "max_distance_km": None
        }

        recs = recommend_jobs(profile, evaluation_mode=True)
        rec_ids = [r["job_id"] for r in recs]

        actual = [test_job_id]

        precision_scores.append(precision_at_k(rec_ids, actual, K))
        recall_scores.append(recall_at_k(rec_ids, actual, K))
        ndcg_scores.append(ndcg_at_k(rec_ids, actual, K))

    print("Precision@10:", sum(precision_scores)/len(precision_scores))
    print("Recall@10:", sum(recall_scores)/len(recall_scores))
    print("NDCG@10:", sum(ndcg_scores)/len(ndcg_scores))


if __name__ == "__main__":
    evaluate()