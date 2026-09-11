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
        text("SELECT Balance, PlanType FROM plan_master WHERE Id = :plan_id"),
        {"plan_id": plan_id}
    ).mappings().fetchone()

    if not plan:
        raise HTTPException(status_code=404, detail="Plan not exists")

    balance_value = plan["Balance"]
    plan_type_value = plan["PlanType"]

    # --------------------------------------------
    # Check if client already has a balance record
    # --------------------------------------------
    balance_master = db.execute(
        text("SELECT Id, PlanId, activation_date FROM balance_master WHERE clientId = :client_id"),
        {"client_id": client_id}
    ).mappings().fetchone()

    # --------------------------------------------
    # Close old plan's effective window automatically
    # --------------------------------------------
    if balance_master and balance_master.get("PlanId"):
        old_plan_id = balance_master["PlanId"]
        old_activation = balance_master.get("activation_date")
        old_window_end = start_date_obj - timedelta(days=1)

        if old_activation:
            old_from = old_activation.strftime("%Y-%m-%d") if isinstance(old_activation, datetime) else str(old_activation)
        else:
            plan_created = db.execute(
                text("SELECT DATE(createdate) AS createdate FROM plan_master WHERE Id = :plan_id"),
                {"plan_id": old_plan_id}
            ).mappings().fetchone()
            old_from = str(plan_created["createdate"]) if plan_created and plan_created.get("createdate") else datetime.now().strftime("%Y-%m-%d")

        existing_old_window = db.execute(
            text("""
                SELECT id FROM plan_effective_window
                WHERE client_id = :client_id AND plan_id = :plan_id
            """),
            {"client_id": client_id, "plan_id": old_plan_id}
        ).mappings().fetchone()

        if existing_old_window:
            db.execute(text("""
                UPDATE plan_effective_window
                SET effective_to = :effective_to
                WHERE id = :id
            """), {
                "effective_to": old_window_end.strftime("%Y-%m-%d"),
                "id": existing_old_window["id"],
            })
        else:
            db.execute(text("""
                INSERT INTO plan_effective_window
                (client_id, plan_id, effective_from, effective_to)
                VALUES (:client_id, :plan_id, :effective_from, :effective_to)
            """), {
                "client_id": client_id,
                "plan_id": old_plan_id,
                "effective_from": old_from,
                "effective_to": old_window_end.strftime("%Y-%m-%d"),
            })

    if balance_master:
        # UPDATE existing record
        update_query = """
            UPDATE balance_master SET
                PlanId = :plan_id,
                PlanType = :plan_type,
                Balance = :balance,
                MainBalance = :balance,
                update_date = NOW()
            WHERE clientId = :client_id
        """
        db.execute(text(update_query), {
            "plan_id": plan_id,
            "plan_type": plan_type_value,
            "balance": balance_value,
            "client_id": client_id
        })

        # --------------------------------------------
        # Insert into billing_plan_alloc_log (UPDATE path only)
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

    else:
        # INSERT new record
        insert_query = """
            INSERT INTO balance_master 
            (PlanId, PlanType, clientId, Balance, MainBalance, start_date, end_date, userid, createdate)
            VALUES (:plan_id, :plan_type, :client_id, :balance, :balance, :start_date, :end_date, 1, NOW())
        """
        db.execute(text(insert_query), {
            "plan_id": plan_id,
            "plan_type": plan_type_value,
            "client_id": client_id,
            "balance": balance_value,
            "start_date": start_date_obj.strftime("%Y-%m-%d"),
            "end_date": end_date_obj.strftime("%Y-%m-%d"),
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
