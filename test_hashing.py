from passlib.context import CryptContext
import sys

def test_hashing():
    print(f"Python version: {sys.version}")
    try:
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password = "testpassword123"
        print(f"Hashing password: {password}")
        hashed = pwd_context.hash(password)
        print(f"Hashed: {hashed}")
        
        print("Verifying password...")
        verified = pwd_context.verify(password, hashed)
        print(f"Verified: {verified}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_hashing()
