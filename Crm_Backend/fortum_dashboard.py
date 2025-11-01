from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Optional
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from database import get_db4
from fastapi.responses import StreamingResponse
import pandas as pd
from io import BytesIO
from openpyxl.styles import Font


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
        SELECT DATE(ti.invoiceDate) AS invoiceDate, category, total
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


    if not all_invoices:
        print("⚠️ No invoices found for given period — generating NA usage data only.")

    # Step 4: Build monthly result
    result = []
    remaining_balance = 0
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.strptime(end_date, "%Y-%m-%d")

    # Predefine pulse query
    pulse_range_query = text("""
        SELECT 
            SUM(ib_pulse) AS total_ib_pulse, 
            SUM(ib_total) AS total_ib_value,
            SUM(ob_pulse) AS total_ob_pulse,
            SUM(ob_total) AS total_ob_value,
            SUM(email_pulse) AS total_email_pulse,
            SUM(email_total) AS total_email_value
        FROM billing_consume_daily
        WHERE client_id = :client_id
        AND DATE(cm_date) BETWEEN :start_date AND :end_date
    """)

    # 🔹 Main monthly loop
    while current_date <= end_dt:
        month_start = current_date
        month_end = (month_start + relativedelta(months=1) - timedelta(days=1))
        if month_end > end_dt:
            month_end = end_dt

        # Invoices within this month
        month_invoices = [
            inv for inv in all_invoices
            if month_start <= datetime.strptime(str(inv.invoiceDate), "%Y-%m-%d") <= month_end
        ]

        # If no invoices this month — full month pulse
        if not month_invoices:
            consume_pulse_row = db.execute(pulse_range_query, {
                "client_id": client_id,
                "start_date": month_start.strftime("%Y-%m-%d"),
                "end_date": month_end.strftime("%Y-%m-%d")
            }).fetchone()

            total_ib_pulse = round(float(consume_pulse_row.total_ib_pulse or 0), 2)
            total_ib_value = round(float(consume_pulse_row.total_ib_value or 0), 2)
            total_ob_pulse = round(float(consume_pulse_row.total_ob_pulse or 0), 2)
            total_ob_value = round(float(consume_pulse_row.total_ob_value or 0), 2)
            total_email_pulse = round(float(consume_pulse_row.total_email_pulse or 0), 2)
            total_email_value = round(float(consume_pulse_row.total_email_value or 0), 2)

            value = total_ib_value + total_ob_value + total_email_value
            balance = remaining_balance - value

            result.append({
                "invoiceDate": month_start.strftime("%Y-%m-%d"),
                # "periodEnd": month_end.strftime("%Y-%m-%d"),
                "category": "NA",
                "total": 0,
                "remaining_balance": remaining_balance,
                "total_ib_pulse": total_ib_pulse,
                "total_ib_value": total_ib_value,
                "total_ob_pulse": total_ob_pulse,
                "total_ob_value": total_ob_value,
                "total_email_pulse": total_email_pulse,
                "total_email_value": total_email_value,
                "value": value,
            })
            remaining_balance = balance

        else:
            # 🔹 Split month into sub-periods based on invoice dates
            month_invoice_dates = sorted([
                datetime.strptime(str(inv.invoiceDate), "%Y-%m-%d")
                for inv in month_invoices
            ])

            sub_ranges = []
            range_start = month_start

            for idx, inv_date in enumerate(month_invoice_dates):
                # Before invoice period (NA)
                if inv_date > range_start:
                    sub_ranges.append((range_start, inv_date - timedelta(days=1), None))

                # Invoice period: from invoice date till next invoice or month-end
                if idx + 1 < len(month_invoice_dates):
                    next_inv_date = month_invoice_dates[idx + 1]
                    sub_ranges.append((inv_date, min(next_inv_date - timedelta(days=1), month_end), inv_date))
                    range_start = next_inv_date
                else:
                    sub_ranges.append((inv_date, month_end, inv_date))
                    range_start = month_end + timedelta(days=1)

            # After last invoice, if any gap till month_end
            if range_start <= month_end:
                sub_ranges.append((range_start, month_end, None))

            # 🔹 Process each sub-period
            for sub_start, sub_end, inv_date in sub_ranges:
                consume_pulse_row = db.execute(pulse_range_query, {
                    "client_id": client_id,
                    "start_date": sub_start.strftime("%Y-%m-%d"),
                    "end_date": sub_end.strftime("%Y-%m-%d")
                }).fetchone()

                total_ib_pulse = round(float(consume_pulse_row.total_ib_pulse or 0), 2)
                total_ib_value = round(float(consume_pulse_row.total_ib_value or 0), 2)
                total_ob_pulse = round(float(consume_pulse_row.total_ob_pulse or 0), 2)
                total_ob_value = round(float(consume_pulse_row.total_ob_value or 0), 2)
                total_email_pulse = round(float(consume_pulse_row.total_email_pulse or 0), 2)
                total_email_value = round(float(consume_pulse_row.total_email_value or 0), 2)

                value = total_ib_value + total_ob_value + total_email_value

                # Check if invoice exists for this sub-period
                inv = None
                if inv_date:
                    inv = next(
                        (i for i in month_invoices if datetime.strptime(str(i.invoiceDate), "%Y-%m-%d") == inv_date),
                        None
                    )

                if inv:
                    category = inv.category
                    total = float(inv.total)
                    if category == "Talk Time":
                        total *= (TalktimePercent / 100)
                    elif category == "Subscription":
                        total *= (CreditPointPercent / 100)
                else:
                    category = "NA"
                    total = 0

                balance = remaining_balance + total - value

                result.append({
                    "invoiceDate": sub_start.strftime("%Y-%m-%d"),
                    # "periodEnd": sub_end.strftime("%Y-%m-%d"),
                    "category": category,
                    "total": total,
                    "remaining_balance": remaining_balance,
                    "total_ib_pulse": total_ib_pulse,
                    "total_ib_value": total_ib_value,
                    "total_ob_pulse": total_ob_pulse,
                    "total_ob_value": total_ob_value,
                    "total_email_pulse": total_email_pulse,
                    "total_email_value": total_email_value,
                    "value": value,
                })

                remaining_balance = balance


        # Move to next month
        current_date = month_end + timedelta(days=1)

    # Totals
    total_sum = sum(i["total"] for i in result)
    value_sum = sum(i["value"] for i in result)
    total_ib_pulse_sum = sum(i["total_ib_pulse"] for i in result)
    total_ib_value_sum = sum(i["total_ib_value"] for i in result)
    total_ob_pulse_sum = sum(i["total_ob_pulse"] for i in result)
    total_ob_value_sum = sum(i["total_ob_value"] for i in result)
    total_email_pulse_sum = sum(i["total_email_pulse"] for i in result)
    total_email_value_sum = sum(i["total_email_value"] for i in result)
    remaining_balance_sum = sum(i["remaining_balance"] for i in result)

    return {
        "client_id": client_id,
        "cost_center": cost_center,
        "CreditPointPercent": CreditPointPercent,
        "TalktimePercent": TalktimePercent,
        "totals": {
            "total_sum": round(total_sum, 2),
            "remaining_balance_sum": round(remaining_balance_sum, 2),
            "total_ib_pulse_sum": round(total_ib_pulse_sum, 2),
            "total_ib_value_sum": round(total_ib_value_sum, 2),
            "total_ob_pulse_sum": round(total_ob_pulse_sum, 2),
            "total_ob_value_sum": round(total_ob_value_sum, 2),
            "total_email_pulse_sum": round(total_email_pulse_sum, 2),
            "total_email_value_sum": round(total_email_value_sum, 2),
            "value_sum": round(value_sum, 2),
        },
        "invoices": result
    }



























