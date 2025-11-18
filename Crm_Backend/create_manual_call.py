from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
from database import get_db4
from pydantic import BaseModel
from typing import Optional
from datetime import datetime




class CallCreate(BaseModel):
    client_id: int
    msisdn: Optional[int] = None
    category1: Optional[str] = None
    category2: Optional[str] = None
    field1: Optional[str] = None
    field2: Optional[str] = None
    field3: Optional[str] = None
    field4: Optional[str] = None
    field5: Optional[str] = None
    field6: Optional[str] = None
    field7: Optional[str] = None
    field8: Optional[str] = None
    field9: Optional[str] = None
    field10: Optional[str] = None
    call_type: Optional[str] = "Inbound"   # default


router = APIRouter()

@router.get("/create_manual_call")
def get_manual_call_details(
    client_id: int = Query(...),
    startdate: date = Query(...),
    enddate: date = Query(...),
    db: Session = Depends(get_db4)
):
    
    try:
        query = text("""
            SELECT 
                MSISDN AS `Call From`,
                SrNo AS `In Call ID`,
                Category1 AS `Scenarios`,
                Category2 AS `Sub Scenarios`,
                Field1 AS `Name`,
                Field2 AS `Contact`,
                Field3 AS `City`,
                Field4 AS `State`,
                Field5 AS `Pin Code`,
                Field6 AS `Product Name`,
                Field7 AS `Source of Purchase`,
                Field8 AS `DOP`,
                Field9 AS `Remarks`,
                Field10 AS `Date of Purchase`,
                CallDate AS `Calling Date`,
                CloseLoopCate1 AS `Call Action`,
                CloseLoopCate2 AS `Call Sub Action`                
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

        # Convert SQLAlchemy Row objects → Python dict
        data = [dict(row._mapping) for row in result]

        return  data

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




@router.get("/search_manual_call")
def search_manual_call(
    client_id: int = Query(...),
    in_call_id: str | None = None,
    call_from: str | None = None,
    scenario: str | None = None,
    sub_scenario1: str | None = None,
    name: str | None = None,
    contact: str | None = None,
    city: str | None = None,
    state: str | None = None,
    pincode: str | None = None,
    product_name: str | None = None,
    source_of_purchase: str | None = None,
    remarks: str | None = None,
    date_of_purchase: str | None = None,
    call_date: date | None = None,
    db: Session = Depends(get_db4)
):
    try:
        base_query = """
            SELECT 
                MSISDN AS `Call From`,
                SrNo AS `In Call ID`,
                Category1 AS `Scenarios`,
                Category2 AS `Sub Scenarios`,
                Field1 AS `Name`,
                Field2 AS `Contact`,
                Field3 AS `City`,
                Field4 AS `State`,
                Field5 AS `Pin Code`,
                Field6 AS `Product Name`,
                Field7 AS `Source of Purchase`,
                Field8 AS `DOP`,
                Field9 AS `Remarks`,
                Field10 AS `Date of Purchase`,
                CallDate AS `Calling Date`
            FROM call_master
            WHERE ClientID = :client_id
        """

        params = {"client_id": client_id}

        if in_call_id:
            base_query += " AND SrNo = :in_call_id"
            params["in_call_id"] = in_call_id

        if call_from:
            base_query += " AND MSISDN = :call_from"
            params["call_from"] = call_from

        if scenario:
            base_query += " AND Category1 = :scenario"
            params["scenario"] = scenario

        if sub_scenario1:
            base_query += " AND Category2 = :sub_scenario1"
            params["sub_scenario1"] = sub_scenario1

        if name:
            base_query += " AND Field1 = :name"
            params["name"] = name

        if contact:
            base_query += " AND Field2 = :contact"
            params["contact"] = contact

        if city:
            base_query += " AND Field3 = :city"
            params["city"] = city

        if state:
            base_query += " AND Field4 = :state"
            params["state"] = state

        if pincode:
            base_query += " AND Field5 = :pincode"
            params["pincode"] = pincode

        if product_name:
            base_query += " AND Field6 = :product_name"
            params["product_name"] = product_name

        if source_of_purchase:
            base_query += " AND Field7 = :source_of_purchase"
            params["source_of_purchase"] = source_of_purchase

        if remarks:
            base_query += " AND Field9 LIKE :remarks"
            params["remarks"] = f"%{remarks}%"

        if date_of_purchase:
            base_query += " AND Field10 = :date_of_purchase"
            params["date_of_purchase"] = date_of_purchase

        if call_date:
            base_query += " AND DATE(CallDate) = :call_date"
            params["call_date"] = call_date

        base_query += " ORDER BY SrNo ASC"

        result = db.execute(text(base_query), params).fetchall()
        data = [dict(r._mapping) for r in result]

        return {"count": len(data), "data": data}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))







@router.post("/call-create")
def create_call(data: CallCreate, db: Session = Depends(get_db4)):
    try:
        query = text("""
            INSERT INTO call_master_auto (
                ClientId,
                MSISDN,
                Category1,
                Category2,
                Field1,
                Field2,
                Field3,
                Field4,
                Field5,
                Field6,
                Field7,
                Field8,
                Field9,
                Field10,
                CallDate,
                CallType
            )
            VALUES (
                :ClientId,
                :MSISDN,
                :Category1,
                :Category2,
                :Field1,
                :Field2,
                :Field3,
                :Field4,
                :Field5,
                :Field6,
                :Field7,
                :Field8,
                :Field9,
                :Field10,
                :CallDate,
                :CallType
            )
        """)

        params = {
            "ClientId": data.client_id,
            "MSISDN": data.msisdn,
            "Category1": data.category1,
            "Category2": data.category2,
            "Field1": data.field1,
            "Field2": data.field2,
            "Field3": data.field3,
            "Field4": data.field4,
            "Field5": data.field5,
            "Field6": data.field6,
            "Field7": data.field7,
            "Field8": data.field8,
            "Field9": data.field9,
            "Field10": data.field10,
            "CallDate": datetime.now(),
            "CallType": data.call_type,
        }

        db.execute(query, params)
        db.commit()

        return {"status": "success", "message": "Call inserted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))