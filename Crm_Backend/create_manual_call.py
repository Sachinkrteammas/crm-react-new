from fastapi import APIRouter, Depends, HTTPException, Query, Body,Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
from database import get_db4
from pydantic import BaseModel
from typing import Optional
from datetime import datetime




# class CallCreate(BaseModel):
#     client_id: int
#     msisdn: Optional[int] = None
#     category1: Optional[str] = None
#     category2: Optional[str] = None
#     field1: Optional[str] = None
#     field2: Optional[str] = None
#     field3: Optional[str] = None
#     field4: Optional[str] = None
#     field5: Optional[str] = None
#     field6: Optional[str] = None
#     field7: Optional[str] = None
#     field8: Optional[str] = None
#     field9: Optional[str] = None
#     field10: Optional[str] = None
#     call_type: Optional[str] = "Inbound"   # default


router = APIRouter()



def get_dynamic_fields(db, client_id):
    query = text("""
        SELECT fieldNumber, FieldName
        FROM field_master
        WHERE ClientId = :client_id AND (FieldStatus IS NULL)
        ORDER BY fieldNumber
    """)
    rows = db.execute(query, {"client_id": client_id}).fetchall()
    return [dict(r._mapping) for r in rows]


def get_dynamic_categories(db, client_id):
    query = text("""
        SELECT Label 
        FROM ecr_master
        WHERE Client = :client_id
        GROUP BY Label
        ORDER BY Label
    """)
    rows = db.execute(query, {"client_id": client_id}).fetchall()
    return [row[0] for row in rows]      # example → [1,2,3,4,5]


def build_dynamic_query(dynamic_fields, dynamic_categories):
    select_parts = [
        "SrNo AS `In Call ID`",
        "MSISDN AS `Call From`",
        "CallDate AS `Calling Date`"
    ]

    # Add Category1, Category2, Category3… dynamically
    for label in dynamic_categories:
        select_parts.append(f"Category{label} AS `Scenario Level {label}`")

    # Add Field1, Field2, Field3… dynamically
    for f in dynamic_fields:
        select_parts.append(f"Field{f['fieldNumber']} AS `{f['FieldName']}`")

    return ",\n                ".join(select_parts)




@router.get("/fields")
def get_fields(client_id: int, db: Session = Depends(get_db4)):
    try:
        query = text("""
            SELECT 
                fm.id,
                fm.fieldNumber,
                fm.FieldName,
                fm.FieldType,
                fmv.id AS value_id,
                fmv.FieldValueName AS value_text
            FROM field_master fm
            LEFT JOIN field_master_value fmv
                ON fm.id = fmv.FieldId
            WHERE fm.ClientId = :client_id
              AND (fm.FieldStatus IS NULL)
            ORDER BY fm.fieldNumber, fmv.id
        """)

        rows = db.execute(query, {"client_id": client_id}).fetchall()

        # Group fields
        field_map = {}

        for row in rows:
            fid = row.id

            if fid not in field_map:
                field_map[fid] = {
                    "id": row.id,
                    "fieldNumber": row.fieldNumber,
                    "FieldName": row.FieldName,
                    "FieldType": row.FieldType,
                    "values": []  # Only used if dropdown
                }

            # If FieldType = DropDown, append dropdown values
            if row.FieldType == "DropDown" and row.value_id is not None:
                field_map[fid]["values"].append({
                    "id": row.value_id,
                    "Value": row.value_text
                })

        # Convert dict to list
        fields = list(field_map.values())

        return fields

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))





@router.post("/call-create")
def create_call(
    client_id: int = Query(...),
    data: dict = Body(...),
    db: Session = Depends(get_db4)
):
    try:
        # 1️⃣ Fetch dynamic fields
        field_query = text("""
            SELECT fieldNumber 
            FROM field_master 
            WHERE ClientId = :client_id
              AND (FieldStatus IS NULL)
            ORDER BY fieldNumber
        """)
        field_rows = db.execute(field_query, {"client_id": client_id}).fetchall()
        dynamic_fields = [row.fieldNumber for row in field_rows]

        # 2️⃣ Prepare dynamic field params
        field_params = {}
        max_fields = max(dynamic_fields) if dynamic_fields else 0

        for num in range(1, max_fields + 1):
            key = f"Field{num}"
            field_params[key] = data.get("fields", {}).get(str(num), None)

        # 3️⃣ Auto SrNo
        srno_query = text("""
            SELECT COALESCE(MAX(SrNo), 0) AS last_srno,
                   COALESCE(MAX(SrNo2), 0) AS last_srno2
            FROM call_master
            WHERE ClientId = :client_id
        """)
        result = db.execute(srno_query, {"client_id": client_id}).fetchone()
        next_srno = result.last_srno + 1
        next_srno2 = result.last_srno2 + 1

        # 4️⃣ Build dynamic SQL
        field_cols = ", ".join(field_params.keys())
        field_vals = ", ".join([f":{k}" for k in field_params.keys()])

        insert_sql = f"""
            INSERT INTO call_master (
                SrNo,
                SrNo2,
                ClientId,
                MSISDN,
                Category1,
                Category2,
                Category3,
                Category4,
                Category5,
                CallType,
                CallDate,
                {field_cols}
            ) VALUES (
                :SrNo,
                :SrNo2,
                :ClientId,
                :MSISDN,
                :Category1,
                :Category2,
                :Category3,
                :Category4,
                :Category5,
                :CallType,
                :CallDate,
                {field_vals}
            )
        """

        params = {
            "SrNo": next_srno,
            "SrNo2": next_srno2,
            "ClientId": client_id,
            "MSISDN": data.get("msisdn"),
            "Category1": data.get("category1"),
            "Category2": data.get("category2"),
            "Category3": data.get("category3"),
            "Category4": data.get("category4"),
            "Category5": data.get("category5"), 
            "CallType": data.get("call_type"),
            "CallDate": datetime.now(),
            **field_params
        }

        db.execute(text(insert_sql), params)
        db.commit()

        return {"status": "success", "SrNo": next_srno}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))








