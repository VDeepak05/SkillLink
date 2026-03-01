from app.recommender import recommend_jobs

# Mock student who prefers evening, but explicit filter requests morning and 'Retail'
profile = {
    "student_id": "student_0",
    "skills": "cashier",
    "preferred_shift": "evening",
    "filter_shop_type": "Retail",
    "filter_salary_min": 500,
    "page": 2,
    "limit": 3
}

recs = recommend_jobs(profile)
for r in recs:
    print(f"{r['job_title']} | {r['shop_type']} | {r['shift_type']} | ₹{r['salary_per_day']}")
