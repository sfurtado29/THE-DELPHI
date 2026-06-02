from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db import get_conn
import bcrypt
import random
import string
from datetime import datetime, timedelta
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

router = APIRouter()


class RegisterRequest(BaseModel):
    first_name:   str
    last_name:    str
    company_name: str
    email:        EmailStr
    password:     str


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
                                Your email verification code is:
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


@router.post("/register")
def register(req: RegisterRequest):
    conn = get_conn()
    cur  = conn.cursor(dictionary=True)
    try:
        # Check if email already exists
        cur.execute(
            "SELECT user_id, email_verified FROM Mst_tbldelphiusers WHERE email = %s",
            (req.email,)
        )
        existing = cur.fetchone()

        if existing:
            if existing["email_verified"] == 1:
                raise HTTPException(
                    status_code=400,
                    detail="Email already registered. Please login."
                )
            else:
                # Email exists but not verified — resend new OTP
                user_id    = existing["user_id"]
                otp_code   = "".join(random.choices(string.digits, k=6))
                otp_expiry = datetime.now() + timedelta(minutes=10)

                # Invalidate old OTPs
                cur.execute("""
                    UPDATE tbl_user_email_otp
                    SET is_used = 1
                    WHERE user_id = %s AND is_used = 0
                """, (user_id,))

                # Insert new OTP
                cur.execute("""
                    INSERT INTO tbl_user_email_otp (user_id, email, otp_code, otp_expiry, is_used)
                    VALUES (%s, %s, %s, %s, 0)
                """, (user_id, req.email, otp_code, otp_expiry))

                try:
                    send_otp_email(req.email, otp_code)
                except Exception as e:
                    print(f"Email send error: {e}")

                return {
                    "message": "Account exists but email not verified. New OTP sent.",
                    "user_id": user_id,
                    "email":   req.email
                }

        # Hash password
        hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()

        # Insert new user with role_id=2 (User) and email_verified=0
        cur.execute("""
            INSERT INTO Mst_tbldelphiusers
                (role_id, user_first_name, user_last_name, company_name, email, password, email_verified, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, 0, 1)
        """, (2, req.first_name, req.last_name, req.company_name, req.email, hashed))

        user_id = cur.lastrowid

        # Generate 6-digit OTP
        otp_code   = "".join(random.choices(string.digits, k=6))
        otp_expiry = datetime.now() + timedelta(minutes=10)

        # Save OTP to DB
        cur.execute("""
            INSERT INTO tbl_user_email_otp (user_id, email, otp_code, otp_expiry, is_used)
            VALUES (%s, %s, %s, %s, 0)
        """, (user_id, req.email, otp_code, otp_expiry))

        # Send OTP email
        try:
            send_otp_email(req.email, otp_code)
        except Exception as e:
            print(f"Email send error: {e}")
            return {
                "message": "Registration successful but email delivery failed. Please use Resend OTP.",
                "user_id": user_id,
                "email":   req.email
            }

        return {
            "message": "Registration successful. OTP sent to your email.",
            "user_id": user_id,
            "email":   req.email
        }

    finally:
        cur.close()
        conn.close()