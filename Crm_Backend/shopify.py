from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db4
from fastapi import Depends
from datetime import datetime, timedelta,timezone
import requests
import secrets

import os
from dotenv import load_dotenv

load_dotenv()

SHOPIFY_API_KEY = os.getenv("SHOPIFY_API_KEY")
SHOPIFY_API_SECRET = os.getenv("SHOPIFY_API_SECRET")
SHOPIFY_SCOPES = os.getenv("SHOPIFY_SCOPES")
SHOPIFY_REDIRECT_URI = os.getenv("SHOPIFY_REDIRECT_URI")
SHOPIFY_API_VERSION = os.getenv("SHOPIFY_API_VERSION")

router = APIRouter(
    prefix="/shopify",
    tags=["Shopify"]
)

state_store = {}


@router.get("/install")
def install(shop: str):

    state = secrets.token_hex(16)

    state_store[shop] = state

    auth_url = (
        f"https://{shop}/admin/oauth/authorize"
        f"?client_id={SHOPIFY_API_KEY}"
        f"&scope={SHOPIFY_SCOPES}"
        f"&redirect_uri={SHOPIFY_REDIRECT_URI}"
        f"&state={state}"
    )

    return RedirectResponse(auth_url)

#
# @router.get("/callback")
# def callback(
#     shop: str,
#     code: str,
#     state: str
# ):
#
#     if state_store.get(shop) != state:
#         raise HTTPException(
#             status_code=400,
#             detail="Invalid state"
#         )
#
#     response = requests.post(
#         f"https://{shop}/admin/oauth/access_token",
#         json={
#             "client_id": SHOPIFY_API_KEY,
#             "client_secret": SHOPIFY_API_SECRET,
#             "code": code
#         }
#     )
#
#     if response.status_code != 200:
#         raise HTTPException(
#             status_code=400,
#             detail=response.text
#         )
#
#     token = response.json()["access_token"]
#
#     return {
#         "shop": shop,
#         "access_token": token
#     }

def get_valid_token(shop: str, db: Session):

    result = db.execute(
        text("""
            SELECT
                access_token,
                refresh_token,
                expires_at
            FROM shopify_connections
            WHERE shop_domain = :shop
        """),
        {"shop": shop}
    ).fetchone()

    print("========== TOKEN CHECK ==========")
    print("Current time:", datetime.now())
    print("Expires at:", result.expires_at)

    if datetime.now() < result.expires_at:
        print("Using existing token")
        return result.access_token

    print("Refreshing token")

    return refresh_shopify_token(
        shop,
        result.refresh_token,
        db
    )

def refresh_shopify_token(
    shop: str,
    refresh_token: str,
    db: Session
):

    response = requests.post(
        f"https://{shop}/admin/oauth/access_token",
        json={
            "client_id": SHOPIFY_API_KEY,
            "client_secret": SHOPIFY_API_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
    )

    data = response.json()

    expires_at = datetime.now() + timedelta(
        seconds=data["expires_in"]
    )

    db.execute(
        text("""
            UPDATE shopify_connections
            SET
                access_token = :access_token,
                refresh_token = :refresh_token,
                expires_in = :expires_in,
                expires_at = :expires_at
            WHERE shop_domain = :shop
        """),
        {
            "shop": shop,
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
            "expires_in": data["expires_in"],
            "expires_at": expires_at
        }
    )

    db.commit()

    return data["access_token"]


@router.get("/callback")
def callback(
    shop: str,
    code: str,
    state: str,
    db: Session = Depends(get_db4)
):

    if state_store.get(shop) != state:
        raise HTTPException(
            status_code=400,
            detail="Invalid state"
        )


    response = requests.post(
        f"https://{shop}/admin/oauth/access_token",
        headers={
            "Content-Type": "application/json"
        },
        json={
            "client_id": SHOPIFY_API_KEY,
            "client_secret": SHOPIFY_API_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "expiring": 1
        }
    )


    print(response.text)


    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=response.text
        )

    print("========== REFRESH RESPONSE ==========")
    print("Status:", response.status_code)
    print("Headers:", response.headers)
    print("Body:", response.text)
    print("======================================")

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail=response.text
        )

    data = response.json()
    expires_at = datetime.now() + timedelta(
        seconds=data.get("expires_in", 0)
    )
    db.execute(
        text("""
            INSERT INTO shopify_connections
            (
                shop_domain,
                access_token,
                refresh_token,
                expires_in,
                expires_at
            )
            VALUES
            (
                :shop_domain,
                :access_token,
                :refresh_token,
                :expires_in,
                :expires_at
            )

            ON DUPLICATE KEY UPDATE

            access_token = :access_token,
            refresh_token = :refresh_token,
            expires_in = :expires_in
        """),
        {
            "shop_domain": shop,
            "access_token": data.get("access_token"),
            "refresh_token": data.get("refresh_token"),
            "expires_in": data.get("expires_in"),
            "expires_at": expires_at
        }
    )

    db.commit()

    return {
        "message": "Shopify connected successfully",
        "shop": shop
    }

@router.get("/customers")
def get_customers(shop: str,db: Session = Depends(get_db4)):


    access_token = get_valid_token(
        shop,
        db
    )

    url = (
        f"https://{shop}/admin/api/2026-07/customers.json"
    )

    response = requests.get(
        url,
        headers={
            "X-Shopify-Access-Token": access_token
        }
    )

    return response.json()


@router.get("/products")
def get_products(shop: str,db: Session = Depends(get_db4)):
    access_token = get_valid_token(
        shop,
        db
    )

    url = (
        f"https://{shop}/admin/api/2026-07/products.json"
    )

    response = requests.get(
        url,
        headers={
            "X-Shopify-Access-Token": access_token
        }
    )

    return response.json()


@router.get("/orders")
def get_orders(
    shop: str,
    db: Session = Depends(get_db4)
):

    access_token = get_valid_token(
        shop,
        db
    )

    url = (
        f"https://{shop}/admin/api/2026-07/orders.json"
    )

    response = requests.get(
        url,
        headers={
            "X-Shopify-Access-Token": access_token
        },
        params={
            "status": "any",
            "limit": 50
        }
    )

    return response.json()