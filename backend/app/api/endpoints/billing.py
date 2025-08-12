from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.services.usage_service import usage_service
from app.services.stripe_service import stripe_service
from app.core.config import settings

router = APIRouter()

@router.post("/checkout-session")
async def create_checkout_session(current_user: User = Depends(get_current_user)):
    try:
        url = await stripe_service.create_checkout_session(current_user)
        return {"url": url}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/portal-session")
async def create_portal_session(current_user: User = Depends(get_current_user)):
    try:
        url = await stripe_service.create_billing_portal_session(current_user)
        return {"url": url}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/portal-link")
async def get_low_code_portal_link() -> dict:
    if not settings.STRIPE_PORTAL_LINK:
        raise HTTPException(status_code=500, detail='Stripe portal link not configured')
    return {"url": settings.STRIPE_PORTAL_LINK}

@router.get("/plan")
async def get_plan(current_user: User = Depends(get_current_user)):
    # Best-effort populate renewal for existing pro users
    try:
        await stripe_service.ensure_subscription_metadata(current_user)
    except Exception:
        pass
    overview = await usage_service.get_plan_overview(current_user)
    return overview 