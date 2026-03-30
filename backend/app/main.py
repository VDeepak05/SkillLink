from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.app.routes import router
import time

app = FastAPI(
    title="SkillLink Job Recommendation API",
    version="1.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production, e.g., ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
# Performance Middleware
# ---------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()

    response = await call_next(request)

    process_time = (time.perf_counter() - start_time) * 1000  # ms
    response.headers["X-Process-Time-ms"] = str(round(process_time, 2))

    return response




@app.get("/")
def root():
    return {"message": "Backend is running"}
