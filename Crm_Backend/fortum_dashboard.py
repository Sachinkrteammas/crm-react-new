from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Optional
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from database import get_db4

router = APIRouter()


@router.get("/client-invoice-details")
def get_client_invoice_details(
    client_id: int = Query(..., description="Dialdesk Client ID"),
    start_date: Optional[str] = Query("2024-04-01", description="YYYY-MM-DD"),
    end_date: Optional[str] = Query("2025-10-14", description="YYYY-MM-DD"),
    db: Session = Depends(get_db4)
):
    # Step 1: Fetch plan percentages
    consume_query = text("""
        SELECT pm.id, pm.CreditPointPercent, pm.TalktimePercent
        FROM balance_master bm
        JOIN plan_master pm ON bm.PlanId = pm.id
        WHERE clientId = :client_id
    """)
    consume_row = db.execute(consume_query, {"client_id": client_id}).fetchone()
    CreditPointPercent = float(consume_row.CreditPointPercent or 0)
    TalktimePercent = float(consume_row.TalktimePercent or 0)

    # Step 2: Get cost center
    cost_center_query = text("""
        SELECT cost_center 
        FROM cost_master 
        WHERE dialdesk_client_id = :client_id
        LIMIT 1
    """)
    cost_center_result = db.execute(cost_center_query, {"client_id": client_id}).fetchone()
    if not cost_center_result:
        return {"error": f"No cost center found for client_id {client_id}"}
    cost_center = cost_center_result[0]

    # Step 3: Fetch all invoices sorted by date
    invoice_query = text("""
        SELECT DATE(ti.invoiceDate) AS invoiceDate, Category, total
        FROM bill_pay_particulars bpp
        INNER JOIN tbl_invoice ti 
            ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
            AND bpp.financial_year = ti.finance_year
            AND bpp.branch_name = ti.branch_name
        WHERE ti.cost_center = :cost_center
        AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date
        ORDER BY ti.invoiceDate ASC
    """)
    all_invoices = db.execute(invoice_query, {
        "cost_center": cost_center,
        "start_date": start_date,
        "end_date": end_date
    }).fetchall()

    # Removed early return to handle months with no invoice
    if not all_invoices:
        print("⚠️ No invoices found for given period — generating NA usage data only.")

    # Step 4: Build monthly result
    result = []
    remaining_balance = 0
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    # Predefine pulse queries
    pulse_range_query = text("""
        SELECT 
            SUM(ib_pulse) AS total_ib_pulse, 
            SUM(ib_total) AS total_ib_value,
            SUM(ibn_pulse) AS total_ibn_pulse,
            SUM(ibn_total) AS total_ibn_value,
            SUM(email_pulse) AS total_email_pulse,
            SUM(email_total) AS total_email_value
        FROM billing_consume_daily
        WHERE client_id = :client_id
        AND DATE(cm_date) BETWEEN :start_date AND :end_date
    """)

    while current_date <= end_dt:
        month_start = current_date
        month_end = (month_start + relativedelta(months=1) - timedelta(days=1))
        if month_end > end_dt:
            month_end = end_dt

        # Get all invoices within this month
        month_invoices = [
            inv for inv in all_invoices
            if month_start <= datetime.strptime(str(inv.invoiceDate), "%Y-%m-%d") <= month_end
        ]

        # Calculate pulse usage for full month
        consume_pulse_row = db.execute(pulse_range_query, {
            "client_id": client_id,
            "start_date": month_start.strftime("%Y-%m-%d"),
            "end_date": month_end.strftime("%Y-%m-%d")
        }).fetchone()

        total_ib_pulse = round(float(consume_pulse_row.total_ib_pulse or 0), 2)
        total_ib_value = round(float(consume_pulse_row.total_ib_value or 0), 2)
        total_ibn_pulse = round(float(consume_pulse_row.total_ibn_pulse or 0), 2)
        total_ibn_value = round(float(consume_pulse_row.total_ibn_value or 0), 2)
        total_email_pulse = round(float(consume_pulse_row.total_email_pulse or 0), 2)
        total_email_value = round(float(consume_pulse_row.total_email_value or 0), 2)

        value = total_ib_value + total_ibn_value + total_email_value

        if month_invoices:
            # Take the latest invoice in the month
            latest_invoice = month_invoices[-1]
            invoice_date = datetime.strptime(str(latest_invoice.invoiceDate), "%Y-%m-%d")
            category = latest_invoice.Category
            total = float(latest_invoice.total)

            # ✅ Apply percent logic on total
            if category == "Talk Time":
                total = total * (TalktimePercent / 100)
            elif category == "Subscription":
                total = total * (CreditPointPercent / 100)


            available_percent = (
                TalktimePercent if category == "Talk Time"
                else (CreditPointPercent if category == "Subscription" else 0)
            )
            available = total * (available_percent / 100)

            balance = remaining_balance + total - value

            result.append({
                "invoiceDate": month_start.strftime("%Y-%m-%d"),
                "Category": category,
                "total": total,
                "available": available,
                "total_ib_pulse": total_ib_pulse,
                "total_ib_value": total_ib_value,
                "total_ibn_pulse": total_ibn_pulse,
                "total_ibn_value": total_ibn_value,
                "total_email_pulse": total_email_pulse,
                "total_email_value": total_email_value,
                "value": value,
                "remaining_balance": remaining_balance,
                "balance": balance
            })
            remaining_balance = balance

        else:
            # No invoice in this month → NA row
            balance = remaining_balance - value
            result.append({
                "invoiceDate": month_start.strftime("%Y-%m-%d"),
                "Category": "NA",
                "total": 0,
                "available": 0,
                "total_ib_pulse": total_ib_pulse,
                "total_ib_value": total_ib_value,
                "total_ibn_pulse": total_ibn_pulse,
                "total_ibn_value": total_ibn_value,
                "total_email_pulse": total_email_pulse,
                "total_email_value": total_email_value,
                "value": value,
                "remaining_balance": remaining_balance,
                "balance": balance
            })
            remaining_balance = balance

        # move to next month
        current_date = month_end + timedelta(days=1)
    
    total_sum = sum(i["total"] for i in result)
    available_sum = sum(i["available"] for i in result)
    value_sum = sum(i["value"] for i in result)
    total_ib_pulse_sum = sum(i["total_ib_pulse"] for i in result)
    total_ib_value_sum = sum(i["total_ib_value"] for i in result)
    total_ibn_pulse_sum = sum(i["total_ibn_pulse"] for i in result)
    total_ibn_value_sum = sum(i["total_ibn_value"] for i in result)
    total_email_pulse_sum = sum(i["total_email_pulse"] for i in result)
    total_email_value_sum = sum(i["total_email_value"] for i in result)
    # balance_sum = result[-1]["balance"] if result else 0

    return {
        "client_id": client_id,
        "cost_center": cost_center,
        "CreditPointPercent": CreditPointPercent,
        "TalktimePercent": TalktimePercent,
        "totals": {
        "total_sum": round(total_sum, 2),
        "available_sum": round(available_sum, 2),
        "value_sum": round(value_sum, 2),
        "total_ib_pulse_sum": round(total_ib_pulse_sum, 2),
        "total_ib_value_sum": round(total_ib_value_sum, 2),
        "total_ibn_pulse_sum": round(total_ibn_pulse_sum, 2),
        "total_ibn_value_sum": round(total_ibn_value_sum, 2),
        "total_email_pulse_sum": round(total_email_pulse_sum, 2),
        "total_email_value_sum": round(total_email_value_sum, 2),
        # "balance_last": round(balance_sum, 2)
        },
        "invoices": result
    }
