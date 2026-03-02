from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
from bson.objectid import ObjectId

from backend.app.schemas import (
    StudentProfile, InteractionLog, JobResponse, JobCreate, 
    StudentSignUp, RetailerSignUp, UserSignIn, UserResponse,
    JobApplicationCreate, JobApplicationResponse, ShopProfileUpdate,
    StudentProfileUpdate, StudentPasswordUpdate, MessageResponse
)
from backend.db.mongo_client import logs_col, jobs_col, users_col, applications_col, messages_col


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
    user_dict["skills"] = [] # Initialize empty skills array
    user_dict["age"] = calculate_age(student.dob)
    
    if user_dict["age"] < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to sign up.")
        
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
    user_dict["verified"] = False  # Default to false
    user_dict["created_at"] = datetime.now(timezone.utc)
    
    result = users_col.insert_one(user_dict)
    return UserResponse(id=str(result.inserted_id), role="retailer", name=retailer.owner_name, email=retailer.email, verified=False)

@router.post("/auth/signin", response_model=UserResponse)
def signin(credentials: UserSignIn):
    user = users_col.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Couldn't find such a user. Please sign up.")
        
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect password.")
        
    name = user.get("name") if user["role"] == "student" else user.get("owner_name")
    return UserResponse(id=str(user["_id"]), role=user["role"], name=name, email=user["email"])


