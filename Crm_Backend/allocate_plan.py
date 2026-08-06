# allocate_plan.py
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from database import get_db4  # Make sure this returns a Session

router = APIRouter(prefix="/allocate-plan", tags=["Allocate Plan"])

# =========================
# GET PLAN LIST
# =========================
@router.get("/plans")
def get_plans(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, PlanName AS plan_name
        FROM plan_master
        ORDER BY PlanName ASC
    """)).mappings().all()
    return rows  # Returns list of plans

# =========================
# GET CLIENT LIST
# =========================
@router.get("/clients")
def get_clients(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT company_id AS id, company_name AS client_name
        FROM registration_master
        WHERE status='A'
        AND company_id NOT IN (
            SELECT clientId FROM balance_master 
            WHERE end_date IS NOT NULL AND end_date > CURDATE()
        )
        ORDER BY company_name ASC
    """)).mappings().all()
    return rows  # Returns list of clients

# =========================
# GET CAMPAIGNS
# =========================
@router.get("/campaigns")
def get_campaigns(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT id, CampaignName
        FROM ob_campaign
        ORDER BY CampaignName ASC
    """)).mappings().all()
    return rows

# =========================
# GET ALLOCATED PLANS
# =========================
@router.get("/list")
def get_plan_list(db: Session = Depends(get_db4)):
    rows = db.execute(text("""
        SELECT 
            bm.Id AS srn,
            rm.company_name AS client,
            rm.campaignid as campaign,
            pm.PlanName AS plan,
            bm.start_date,
            bm.end_date,
            pm.SetupCost AS setUpCost,
            pm.RentalAmount AS rentalCost,
            bm.Balance AS balance,
            pm.PeriodType AS paymentTerms,
            pm.IB_Call_Charge AS ibCall,
            pm.InboundCallChargeNight AS ibCallNight,
            pm.OutboundCallCharge AS obCall,
            pm.SMSCharge AS sms,
            pm.EmailCharge AS email,
            pm.MissCallCharge AS missCall,
            pm.VFOCallCharge AS vfo,
            pm.TalktimePercent AS talktime,
            pm.CreditPointPercent AS subscription
        FROM balance_master bm
        INNER JOIN plan_master pm ON bm.PlanId = pm.Id
        INNER JOIN registration_master rm ON bm.ClientId = rm.company_id
        LEFT JOIN ob_campaign oc ON bm.ClientId = oc.ClientId
        GROUP BY bm.Id
        ORDER BY rm.company_name ASC
    """)).mappings().all()
    return rows


# =========================
# CREATE ALLOCATE PLAN
# =========================
@router.post("/create")
def create_allocate_plan(data: dict, db: Session = Depends(get_db4)):

    client_id = data["client_id"]
    plan_id = data["plan_id"]
    plan_type = data.get("plan_type", "Prepaid")

    # 1. Check if client already has a balance record -> "Plan Already Mapped"
    existing = db.execute(
        text("SELECT clientId FROM balance_master WHERE clientId = :client_id LIMIT 1"),
        {"client_id": client_id}
    ).fetchone()

    if existing:
        return {"status": "error", "message": "Plan Already Mapped"}

    # 2. Fetch plan -> "Plan Not Exists"
    plan = db.execute(
        text("SELECT Balance FROM plan_master WHERE Id = :plan_id"),
        {"plan_id": plan_id}
    ).mappings().fetchone()

    if not plan:
        return {"status": "error", "message": "Plan Not Exists"}

    balance_value = plan["Balance"]

    # 3. Insert into balance_master (PHP saves no start_date/end_date here)
    insert_query = """
        INSERT INTO balance_master
        (PlanId, clientId, Balance, MainBalance, PlanType, userid, createdate)
        VALUES (:plan_id, :client_id, :balance, :balance, :plan_type, 1, NOW())
    """
    db.execute(text(insert_query), {
        "plan_id": plan_id,
        "client_id": client_id,
        "balance": balance_value,
        "plan_type": plan_type,
    })

    # 4. Insert into history_plan_master
    db.execute(text("""
        INSERT INTO history_plan_master
        (planId, clientId, user_id, createdate)
        VALUES (:plan_id, :client_id, 1, NOW())
    """), {
        "plan_id": plan_id,
        "client_id": client_id,
    })

    # 5. Seed billing_opening_balance if not already present
    open_exist = db.execute(
        text("SELECT clientid FROM billing_opening_balance WHERE clientid = :client_id LIMIT 1"),
        {"client_id": client_id}
    ).fetchone()

    if not open_exist:
        db.execute(text("""
            INSERT INTO billing_opening_balance
            (clientid, bill_start_date, bill_end_date, fin_year, fin_month)
            VALUES (:client_id, CURDATE(), LAST_DAY(CURDATE()), :fin_year, :fin_month)
        """), {
            "client_id": client_id,
            "fin_year": datetime.now().strftime("%Y"),
            "fin_month": datetime.now().strftime("%b"),
        })

    db.commit()
    return {"status": "success", "message": "Plan Allocated To Client"}
