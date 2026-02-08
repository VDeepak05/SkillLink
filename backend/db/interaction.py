from datetime import datetime, timezone
from mongo_client import logs_col

def log_interaction(student_id, job_id, event_type):
    interaction = {
        "student_id": student_id,
        "job_id": job_id,
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc)
    }

    logs_col.insert_one(interaction)
    print(
        f"Logged interaction: {student_id} "
        f"{event_type} {job_id}"
    )


if __name__ == "__main__":
    log_interaction("U1001", "J2034", "view")
    log_interaction("U1001", "J2034", "save")
    log_interaction("U1001", "J2034", "apply")
