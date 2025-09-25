from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from database import get_db4
import json
from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook



router = APIRouter(prefix="/ecr", tags=["ECR Master"])



class CreateScenarioRequest(BaseModel):
    ecrName: str
    parent_id: Optional[int] = None
    Label: Optional[int] = None

class UpdateScenarioRequest(BaseModel):
    ecrName: Optional[str] = None
    parent_id: Optional[int] = None
    Label: Optional[int] = None



def safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None



# -----------------------------
# GET all hierarchy by Client
# -----------------------------
@router.get("/tree")
def get_scenario_tree(
    client_id: int = Query(..., description="Client/Company ID"),
    db: Session = Depends(get_db4)
):
    query = text("SELECT * FROM ecr_master WHERE Client = :client ORDER BY id ASC")
    result = db.execute(query, {"client": client_id})

    rows = []
    for r in result:
        row = dict(r._mapping)
        # Normalize IDs
        row["id"] = int(row["id"])
        row["parent_id"] = safe_int(row.get("parent_id"))
        row["Label"] = int(row["Label"]) if row.get("Label") is not None else None
        rows.append(row)

    # Group by parent_id
    by_parent = {}
    for row in rows:
        by_parent.setdefault(row["parent_id"], []).append(row)

    # Recursive builder
    def build_tree(parent_id=None):
        nodes = []
        for row in by_parent.get(parent_id, []):
            node = {
                "id": row["id"],
                "Scenario": row["ecrName"],
                "Label": row["Label"],
                "children": build_tree(row["id"])
            }
            nodes.append(node)
        return nodes

    return {"scenarios": build_tree(None)}


# -----------------------------
# GET one Scenario with hierarchy
# -----------------------------
# -----------------------------
# GET one Scenario with hierarchy (subtree)
# -----------------------------
@router.get("/tree/{ecr_id}")
def get_scenario_subtree(
    ecr_id: int,
    client_id: int = Query(..., description="Client/Company ID"),
    db: Session = Depends(get_db4)
):
    query = text("SELECT * FROM ecr_master WHERE Client = :client ORDER BY id ASC")
    result = db.execute(query, {"client": client_id})

    rows = []
    for r in result:
        row = dict(r._mapping)
        row["id"] = int(row["id"])
        row["parent_id"] = safe_int(row.get("parent_id"))
        row["Label"] = int(row["Label"]) if row.get("Label") is not None else None
        rows.append(row)

    row_map = {r["id"]: r for r in rows}
    if ecr_id not in row_map:
        raise HTTPException(status_code=404, detail="Scenario not found")

    by_parent = {}
    for row in rows:
        by_parent.setdefault(row["parent_id"], []).append(row)

    def build_tree(parent_id):
        nodes = []
        for row in by_parent.get(parent_id, []):
            node = {
                "id": row["id"],
                "Scenario": row["ecrName"],
                "Label": row["Label"],
                "children": build_tree(row["id"])
            }
            nodes.append(node)
        return nodes

    root = row_map[ecr_id]
    return {
        "id": root["id"],
        "Scenario": root["ecrName"],
        "Label": root["Label"],
        "children": build_tree(root["id"])
    }


# -----------------------------
# CREATE new Scenario/SubScenario
# -----------------------------
@router.post("/create")
def create_scenario(
    payload: CreateScenarioRequest = Body(...),
    client_id: int = Query(..., description="Client/Company ID"),
    db: Session = Depends(get_db4)
):
    insert_query = text("""
        INSERT INTO ecr_master (ecrName, parent_id, Label, Client, createdate)
        VALUES (:ecrName, :parent_id, :Label, :Client, NOW())
    """)
    db.execute(insert_query, {
        "ecrName": payload.ecrName,
        "parent_id": payload.parent_id,
        "Label": payload.Label,
        "Client": client_id
    })
    db.commit()
    return {"message": "Scenario created successfully"}


# -----------------------------
# UPDATE Scenario/SubScenario
# -----------------------------
@router.put("/update/{ecr_id}")
def update_scenario(
    ecr_id: int,
    payload: UpdateScenarioRequest = Body(...),
    client_id: int = Query(..., description="Client/Company ID"),
    db: Session = Depends(get_db4)
):
    check = db.execute(
        text("SELECT id FROM ecr_master WHERE id=:id AND Client=:client"),
        {"id": ecr_id, "client": client_id}
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scenario not found")

    fields, params = [], {"id": ecr_id, "client": client_id}
    if payload.ecrName is not None:
        fields.append("ecrName=:ecrName")
        params["ecrName"] = payload.ecrName
    if payload.parent_id is not None:
        fields.append("parent_id=:parent_id")
        params["parent_id"] = payload.parent_id
    if payload.Label is not None:
        fields.append("Label=:Label")
        params["Label"] = payload.Label

    if not fields:
        raise HTTPException(status_code=400, detail="No fields provided")

    query = f"UPDATE ecr_master SET {', '.join(fields)} WHERE id=:id AND Client=:client"
    db.execute(text(query), params)
    db.commit()
    return {"message": "Scenario updated successfully"}


# -----------------------------
# DELETE Scenario/SubScenario
# -----------------------------
@router.delete("/delete/{ecr_id}")
def delete_scenario(
    ecr_id: int,
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    check = db.execute(
        text("SELECT id FROM ecr_master WHERE id=:id AND Client=:client"),
        {"id": ecr_id, "client": client_id}
    ).first()
    if not check:
        raise HTTPException(status_code=404, detail="Scenario not found")

    def delete_recursive(pid):
        children = db.execute(
            text("SELECT id FROM ecr_master WHERE parent_id=:pid AND Client=:client"),
            {"pid": pid, "client": client_id}
        ).fetchall()
        for child in children:
            delete_recursive(int(child.id))
        db.execute(
            text("DELETE FROM ecr_master WHERE id=:id AND Client=:client"),
            {"id": pid, "client": client_id}
        )

    delete_recursive(ecr_id)
    db.commit()
    return {"message": "Scenario and sub-scenarios deleted"}



@router.get("/export")
def export_scenario_tree_excel(
    client_id: int = Query(..., description="Client/Company ID"),
    db: Session = Depends(get_db4)
):
    query = text("SELECT * FROM ecr_master WHERE Client = :client ORDER BY id ASC")
    result = db.execute(query, {"client": client_id})

    rows = []
    for r in result:
        row = dict(r._mapping)
        row["id"] = int(row["id"])
        row["parent_id"] = safe_int(row.get("parent_id"))
        row["Label"] = int(row["Label"]) if row.get("Label") is not None else None
        rows.append(row)

    # Group by parent
    by_parent = {}
    for row in rows:
        by_parent.setdefault(row["parent_id"], []).append(row)

    def build_tree(parent_id=None, level=0):
        nodes = []
        for row in by_parent.get(parent_id, []):
            node = {
                "id": row["id"],
                "Scenario": row["ecrName"],
                "Label": row["Label"],
                "level": level,
                "children": build_tree(row["id"], level + 1)
            }
            nodes.append(node)
        return nodes

    tree = build_tree(None)

    # --- Excel export ---
    wb = Workbook()
    ws = wb.active
    ws.title = "Scenario Tree"

    # headers
    ws.append(["ID", "Scenario", "Label", "Parent ID", "Level"])

    def write_nodes(nodes, parent_id=None):
        for node in nodes:
            ws.append([
                node["id"],
                node["Scenario"],
                node["Label"],
                parent_id,
                node["level"]
            ])
            write_nodes(node["children"], node["id"])

    write_nodes(tree)

    # Save to memory
    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="scenario_tree_client_{client_id}.xlsx"'
        }
    )