# ---------------------------------------------------------
#                 ADMIN ROUTES
# ---------------------------------------------------------
@router.post("/admin/login")
def admin_login(credentials: UserSignIn):
    # Hardcoded admin credentials for simplicity
    if credentials.email == "admin@skilllink.com" and credentials.password == "admin123":
        return {"id": "admin_sys", "role": "admin", "name": "System Admin", "email": "admin@skilllink.com"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials.")

@router.get("/admin/retailers")
def get_all_retailers():
    try:
        retailers = list(users_col.find({"role": "retailer"}))
        for r in retailers:
            r["id"] = str(r["_id"])
            del r["_id"]
            if "password" in r:
                del r["password"]
            if "verified" not in r:
                r["verified"] = False # backward compatibility
        return {"status": "success", "retailers": retailers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/retailers/{user_id}/verify")
def verify_retailer(user_id: str):
    try:
        result = users_col.update_one(
            {"_id": ObjectId(user_id), "role": "retailer"},
            {"$set": {"verified": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Retailer not found")
        return {"status": "success", "message": "Retailer verified successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/retailers/{user_id}/reject")
def reject_retailer(user_id: str):
    try:
        result = users_col.delete_one({"_id": ObjectId(user_id), "role": "retailer"})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Retailer not found")
        return {"status": "success", "message": "Retailer rejected and deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
#                 USER AUTH ROUTES
# ---------------------------------------------------------

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
        query["$or"] = [
            {"job_title": {"$regex": search, "$options": "i"}},
            {"shop_name": {"$regex": search, "$options": "i"}},
            {"area": {"$regex": search, "$options": "i"}}
        ]
        
    query["status"] = {"$ne": "closed"} # Filter out closed jobs
        
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
    job_dict["latitude"] = 10.7867 # Palakkad
    job_dict["longitude"] = 76.6548 # Palakkad
    job_dict["shop_name"] = "Shop " + job_dict["retailer_id"][-4:] # fallback name
    job_dict["area"] = "Palakkad" # fallback area
    
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


# ---------------------------------------------------------
#                 RETAILER DASHBOARD ROUTES
# ---------------------------------------------------------

@router.get("/retailer/profile/{user_id}")
def get_retailer_profile(user_id: str):
    try:
        retailer = users_col.find_one({"_id": ObjectId(user_id), "role": "retailer"})
        if not retailer:
            raise HTTPException(status_code=404, detail="Retailer not found")
            
        return {
            "status": "success", 
            "profile": {
                "owner_name": retailer.get("owner_name"),
                "shop_name": retailer.get("shop_name"),
                "email": retailer.get("email"),
                "shop_id": retailer.get("shop_id"),
                "shop_type": retailer.get("shop_type"),
                "location": retailer.get("location"),
                "profile": retailer.get("profile", {})
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/retailer/profile/{user_id}")
def update_shop_profile(user_id: str, profile: ShopProfileUpdate):
    try:
        data = profile.dict(exclude_unset=True)
        if not data:
            return {"status": "success", "message": "Nothing to update"}
            
        update_query = {}
        for key in ["owner_name", "shop_name", "shop_type", "location"]:
            if key in data:
                update_query[key] = data.pop(key)
        
        # update nested profile map if there are any remaining fields
        if data:
            for k, v in data.items():
                update_query[f"profile.{k}"] = v
            
        # filter out None values unless explicitly wanted, keeping simple
        update_query = {k: v for k, v in update_query.items() if v is not None}
        
        if not update_query:
            return {"status": "success", "message": "Nothing to update"}
            
        result = users_col.update_one(
            {"_id": ObjectId(user_id), "role": "retailer"},
            {"$set": update_query}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Retailer not found")
        return {"status": "success", "message": "Profile updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/retailer/jobs/{user_id}")
def get_retailer_jobs(user_id: str):
    try:
        jobs = list(jobs_col.find({"retailer_id": user_id}))
        for j in jobs:
            j["id"] = str(j["_id"])
            del j["_id"]
        return {"status": "success", "jobs": jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/retailer/password/{user_id}")
def update_retailer_password(user_id: str, payload: StudentPasswordUpdate):
    try:
        retailer = users_col.find_one({"_id": ObjectId(user_id), "role": "retailer"})
        if not retailer:
            raise HTTPException(status_code=404, detail="Retailer not found")
            
        if not verify_password(payload.old_password, retailer["password"]):
            raise HTTPException(status_code=400, detail="Incorrect old password")
            
        new_hashed = get_password_hash(payload.new_password)
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_hashed}}
        )
        
        return {"status": "success", "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------
#                 JOB APPLICATIONS ROUTES
# ---------------------------------------------------------

@router.post("/jobs/apply")
def apply_for_job(application: JobApplicationCreate):
    try:
        # Prevent double applications
        existing = applications_col.find_one({
            "job_id": application.job_id,
            "student_id": application.retailer_id # retailer_id actually holds student_id in the post request because of an alias inside the schema
        })
        if existing:
            raise HTTPException(status_code=400, detail="Already applied for this job")
            
        # Get student details
        student = users_col.find_one({"_id": ObjectId(application.retailer_id), "role": "student"})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get job to ensure it exists and get retailer_id
        job = jobs_col.find_one({"job_id": application.job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        app_doc = {
            "job_id": application.job_id,
            "actual_retailer_id": job["retailer_id"],
            "student_id": application.retailer_id, # Using retailer_id as student_id
            "student_name": student.get("name", "Unknown"),
            "student_college": student.get("college", ""),
            "student_contact": student.get("phone_no", student.get("email")),
            "status": "pending",
            "applied_at": datetime.now(timezone.utc).isoformat()
        }
        
        applications_col.insert_one(app_doc)
        
        # Notify Retailer about new application
        messages_col.insert_one({
            "recipient_id": job["retailer_id"],
            "job_id": application.job_id,
            "title": "New Applicant",
            "message": f"{student.get('name', 'A student')} applied for {job.get('job_title', 'a job')}.",
            "read": False,
            "created_at": app_doc["applied_at"]
        })
        
        return {"status": "success", "message": "Application submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/retailer/applications/{user_id}")
def get_retailer_applications(user_id: str):
    try:
        apps = list(applications_col.find({"actual_retailer_id": user_id}))
        for a in apps:
            a["id"] = str(a["_id"])
            del a["_id"]
            
            # Optionally enrich with job title
            job = jobs_col.find_one({"job_id": a["job_id"]})
            if job:
                a["job_title"] = job.get("job_title", "Unknown Job")
                
            # Enrich with dynamic student details
            student = users_col.find_one({"_id": ObjectId(a["student_id"]), "role": "student"})
            if student:
                a["student_name"] = student.get("name", a.get("student_name"))
                a["student_skills"] = student.get("skills", [])
                a["student_college"] = student.get("college", a.get("student_college"))
                a["student_reg_no"] = student.get("college_reg_no", "")
                
                # Calculate age
                dob_str = student.get("dob")
                if dob_str:
                    try:
                        dob = datetime.strptime(dob_str, "%Y-%m-%d")
                        today = datetime.now()
                        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                        a["student_age"] = age
                    except:
                        a["student_age"] = None
                else:
                    a["student_age"] = None
                    
                # Gate contact information
                if a["status"] == "accepted":
                    a["student_phone"] = student.get("phone_no", "Not provided")
                    a["student_email"] = student.get("email", "Not provided")
                    a["student_contact"] = student.get("phone_no", student.get("email", a.get("student_contact"))) # Keep for backwards compatibility
                else:
                    a["student_phone"] = "Hidden until accepted"
                    a["student_email"] = "Hidden until accepted"
                    a["student_contact"] = "Hidden until accepted"
            else:
                if a["status"] != "accepted":
                    a["student_phone"] = "Hidden until accepted"
                    a["student_email"] = "Hidden until accepted"
                    a["student_contact"] = "Hidden until accepted"
                
        return {"status": "success", "applications": apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/retailer/applications/{application_id}")
def update_application_status(application_id: str, status: dict):
    try:
        new_status = status.get("status")
        if new_status not in ["accepted", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        # 1. Update the application status
        result = applications_col.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": new_status}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Application not found")
        
        # 2. Check if we just accepted an application. If so, check job capacity.
        if new_status == "accepted":
            # get the updated application to find the job_id
            updated_app = applications_col.find_one({"_id": ObjectId(application_id)})
            job_id = updated_app.get("job_id")
            
            # get job details
            job = jobs_col.find_one({"job_id": job_id})
            now_iso = datetime.now(timezone.utc).isoformat()
            
            if job:
                # notify the accepted student
                messages_col.insert_one({
                    "recipient_id": updated_app.get("student_id"),
                    "job_id": job_id,
                    "title": "Application Accepted!",
                    "message": f"Congratulations! Your application for the {job.get('job_title', 'Job')} role at {job.get('shop_name', 'the shop')} has been accepted.",
                    "read": False,
                    "created_at": now_iso
                })
                
                openings = job.get("openings", 1)
                
                # count how many accepted apps exist for this job
                accepted_count = applications_col.count_documents({"job_id": job_id, "status": "accepted"})
                
                # If we have reached or exceeded the required openings
                if accepted_count >= openings:
                    # a) Close the job
                    jobs_col.update_one({"job_id": job_id}, {"$set": {"status": "closed"}})
                    
                    # b) Reject all pending applications
                    pending_apps = list(applications_col.find({"job_id": job_id, "status": "pending"}))
                    
                    if pending_apps:
                        pending_ids = [app["_id"] for app in pending_apps]
                        applications_col.update_many(
                            {"_id": {"$in": pending_ids}},
                            {"$set": {"status": "rejected"}}
                        )
                        
                        # c) Send Inbox notification to rejected students
                        messages_to_insert = []
                        for app in pending_apps:
                            messages_to_insert.append({
                                "recipient_id": app["student_id"],
                                "job_id": job_id,
                                "title": "Application Update",
                                "message": f"Sorry, all openings for the {job.get('job_title', 'Job')} role at {job.get('shop_name', 'the shop')} have been filled. You were not selected this time.",
                                "read": False,
                                "created_at": now_iso
                            })
                            
                        if messages_to_insert:
                            messages_col.insert_many(messages_to_insert)
            
        return {"status": "success", "message": f"Application {new_status}"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
#                 STUDENT DASHBOARD ROUTES
# ---------------------------------------------------------

@router.get("/student/profile/{user_id}")
def get_student_profile(user_id: str):
    try:
        student = users_col.find_one({"_id": ObjectId(user_id), "role": "student"})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
            
        return {
            "status": "success", 
            "profile": {
                "name": student.get("name"),
                "email": student.get("email"),
                "phone_no": student.get("phone_no"),
                "dob": student.get("dob"),
                "college": student.get("college"),
                "college_reg_no": student.get("college_reg_no"),
                "skills": student.get("skills", [])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/student/profile/{user_id}")
def update_student_profile(user_id: str, profile: StudentProfileUpdate):
    try:
        update_data = {k: v for k, v in profile.dict().items() if v is not None}
        if not update_data:
            return {"status": "success", "message": "Nothing to update"}
            
        result = users_col.update_one(
            {"_id": ObjectId(user_id), "role": "student"},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        return {"status": "success", "message": "Profile updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/student/password/{user_id}")
def update_student_password(user_id: str, payload: StudentPasswordUpdate):
    try:
        student = users_col.find_one({"_id": ObjectId(user_id), "role": "student"})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
            
        if not verify_password(payload.old_password, student["password"]):
            raise HTTPException(status_code=400, detail="Incorrect old password")
            
        new_hashed = get_password_hash(payload.new_password)
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_hashed}}
        )
        
        return {"status": "success", "message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/messages/{user_id}", response_model=list[MessageResponse])
def get_messages(user_id: str):
    try:
        cursor = messages_col.find({"recipient_id": user_id}).sort("created_at", -1)
        results = []
        for msg in cursor:
            msg["id"] = str(msg["_id"])
            results.append(MessageResponse(**msg))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/messages/{message_id}/read")
def mark_message_read(message_id: str):
    try:
        result = messages_col.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"read": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Message not found")
        return {"status": "success", "message": "Message marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
