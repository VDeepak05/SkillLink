import bcrypt

def test_bcrypt():
    password = "testpassword123"
    print(f"Hashing password: {password}")
    
    # In bcrypt 4.0+, the password must be bytes
    password_bytes = password.encode('utf-8')
    
    # Hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    print(f"Hashed: {hashed}")
    
    # Verify
    print("Verifying...")
    verified = bcrypt.checkpw(password_bytes, hashed)
    print(f"Verified: {verified}")

if __name__ == "__main__":
    test_bcrypt()
