
from fastapi import APIRouter, Form, HTTPException
from db import get_conn
import hashlib

router = APIRouter()

@router.post("/login")
def login(user_email: str = Form(...), user_password: str = Form(...)):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)

    # If password is stored as plain text (not recommended but simple)
    query = """
        SELECT 
            User_id AS id,
            User_email AS email,
            CONCAT(User_firstname,' ',User_lastname) AS fullname,
            Prole_id AS role
        FROM Mst_tblusers
        WHERE User_email = %s 
          AND User_password = %s
          AND Isactive = 1
    """

    cur.execute(query, (user_email, user_password))
    user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "user": user
    }
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_conn
import bcrypt

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/login")
def login(req: LoginRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT u.user_id, u.user_first_name, u.user_last_name,
                   u.email, u.password, u.email_verified, u.is_active,
                   u.role_id, r.role_name
            FROM Mst_tbldelphiusers u
            JOIN Mst_delphirole r ON u.role_id = r.role_id
            WHERE u.email = %s
        """, (req.email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="Account is deactivated")

        if not user["email_verified"]:
            raise HTTPException(status_code=403, detail="Email not verified. Please verify your OTP first.")

        if not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "message": "Login successful",
            "user": {
                "user_id":    user["user_id"],
                "full_name":  f"{user['user_first_name']} {user['user_last_name']}",
                "email":      user["email"],
                "role_id":    user["role_id"],
                "role_name":  user["role_name"],
            }
        }

    finally:
        cur.close()
        conn.close()