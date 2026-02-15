from fastapi import FastAPI, Request
from app.routes import router
import time

app = FastAPI(
    title="SkillLink Job Recommendation API",
    version="1.0"
)

# Performance Middleware
# ---------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time = (time.perf_counter() - start_time) * 1000  # ms
    response.headers["X-Process-Time-ms"] = str(round(process_time, 2))

    return response

app.include_router(router)


@app.get("/")
def root():
    return {"message": "Backend is running"}
