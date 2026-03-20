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
import bcrypt

def verify_password(plain_password: str, hashed_password: str):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

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
        # Find the job first to get its normalized IDs
        job = jobs_col.find_one({"job_id": application.job_id})
        if not job and len(application.job_id) == 24:
            try:
                job = jobs_col.find_one({"_id": ObjectId(application.job_id)})
            except:
                pass
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Now check for existing application using BOTH possible identity fields
        # (the job_id string and the MongoDB _id)
        job_id_str = job.get("job_id")
        job_obj_id = str(job["_id"])

        existing = applications_col.find_one({
            "student_id": application.retailer_id,
            "job_id": {"$in": [job_id_str, job_obj_id]}
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="Already applied for this job")
            
        # Get student details
        student = users_col.find_one({"_id": ObjectId(application.retailer_id), "role": "student"})
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        retailer_id = job.get("retailer_id", "admin_sys")
        
        app_doc = {
            "job_id": application.job_id,
            "actual_retailer_id": retailer_id,
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
            "recipient_id": retailer_id,
            "job_id": application.job_id,
            "title": "New Applicant",
            "message": f"{student.get('name', 'A student')} applied for {job.get('job_title', 'a job')}.",
            "read": False,
            "created_at": app_doc["applied_at"]
        })
        
        return {"status": "success", "message": "Application submitted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}/status/{user_id}")
def check_application_status(job_id: str, user_id: str):
    try:
        # Check if an application exists for this student and job
        application = applications_col.find_one({
            "job_id": job_id,
            "student_id": user_id
        })
        return {"applied": application is not None}
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
            if not job and len(a["job_id"]) == 24:
                try:
                    job = jobs_col.find_one({"_id": ObjectId(a["job_id"])})
                except:
                    pass
            
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

@router.get("/student/applications/{user_id}")
def get_student_applications(user_id: str):
    try:
        # Fetch all applications for the student
        raw_apps = list(applications_col.find({"student_id": user_id}).sort("applied_at", -1))
        
        seen_job_internal_ids = set()
        apps = []

        for a in raw_apps:
            a["id"] = str(a["_id"])
            del a["_id"]
            
            # Enrich with job details
            job = jobs_col.find_one({"job_id": a["job_id"]})
            if not job and len(a["job_id"]) == 24:
                try:
                    job = jobs_col.find_one({"_id": ObjectId(a["job_id"])})
                except:
                    pass

            # Determine a truly unique key for this job to prevent duplicates in the UI
            # We use the MongoDB string ID as the ultimate source of truth
            job_unique_key = None
            if job:
                job_unique_key = str(job["_id"])
            else:
                # If job is deleted, fallback to the job_id string from the application
                job_unique_key = a.get("job_id")

            if job_unique_key in seen_job_internal_ids:
                continue
            seen_job_internal_ids.add(job_unique_key)

            if job:
                a["job_title"] = job.get("job_title", "Unknown Job")
                a["shop_name"] = job.get("shop_name", "Unknown Shop")
                a["shop_type"] = job.get("shop_type", "")
                a["salary"] = job.get("salary_per_day", "")
                a["location"] = job.get("area", "")
                a["shift"] = job.get("shift_type", "")
            else:
                # Fallback if job was deleted or missing after both lookups
                a["job_title"] = "Job No Longer Available"
                a["shop_name"] = "Deleted"
                a["shop_type"] = "N/A"
                a["salary"] = "0"
                a["location"] = "Location Not Available"
                a["shift"] = ""
            
            apps.append(a)
            
        return {"status": "success", "applications": apps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/student/wishlist/toggle")
def toggle_wishlist(payload: dict):
    try:
        student_id = payload.get("student_id")
        job_id = payload.get("job_id")
        
        if not student_id or not job_id:
            raise HTTPException(status_code=400, detail="Missing student_id or job_id")
            
        user = users_col.find_one({"_id": ObjectId(student_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")
            
        wishlist = user.get("wishlist", [])
        if job_id in wishlist:
            # Remove from wishlist
            users_col.update_one(
                {"_id": ObjectId(student_id)},
                {"$pull": {"wishlist": job_id}}
            )
            return {"status": "success", "action": "removed", "message": "Job removed from wishlist"}
        else:
            # Add to wishlist
            users_col.update_one(
                {"_id": ObjectId(student_id)},
                {"$addToSet": {"wishlist": job_id}}
            )
            return {"status": "success", "action": "added", "message": "Job added to wishlist"}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/student/wishlist/{user_id}")
def get_student_wishlist(user_id: str):
    try:
        user = users_col.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="Student not found")
            
        wishlist_ids = user.get("wishlist", [])
        
        wishlist_jobs = []
        for j_id in wishlist_ids:
            job = jobs_col.find_one({"job_id": j_id})
            if not job:
                if len(j_id) == 24:
                    job = jobs_col.find_one({"_id": ObjectId(j_id)})
            
            if job:
                job["id"] = str(job["_id"])
                job["job_id"] = job.get("job_id", str(job["_id"]))
                del job["_id"]
                wishlist_jobs.append(job)
                
        return {"wishlist": wishlist_jobs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
