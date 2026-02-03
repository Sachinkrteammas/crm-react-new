from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Optional
from datetime import datetime, timedelta
from database import get_db4
from dateutil.relativedelta import relativedelta


router = APIRouter()


@router.get("/client-invoice-usage")
def get_client_invoice_usage(
    client_id: int = Query(...),
    start_date: Optional[str] = Query("2024-04-01"),
    end_date: Optional[str] = Query("2025-10-14"),
    db: Session = Depends(get_db4)
):
    # 1️⃣ Plan percentages
    consume_row = db.execute(text("""
        SELECT pm.CreditPointPercent, pm.TalktimePercent
        FROM balance_master bm
        JOIN plan_master pm ON bm.PlanId = pm.id
        WHERE bm.clientId = :client_id
    """), {"client_id": client_id}).fetchone()

    if consume_row:
        CreditPointPercent = float(consume_row.CreditPointPercent or 0)
        TalktimePercent = float(consume_row.TalktimePercent or 0)
    else:
        CreditPointPercent = 0.0
        TalktimePercent = 0.0

    # 2️⃣ Cost center
    cost_center_row = db.execute(text("""
        SELECT cost_center
        FROM cost_master
        WHERE dialdesk_client_id = :client_id
        LIMIT 1
    """), {"client_id": client_id}).fetchone()

    if not cost_center_row:
        return {"error": "Cost center not found"}

    cost_center = cost_center_row[0]

    additional_invoice_query = text("""
        SELECT EffectiveMonth, OpeningAmt, ReceiveAmt 
        FROM `exp_opening_client` 
        WHERE ClientId = :client_id
    """)

    additional_invoice_result = db.execute(additional_invoice_query, {"client_id": client_id}).fetchone()


    if additional_invoice_result:
        opening_add = float(additional_invoice_result.OpeningAmt or 0)
        amount_received = float(additional_invoice_result.ReceiveAmt or 0)
    else:
        opening_add = 0.0
        amount_received = 0.0
    print(opening_add, amount_received)

    opening_invoice_query = text("""
        SELECT category, SUM(total) AS total_amount
        FROM bill_pay_particulars bpp
        INNER JOIN tbl_invoice ti
            ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
            AND bpp.financial_year = ti.finance_year
            AND bpp.branch_name = ti.branch_name
        WHERE ti.cost_center = :cost_center
        AND DATE(ti.invoiceDate) >= '2025-04-01'
        AND DATE(ti.invoiceDate) < :start_date
        GROUP BY category
    """)
    invoice_rows = db.execute(opening_invoice_query, {
        "cost_center": cost_center,
        "start_date": start_date
    }).fetchall()

    opening_credit = opening_add
    for row in invoice_rows:
        amt = float(row.total_amount or 0)

        if row.category in ("Talk Time", "Talktime"):
            amt *= (TalktimePercent / 100)
            amt = round(amt,0)
        elif row.category == "Subscription":
            amt *= (CreditPointPercent / 100)
            amt = round(amt,0)

        opening_credit += amt

    # ---- B. Usage before start_date
    opening_usage_query = text("""
        SELECT 
            SUM(ib_total +
                ibn_total +
                ob_total +
                sms_total +
                email_total +
                ivr_total) AS total_usage
        FROM billing_consume_daily_new
        WHERE client_id = :client_id
        AND DATE(cm_date) >= '2025-04-01'
        AND DATE(cm_date) < :start_date
    """)
    usage_row = db.execute(opening_usage_query, {
        "client_id": client_id,
        "start_date": start_date
    }).fetchone()

    opening_usage = float(usage_row.total_usage or 0)

    # ---- C. Opening balance
    opening_balance1 = round(opening_credit - opening_usage + amount_received, 2)

    # 3️⃣ Invoice data
    invoice_query = text("""
        SELECT
               DATE(ti.invoiceDate) AS invoiceDate,
               ti.bill_no,
               category,
               total,
               grnd
        FROM bill_pay_particulars bpp
        JOIN tbl_invoice ti
          ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
         AND bpp.financial_year = ti.finance_year
         AND bpp.branch_name = ti.branch_name
        WHERE ti.cost_center = :cost_center
          AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date
        ORDER BY ti.invoiceDate
    """)

    all_invoices = db.execute(invoice_query, {
        "cost_center": cost_center,
        "start_date": start_date,
        "end_date": end_date
    }).fetchall()


    # 🔹 Usage query (range-based)
    usage_query = text("""
        SELECT
            SUM(
                ib_total +
                ibn_total +
                ob_total +
                sms_total +
                email_total +
                ivr_total
                ) AS credit_consumption
        FROM billing_consume_daily_new
        WHERE client_id = :client_id
        AND DATE(cm_date) BETWEEN :from_date AND :to_date
    """)

    result = []

    # Start opening balance as 0
    opening_balance = opening_balance1
    # opening_balance = 0

    # Convert dates
    start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
    end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()

    # Group invoices by month
    invoice_map = {}
    for inv in all_invoices:
        month_key = inv.invoiceDate.strftime("%Y-%m")
        invoice_map.setdefault(month_key, []).append(inv)

    current_month = start_dt.replace(day=1)

    while current_month <= end_dt:
        month_key = current_month.strftime("%Y-%m")
        month_start = current_month
        month_end = (current_month + relativedelta(months=1) - timedelta(days=1))
        if month_end > end_dt:
            month_end = end_dt

        month_invoices = invoice_map.get(month_key, [])

        # CASE 1: Month has NO invoices → NA row
        if not month_invoices:
            usage_row = db.execute(usage_query, {
                "client_id": client_id,
                "from_date": month_start,
                "to_date": month_end
            }).fetchone()

            credit_consumption = float(usage_row.credit_consumption or 0)
            credit_release = 0
            closing_balance = opening_balance + credit_release - credit_consumption

            result.append({
                "invoiceDate": str(month_start),
                "invoice_no": None,
                "category": "NA",
                "Amount": 0,
                "credit_release": round(credit_release, 2),
                "credit_consumption": round(credit_consumption, 2),
                "opening_balance": round(opening_balance, 2),
                "closing_balance": round(closing_balance, 2),
                "value": 0,
                "consumption_from": str(month_start),
                "consumption_to": str(month_end)
            })

            # next opening_balance
            opening_balance = closing_balance

        # CASE 2: Month HAS invoices → existing logic
        else:
            month_invoices = sorted(month_invoices, key=lambda x: x.invoiceDate)

            # 🔥 NEW: handle consumption BEFORE first invoice
            first_invoice_date = month_invoices[0].invoiceDate
            if month_start < first_invoice_date:
                usage_row = db.execute(usage_query, {
                    "client_id": client_id,
                    "from_date": month_start,
                    "to_date": first_invoice_date - timedelta(days=1)
                }).fetchone()

                credit_consumption = float(usage_row.credit_consumption or 0)
                credit_release = 0
                closing_balance = opening_balance - credit_consumption

                result.append({
                    "invoiceDate": str(month_start),
                    "invoice_no": None,
                    "category": "NA",
                    "Amount": 0,
                    "credit_release": 0,
                    "credit_consumption": round(credit_consumption, 2),
                    "opening_balance": round(opening_balance, 2),
                    "closing_balance": round(closing_balance, 2),
                    "value": 0,
                    "consumption_from": str(month_start),
                    "consumption_to": str(first_invoice_date - timedelta(days=1))
                })

                opening_balance = closing_balance

            for idx, inv in enumerate(month_invoices):
                base_total = float(inv.total or 0)

                # Credit release
                credit_release = base_total
                if inv.category in ("Talk Time", "Talktime"):
                    credit_release *= (TalktimePercent / 100)
                    credit_release = round(credit_release,0)
                elif inv.category == "Subscription":
                    credit_release *= (CreditPointPercent / 100)
                    credit_release = round(credit_release,0)

                from_date = inv.invoiceDate

                if idx + 1 < len(month_invoices):
                    to_date = month_invoices[idx + 1].invoiceDate - timedelta(days=1)
                else:
                    to_date = month_end

                usage_row = db.execute(usage_query, {
                    "client_id": client_id,
                    "from_date": from_date,
                    "to_date": to_date
                }).fetchone()

                credit_consumption = float(usage_row.credit_consumption or 0)

                closing_balance = opening_balance + credit_release - credit_consumption

                result.append({
                    "invoiceDate": str(inv.invoiceDate),
                    "invoice_no": inv.bill_no,
                    "category": inv.category,
                    "Amount": round(float(inv.grnd or 0), 2),
                    "credit_release": round(credit_release, 2),
                    "credit_consumption": round(credit_consumption, 2),
                    "opening_balance": round(opening_balance, 2),
                    "closing_balance": round(closing_balance, 2),
                    "value": round(base_total, 2),
                    "consumption_from": str(from_date),
                    "consumption_to": str(to_date)
                })

                # next opening_balance
                opening_balance = closing_balance

        current_month += relativedelta(months=1)


    return {
        "client_id": client_id,
        "cost_center": cost_center,
        "CreditPointPercent": CreditPointPercent,
        "TalktimePercent": TalktimePercent,
        "totals": {
            "Amount": round(sum(i["Amount"] for i in result), 2),
            "credit_release": round(sum(i["credit_release"] for i in result), 2),
            "credit_consumption": round(sum(i["credit_consumption"] for i in result), 2),
            "value": round(sum(i["value"] for i in result), 2),
            "opening_balance": round(sum(i["opening_balance"] for i in result), 2),
            "closing_balance": round(sum(i["closing_balance"] for i in result), 2)
        },
        "invoices": result
    }


