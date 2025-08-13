import stripe
from typing import Optional
from fastapi import HTTPException
from app.core.config import settings
from app.db.session import async_session_factory
from app.models.user import User
from datetime import datetime, timezone
from app.services.email_service import send_email
from app.services.email_templates import build_subscription_welcome_email, build_subscription_cancellation_email

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    def __init__(self):
        self.price_id = settings.STRIPE_PRICE_ID or settings.STRIPE_PRICE_PRO_MONTHLY
        self.frontend_origin = settings.EFFECTIVE_FRONTEND_URL
        self.backend_origin = settings.EFFECTIVE_BACKEND_URL
        self.webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)

    async def _get_or_create_customer(self, user: User) -> str:
        if user.stripe_customer_id:
            return user.stripe_customer_id
        # Try to find existing Stripe customer by email to avoid duplicates
        try:
            existing = stripe.Customer.list(email=user.email, limit=1)
            if existing and existing.data:
                customer_id = existing.data[0].id
            else:
                sc = stripe.Customer.create(email=user.email, name=user.full_name)
                customer_id = sc.id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Stripe customer error: {e}")
        async with async_session_factory() as session:
            db_user = await session.get(User, user.id)
            db_user.stripe_customer_id = customer_id
            await session.commit()
        return customer_id

    async def _find_user_by_customer(self, customer_id: str) -> Optional[User]:
        async with async_session_factory() as session:
            from sqlalchemy import select
            res = await session.execute(select(User).where(User.stripe_customer_id == customer_id))
            return res.scalars().first()

    async def _find_or_link_user_by_customer(self, customer_id: str) -> Optional[User]:
        # First try direct mapping
        user = await self._find_user_by_customer(customer_id)
        if user:
            return user
        # Fallback: fetch Stripe customer and map by email
        try:
            cust = stripe.Customer.retrieve(customer_id)
            email = cust.get('email')
            if not email:
                return None
            async with async_session_factory() as session:
                from sqlalchemy import select
                res = await session.execute(select(User).where(User.email == email))
                u = res.scalars().first()
                if not u:
                    return None
                db_user = await session.get(User, u.id)
                db_user.stripe_customer_id = customer_id
                await session.commit()
                return db_user
        except Exception:
            return None

    async def ensure_subscription_metadata(self, user: User) -> None:
        """Best-effort populate renewal date for existing pro users missing renewal info."""
        if not user or not user.stripe_customer_id:
            return
        if (user.subscription_tier or '').lower() != 'pro' or user.subscription_status not in ('active','trialing'):
            return
        if getattr(user, 'subscription_renewal_at', None):
            return
        try:
            subs = stripe.Subscription.list(customer=user.stripe_customer_id, status='all', limit=3)
            # Find active/trialing sub for our price
            sub = None
            for s in subs.auto_paging_iter():
                st = s.get('status')
                if st in ('active','trialing'):
                    # If a price is configured, match it; otherwise take the first active
                    try:
                        price_id = s['items']['data'][0]['price']['id']
                        if self.price_id and price_id != self.price_id:
                            continue
                    except Exception:
                        pass
                    sub = s
                    break
            if sub:
                cpe = sub.get('current_period_end')
                if cpe:
                    async with async_session_factory() as session:
                        db_user = await session.get(User, user.id)
                        db_user.subscription_renewal_at = datetime.fromtimestamp(cpe, tz=timezone.utc)
                        await session.commit()
        except Exception:
            # Silent failure; this is best-effort
            pass

    async def create_checkout_session(self, user: User) -> str:
        if not self.price_id:
            raise HTTPException(status_code=500, detail='Stripe price not configured')
        customer_id = await self._get_or_create_customer(user)
        # Prevent multiple concurrent subscriptions
        try:
            subs = stripe.Subscription.list(customer=customer_id, status='all', limit=10)
            for s in subs.auto_paging_iter():
                if s.get('status') in ('active', 'trialing'):
                    # Block only true active/trialing subs
                    raise HTTPException(status_code=400, detail='An active subscription already exists for this account')
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Stripe subscription check failed: {e}")
        session = stripe.checkout.Session.create(
            mode='subscription',
            customer=customer_id,
            line_items=[{"price": self.price_id, "quantity": 1}],
            success_url=f"{self.frontend_origin}/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{self.frontend_origin}/billing/cancel",
            metadata={"user_id": str(user.id)},
            # Restrict to card-only to disable Amazon Pay, Cash App Pay, Klarna, etc.
            payment_method_types=["card"],
        )
        return session.url

    async def create_billing_portal_session(self, user: User) -> str:
        customer_id = await self._get_or_create_customer(user)
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{self.frontend_origin}/profile"
        )
        return session.url

    async def handle_webhook(self, payload: bytes, sig_header: Optional[str]):
        if not self.webhook_secret:
            raise HTTPException(status_code=500, detail='Webhook secret not configured')
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=self.webhook_secret
        )
        type_ = event['type']
        data = event['data']['object']

        if type_ == 'checkout.session.completed':
            await self._on_checkout_completed(data)
        elif type_ in ('customer.subscription.created', 'customer.subscription.updated'):
            await self._on_subscription_update(data)
        elif type_ == 'customer.subscription.deleted':
            await self._on_subscription_deleted(data)

    async def _on_checkout_completed(self, session_obj):
        customer_id = session_obj.get('customer')
        email = session_obj.get('customer_details', {}).get('email')
        async with async_session_factory() as session:
            user = await self._find_user_by_customer(customer_id)
            if not user and email:
                from sqlalchemy import select
                res = await session.execute(select(User).where(User.email == email))
                user = res.scalars().first()
            if user:
                db_user = await session.get(User, user.id)
                # Snapshot old state
                old_status = db_user.subscription_status
                old_tier = (db_user.subscription_tier or '').lower()
                db_user.stripe_customer_id = customer_id
                db_user.subscription_status = 'active'
                db_user.subscription_tier = 'pro'
                # Try to populate renewal from the subscription if available via expand
                try:
                    sub_id = session_obj.get('subscription')
                    if sub_id:
                        sub = stripe.Subscription.retrieve(sub_id)
                        cpe = sub.get('current_period_end')
                        if cpe:
                            db_user.subscription_renewal_at = datetime.fromtimestamp(cpe, tz=timezone.utc)
                except Exception:
                    pass
                await session.commit()
                # Send welcome email only on transition to active/trialing pro
                became_pro = (db_user.subscription_status in ('active','trialing')) and ((db_user.subscription_tier or '').lower() == 'pro') and not (old_tier == 'pro' and (old_status in ('active','trialing')))
                if became_pro:
                    try:
                        send_email(
                            subject="Welcome to Thesyx Pro",
                            recipients=[db_user.email],
                            html_body=build_subscription_welcome_email(db_user.full_name),
                        )
                    except Exception:
                        pass

    async def _on_subscription_update(self, sub_obj):
        customer_id = sub_obj.get('customer')
        status = sub_obj.get('status')
        user = await self._find_or_link_user_by_customer(customer_id)
        if not user:
            return
        async with async_session_factory() as session:
            db_user = await session.get(User, user.id)
            # Snapshot old state
            old_status = db_user.subscription_status
            old_tier = (db_user.subscription_tier or '').lower()
            db_user.subscription_status = status
            try:
                items = sub_obj.get('items', {}).get('data', [])
                if items:
                    price = items[0]['price']
                    db_user.subscription_tier = 'pro' if price.get('id') == self.price_id else 'free'
            except Exception:
                pass
            # Save renewal (current_period_end) if present
            try:
                cpe = sub_obj.get('current_period_end')
                if cpe:
                    db_user.subscription_renewal_at = datetime.fromtimestamp(cpe, tz=timezone.utc)
            except Exception:
                pass
            await session.commit()
            # Send welcome email only on transition to active/trialing pro
            became_pro = (db_user.subscription_status in ('active','trialing')) and ((db_user.subscription_tier or '').lower() == 'pro') and not (old_tier == 'pro' and (old_status in ('active','trialing')))
            if became_pro:
                try:
                    send_email(
                        subject="Welcome to Thesyx Pro",
                        recipients=[db_user.email],
                        html_body=build_subscription_welcome_email(db_user.full_name),
                    )
                except Exception:
                    pass

    async def _on_subscription_deleted(self, sub_obj):
        customer_id = sub_obj.get('customer')
        user = await self._find_or_link_user_by_customer(customer_id)
        if not user:
            return
        async with async_session_factory() as session:
            db_user = await session.get(User, user.id)
            db_user.subscription_status = 'canceled'
            db_user.subscription_tier = 'free'
            db_user.subscription_renewal_at = None
            await session.commit()
        # Send cancellation email (best-effort)
        try:
            send_email(
                subject="Your Thesyx Pro subscription is canceled",
                recipients=[user.email],
                html_body=build_subscription_cancellation_email(user.full_name),
            )
        except Exception:
            pass

stripe_service = StripeService() 