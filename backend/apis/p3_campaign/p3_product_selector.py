# apis/p3_campaign/p3_product_selector.py
from __future__ import annotations
from difflib import get_close_matches
from db import get_conn
from apis.context_engine.openai_service import ask_gpt


def get_user_products(user_id: int) -> list[str]:
    """
    Returns flat list of product/service names for the user.
    Reads brands, services, and specialties — covers all company types.
    """
    try:
        conn   = get_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT brands, services, specialties
            FROM delphi_company_profiles
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
        """, (user_id,))
        row = cursor.fetchone()
        if not row:
            return []
        products = []
        seen     = set()
        for col in ("brands", "services", "specialties"):
            raw = row.get(col) or ""
            for item in raw.split(","):
                item = item.strip()
                if item and item.lower() not in seen:
                    seen.add(item.lower())
                    products.append(item)
        return products
    except Exception as e:
        print(f"[ProductSelector] DB error for user {user_id}: {e}")
        return []
    finally:
        try:
            cursor.close()
            conn.close()
        except:
            pass


def get_product_labels(products: list[str]) -> list[str]:
    """Pass-through — kept for import compatibility."""
    return products


def detect_product_selection(user_input: str, products: list[str]) -> str | None:
    if not products:
        return None

    lower_input = user_input.lower().strip()

    # 1. Direct substring match
    for product in products:
        if product.lower() in lower_input or lower_input in product.lower():
            return product

    # 2. Fuzzy match
    matches = get_close_matches(user_input, products, n=1, cutoff=0.4)
    if matches:
        return matches[0]

    # 3. GPT fallback for ordinal / natural language
    numbered = "\n".join(f"{i+1}. {p}" for i, p in enumerate(products))
    prompt = f"""A user was shown this list of products and asked to pick one:

{numbered}

User said: "{user_input}"

If the user is clearly selecting one of the listed products
(by number, ordinal, name, or description), return ONLY the
exact product name from the list.
If the user is describing a NEW product not on the list, return: NONE
No explanation. No quotes."""

    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=50).strip()
        if result.upper() == "NONE":
            return None
        for product in products:
            if product.lower() == result.lower():
                return product
        return None
    except Exception as e:
        print(f"[ProductSelector] GPT error: {e}")
        return None


def build_product_question(products: list[str]) -> str:
    if not products:
        return (
            "What product or service would you like to run this campaign for? "
            "Give me a brief description."
        )
    numbered = "\n".join(f"{i+1}. {p}" for i, p in enumerate(products))
    return (
        f"We found these from your profile:\n\n"
        f"{numbered}\n\n"
        f"Which one would you like to run this campaign for? "
        f"Pick one from the list, or describe a new one if it's not listed."
    )


def detect_product_selection(user_input: str, products: list[str]) -> str | None:
    """
    Returns matched product name string or None.
    """
    if not products:
        return None

    lower_input = user_input.lower().strip()

    # 1. Direct substring match
    for p in products:
        if p.lower() in lower_input or lower_input in p.lower():
            return p

    # 2. Fuzzy match
    matches = get_close_matches(user_input, products, n=1, cutoff=0.4)
    if matches:
        return matches[0]

    # 3. GPT fallback
    numbered = "\n".join(f"{i+1}. {p}" for i, p in enumerate(products))
    prompt = f"""A user was shown this list and asked to pick one:

{numbered}

User said: "{user_input}"

If the user is clearly selecting one of the listed items
(by number, ordinal, name, or description), return ONLY the
exact item name from the list.
If the user is describing something NEW not on the list, return: NONE
No explanation. No quotes."""

    try:
        result = ask_gpt(prompt, temperature=0.0, max_tokens=50).strip()
        if result.upper() == "NONE":
            return None
        return next((p for p in products if p.lower() == result.lower()), None)
    except Exception as e:
        print(f"[ProductSelector] GPT error: {e}")
        return None