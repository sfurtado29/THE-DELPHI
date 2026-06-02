from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_conn
from datetime import datetime, timedelta
import random
import string
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import bcrypt
import os

router = APIRouter()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotOTPRequest(BaseModel):
    email:    EmailStr
    otp_code: str


class ResetPasswordRequest(BaseModel):
    email:        EmailStr
    otp_code:     str
    new_password: str


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

                        <!-- Logo / Brand -->
                        <tr>
                            <td style="padding-bottom: 24px;">
                                <span style="font-size:22px; font-weight:700; color:#3b82f6;">Delphi AI</span>
                            </td>
                        </tr>

                        <!-- Message -->
                        <tr>
                            <td style="font-size:15px; color:#374151; padding-bottom:24px;">
                                You requested to reset your password. Use the code below:
                            </td>
                        </tr>

                        <!-- OTP Code -->
                        <tr>
                            <td style="padding-bottom:28px;">
                                <span style="font-size:36px; font-weight:700; color:#111827;
                                             letter-spacing:8px; font-family: 'Courier New', monospace;">
                                    {otp_spaced}
                                </span>
                            </td>
                        </tr>

                        <!-- Expiry Note -->
                        <tr>
                            <td style="font-size:13px; color:#6b7280;">
                                This code expires in <strong style="color:#111827;">10 minutes</strong>.
                                Do not share it with anyone.
                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="padding: 28px 0 16px 0;">
                                <hr style="border:none; border-top:1px solid #e5e7eb;">
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="font-size:12px; color:#9ca3af;">
                                If you did not request a password reset, please ignore this email.<br>
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
    msg["Subject"] = "Delphi AI - Password Reset Code"
    msg["From"]    = smtp_user
    msg["To"]      = to_email

    msg.attach(MIMEText(f"Your Delphi AI password reset OTP is: {otp}\nExpires in 10 minutes.", "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
            print(f"Password reset OTP sent to {to_email}")
    except Exception as e:
        print(f"SMTP Error: {e}")
        raise


@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        # Check user exists
        cur.execute(
            "SELECT user_id, is_active FROM Mst_tbldelphiusers WHERE email = %s",
            (req.email,)
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="No account found with this email."
            )

        if not user["is_active"]:
            raise HTTPException(
                status_code=403,
                detail="Account is deactivated."
            )

        # Invalidate old OTPs
        cur.execute("""
            UPDATE tbl_user_email_otp
            SET is_used = 1
            WHERE user_id = %s AND is_used = 0
        """, (user["user_id"],))

        # Generate OTP
        otp_code   = "".join(random.choices(string.digits, k=6))
        otp_expiry = datetime.now() + timedelta(minutes=10)

        # Save OTP
        cur.execute("""
            INSERT INTO tbl_user_email_otp (user_id, email, otp_code, otp_expiry, is_used)
            VALUES (%s, %s, %s, %s, 0)
        """, (user["user_id"], req.email, otp_code, otp_expiry))

        # Send email
        try:
            send_otp_email(req.email, otp_code)
        except Exception as e:
            print(f"Email send error: {e}")
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP email. Please try again."
            )

        return {
            "message": "Password reset OTP sent to your email.",
            "email":   req.email
        }

    finally:
        cur.close()
        conn.close()


@router.post("/verify-forgot-otp")
def verify_forgot_otp(req: VerifyForgotOTPRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT o.otp_id, o.otp_code, o.otp_expiry, u.user_id
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

        return {"message": "OTP verified. You can now reset your password."}

    finally:
        cur.close()
        conn.close()


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        # Verify OTP one more time before resetting
        cur.execute("""
            SELECT o.otp_id, o.otp_code, o.otp_expiry, u.user_id
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
                detail="No active OTP found. Please restart the process."
            )

        if datetime.now() > otp_row["otp_expiry"]:
            raise HTTPException(
                status_code=400,
                detail="OTP has expired. Please request a new one."
            )

        if otp_row["otp_code"] != req.otp_code:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP."
            )

        if len(req.new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 6 characters."
            )

        # Hash new password
        hashed = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()

        # Update password
        cur.execute(
            "UPDATE Mst_tbldelphiusers SET password = %s WHERE user_id = %s",
            (hashed, otp_row["user_id"])
        )

        # Mark OTP as used
        cur.execute(
            "UPDATE tbl_user_email_otp SET is_used = 1 WHERE otp_id = %s",
            (otp_row["otp_id"],)
        )

        return {"message": "Password reset successfully. You can now log in."}

    finally:
        cur.close()
        conn.close()