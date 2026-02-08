# Database Design

## Database: job_recommendation

The system uses MongoDB as a document-oriented database to store application data. 
The flexible schema supports evolving job attributes and user interaction data.

---

## Collections

### 1. users
Stores authentication and role information.

Fields:
- email (string)
- password_hash (string)
- role (student / retailer / admin)
- created_at (datetime)

---

### 2. students
Stores student preference profiles.

Fields:
- user_id (reference to users)
- skills (array)
- preferred_shift
- max_distance_km

---

### 3. retailers
Stores retailer details.

Fields:
- user_id (reference to users)
- shop_name
- shop_type
- verified (boolean)

---

### 4. jobs
Stores job postings.

Fields:
- job_id
- job_title
- job_category
- shop_type
- shift_type
- working_days
- salary_per_day
- seasonal_job
- location_area

---

### 5. interaction_logs
Stores user interactions for recommendation learning.

Fields:
- student_id
- job_id
- event_type (view / save / apply)
- timestamp
