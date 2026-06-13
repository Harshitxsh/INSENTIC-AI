import os
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth

# Load service account path from environment, or default if missing
# The user will need to supply the path in the .env or env vars
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")

try:
    if firebase_admin._apps:
        pass
    elif cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized using service account certificate.")
    else:
        # Fallback to Application Default Credentials (ADC) for Google Cloud Run
        firebase_admin.initialize_app()
        print("Firebase Admin SDK initialized using Application Default Credentials (ADC).")
except Exception as e:
    print(f"Warning: Failed to initialize Firebase Admin SDK: {e}")

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