# @router.get("/client-invoice-details")
# def get_client_invoice_details(
#     client_id: int = Query(..., description="Dialdesk Client ID"),
#     start_date: Optional[str] = Query("2024-04-01", description="YYYY-MM-DD"),
#     end_date: Optional[str] = Query("2025-10-14", description="YYYY-MM-DD"),
#     db: Session = Depends(get_db4)
# ):
#     # Step 1: Fetch plan percentages
#     consume_query = text("""
#         SELECT pm.id, pm.CreditPointPercent, pm.TalktimePercent
#         FROM balance_master bm
#         JOIN plan_master pm ON bm.PlanId = pm.id
#         WHERE clientId = :client_id
#     """)
#     consume_row = db.execute(consume_query, {"client_id": client_id}).fetchone()
#     CreditPointPercent = float(consume_row.CreditPointPercent or 0)
#     TalktimePercent = float(consume_row.TalktimePercent or 0)

#     # Step 2: Get cost center
#     cost_center_query = text("""
#         SELECT cost_center 
#         FROM cost_master 
#         WHERE dialdesk_client_id = :client_id
#         LIMIT 1
#     """)
#     cost_center_result = db.execute(cost_center_query, {"client_id": client_id}).fetchone()
#     if not cost_center_result:
#         return {"error": f"No cost center found for client_id {client_id}"}
#     cost_center = cost_center_result[0]

