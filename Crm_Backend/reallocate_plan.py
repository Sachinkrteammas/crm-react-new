# reallocate_plan.py
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from database import get_db4  # Your DB session dependency

router = APIRouter(
    prefix="/reallocate-plan",
    tags=["Re Allocate Plan"]
)

# =========================
# GET PLAN & CLIENT LIST (for form dropdowns)
# =========================
@router.get("/plans")
def get_plans(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, PlanName AS plan_name
        FROM plan_master
        ORDER BY PlanName ASC
    """)).mappings().all()
    return rows

@router.get("/clients")
def get_clients(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT company_id AS id, company_name AS client_name
        FROM registration_master
        WHERE status='A'
        AND company_id IN (SELECT clientId FROM balance_master)
        ORDER BY company_name ASC
    """)).mappings().all()
    return rows

# =========================
# RE-ALLOCATE PLAN
# =========================

@router.post("/save")
def save_reallocate_plan(
    client_id: int = Form(...),
    plan_id: int = Form(...),
    start_date: str = Form(...),
    db: Session = Depends(get_db4),
):
    """
    Reallocate plan to a client
    """

    # Validate date format
    try:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid start_date format, should be YYYY-MM-DD")

    end_date_obj = start_date_obj + timedelta(days=365 - 1)

    # --------------------------------------------
    # Fetch plan balance
    # --------------------------------------------
    plan = db.execute(
        text("SELECT Balance FROM plan_master WHERE Id = :plan_id"),
        {"plan_id": plan_id}
    ).mappings().fetchone()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not exists")

    balance_value = plan["Balance"]

    # --------------------------------------------
    # Check if client already has a balance record
    # --------------------------------------------
    balance_master = db.execute(
        text("SELECT Id FROM balance_master WHERE clientId = :client_id"),
        {"client_id": client_id}
    ).fetchone()

    if balance_master:
        # UPDATE existing record
        update_query = """
            UPDATE balance_master SET
                PlanId = :plan_id,
                Balance = :balance,
                MainBalance = :balance,
                update_date = NOW()
            WHERE clientId = :client_id
        """
        db.execute(text(update_query), {
            "plan_id": plan_id,
            "balance": balance_value,
            "client_id": client_id
        })

    else:
        # INSERT new record
        insert_query = """
            INSERT INTO balance_master 
            (PlanId, clientId, Balance, MainBalance, start_date, end_date, userid, createdate)
            VALUES (:plan_id, :client_id, :balance, :balance, :start_date, :end_date, 1, NOW())
        """
        db.execute(text(insert_query), {
            "plan_id": plan_id,
            "client_id": client_id,
            "balance": balance_value,
            "start_date": start_date_obj.strftime("%Y-%m-%d"),
            "end_date": end_date_obj.strftime("%Y-%m-%d"),
        })

    # --------------------------------------------
    # Insert into billing_plan_alloc_log
    # --------------------------------------------
    db.execute(text("""
        INSERT INTO billing_plan_alloc_log 
        (client_id, plan_id, start_date, created_by, alloc_type, created_at)
        VALUES (:client_id, :plan_id, :start_date, 1, 'Re-Allocate-plan', NOW())
    """), {
        "client_id": client_id,
        "plan_id": plan_id,
        "start_date": start_date_obj.strftime("%Y-%m-%d")
    })

    # --------------------------------------------
    # Insert into history_plan_master
    # --------------------------------------------
    db.execute(text("""
        INSERT INTO history_plan_master 
        (planId, clientId, user_id, createdate)
        VALUES (:plan_id, :client_id, 1, NOW())
    """), {
        "plan_id": plan_id,
        "client_id": client_id
    })

    db.commit()

    return {"status": "success", "message": "Plan re-allocated to client successfully"}
