from fastapi import APIRouter, Request, HTTPException
from app.services.stripe_service import stripe_service

router = APIRouter()

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    try:
        await stripe_service.handle_webhook(payload, sig_header)
        return {"received": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) 