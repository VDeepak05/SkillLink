from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from backend.app.schemas import StudentProfile, InteractionLog, JobResponse, JobCreate, StudentSignUp, RetailerSignUp, UserSignIn, UserResponse
from backend.app.recommender import recommend_jobs, job_popularity
from backend.db.mongo_client import logs_col, jobs_col, users_col


router = APIRouter()

# Password hashing setup
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def calculate_age(dob_str: str) -> int:
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        today = datetime.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except ValueError:
        return 18 # fallback string format logic
        

# Auth Endpoints
@router.post("/auth/signup/student", response_model=UserResponse)
def signup_student(student: StudentSignUp):
    if users_col.find_one({"email": student.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict = student.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["role"] = "student"
    user_dict["age"] = calculate_age(student.dob)
    user_dict["created_at"] = datetime.now(timezone.utc)
    
    result = users_col.insert_one(user_dict)
    return UserResponse(id=str(result.inserted_id), role="student", name=student.name, email=student.email)

@router.post("/auth/signup/retailer", response_model=UserResponse)
def signup_retailer(retailer: RetailerSignUp):
    if users_col.find_one({"email": retailer.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_dict = retailer.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["role"] = "retailer"
    user_dict["created_at"] = datetime.now(timezone.utc)
    
    result = users_col.insert_one(user_dict)
    return UserResponse(id=str(result.inserted_id), role="retailer", name=retailer.owner_name, email=retailer.email)

@router.post("/auth/signin", response_model=UserResponse)
def signin(credentials: UserSignIn):
    user = users_col.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    name = user.get("name") if user["role"] == "student" else user.get("owner_name")
    return UserResponse(id=str(user["_id"]), role=user["role"], name=name, email=user["email"])


@router.post("/recommend", response_model=list[JobResponse])
def get_recommendations(profile: StudentProfile):
    results = recommend_jobs(profile.dict())
    for res in results:
        if not hasattr(res, "id") or not res.id:
            res.id = res.job_id
    return results

@router.get("/jobs", response_model=list[JobResponse])
def get_jobs(search: str = ""):
    query = {}
    if search:
        query = {
            "$or": [
                {"job_title": {"$regex": search, "$options": "i"}},
                {"shop_name": {"$regex": search, "$options": "i"}},
                {"area": {"$regex": search, "$options": "i"}}
            ]
        }
    jobs_cursor = jobs_col.find(query).sort("created_at", -1).limit(50)
    results = []
    for job in jobs_cursor:
        job["id"] = str(job["_id"])
        if "job_id" not in job:
            job["job_id"] = str(job["_id"])
        
        # handle empty strings for floats
        if job.get("latitude") == "": job["latitude"] = None
        if job.get("longitude") == "": job["longitude"] = None
        
        results.append(JobResponse(**job))
    return results

@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str):
    job = jobs_col.find_one({"job_id": job_id})
    if not job:
        # fallback to _id if it's a valid object string
        from bson import ObjectId
        if len(job_id) == 24:
            job = jobs_col.find_one({"_id": ObjectId(job_id)})
            
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job["id"] = str(job["_id"])
    if "job_id" not in job:
        job["job_id"] = str(job["_id"])
        
    if job.get("latitude") == "": job["latitude"] = None
    if job.get("longitude") == "": job["longitude"] = None
    
    return JobResponse(**job)

@router.post("/jobs")
def create_job(job: JobCreate):
    job_dict = job.dict()
    job_dict["job_id"] = str(uuid.uuid4())
    job_dict["created_at"] = datetime.now(timezone.utc)
    
    # Mocking location details since they are not in the create schema but needed for recommendations/response
    job_dict["latitude"] = 12.9716
    job_dict["longitude"] = 77.5946
    job_dict["shop_name"] = "Shop " + job_dict["retailer_id"][-4:] # fallback name
    job_dict["area"] = "Bangalore" # fallback area
    
    result = jobs_col.insert_one(job_dict)
    return {"status": "success", "job_id": job_dict["job_id"], "id": str(result.inserted_id)}



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
