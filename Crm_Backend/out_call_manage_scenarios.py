
# Out Call Manage Scenarios Api..
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4, get_engine4
from pydantic import BaseModel
from typing import Optional
from io import BytesIO
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

router = APIRouter(prefix="/obecr", tags=["Out Call ECR"])

# ------------------- MODELS -------------------
class CreateScenario(BaseModel):
    ecrName: str
    parent_id: Optional[int] = None
    Label: Optional[int] = None
    campaign_id: int

class UpdateScenario(BaseModel):
    ecrName: Optional[str] = None
    parent_id: Optional[int] = None
    Label: Optional[int] = None

def safe_int(v):
    try:
        return int(v)
    except:
        return None

# ------------------- HELPER -------------------
def fetch_obecr(query: str, params: dict):
    engine = get_engine4()
    with engine.connect() as conn:
        result = conn.execute(text(query), params).mappings()
        return [{"id": row["id"], "ecrName": row["ecrName"]} for row in result]

# ------------------- LEVEL APIs -------------------
@router.get("/level{level}/{parent_id}", tags=["Levels"])
def get_level(level: int, parent_id: int, client_id: int = Query(...), campaign_id: int = Query(...)):
    query = """
        SELECT id, ecrName
        FROM obecr_master
        WHERE Label = :level
          AND parent_id = :parent_id
          AND Client = :client_id
          AND CampaignId = :campaign_id
        ORDER BY ecrName
    """
    return fetch_obecr(query, {"level": level, "parent_id": parent_id, "client_id": client_id, "campaign_id": campaign_id})

# LEVEL 1 (no parent)
@router.get("/level1")
def get_level1(client_id: int = Query(...), campaign_id: int = Query(...)):
    query = """
        SELECT id, ecrName
        FROM obecr_master
        WHERE Label = 1
          AND Client = :client_id
          AND CampaignId = :campaign_id
        ORDER BY ecrName
    """
    return fetch_obecr(query, {"client_id": client_id, "campaign_id": campaign_id})

# ------------------- TREE -------------------
@router.get("/tree")
def get_out_tree(client_id: int, campaign_id: int, db: Session = Depends(get_db4)):
    q = text("""
        SELECT * FROM obecr_master
        WHERE Client=:client AND CampaignId=:camp
        ORDER BY id ASC
    """)
    rows = [dict(r._mapping) for r in db.execute(q, {"client": client_id, "camp": campaign_id})]

    for r in rows:
        r["id"] = int(r["id"])
        r["parent_id"] = safe_int(r["parent_id"])
        r["Label"] = safe_int(r["Label"])

    by_parent = {}
    for r in rows:
        by_parent.setdefault(r["parent_id"], []).append(r)

    def build(pid=None):
        nodes = []
        for row in by_parent.get(pid, []):
            nodes.append({
                "id": row["id"],
                "Scenario": row["ecrName"],
                "Label": row["Label"],
                "children": build(row["id"])
            })
        return nodes

    return {"scenarios": build(None)}

# ------------------- CREATE -------------------
@router.post("/create")
def create_out_scenario(payload: CreateScenario, client_id: int, db: Session = Depends(get_db4)):
    q = text("""
        INSERT INTO obecr_master (ecrName, parent_id, Label, Client, CampaignId, createdate)
        VALUES (:name, :pid, :lab, :client, :camp, NOW())
    """)
    db.execute(q, {
        "name": payload.ecrName,
        "pid": payload.parent_id,
        "lab": payload.Label,
        "client": client_id,
        "camp": payload.campaign_id
    })
    db.commit()
    return {"status": "created"}

# ------------------- UPDATE -------------------
@router.put("/update/{id}")
def update_out_scenario(id: int, payload: UpdateScenario, client_id: int, db: Session = Depends(get_db4)):
    check = db.execute(text("SELECT id FROM obecr_master WHERE id=:id AND Client=:client"), {"id": id, "client": client_id}).first()
    if not check:
        raise HTTPException(404, "Scenario not found")

    fields = []
    params = {"id": id, "client": client_id}

    if payload.ecrName:
        fields.append("ecrName=:name")
        params["name"] = payload.ecrName
    if payload.parent_id is not None:
        fields.append("parent_id=:pid")
        params["pid"] = payload.parent_id
    if payload.Label is not None:
        fields.append("Label=:lab")
        params["lab"] = payload.Label
    if not fields:
        return {"status": "no changes"}

    q = f"UPDATE obecr_master SET {', '.join(fields)} WHERE id=:id AND Client=:client"
    db.execute(text(q), params)
    db.commit()
    return {"status": "updated"}

# ------------------- DELETE -------------------
@router.delete("/delete/{id}")
def delete_out_scenario(id: int, client_id: int, db: Session = Depends(get_db4)):
    def delete_children(parent):
        children = db.execute(text("SELECT id FROM obecr_master WHERE parent_id=:pid"), {"pid": parent}).fetchall()
        for c in children:
            delete_children(c.id)
        db.execute(text("DELETE FROM obecr_master WHERE id=:id"), {"id": parent})

    delete_children(id)
    db.commit()
    return {"status": "deleted"}

# ------------------- EXPORT -------------------
@router.get("/export")
def export_out_tree(client_id: int, campaign_id: int, db: Session = Depends(get_db4)):
    # Fetch all scenarios for client + campaign
    q = text("SELECT id, ecrName, parent_id, Label FROM obecr_master WHERE Client=:client AND CampaignId=:camp ORDER BY id ASC")
    rows = [dict(r._mapping) for r in db.execute(q, {"client": client_id, "camp": campaign_id})]

    # Normalize parent_id and Label
    for r in rows:
        r["parent_id"] = safe_int(r.get("parent_id"))
        r["Label"] = safe_int(r.get("Label"))

    # Build tree grouped by parent_id
    by_parent = {}
    for r in rows:
        by_parent.setdefault(r["parent_id"], []).append(r)

    def build_tree(parent_id=None, level=0):
        nodes = []
        for r in by_parent.get(parent_id, []):
            node = {
                "id": r["id"],
                "Scenario": r["ecrName"],
                "Label": r["Label"],
                "parent_id": parent_id,
                "level": level,
                "children": build_tree(r["id"], level + 1)
            }
            nodes.append(node)
        return nodes

    tree = build_tree(None)

    # --- Excel export ---
    wb = Workbook()
    ws = wb.active
    ws.title = "scenarios_tree"

    # Only required headers
    ws.append(["ID", "Scenario", "Label", "Parent ID", "Level"])

    def write_nodes(nodes):
        for n in nodes:
            ws.append([n["id"], n["Scenario"], n["Label"], n["parent_id"], n["level"]])
            write_nodes(n["children"])

    write_nodes(tree)

    # Save to memory and return
    out = BytesIO()
    wb.save(out)
    out.seek(0)
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=scenarios_tree_{client_id}_{campaign_id}.xlsx"}
    )


# ------------------- CAMPAIGNS BY CLIENT -------------------
@router.get("/campaigns-by-client")
def get_campaigns_by_client(client_id: int, db: Session = Depends(get_db4)):
    q = text("""
        SELECT DISTINCT 
            id AS id,
            CampaignName
        FROM ob_campaign
        WHERE ClientId = :client
        ORDER BY CampaignName
    """)
    rows = db.execute(q, {"client": client_id}).fetchall()

    return [
        {"id": row.id, "CampaignName": row.CampaignName}
        for row in rows
    ]
