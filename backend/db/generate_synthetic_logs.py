import random
from backend.db.mongo_client import logs_col, jobs_col

NUM_STUDENTS = 300
INTERACTIONS_PER_STUDENT = 15

print("Clearing old synthetic logs...")
logs_col.delete_many({})

# Fetch all jobs
jobs = list(jobs_col.find({}, {"job_id": 1, "shop_type": 1, "shift_type": 1}))

if not jobs:
    raise Exception("No jobs found in DB.")

# Group jobs by shop_type
jobs_by_category = {}
for job in jobs:
    cat = job.get("shop_type", "unknown")
    jobs_by_category.setdefault(cat, []).append(job)

all_categories = list(jobs_by_category.keys())
all_jobs = jobs

print("Generating structured synthetic logs...")

for i in range(NUM_STUDENTS):

    student_id = f"student_{i}"

    # 🎯 Each student prefers 1–2 categories
    preferred_categories = random.sample(all_categories, k=min(2, len(all_categories)))

    # 🎯 Preferred shift
    preferred_shift = random.choice(["morning", "evening", "night"])

    for _ in range(INTERACTIONS_PER_STUDENT):

        # 80% probability: interact within preferred categories
        if random.random() < 0.8:
            category = random.choice(preferred_categories)
            candidate_jobs = jobs_by_category.get(category, all_jobs)
        else:
            # 20% exploration
            candidate_jobs = all_jobs

        job = random.choice(candidate_jobs)

        # Bias shift match slightly
        if job.get("shift_type") == preferred_shift:
            event_type = random.choices(
                ["view", "save", "apply"],
                weights=[1, 2, 4]
            )[0]
        else:
            event_type = random.choices(
                ["view", "save", "apply"],
                weights=[3, 2, 1]
            )[0]

        logs_col.insert_one({
            "student_id": student_id,
            "job_id": job["job_id"],
            "event_type": event_type
        })

print("Synthetic logs created.")
print("Total logs now:", logs_col.count_documents({}))