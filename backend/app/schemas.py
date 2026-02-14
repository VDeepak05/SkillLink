from pydantic import BaseModel
from typing import List

class StudentProfile(BaseModel):
    student_id: str
    skills: str
    preferred_shift: str
    max_distance_km: int


class InteractionLog(BaseModel):
    student_id: str
    job_id: str
    event_type: str


class JobResponse(BaseModel):
    job_id: str
    job_title: str
    shop_type: str
    shift_type: str
    salary_per_day: int
