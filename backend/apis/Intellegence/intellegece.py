from fastapi import APIRouter
from pydantic import BaseModel
from apis.context_engine.cortex_service import query_cortex_analyst

router = APIRouter(
    prefix="/intellegence",
    tags=["Intellegence"]
)


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat_with_cortex(request: ChatRequest):
    try:
        results = query_cortex_analyst(request.message, model="leads")

        return {
            "data":      results,
            "row_count": len(results),
        }

    except Exception as e:
        return {"error": str(e)}
