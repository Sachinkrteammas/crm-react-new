from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
from database import get_db4

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
        "SrNo AS `Call ID`",
        "MSISDN AS `In Call From`",
        "CallDate AS `Call Date`"
    ]

    # Add Category1, Category2, Category3… dynamically
    for label in dynamic_categories:
        select_parts.append(f"Category{label} AS `Scenario Level {label}`")

    # Add Field1, Field2, Field3… dynamically
    for f in dynamic_fields:
        select_parts.append(f"Field{f['fieldNumber']} AS `{f['FieldName']}`")

    return ",\n                ".join(select_parts)









# @router.get("/call-details")
# def get_call_details(
#     client_id: int = Query(...),
#     startdate: date = Query(...),
#     enddate: date = Query(...),

#     scenario: str = Query(None),
#     scenario1: str = Query(None),
#     scenario2: str = Query(None),
#     scenario3: str = Query(None),
#     scenario4: str = Query(None),

#     db: Session = Depends(get_db4)
# ):
#     """
#     Fetch call details from call_master_auto with optional scenario filters.
#     """

#     try:
#         base_query = """
#             SELECT 
#                 MSISDN AS `In Call From`,
#                 SrNo AS `Call ID`,
#                 Category1 AS `Scenario`,
#                 Category2 AS `Sub Scenario 1`,
#                 Field1 AS `Name`,
#                 Field2 AS `Contact`,
#                 Field3 AS `City`,
#                 Field4 AS `State`,
#                 Field5 AS `Pin Code`,
#                 Field6 AS `Product Name`,
#                 Field7 AS `Source of Purchase`,
#                 Field8 AS `DOP`,
#                 Field9 AS `Remarks`,
#                 Field10 AS `Date of Purchase`,
#                 CallDate AS `Call Date`,
#                 CloseLoopCate1 AS `Call Action`,
#                 CloseLoopCate2 AS `Call Sub Action`,
#                 closeLooping_remarks AS `Call Action Remarks`,
#                 CloseLoopingDate AS `Closure Date`,
#                 FollowupDate AS `Follow Up Date`,
#                 CaseCloseBy AS `Case Closed By`,
#                 tat AS `TAT`,
#                 duedate AS `Due Date`,
#                 callcreated AS `Call Created`,
#                 CloseLoopStatus AS `Call status`,
#                 length_in_sec AS `Closer Time`
#             FROM call_master_auto
#             WHERE ClientID = :ClientId
#               AND DATE(CallDate) BETWEEN :startdate AND :enddate
#               AND CallType = 'Inbound'
#         """

#         params = {
#             "ClientId": client_id,
#             "startdate": startdate,
#             "enddate": enddate
#         }

#         # Add filters dynamically ONLY if values exist
#         if scenario:
#             base_query += " AND Category1 = :scenario"
#             params["scenario"] = scenario

#         if scenario1:
#             base_query += " AND Category2 = :scenario1"
#             params["scenario1"] = scenario1

#         # if scenario2:
#         #     base_query += " AND Category3 = :scenario2"
#         #     params["scenario2"] = scenario2

#         # if scenario3:
#         #     base_query += " AND Category4 = :scenario3"
#         #     params["scenario3"] = scenario3

#         # if scenario4:
#         #     base_query += " AND Category5 = :scenario4"
#         #     params["scenario4"] = scenario4

#         # Ensure final ordering
#         base_query += " ORDER BY SrNo ASC"

#         result = db.execute(text(base_query), params).fetchall()

#         data = [dict(row._mapping) for row in result]

#         return data

#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))






@router.get("/call-details")
def get_call_details(
    client_id: int = Query(...),
    startdate: date = Query(...),
    enddate: date = Query(...),
    call_id :int = Query(None),
    call_action :str = Query(None),

    scenario: str = Query(None),
    scenario1: str = Query(None),
    scenario2: str = Query(None),
    scenario3: str = Query(None),
    scenario4: str = Query(None),

    db: Session = Depends(get_db4)
):
    """
    Fully dynamic call details API
    """

    try:
        # -------------------------------
        # 1. Get dynamic fields
        # -------------------------------
        dynamic_fields = get_dynamic_fields(db, client_id)
        dynamic_categories = get_dynamic_categories(db, client_id)

        # -------------------------------
        # 2. Build dynamic SELECT section
        # -------------------------------
        select_dynamic = build_dynamic_query(dynamic_fields, dynamic_categories)

        # -------------------------------
        # 3. Final query base
        # -------------------------------
        base_query = f"""
            SELECT 
                {select_dynamic},
                CloseLoopCate1 AS `Call Action`,
                CloseLoopCate2 AS `Call Sub Action`,
                closeLooping_remarks AS `Call Action Remarks`,
                CloseLoopingDate AS `Closure Date`,
                FollowupDate AS `Follow Up Date`,
                CaseCloseBy AS `Case Closed By`,
                tat AS `TAT`,
                duedate AS `Due Date`,
                callcreated AS `Call Created`,
                CloseLoopStatus AS `Call Status`,
                length_in_sec AS `Closer Time`
            FROM call_master_auto
            WHERE ClientID = :ClientId
              AND DATE(CallDate) BETWEEN :startdate AND :enddate
              AND CallType = 'Inbound'
        """

        # -------------------------------
        # 4. Dynamic Filtering
        # -------------------------------
        params = {
            "ClientId": client_id,
            "startdate": startdate,
            "enddate": enddate
        }

        if scenario:
            base_query += " AND Category1 = :scenario"
            params["scenario"] = scenario

        if scenario1:
            base_query += " AND Category2 = :scenario1"
            params["scenario1"] = scenario1

        if scenario2:
            base_query += " AND Category3 = :scenario2"
            params["scenario2"] = scenario2

        if scenario3:
            base_query += " AND Category4 = :scenario3"
            params["scenario3"] = scenario3

        if scenario4:
            base_query += " AND Category5 = :scenario4"
            params["scenario4"] = scenario4

        if call_id:
            base_query += " AND SrNo = :call_id"
            params["call_id"] = call_id

        if call_action:
            base_query += " AND CloseLoopCate1 = :call_action"
            params["call_action"] = call_action

        # Final Sort
        base_query += " ORDER BY SrNo ASC"

        # -------------------------------
        # 5. Execute
        # -------------------------------
        result = db.execute(text(base_query), params).fetchall()

        # -------------------------------
        # 6. Convert to dictionary
        # -------------------------------
        data = [dict(row._mapping) for row in result]

        return data

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))







