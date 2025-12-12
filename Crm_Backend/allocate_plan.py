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
            GROUP_CONCAT(oc.CampaignName SEPARATOR ', ') AS campaign,
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
            pm.VFOCallCharge AS vfo
        FROM balance_master bm
        INNER JOIN plan_master pm ON bm.PlanId = pm.Id
        INNER JOIN registration_master rm ON bm.ClientId = rm.company_id
        LEFT JOIN ob_campaign oc ON bm.ClientId = oc.ClientId
        GROUP BY bm.Id
        ORDER BY bm.Id ASC
    """)).mappings().all()
    return rows


# =========================
# CREATE ALLOCATE PLAN
# =========================
@router.post("/create")
def create_allocate_plan(data: dict, db: Session = Depends(get_db4)):

    start_date = data["start_date"]

    # If ISO datetime received → convert
    if "T" in start_date:
        start_date = start_date.split("T")[0]

    db.execute(text("""
        INSERT INTO balance_master (PlanId, clientId, start_date)
        VALUES (:plan_id, :client_id, :start_date)
    """), {
        "plan_id": data["plan_id"],
        "client_id": data["client_id"],
        "start_date": start_date
    })

    db.commit()
    return {"status": "success", "message": "Plan Allocated Successfully"}
