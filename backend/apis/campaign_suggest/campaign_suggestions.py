from db import get_conn


def get_industry_suggestions(limit=12):

    conn = get_conn()
    cursor = conn.cursor()

    try:

        query = """
        SELECT Standard_industry_desc
        FROM Mst_tblstandardindustry
        WHERE Isactive = 1
        ORDER BY Standard_industry_desc
        LIMIT %s
        """

        cursor.execute(query, (limit,))

        rows = cursor.fetchall()

        return [
            row[0]
            for row in rows
            if row[0]
        ]

    finally:
        cursor.close()
        conn.close()


def get_geography_suggestions(limit=15):

    conn = get_conn()
    cursor = conn.cursor()

    try:

        query = """
        SELECT Location_desc
        FROM Mst_tbllocationelements
        WHERE Isactive = 1
        AND Location_type IN ('country', 'region')
        ORDER BY Location_desc
        LIMIT %s
        """

        cursor.execute(query, (limit,))

        rows = cursor.fetchall()

        return [
            row[0]
            for row in rows
            if row[0]
        ]

    finally:
        cursor.close()
        conn.close()