#     # Step 3: Fetch all invoices sorted by date
#     invoice_query = text("""
#         SELECT DATE(ti.invoiceDate) AS invoiceDate, category, total
#         FROM bill_pay_particulars bpp
#         INNER JOIN tbl_invoice ti 
#             ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
#             AND bpp.financial_year = ti.finance_year
#             AND bpp.branch_name = ti.branch_name
#         WHERE ti.cost_center = :cost_center
#         AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date
#         ORDER BY ti.invoiceDate ASC
#     """)
#     all_invoices = db.execute(invoice_query, {
#         "cost_center": cost_center,
#         "start_date": start_date,
#         "end_date": end_date
#     }).fetchall()

#     # Removed early return to handle months with no invoice
#     if not all_invoices:
#         print("⚠️ No invoices found for given period — generating NA usage data only.")

#     # Step 4: Build monthly result
#     result = []
#     remaining_balance = 0
#     current_date = datetime.strptime(start_date, "%Y-%m-%d")
#     end_dt = datetime.strptime(end_date, "%Y-%m-%d")

#     # Predefine pulse queries
#     pulse_range_query = text("""
#         SELECT 
#             SUM(ib_pulse) AS total_ib_pulse, 
#             SUM(ib_total) AS total_ib_value,
#             SUM(ibn_pulse) AS total_ob_pulse,
#             SUM(ibn_total) AS total_ob_value,
#             SUM(email_pulse) AS total_email_pulse,
#             SUM(email_total) AS total_email_value
#         FROM billing_consume_daily
#         WHERE client_id = :client_id
#         AND DATE(cm_date) BETWEEN :start_date AND :end_date
#     """)

#     while current_date <= end_dt:
#         month_start = current_date
#         month_end = (month_start + relativedelta(months=1) - timedelta(days=1))
#         if month_end > end_dt:
#             month_end = end_dt

#         # Get all invoices within this month
#         month_invoices = [
#             inv for inv in all_invoices
#             if month_start <= datetime.strptime(str(inv.invoiceDate), "%Y-%m-%d") <= month_end
#         ]

#         # Calculate pulse usage for full month
#         consume_pulse_row = db.execute(pulse_range_query, {
#             "client_id": client_id,
#             "start_date": month_start.strftime("%Y-%m-%d"),
#             "end_date": month_end.strftime("%Y-%m-%d")
#         }).fetchone()

#         total_ib_pulse = round(float(consume_pulse_row.total_ib_pulse or 0), 2)
#         total_ib_value = round(float(consume_pulse_row.total_ib_value or 0), 2)
#         total_ob_pulse = round(float(consume_pulse_row.total_ob_pulse or 0), 2)
#         total_ob_value = round(float(consume_pulse_row.total_ob_value or 0), 2)
#         total_email_pulse = round(float(consume_pulse_row.total_email_pulse or 0), 2)
#         total_email_value = round(float(consume_pulse_row.total_email_value or 0), 2)

#         value = total_ib_value + total_ob_value + total_email_value

#         if month_invoices:
#             # Take the latest invoice in the month
#             latest_invoice = month_invoices[-1]
#             invoice_date = datetime.strptime(str(latest_invoice.invoiceDate), "%Y-%m-%d")
#             category = latest_invoice.category
#             total = float(latest_invoice.total)

#             # ✅ Apply percent logic on total
#             if category == "Talk Time":
#                 total = total * (TalktimePercent / 100)
#             elif category == "Subscription":
#                 total = total * (CreditPointPercent / 100)


#             available_percent = (
#                 TalktimePercent if category == "Talk Time"
#                 else (CreditPointPercent if category == "Subscription" else 0)
#             )
#             available = total * (available_percent / 100)

#             balance = remaining_balance + total - value

#             result.append({
#                 "invoiceDate": month_start.strftime("%Y-%m-%d"),
#                 "category": category,
#                 "total": total,
#                 "remaining_balance": remaining_balance,
#                 "total_ib_pulse": total_ib_pulse,
#                 "total_ib_value": total_ib_value,
#                 "total_ob_pulse": total_ob_pulse,
#                 "total_ob_value": total_ob_value,
#                 "total_email_pulse": total_email_pulse,
#                 "total_email_value": total_email_value,
#                 "value": value,
#                 # "balance": balance
#             })
#             remaining_balance = balance

#         else:
#             # No invoice in this month → NA row
#             balance = remaining_balance - value
#             result.append({
#                 "invoiceDate": month_start.strftime("%Y-%m-%d"),
#                 "category": "NA",
#                 "total": 0,
#                 "remaining_balance": remaining_balance,
#                 "total_ib_pulse": total_ib_pulse,
#                 "total_ib_value": total_ib_value,
#                 "total_ob_pulse": total_ob_pulse,
#                 "total_ob_value": total_ob_value,
#                 "total_email_pulse": total_email_pulse,
#                 "total_email_value": total_email_value,
#                 "value": value,
#                 # "balance": balance
#             })
#             remaining_balance = balance

