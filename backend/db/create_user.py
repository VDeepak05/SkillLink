import bcrypt
from datetime import datetime
from mongo_client import users_col

def create_user(email, password, role):
    # Check if user already exists
    if users_col.find_one({"email": email}):
        print("User already exists!")
        return

    # Hash password
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    user = {
        "email": email,
        "password_hash": hashed.decode(),
        "role": role,
        "created_at": datetime.utcnow()
    }

    users_col.insert_one(user)
    print(f"User created: {email} ({role})")


# ---- TEST USERS ----
create_user("student1@college.edu", "student123", "student")
create_user("retailer1@shop.com", "retailer123", "retailer")
