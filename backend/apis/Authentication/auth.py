# backend/apis/Authentication/auth.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_conn
from datetime import datetime, timedelta
import random
import string
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

router = APIRouter()


class VerifyOTPRequest(BaseModel):
    email:    EmailStr
    otp_code: str


class ResendOTPRequest(BaseModel):
    email: EmailStr


def send_otp_email(to_email: str, otp: str):
    smtp_host     = os.getenv("SMTP_HOST", "smtp.zoho.in")
    smtp_port     = int(os.getenv("SMTP_PORT", 587))
    smtp_user     = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    otp_spaced = " ".join(list(otp))

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0"
                        style="background:#ffffff; border-radius:12px; border:1px solid #e2e8f0; padding:40px;">
                        <tr>
                            <td style="padding-bottom: 24px;">
                                <span style="font-size:22px; font-weight:700; color:#3b82f6;">Delphi AI</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:15px; color:#374151; padding-bottom:24px;">
                                Your email verification code is:
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-bottom:28px;">
                                <span style="font-size:36px; font-weight:700; color:#111827;
                                             letter-spacing:8px; font-family: 'Courier New', monospace;">
                                    {otp_spaced}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:13px; color:#6b7280;">
                                This code expires in <strong style="color:#111827;">10 minutes</strong>.
                                Do not share it with anyone.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 28px 0 16px 0;">
                                <hr style="border:none; border-top:1px solid #e5e7eb;">
                            </td>
                        </tr>
                        <tr>
                            <td style="font-size:12px; color:#9ca3af;">
                                If you did not request this, please ignore this email.<br>
                                &copy; 2025 Delphi AI. All rights reserved.
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Delphi AI - Email Verification Code"
    msg["From"]    = smtp_user
    msg["To"]      = to_email

    msg.attach(MIMEText(f"Your Delphi AI OTP is: {otp}\nExpires in 10 minutes.", "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
            print(f"OTP email sent successfully to {to_email}")
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise


@router.post("/verify-otp")
def verify_otp(req: VerifyOTPRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT o.otp_id, o.otp_code, o.otp_expiry, o.is_used, u.user_id
            FROM tbl_user_email_otp o
            JOIN Mst_tbldelphiusers u ON o.user_id = u.user_id
            WHERE o.email = %s AND o.is_used = 0
            ORDER BY o.created_at DESC
            LIMIT 1
        """, (req.email,))
        otp_row = cur.fetchone()

        if not otp_row:
            raise HTTPException(
                status_code=400,
                detail="No active OTP found. Please request a new one."
            )

        if datetime.now() > otp_row["otp_expiry"]:
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new one."
            )

        if otp_row["otp_code"] != req.otp_code:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP. Please check and try again."
            )

        # Mark OTP as used
        cur.execute(
            "UPDATE tbl_user_email_otp SET is_used = 1 WHERE otp_id = %s",
            (otp_row["otp_id"],)
        )

        # Mark user email as verified
        cur.execute(
            "UPDATE Mst_tbldelphiusers SET email_verified = 1 WHERE user_id = %s",
            (otp_row["user_id"],)
        )

        return {"message": "Email verified successfully. You can now log in."}

    finally:
        cur.close()
        conn.close()


@router.post("/resend-otp")
def resend_otp(req: ResendOTPRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(
            "SELECT user_id, email_verified FROM Mst_tbldelphiusers WHERE email = %s",
            (req.email,)
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="Email not found. Please register first."
            )

        if user["email_verified"] == 1:
            raise HTTPException(
                status_code=400,
                detail="Email is already verified. Please login."
            )

        # Invalidate all previous OTPs
        cur.execute("""
            UPDATE tbl_user_email_otp
            SET is_used = 1
            WHERE user_id = %s AND is_used = 0
        """, (user["user_id"],))

        # Generate new OTP
        otp_code   = "".join(random.choices(string.digits, k=6))
        otp_expiry = datetime.now() + timedelta(minutes=10)

        cur.execute("""
            INSERT INTO tbl_user_email_otp (user_id, email, otp_code, otp_expiry, is_used)
            VALUES (%s, %s, %s, %s, 0)
        """, (user["user_id"], req.email, otp_code, otp_expiry))

        try:
            send_otp_email(req.email, otp_code)
        except Exception as e:
            print(f"Email send error: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP email. Please try again."
            )

        return {"message": "New OTP sent to your email."}

    finally:
        cur.close()
        conn.close()


# ── NEW: Fetch user by email after OTP verification ───────────────────────────

@router.get("/user-by-email")
def get_user_by_email(email: str):
    """
    Called by frontend immediately after OTP verification
    to fetch full user object (including user_id) for localStorage.
    """
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                u.user_id,
                u.user_first_name,
                u.user_last_name,
                u.company_name,
                u.email,
                r.role_name
            FROM Mst_tbldelphiusers u
            JOIN Mst_delphirole r ON u.role_id = r.role_id
            WHERE u.email = %s
              AND u.is_active = 1
        """, (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return {"success": True, "user": user}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()