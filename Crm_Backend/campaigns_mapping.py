
# campaigns_mapping.py
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4

router = APIRouter(prefix="/campaign-mapping", tags=["Campaign Mapping"])


def clean_value(val):
        if not val or val == "''":
            return ""
        return val.replace("'", "").replace(" ", "")


def to_db_format(value: str):
    if not value:
        return "''"
    return ",".join([f"'{v.strip()}'" for v in value.split(",") if v.strip()])



# LIST by company_id
@router.get("/list/{company_id}")
def list_campaigns(company_id: int, db: Session = Depends(get_db4)):
    query = """
        SELECT 
            company_id AS id,
            campaignid,
            GroupId,
            multilang_ivrs,
            agent_skills
        FROM registration_master
        WHERE company_id = :company_id
        ORDER BY company_id DESC
    """
    rows = db.execute(text(query), {"company_id": company_id}).mappings().all()

    response = []
    for row in rows:
        response.append({
            "company_id": row["id"],
            "campaignid": clean_value(row["campaignid"]),
            "GroupId": clean_value(row["GroupId"]),
            "multilang_ivrs": clean_value(row["multilang_ivrs"]),
            "agent_skills": clean_value(row["agent_skills"]),
        })
    return response


# VIEW single by company_id
@router.get("/view/{company_id}")
def view_campaign(company_id: int, db: Session = Depends(get_db4)):
    query = text("""
        SELECT 
            company_id AS id,
            campaignid,
            GroupId,
            multilang_ivrs,
            agent_skills
        FROM registration_master
        WHERE company_id = :company_id
    """)
    row = db.execute(query, {"company_id": company_id}).mappings().first()
    if not row:
        return {"error": f"Campaign ID {company_id} not found"}
    
    return {
        "company_id": row["id"],
        "campaignid": clean_value(row["campaignid"]),
        "GroupId": clean_value(row["GroupId"]),
        "multilang_ivrs": clean_value(row["multilang_ivrs"]),
        "agent_skills": clean_value(row["agent_skills"]),
    }


# CREATE (attach to company_id)
@router.post("/create/{company_id}")
def create_campaign(
    company_id: int,
    campaignid: str = Form(...),
    GroupId: str = Form(...),
    multilang_ivrs: str = Form(""),
    agent_skills: str = Form(""),
    db: Session = Depends(get_db4)
):
    query = text("""
        INSERT INTO registration_master
          (company_id, campaignid, GroupId, multilang_ivrs, agent_skills)
        VALUES
          (:company_id, :campaignid, :GroupId, :multilang_ivrs, :agent_skills)
    """)
    db.execute(query, {
        "company_id": company_id,
        "campaignid": to_db_format(campaignid),
        "GroupId": to_db_format(GroupId),
        "multilang_ivrs": to_db_format(multilang_ivrs),
        "agent_skills": to_db_format(agent_skills),
    })
    db.commit()
    return {"message": "Campaign Mapping created successfully."}


# UPDATE by company_id
@router.put("/update/{company_id}")
def update_campaign(
    company_id: int,
    campaignid: str = Form(...),
    GroupId: str = Form(...),
    multilang_ivrs: str = Form(""),
    agent_skills: str = Form(""),
    db: Session = Depends(get_db4)
):
    check = db.execute(
        text("SELECT company_id FROM registration_master WHERE company_id = :company_id"),
        {"company_id": company_id}
    ).fetchone()
    if not check:
        return {"error": f"Campaign ID {company_id} not found"}

    query = text("""
        UPDATE registration_master
        SET
          campaignid = :campaignid,
          GroupId = :GroupId,
          multilang_ivrs = :multilang_ivrs,
          agent_skills = :agent_skills,
          update_date = NOW()
        WHERE company_id = :company_id
    """)
    db.execute(query, {
        "company_id": company_id,
        "campaignid": to_db_format(campaignid),
        "GroupId": to_db_format(GroupId),
        "multilang_ivrs": to_db_format(multilang_ivrs),
        "agent_skills": to_db_format(agent_skills),
    })
    db.commit()
    return {"message": f"Campaign ID {company_id} updated successfully."}


# DELETE by company_id
@router.delete("/delete/{company_id}")
def delete_campaign(company_id: int, db: Session = Depends(get_db4)):
    check = db.execute(
        text("SELECT company_id FROM registration_master WHERE company_id = :company_id"),
        {"company_id": company_id}
    ).fetchone()
    if not check:
        return {"error": f"Campaign ID {company_id} not found"}

    db.execute(text("DELETE FROM registration_master WHERE company_id = :company_id"), {"company_id": company_id})
    db.commit()
    return {"message": f"Campaign ID {company_id} deleted successfully."}
