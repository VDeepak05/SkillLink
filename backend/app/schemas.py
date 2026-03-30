from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Any

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


class JobCreate(BaseModel):
    retailer_id: str
    job_title: str
    shop_type: str
    salary_per_day: int
    shift_type: str
    openings: int = 1
    is_seasonal: bool = False
    description: str = ""
    skills: list[str] = []

# Authentication Schemas
class StudentSignUp(BaseModel):
    name: str
    college: str
    college_reg_no: str
    dob: str # YYYY-MM-DD
    phone_no: str
    email: str
    password: str

class RetailerSignUp(BaseModel):
    owner_name: str = Field(..., example="Jane Doe")
    shop_name: str = Field(..., example="Jane's Bakery")
    shop_id: str = Field(..., example="REG456")
    shop_type: str = Field(..., example="Bakery")
    location: str = Field(..., example="Indiranagar")
    phone_no: str = Field(..., example="1234567890")
    email: str
    password: str = Field(..., min_length=6)
    verified: bool = Field(False, description="Whether the admin has verified this shop")

class UserSignIn(BaseModel):
    email: str
    password: str
    role: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    role: str
    name: str
    email: str
    verified: Optional[bool] = None
    
class JobResponse(BaseModel):
    id: str  # Added ID for frontend use
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
    description: Optional[str] = None
    openings: Optional[int] = None
    is_seasonal: Optional[bool] = None
    
    score: Optional[float] = None # made optional to work for normal query
    applicant_count: Optional[int] = 0
    distance: Optional[float] = None
    skills: List[str] = []

    @field_validator('skills', mode='before')
    @classmethod
    def coerce_skills(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str) and v.strip():
            return [s.strip() for s in v.split(',') if s.strip()]
        return []

class PaginatedJobResponse(BaseModel):
    total_count: int
    jobs: List[JobResponse]

class JobApplicationCreate(BaseModel):
    job_id: str
    retailer_id: str

class JobApplicationResponse(BaseModel):
    id: str
    job_id: str
    student_id: str
    student_name: str
    student_college: Optional[str] = None
    student_contact: Optional[str] = None
    status: str # "pending", "accepted", "rejected"
    applied_at: str

class ShopProfileUpdate(BaseModel):
    description: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    logo_url: Optional[str] = None
    owner_name: Optional[str] = None
    shop_name: Optional[str] = None
    shop_type: Optional[str] = None
    location: Optional[str] = None
    phone_no: Optional[str] = None

class StudentProfileUpdate(BaseModel):
    skills: Optional[List[str]] = None
    name: Optional[str] = None
    phone_no: Optional[str] = None
    dob: Optional[str] = None
    college: Optional[str] = None
    college_reg_no: Optional[str] = None

class StudentPasswordUpdate(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class MessageResponse(BaseModel):
    id: str
    recipient_id: str
    job_id: str
    title: str
    message: str
    read: bool
    created_at: str