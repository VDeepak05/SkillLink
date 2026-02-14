from fastapi import FastAPI
from app.routes import router

app = FastAPI(
    title="SkillLink Job Recommendation API",
    version="1.0"
)

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Backend is running"}
