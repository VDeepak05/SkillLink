from pydantic import BaseModel
from typing import List, Optional

class StudentProfile(BaseModel):
    student_id: str
    skills: str
    preferred_shift: str
    max_distance_km: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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
    shop_name: Optional[str] = None
    address_line: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    full_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    score: float