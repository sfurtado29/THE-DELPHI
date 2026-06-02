# profile_routes.py
from fastapi import APIRouter, HTTPException
from db import get_conn

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)

@router.get("/{user_id}")
def get_company_profile(user_id: int):

    try:
        conn = get_conn()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            company_name,
            specialties,
            brands,
            services,
            industry,
            headquarters,
            website
        FROM delphi_company_profiles
        WHERE user_id = %s
        ORDER BY id DESC
        LIMIT 1
        """

        cursor.execute(query, (user_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=404,
                detail="Profile not found"
            )

        return {
            "success": True,
            "profile": row
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        try:
            cursor.close()
            conn.close()
        except:
            pass