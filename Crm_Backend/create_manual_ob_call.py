from fastapi import APIRouter, Depends, Query, Body, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from typing import List
from datetime import datetime

router = APIRouter()



@router.get("/label1")
def get_label1_ecr(
    Client: int = Query(...),
    CampaignId: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT id, ecrName
        FROM obecr_master
        WHERE Client = :client
        AND CampaignId = :campaign
        AND Label = '1'
        ORDER BY ecrName
    """)

    result = db.execute(
        query,
        {"client": Client, "campaign": CampaignId}
    ).fetchall()

    return [{"id": row.id, "ecrName": row.ecrName} for row in result]





@router.get("/label2")
def get_label2_ecr(
    Client: int = Query(...),
    CampaignId: int = Query(...),
    parent_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT id, ecrName
        FROM obecr_master
        WHERE Client = :client
        AND CampaignId = :campaign
        AND parent_id = :parent
        AND Label = '2'
        ORDER BY ecrName
    """)

    result = db.execute(
        query,
        {"client": Client, "campaign": CampaignId, "parent": parent_id}
    ).fetchall()

    return [{"id": row.id, "ecrName": row.ecrName} for row in result]




@router.get("/label3")
def get_label3_ecr(
    Client: int = Query(...),
    CampaignId: int = Query(...),
    parent_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT id, ecrName
        FROM obecr_master
        WHERE Client = :client
        AND CampaignId = :campaign
        AND parent_id = :parent
        AND Label = '3'
        ORDER BY ecrName
    """)

    result = db.execute(
        query,
        {"client": Client, "campaign": CampaignId, "parent": parent_id}
    ).fetchall()

    return [{"id": row.id, "ecrName": row.ecrName} for row in result]



@router.get("/label4")
def get_label4_ecr(
    Client: int = Query(...),
    CampaignId: int = Query(...),
    parent_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT id, ecrName
        FROM obecr_master
        WHERE Client = :client
        AND CampaignId = :campaign
        AND parent_id = :parent
        AND Label = '4'
        ORDER BY ecrName
    """)

    result = db.execute(
        query,
        {"client": Client, "campaign": CampaignId, "parent": parent_id}
    ).fetchall()

    return [{"id": row.id, "ecrName": row.ecrName} for row in result]


@router.get("/label5")
def get_label5_ecr(
    Client: int = Query(...),
    CampaignId: int = Query(...),
    parent_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT id, ecrName
        FROM obecr_master
        WHERE Client = :client
        AND CampaignId = :campaign
        AND parent_id = :parent
        AND Label = '5'
        ORDER BY ecrName
    """)

    result = db.execute(
        query,
        {"client": Client, "campaign": CampaignId, "parent": parent_id}
    ).fetchall()

    return [{"id": row.id, "ecrName": row.ecrName} for row in result]    





@router.get("/obfield_master", response_model=List[dict])
def get_ob_fields(
    ClientId: int = Query(...),
    CampaignId: int = Query(...),
    db: Session = Depends(get_db4)
):
    query = text("""
        SELECT f.id, f.FieldName, f.FieldType, v.FieldValueName
        FROM obfield_master f
        LEFT JOIN obfield_master_value v
            ON f.id = v.FieldId
            AND f.ClientId = v.ClientId
        WHERE f.ClientId = :client_id
        AND f.CampaignId = :campaign_id
    """)

    rows = db.execute(query, {
        "client_id": ClientId,
        "campaign_id": CampaignId
    }).fetchall()

    fields_dict = {}

    for row in rows:
        if row.id not in fields_dict:
            fields_dict[row.id] = {
                "id": row.id,
                "FieldName": row.FieldName,
                "FieldType": row.FieldType,
                "values": []
            }

        if row.FieldValueName:
            fields_dict[row.id]["values"].append(row.FieldValueName)

    return list(fields_dict.values())



@router.post("/save-tagging")
def save_tagging(
    ClientId: int = Query(...),
    CampaignId: int = Query(...),   # ✅ moved to param
    data: dict = Body(...),
    db: Session = Depends(get_db4)
):
    try:
        # 🔹 1. Fetch fieldName + fieldNumber mapping
        field_query = text("""
            SELECT fieldName, fieldNumber
            FROM obfield_master
            WHERE ClientId = :ClientId
            AND CampaignId = :CampaignId
        """)

        results = db.execute(field_query, {
            "ClientId": ClientId,
            "CampaignId": CampaignId
        }).fetchall()

        # Create mapping dictionary
        # Example: {"Customer Name": 1, "Order ID": 2}
        field_map = {row[0]: row[1] for row in results}

        dynamic_columns = []
        dynamic_values = {}

        # 🔹 2. Match incoming keys with DB fieldName
        for input_key, input_value in data.items():

            if input_key in field_map:
                field_number = field_map[input_key]
                column_name = f"Field{field_number}"

                dynamic_columns.append(column_name)
                dynamic_values[column_name] = input_value
        

        srno_query = text("""
            SELECT COALESCE(MAX(SrNo), 0) AS last_srno
            FROM call_master_out
            WHERE ClientId = :ClientId
        """)
        result = db.execute(srno_query, {"ClientId": ClientId}).fetchone()
        next_srno = result.last_srno + 1

        # 🔹 Static columns
        base_columns = [
            "SrNo",
            "ClientId",
            "AllocationId",
            "MSISDN",
            "Category1",
            "Category2",
            "Category3",
            "Category4",
            "Category5",
            "CallDate",
            "CallType"
        ]

        all_columns = base_columns + dynamic_columns

        columns_str = ", ".join(all_columns)
        values_str = ", ".join([f":{col}" for col in all_columns])

        insert_query = text(f"""
            INSERT INTO call_master_out ({columns_str})
            VALUES ({values_str})
        """)

        final_values = {
            "SrNo": next_srno,
            "ClientId": ClientId,
            "AllocationId": data.get("AllocationId"),
            "MSISDN": data.get("MSISDN"),
            "Category1": data.get("Scenario"),
            "Category2": data.get("SubScenario1"),
            "Category3": data.get("SubScenario2"),
            "Category4": data.get("SubScenario3"),
            "Category5": data.get("SubScenario4"),
            "CallDate": datetime.now(),
            "CallType": "Outbound"
        }

        final_values.update(dynamic_values)

        db.execute(insert_query, final_values)
        db.commit()

        return {
            "message": "Tagging saved successfully",
            "dynamic_fields_saved": dynamic_columns
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))