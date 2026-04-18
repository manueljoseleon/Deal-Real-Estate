"""
Shared FastAPI dependencies.
"""
from fastapi import Header, HTTPException
from backend.app.config import settings


def require_admin(x_admin_key: str = Header(default="")):
    """Reject requests that don't carry the correct X-Admin-Key header.

    If ADMIN_API_KEY is not configured (empty string), the check is skipped
    so local development works without setting the variable.
    """
    if settings.admin_api_key and x_admin_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key")
