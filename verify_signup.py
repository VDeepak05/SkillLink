import urllib.request
import json

def test_signup():
    url = "http://localhost:8000/auth/signup/student"
    payload = {
        "name": "Test User",
        "college": "Test College",
        "college_reg_no": "12345",
        "dob": "2000-01-01",
        "phone_no": "1234567890",
        "email": "test_unique3@example.com",
        "password": "testpassword123"
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    req.add_header('Content-Type', 'application/json')
    
    print(f"Sending request to {url}...")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            print(f"Status Code: {response.getcode()}")
            print(f"Response: {response.read().decode('utf-8')}")
    except Exception as e:
        print(f"Request failed: {e}")
        if hasattr(e, 'read'):
            print(f"Error detail: {e.read().decode('utf-8')}")

if __name__ == "__main__":
    test_signup()
