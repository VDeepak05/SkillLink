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


class JobCreate(BaseModel):
    retailer_id: str
    job_title: str
    shop_type: str
    salary_per_day: int
    shift_type: str
    openings: int = 1
    is_seasonal: bool = False
    description: str = ""

# Authentication Schemas
class StudentSignUp(BaseModel):
    name: str
    college: str
    dob: str # YYYY-MM-DD
    phone_no: str
    email: str
    password: str

class RetailerSignUp(BaseModel):
    owner_name: str
    shop_name: str
    shop_id: str
    shop_type: str
    location: str
    email: str
    password: str

class UserSignIn(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    role: str
    name: str
    email: str
    
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