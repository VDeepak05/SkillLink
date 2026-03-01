import random
from backend.db.mongo_client import logs_col, jobs_col

NUM_STUDENTS = 300
INTERACTIONS_PER_STUDENT = 40

print("Clearing old synthetic logs...")
logs_col.delete_many({})

jobs = list(jobs_col.find({}, {"job_id": 1, "shop_type": 1, "shift_type": 1}))

if not jobs:
    raise Exception("No jobs found in DB.")

# Group jobs by category
jobs_by_category = {}
for job in jobs:
    cat = job.get("shop_type", "unknown")
    jobs_by_category.setdefault(cat, []).append(job)

all_categories = list(jobs_by_category.keys())
all_jobs = jobs

print("Generating strong-structure synthetic logs...")

for i in range(NUM_STUDENTS):

    student_id = f"student_{i}"

    # 🔥 One dominant category
    primary_category = random.choice(all_categories)

    # 🔥 Strong shift preference
    preferred_shift = random.choice(["morning", "evening", "night"])

    for _ in range(INTERACTIONS_PER_STUDENT):

        # 90% within primary category
        if random.random() < 0.9:
            candidate_jobs = jobs_by_category.get(primary_category, all_jobs)
        else:
            candidate_jobs = all_jobs  # exploration

        job = random.choice(candidate_jobs)

        # Strong shift bias
        if job.get("shift_type") == preferred_shift:
            event_type = random.choices(
                ["view", "save", "apply"],
                weights=[1, 2, 6]  # strong apply bias
            )[0]
        else:
            event_type = random.choices(
                ["view", "save", "apply"],
                weights=[4, 2, 1]
            )[0]

        logs_col.insert_one({
            "student_id": student_id,
            "job_id": job["job_id"],
            "event_type": event_type
        })

print("Synthetic logs created.")
print("Total logs now:", logs_col.count_documents({}))