@router.get("/create_manual_call")
def get_manual_call_details(
    client_id: int = Query(...),
    startdate: date = Query(...),
    enddate: date = Query(...),
    db: Session = Depends(get_db4)
):

    try:
        # 1️⃣ Load dynamic metadata
        dynamic_fields = get_dynamic_fields(db, client_id)
        dynamic_categories = get_dynamic_categories(db, client_id)

        # 2️⃣ Build dynamic select columns
        select_columns = build_dynamic_query(dynamic_fields, dynamic_categories)

        # 3️⃣ Create final dynamic query
        query = text(f"""
            SELECT 
                {select_columns}
            FROM call_master
            WHERE ClientID = :ClientId
              AND DATE(CallDate) BETWEEN :startdate AND :enddate
            ORDER BY SrNo ASC
        """)

        result = db.execute(query, {
            "ClientId": client_id,
            "startdate": startdate,
            "enddate": enddate
        }).fetchall()

        # Convert SQLAlchemy Row → dict
        data = [dict(row._mapping) for row in result]

        return data

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))






@router.get("/search_manual_call")
def search_manual_call(
    request: Request,
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    try:
        # 1️⃣ Extract all query params except client_id
        raw_params = dict(request.query_params)
        raw_params.pop("client_id", None)

        # 2️⃣ Get dynamic field mapping
        rows = db.execute(text("""
            SELECT fieldNumber, fieldName
            FROM field_master
            WHERE ClientId = :client_id
        """), {"client_id": client_id}).fetchall()

        field_map = {row.fieldName: f"Field{row.fieldNumber}" for row in rows}

        # 3️⃣ SELECT fields dynamically
        select_parts = [
            "MSISDN AS `Call From`",
            "SrNo AS `In Call ID`",
            "Category1 AS `Scenarios`",
            "Category2 AS `Sub Scenarios1`",
            "Category3 AS `Sub Scenarios2`",
            "Category4 AS `Sub Scenarios3`",
            "Category5 AS `Sub Scenarios4`",
            "CallDate AS `Calling Date`"
        ]

        for label, dbcol in field_map.items():
            select_parts.append(f"{dbcol} AS `{label}`")

        select_query = ", ".join(select_parts)

        # 4️⃣ Base query
        sql = f"""
            SELECT {select_query}
            FROM call_master
            WHERE ClientID = :client_id
        """

        params = {"client_id": client_id}

        # 5️⃣ Static filters
        static_map = {
            "in_call_id": "SrNo",
            "call_from": "MSISDN",
            "scenario": "Category1",
            "sub_scenario1": "Category2",
            "sub_scenario2": "Category3",
            "sub_scenario3": "Category4",
            "sub_scenario4": "Category5",
            "call_date": "DATE(CallDate)",
        }

        for key, val in raw_params.items():
            if not val:
                continue

            # static filters
            if key in static_map:
                sql += f" AND {static_map[key]} = :{key}"
                params[key] = val
                continue

            # dynamic field filters
            if key in field_map:
                sql += f" AND {field_map[key]} LIKE :{key}"
                params[key] = f"%{val}%"

        sql += " ORDER BY SrNo ASC"

        # Execute
        result = db.execute(text(sql), params).fetchall()
        data = [dict(r._mapping) for r in result]

        return {"count": len(data), "data": data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))






