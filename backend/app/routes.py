from fastapi import APIRouter
from datetime import datetime, timezone

from app.schemas import StudentProfile, InteractionLog
from app.recommender import recommend_jobs
from db.mongo_client import logs_col
from app.recommender import job_popularity


router = APIRouter()


@router.post("/recommend")
def get_recommendations(profile: StudentProfile):
    results = recommend_jobs(profile.dict())
    return results


@router.post("/log-interaction")
def log_interaction_api(log: InteractionLog):
    logs_col.insert_one({
        "student_id": log.student_id,
        "job_id": log.job_id,
        "event_type": log.event_type,
        "timestamp": datetime.now(timezone.utc)
    })
    # 🔥 Update in-memory popularity cache
    job_popularity[log.job_id] = job_popularity.get(log.job_id, 0) + 1

    return {"status": "logged"}
