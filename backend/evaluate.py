import random
import math
from app.recommender import recommend_jobs
from db.mongo_client import logs_col

K = 10

def precision_at_k(recommended, actual, k=10):
    hits = len(set(recommended[:k]) & set(actual))
    return hits / k

def recall_at_k(recommended, actual, k=10):
    if not actual:
        return 0
    hits = len(set(recommended[:k]) & set(actual))
    return hits / len(actual)

def dcg_at_k(recommended, actual, k=10):
    score = 0
    for i, item in enumerate(recommended[:k]):
        if item in actual:
            score += 1 / math.log2(i + 2)
    return score

def ndcg_at_k(recommended, actual, k=10):
    ideal_dcg = dcg_at_k(actual, actual, k)
    if ideal_dcg == 0:
        return 0
    return dcg_at_k(recommended, actual, k) / ideal_dcg


def evaluate():

    students = list({log["student_id"] for log in logs_col.find({}, {"student_id": 1})})

    precision_scores = []
    recall_scores = []
    ndcg_scores = []

    for student_id in students:

        user_logs = list(logs_col.find(
            {"student_id": student_id},
            {"job_id": 1, "_id": 0}
        ))

        if len(user_logs) < 2:
            continue  # skip cold users

        # Leave one out
        test_item = random.choice(user_logs)["job_id"]
        actual = [test_item]

        # Build profile for recommendation
        profile = {
            "student_id": student_id,
            "skills": "",
            "preferred_shift": "evening",
            "max_distance_km": None
        }

        recommendations = recommend_jobs(profile)
        recommended_ids = [r["job_id"] for r in recommendations]

        precision_scores.append(precision_at_k(recommended_ids, actual, K))
        recall_scores.append(recall_at_k(recommended_ids, actual, K))
        ndcg_scores.append(ndcg_at_k(recommended_ids, actual, K))

    print("Evaluation Results:")
    print("Precision@10:", sum(precision_scores)/len(precision_scores))
    print("Recall@10:", sum(recall_scores)/len(recall_scores))
    print("NDCG@10:", sum(ndcg_scores)/len(ndcg_scores))


if __name__ == "__main__":
    evaluate()