@router.put("/call/call-master/{client_id}/{record_id}")
def update_call(
    client_id: int,
    record_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db4)
):
    try:
        # 1️⃣ Fetch dynamic fields for this client
        field_query = text("""
            SELECT fieldNumber 
            FROM field_master 
            WHERE ClientId = :client_id
              AND (FieldStatus IS NULL)
            ORDER BY fieldNumber
        """)
        field_rows = db.execute(field_query, {"client_id": client_id}).fetchall()
        dynamic_fields = [row.fieldNumber for row in field_rows]

        # 2️⃣ Build dynamic field params (Field1, Field2...)
        field_params = {}
        for num in dynamic_fields:
            key = f"Field{num}"    # Field1, Field2...
            field_params[key] = data.get(key)  # 👈 FIXED

        # 3️⃣ Build update SET clause
        update_fields = []

        # Category fields
        category_map = {
            "Category1": data.get("Category1"),
            "Category2": data.get("Category2"),
            "Category3": data.get("Category3"),
            "Category4": data.get("Category4"),
            "Category5": data.get("Category5"),
        }
        for key, val in category_map.items():
            if val is not None:
                update_fields.append(f"{key} = :{key}")

        # CallType
        if data.get("CallType") is not None:
            update_fields.append("CallType = :CallType")

        # Dynamic fields
        for key in field_params.keys():
            update_fields.append(f"{key} = :{key}")

        if not update_fields:
            raise HTTPException(400, "No valid fields provided for update.")

        update_sql = f"""
            UPDATE call_master
            SET {", ".join(update_fields)}
            WHERE ClientId = :client_id AND SrNo = :record_id
        """

        params = {
            "client_id": client_id,
            "record_id": record_id,
            **category_map,
            "CallType": data.get("CallType"),
            **field_params
        }

        print("⚡ FINAL PARAMS SENT TO DB:", params)

        db.execute(text(update_sql), params)
        db.commit()

        return {"status": "success", "updated_id": record_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))







@router.get("/close-looping/sub-actions")
def get_close_loop_sub_actions(
    action: str = Query(..., description="Value of CloseLoopCate1 (Open/Closed/etc.)"),
    client_id: int = Query(...),
    db: Session = Depends(get_db4)
):
    """
    Fetch all CloseLoopCate2 values where CloseLoopCate1 matches the selected CALL ACTION.
    """
    try:
        query = text("""
            SELECT DISTINCT CloseLoopCate2
            FROM call_master
            WHERE ClientId = :client_id
              AND CloseLoopCate1 = :cate1
              AND CloseLoopCate2 IS NOT NULL
              AND TRIM(CloseLoopCate2) <> ''
            ORDER BY CloseLoopCate2
        """)

        result = db.execute(query, {
            "client_id": client_id,
            "cate1": action
        })

        rows = [row[0] for row in result.fetchall()]

        return rows  # return plain list like ["Resolved", "Follow Up", etc.]

    except Exception as e:
        return {"status": "error", "message": str(e)}








@router.put("/close-looping")
def close_looping(
    client_id: int = Query(...),
    callId: int = Query(...),
    payload: dict = Body(...),
    db: Session = Depends(get_db4)
):
    try:
        close_action = payload.get("CloseLoopCate1")
        close_sub_action = payload.get("CloseLoopCate2")
        remarks = payload.get("closelooping_remarks")
        follow_up_date  = payload.get("FollowupDate")

        update_query = text("""
            UPDATE call_master
            SET 
                CloseLoopCate1 = :cate1,
                CloseLoopCate2 = :cate2,
                closelooping_remarks = :remark,
                FollowupDate = :follow_up_date,
                CloseLoopingDate = NOW()
            WHERE ClientId = :client_id
              AND SrNo = :call_id
        """)

        result = db.execute(update_query, {
            "client_id": client_id,
            "call_id": callId,
            "cate1": close_action,
            "cate2": close_sub_action,
            "remark": remarks,
            "follow_up_date": follow_up_date
        })

        db.commit()

        if result.rowcount == 0:
            return {"status": "error", "message": "Record not found"}

        return {"status": "success", "message": "Call closed successfully"}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}




@router.get("/call-flow")
def get_call_flow(
    client_id: int = Query(...),
    category: str = Query(None),
    type: str = Query(None),
    subtype: str = Query(None),
    subtype1: str = Query(None),
    subtype2: str = Query(None),
    db: Session = Depends(get_db4)
):
    try:
        query = """
            SELECT id, client_id, category, `type`, subtype, subtype1, subtype2, resolution
            FROM call_flow
            WHERE client_id = :client_id
        """

        params = {"client_id": client_id}

        if category:
            query += " AND category = :category"
            params["category"] = category

        if type:
            query += " AND `type` = :type"
            params["type"] = type

        if subtype:
            query += " AND subtype = :subtype"
            params["subtype"] = subtype

        if subtype1:
            query += " AND subtype1 = :subtype1"
            params["subtype1"] = subtype1

        if subtype2:
            query += " AND subtype2 = :subtype2"
            params["subtype2"] = subtype2

        result = db.execute(text(query), params).fetchall()

        # FIXED: Convert rows to dictionaries properly
        return [dict(row._mapping) for row in result]

    except Exception as e:
        return {"error": str(e)}
