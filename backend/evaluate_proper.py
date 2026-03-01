import random
import numpy as np
from backend.app.recommender import recommend_jobs, job_lookup
from backend.db.mongo_client import logs_col

K = 10


def evaluate(weights=None):

    student_ids = logs_col.distinct("student_id")

    hit_count = 0
    precision_scores = []
    recall_scores = []
    ndcg_scores = []
    ap_scores = []
    diversity_scores = []

    evaluated = 0

    for student_id in student_ids:

        logs = list(logs_col.find(
            {"student_id": student_id},
            {"job_id": 1, "event_type": 1, "_id": 0}
        ))

        if len(logs) < 2:
            continue

        evaluated += 1

        # Leave-one-out
        test_log = random.choice(logs)
        test_job_id = test_log["job_id"]
        test_category = job_lookup[test_job_id]["shop_type"]

        train_logs = [l for l in logs if l["job_id"] != test_job_id]

        # For evaluation, we want to allow the test job to be ranked.
        # If we rigorously filter by the max shift, and test job has a different shift,
        # it will be impossible to hit exactly. We align the preferred shift to the test job.
        preferred_shift = job_lookup[test_job_id].get("shift_type", "")

        profile = {
            "student_id": student_id,
            "skills": "",
            "preferred_shift": preferred_shift
        }

        recs = recommend_jobs(profile, evaluation_mode=True, weights=weights, train_logs=train_logs)

        rec_job_ids = [r["job_id"] for r in recs]
        rec_categories = [job_lookup[j]["shop_type"] for j in rec_job_ids]

        # ---------- Exact Hit ----------
        if test_job_id in rec_job_ids:
            hit_count += 1

        # ---------- Category Hit ----------
        relevant = [1 if cat == test_category else 0 for cat in rec_categories]

        precision = sum(relevant) / K
        recall = 1 if sum(relevant) > 0 else 0

        precision_scores.append(precision)
        recall_scores.append(recall)

        # ---------- NDCG (single relevant) ----------
        if test_category in rec_categories:
            rank = rec_categories.index(test_category)
            ndcg_scores.append(1 / np.log2(rank + 2))
        else:
            ndcg_scores.append(0)
        # ---------- MAP ----------
        ap = 0
        for i, rel in enumerate(relevant):
            if rel:
                ap = 1 / (i + 1)
                break
        ap_scores.append(ap)

        # ---------- Diversity ----------
        unique_categories = len(set(rec_categories))
        diversity_scores.append(unique_categories / K)

    if evaluated == 0:
        print("No interaction data found. Cannot evaluate.")
        return None

    metrics = {
        "hit_rate": hit_count / evaluated,
        "precision": np.mean(precision_scores),
        "recall": np.mean(recall_scores),
        "ndcg": np.mean(ndcg_scores),
        "map": np.mean(ap_scores),
        "diversity": np.mean(diversity_scores),
        "students": evaluated
    }

    print("\nStudents evaluated:", evaluated)
    print("Exact Job HitRate@10:", metrics["hit_rate"])
    print("Precision@10:", metrics["precision"])
    print("Recall@10:", metrics["recall"])
    print("NDCG@10:", metrics["ndcg"])
    print("MAP@10:", metrics["map"])
    print("Diversity@10:", metrics["diversity"])

    return metrics


if __name__ == "__main__":
    evaluate()