#         # move to next month
#         current_date = month_end + timedelta(days=1)
    
#     total_sum = sum(i["total"] for i in result)
#     value_sum = sum(i["value"] for i in result)
#     total_ib_pulse_sum = sum(i["total_ib_pulse"] for i in result)
#     total_ib_value_sum = sum(i["total_ib_value"] for i in result)
#     total_ob_pulse_sum = sum(i["total_ob_pulse"] for i in result)
#     total_ob_value_sum = sum(i["total_ob_value"] for i in result)
#     total_email_pulse_sum = sum(i["total_email_pulse"] for i in result)
#     total_email_value_sum = sum(i["total_email_value"] for i in result)
#     remaining_balance_sum = sum(i["remaining_balance"] for i in result)


#     return {
#         "client_id": client_id,
#         "cost_center": cost_center,
#         "CreditPointPercent": CreditPointPercent,
#         "TalktimePercent": TalktimePercent,
#         "totals": {
#         "total_sum": round(total_sum, 2),
#         "remaining_balance_sum": round(remaining_balance_sum, 2),      
#         "total_ib_pulse_sum": round(total_ib_pulse_sum, 2),
#         "total_ib_value_sum": round(total_ib_value_sum, 2),
#         "total_ob_pulse_sum": round(total_ob_pulse_sum, 2),
#         "total_ob_value_sum": round(total_ob_value_sum, 2),
#         "total_email_pulse_sum": round(total_email_pulse_sum, 2),
#         "total_email_value_sum": round(total_email_value_sum, 2),
#         "value_sum": round(value_sum, 2),
        
#         },
#         "invoices": result
#     }











@router.get("/client-invoice-details/download")
def download_client_invoice_details_excel(
    client_id: int = Query(..., description="Dialdesk Client ID"),
    start_date: Optional[str] = Query("2024-04-01", description="YYYY-MM-DD"),
    end_date: Optional[str] = Query("2025-10-14", description="YYYY-MM-DD"),
    db: Session = Depends(get_db4)
):
    # ✅ Reuse your existing data logic
    data_response = get_client_invoice_details(
        client_id=client_id,
        start_date=start_date,
        end_date=end_date,
        db=db
    )

    if "invoices" not in data_response:
        return {"error": "No data found to export"}

    invoices = data_response["invoices"]
    totals = data_response.get("totals", {})

    # ✅ Add Quarter column for each row
    for item in invoices:
        date_str = item.get("invoiceDate")
        if date_str:
            month = datetime.strptime(date_str, "%Y-%m-%d").month
            if 1 <= month <= 3:
                quarter = "Q1"
            elif 4 <= month <= 6:
                quarter = "Q2"
            elif 7 <= month <= 9:
                quarter = "Q3"
            else:
                quarter = "Q4"
            item["Quarter"] = quarter
        else:
            item["Quarter"] = "-"


    # ✅ Optional: Add totals row at the end
    totals_row = {
        "invoiceDate": "Total",
        "category": "",
        "Quarter": "",
        "total": totals.get("total_sum", 0),
        "remaining_balance": totals.get("remaining_balance_sum", 0),
        "total_ib_pulse": totals.get("total_ib_pulse_sum", 0),
        "total_ib_value": totals.get("total_ib_value_sum", 0),
        "total_ob_pulse": totals.get("total_ob_pulse_sum", 0),
        "total_ob_value": totals.get("total_ob_value_sum", 0),
        "total_email_pulse": totals.get("total_email_pulse_sum", 0),
        "total_email_value": totals.get("total_email_value_sum", 0),
        "value": totals.get("value_sum", 0),
    }

    # ✅ Create DataFrame for the main table
    df = pd.DataFrame(invoices)
    df = pd.concat([df, pd.DataFrame([totals_row])], ignore_index=True)

    # ✅ Reorder columns so "Quarter" comes after "category"
    if "Quarter" in df.columns and "category" in df.columns:
        cols = list(df.columns)
        cols.insert(cols.index("category") + 1, cols.pop(cols.index("Quarter")))
        df = df[cols]

    # ✅ Convert DataFrame to Excel in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Client Invoice Details")
        ws = writer.sheets["Client Invoice Details"]
        
        # ✅ Make header bold
        header_font = Font(bold=True)
        for cell in ws[1]:
            cell.font = header_font

        # ✅ Make the “Total” row bold
        total_row_index = len(df) + 1  # +1 because Excel rows are 1-indexed
        bold_font = Font(bold=True)
        for cell in ws[total_row_index]:
            cell.font = bold_font

    output.seek(0)

    filename = f"Client_{client_id}_Invoice_Details_{start_date}_to_{end_date}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
