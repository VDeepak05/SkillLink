from fastapi import APIRouter
from datetime import datetime, timezone

from backend.app.schemas import StudentProfile, InteractionLog, JobResponse
from backend.app.recommender import recommend_jobs, job_popularity
from backend.db.mongo_client import logs_col


router = APIRouter()


@router.post("/recommend", response_model=list[JobResponse])
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
