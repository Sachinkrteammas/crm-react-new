from fastapi import Query, Depends, HTTPException,APIRouter
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db4
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

router = APIRouter()



class CreateInvoiceBody(BaseModel):
    category: Optional[str] = ""
    bill_no: Optional[str] = ""
    branch_name: Optional[str] = ""
    cost_center: Optional[str] = ""
    finance_year: Optional[str] = ""
    month: Optional[str] = ""

    invoiceDate: Optional[date] = ""
    invoiceDescription: Optional[str] = ""

    total: Optional[float] = 0
    tax: Optional[float] = 0
    grnd: Optional[float] = 0

    approve_po: Optional[str] = ""
    approve_grn: Optional[str] = ""
    username: Optional[str] = ""
    view_ahmedabad: Optional[str] = ""

    cost_branch: Optional[str] = ""
    cost_OPBranch: Optional[str] = ""

    cost_b_Address1: Optional[str] = ""
    cost_b_Address2: Optional[str] = ""
    cost_b_Address3: Optional[str] = ""
    cost_b_Address4: Optional[str] = ""
    cost_b_Address5: Optional[str] = ""

    cost_a_address1: Optional[str] = ""
    cost_a_address2: Optional[str] = ""
    cost_a_address3: Optional[str] = ""
    cost_a_address4: Optional[str] = ""
    cost_a_address5: Optional[str] = ""

    cost_ServiceTaxNo: Optional[str] = ""
    cost_VendorGSTNo: Optional[str] = ""



@router.get("/cost-master/{client_id}")
def get_cost_master(client_id: int, db: Session = Depends(get_db4)):
    query = text("""
        SELECT 
            branch,
            b_Address1, b_Address2, b_Address3,
            a_address1, a_address2, a_address3,
            cost_center,
            ServiceTaxNo,
            VendorGSTNo,
            `client`
        FROM cost_master
        WHERE dialdesk_client_id = :client_id
    """)

    result = db.execute(query, {"client_id": client_id}).mappings().all()

    if not result:
        raise HTTPException(status_code=404, detail="No data found for this client")

    return {
        "client_id": client_id,
        "data": result
    }




@router.post("/create_invoice")
def create_invoice(
    invoiceType: str = Query(...),      # 👈 ONLY IN QUERY PARAM
    body: CreateInvoiceBody = None,     # 👈 EVERYTHING ELSE IN BODY
    db: Session = Depends(get_db4)
):
    if not body:
        raise HTTPException(status_code=400, detail="Request body is required")

    insert_query = text("""
        INSERT INTO tbl_invoice (
            invoiceType,
            bill_no,            
            category,
            branch_name,
            cost_center,
            finance_year,
            month,
            invoiceDate,
            invoiceDescription,
            total,
            tax,
            grnd,
            approve_po,
            approve_grn,
            username,
            view_ahmedabad,
            cost_branch,
            cost_OPBranch,
            cost_b_Address1,
            cost_b_Address2,
            cost_b_Address3,
            cost_b_Address4,
            cost_b_Address5,
            cost_a_address1,
            cost_a_address2,
            cost_a_address3,
            cost_a_address4,
            cost_a_address5,
            cost_ServiceTaxNo,
            cost_VendorGSTNo,
            createdate
        )
        VALUES (
            :invoiceType,
            :bill_no,
            :category,
            :branch_name,
            :cost_center,
            :finance_year,
            :month,
            :invoiceDate,
            :invoiceDescription,
            :total,
            :tax,
            :grnd,
            :approve_po,
            :approve_grn,
            :username,
            :view_ahmedabad,
            :cost_branch,
            :cost_OPBranch,
            :cost_b_Address1,
            :cost_b_Address2,
            :cost_b_Address3,
            :cost_b_Address4,
            :cost_b_Address5,
            :cost_a_address1,
            :cost_a_address2,
            :cost_a_address3,
            :cost_a_address4,
            :cost_a_address5,
            :cost_ServiceTaxNo,
            :cost_VendorGSTNo,
            :createdate
        )
    """)

    db.execute(insert_query, {
        "invoiceType": invoiceType,
        "createdate":datetime.now(),
        **body.model_dump()
    })

    db.commit()

    return {
        "status": "success",
        "message": "Invoice created successfully",
        "data": {
            "invoiceType": invoiceType,
            "finance_year": body.finance_year,
            "month": body.month,
            "total": body.total,
            "grnd": body.grnd
        }
    }