from math import floor

from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from database import get_db4
from typing import Dict, Optional, Any, List
from passlib.context import CryptContext

router = APIRouter()


# To encrypt password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)



@router.get("/clients-rights")
def get_all_clients_rights(db: Session = Depends(get_db4)):
    """
    Fetch all companies (company_id, company_name) as dictionary list
    """
    query = text("SELECT company_id, company_name FROM registration_master WHERE status = 'A'")
    result = db.execute(query).fetchall()

    return [{"company_id": row[0], "company_name": row[1]} for row in result]


@router.get("/clients-rights_is_dial")
def get_all_clients_rights_is_dial(
    db: Session = Depends(get_db4),
        start_date: Optional[str] = Query(
            None, description="Start date in YYYY-MM-DD"
        ),
        end_date: Optional[str] = Query(
            None, description="End date in YYYY-MM-DD"
        ),
):
    """
    Fetch all active DD clients with Opening balance, cost centers,
    and dynamically calculate Talktime and Subscription points.
    """
    if not start_date:
        start_date = datetime.today().strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.today().strftime("%Y-%m-%d")

    clients_query = text("""
        SELECT
            rm.company_id,
            rm.company_name,
            COALESCE(eoc.Opening, 0) AS Opening
        FROM registration_master rm
        JOIN exp_opening_client eoc ON rm.company_id = eoc.ClientId
        WHERE rm.STATUS = 'A' AND rm.is_dd_client = 1
    """)
    clients = db.execute(clients_query).fetchall()

    output = []

    for client in clients:
        client_id = client.company_id
        company_name = client.company_name
        opening = float(client.Opening or 0)

        # Assume your base opening as of 1-Sep
        base_opening = float(client.Opening or 0)

        # Define start of financial month (here 2025-09-01)
        month_opening_date = "2025-09-01"

        # Compute all releases before the chosen start_date
        cost_master_name = text("""SELECT cost_center FROM cost_master WHERE dialdesk_client_id = :client_id""")
        cost_master_name_value = db.execute(
            cost_master_name,
            {
                "client_id": client_id
            }
        ).mappings().first()
        cost_value = cost_master_name_value["cost_center"] if cost_master_name_value else None
        release_query = text("""
                        SELECT ti.bill_no,
                        ti.Category,
                        CASE
                            WHEN bpp.status = 'part payment'
                                THEN
                                    SUM(bpp.net_amount)
                                    - (IFNULL(ti.igst,0) + IFNULL(ti.cgst,0) + IFNULL(ti.sgst,0))
                            ELSE
                                SUM(bpp.net_amount)
                        END AS release_sum
                    FROM bill_pay_particulars bpp
                    INNER JOIN tbl_invoice ti
                        ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
                        AND bpp.financial_year = ti.finance_year
                        AND bpp.branch_name = ti.branch_name
                    WHERE ti.cost_center = :cost_value
                    AND DATE(ti.invoiceDate) >='2025-09-01'
                    AND DATE(bpp.pay_dates) BETWEEN :month_opening_date AND date_sub(DATE(:start_date),interval 1 day)
                    GROUP BY
                        ti.bill_no,

                        ti.status,
                        ti.igst,
                        ti.cgst,
                        ti.sgst;

                    """)

        release_rows = db.execute(
            release_query,
            {
                "cost_value": cost_value,
                "month_opening_date": month_opening_date,
                "start_date": start_date,
            }
        ).mappings().fetchall()  # 👈 mappings() is important

        total_talktime1 = 0.0
        total_subscription1 = 0.0

        for b in release_rows:
            category = (b["Category"] or "").strip().lower()
            total = float(b["release_sum"] or 0)

            if "talktime" in category:
                total_talktime1 += total
            elif category == "subscription":
                total_subscription1 += total

        # total release before (all categories)
        release_before_value = total_talktime1 + total_subscription1

        print(release_before_value, "release_before_value===")

        #################################################################################

        release_query_billing = text("""select ti.Category,COALESCE(SUM(ti.total), 0) AS release_billing from tbl_invoice 
            ti WHERE ti.cost_center = :cost_value
                        AND DATE(ti.invoiceDate)>='2025-09-01' AND DATE(ti.invoiceDate) BETWEEN :month_opening_date AND 
                        DATE(:start_date)-1  AND Category IN ('talktime','subscription') group by Category""")

        release_rows_billing = db.execute(
            release_query_billing,
            {
                "cost_value": cost_value,
                "month_opening_date": month_opening_date,
                "start_date": start_date,
            }
        ).mappings().fetchall()  # 👈 mappings() is important

        total_talktime_billing = 0.0
        total_subscription_billing = 0.0

        for b in release_rows_billing:
            category_billing = (b["Category"] or "").strip().lower()
            total_billing = float(b["release_billing"] or 0)

            if "talktime" in category_billing:
                total_talktime_billing += total_billing
            elif category_billing == "subscription":
                total_subscription_billing += total_billing

        # total release before (all categories)
        release_before_billing = total_talktime_billing + total_subscription_billing

        print(release_before_billing, "release_before_billing===")

        ############################   End################################################################

        # Compute all consumption before the chosen start_date
        consume_before_query = text("""
            SELECT COALESCE(SUM(cm_total), 0) AS consume_sum
            FROM billing_consume_daily_new
            WHERE client_id = :client_id
            AND DATE(cm_date) BETWEEN :month_opening_date AND DATE(:start_date) - INTERVAL 1 DAY
        """)
        consume_before = db.execute(consume_before_query, {
            "client_id": client_id,
            "month_opening_date": month_opening_date,
            "start_date": start_date
        }).fetchone()
        consume_before_value = float(consume_before.consume_sum or 0)

        # Calculate effective opening as on selected start_date

        plan_query = text("""
            SELECT
                COALESCE(pm.CreditPointPercent, 0) AS CreditPointPercent,
                COALESCE(pm.TalktimePercent, 0) AS TalktimePercent
            FROM balance_master bm
            JOIN plan_master pm ON bm.PlanId = pm.id
            WHERE bm.clientId = :client_id
            LIMIT 1
        """)
        plan = db.execute(plan_query, {"client_id": client_id}).fetchone()

        if plan:
            credit_percent = float(str(plan.CreditPointPercent).replace('%', '') or 0)
            talktime_percent = float(str(plan.TalktimePercent).replace('%', '') or 0)
        else:
            credit_percent = 0.0
            talktime_percent = 0.0

        cost_query = text("""
            SELECT cost_center
            FROM cost_master
            WHERE dialdesk_client_id = :client_id
        """)
        cost_centers = db.execute(cost_query, {"client_id": client_id}).fetchall()

        total_talktime = 0.0
        total_subscription = 0.0
        total_talktime_billing1 = 0.0
        total_subscription_billing1 = 0.0

        for cc_row in cost_centers:
            cost_center = cc_row.cost_center.strip() if cc_row.cost_center else None
            if not cost_center:
                continue

            ############################  Krishna ####################################################
            bill_query_billing = text(""" select ti.Category,COALESCE(SUM(ti.total), 0) AS release_billing from tbl_invoice 
            ti WHERE ti.cost_center = :cost_center
                        AND DATE(ti.invoiceDate)>='2025-09-01' AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date  
                        AND Category IN ('talktime','subscription') group by Category""")
            bill_rows_billing = db.execute(bill_query_billing, {
                "cost_center": cost_center,
                "start_date": start_date,
                "end_date": end_date,
                "client_id": client_id
            }).fetchall()

            for b in bill_rows_billing:
                category_billing1 = (b.Category or "").strip().lower()
                release_billing = float(b.release_billing or 0)
                if "talktime" in category_billing1:
                    total_talktime_billing1 += release_billing
                elif category_billing1 == "subscription":
                    total_subscription_billing1 += release_billing

            ####################### End ####################################################################

            bill_query = text("""
                            SELECT
                                ti.bill_no,
                                ti.Category,
                                CASE
                                    WHEN bpp.status = 'part payment'
                                        THEN
                                            SUM(bpp.net_amount)
                                            - (IFNULL(ti.igst,0) + IFNULL(ti.cgst,0) + IFNULL(ti.sgst,0))
                                    ELSE
                                        SUM(ti.total)
                                END AS total
                            FROM bill_pay_particulars bpp
                            INNER JOIN tbl_invoice ti
                                ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
                                AND bpp.financial_year = ti.finance_year
                                AND bpp.branch_name = ti.branch_name
                            WHERE ti.cost_center = :cost_center
                            AND DATE(ti.invoiceDate)>='2025-09-01'
                            AND DATE(bpp.pay_dates) BETWEEN :start_date AND :end_date
                            GROUP BY
                                ti.bill_no,

                                ti.status,
                                ti.igst,
                                ti.cgst,
                                ti.sgst;
                        """)
            bill_rows = db.execute(bill_query, {
                "cost_center": cost_center,
                "start_date": start_date,
                "end_date": end_date
            }).fetchall()

            for b in bill_rows:
                category = (b.Category or "").strip().lower()
                total = float(b.total or 0)
                if "talktime" in category:
                    total_talktime += total
                elif category == "subscription":
                    total_subscription += total

        talktime_value = round(total_talktime * (talktime_percent / 100), 2)
        subscription_value = round(total_subscription * (credit_percent / 100), 2)
        fresh_release = round(talktime_value + subscription_value, 2)

        talktime_value_billing = round(total_talktime_billing1 * (talktime_percent / 100), 2)
        subscription_value_billing = round(total_subscription_billing1 * (credit_percent / 100), 2)
        fresh_release_billing = round(talktime_value_billing + subscription_value_billing, 2)
        print(fresh_release_billing, "Billing++++++")



        total_talktime_value = 0.0
        total_subscription_value = 0.0

        for cc_row in cost_centers:
            cost_center = cc_row.cost_center.strip() if cc_row.cost_center else None
            if not cost_center:
                continue

            invoice_query = text("""
                        SELECT 
                            LOWER(TRIM(category)) AS category,
                            SUM(total) AS total_sum
                        FROM tbl_invoice ti
                        WHERE ti.cost_center = :cost_center
                          AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date
                          AND LOWER(TRIM(ti.category)) IN ('talktime', 'subscription')
                        GROUP BY LOWER(TRIM(ti.category))
                    """)
            invoice_rows = db.execute(invoice_query, {
                "cost_center": cost_center,
                "start_date": start_date,
                "end_date": end_date,
            }).fetchall()

            for b in invoice_rows:
                category = (b.category or "").strip().lower()
                total = float(b.total_sum or 0)
                if category == "talktime":
                    total_talktime_value += total
                elif category == "subscription":
                    total_subscription_value += total



        consume_query = text("""
            SELECT COALESCE(SUM(cm_total), 0) AS consume
            FROM billing_consume_daily_new
            WHERE client_id = :client_id
            AND DATE(cm_date) BETWEEN :start_date AND :end_date
        """)
        consume_row = db.execute(consume_query, {
            "client_id": client_id,
            "start_date": start_date,
            "end_date": end_date
        }).fetchone()

        consume_value = float(consume_row.consume or 0)

        talktime_release_pct = total_talktime1 * (talktime_percent / 100)
        subscription_release_pct = total_subscription1 * (credit_percent / 100)

        release_after_percentage = round(
            talktime_release_pct + subscription_release_pct,
            2
        )

        talktime_release_pct_billing = total_talktime_billing * (talktime_percent / 100)
        subscription_release_pct_billing = total_subscription_billing * (credit_percent / 100)

        release_after_percentage_billing = round(
            talktime_release_pct_billing + subscription_release_pct_billing,
            2
        )

        if start_date == "2025-09-01":
            effective_opening = base_opening
            effective_opening_billing = base_opening
        else:
            effective_opening = base_opening + release_after_percentage - consume_before_value
            effective_opening_billing = base_opening + release_after_percentage_billing - consume_before_value

        print(effective_opening, "effective_opening===")
        print(effective_opening_billing, "effective_opening_billing----")

        Release_billing = round(
            (total_talktime_value * (talktime_percent / 100)) +
            (total_subscription_value * (credit_percent / 100)),
            2
        )

        try:
            to_be_billed = round(
                ((effective_opening_billing + Release_billing - consume_value) * 100) / talktime_percent,
                2
            ) if (
                         ((effective_opening_billing + Release_billing - consume_value) * 100) / talktime_percent
                 ) < 0 else 0
        except ZeroDivisionError:
            to_be_billed = 0


        output.append({
            "company_id": client_id,
            "company_name": company_name,
            "opening": effective_opening,
            "talktime_total": round(total_talktime, 2),
            "subscription_total": round(total_subscription, 2),
            "talktime_percent": talktime_percent,
            "credit_percent": credit_percent,
            "talktime_value": talktime_value,
            "subscription_value": subscription_value,
            "fresh_release": round(talktime_value + subscription_value, 2),
            "consume": round(consume_value, 2),
            "balance": round((effective_opening + talktime_value + subscription_value - consume_value), 2),
            "total_talktime_value": round(total_talktime_value, 2),
            "total_subscription_value": round(total_subscription_value, 2),
            # "Release_billing": round(total_talktime_value + total_subscription_value, 2),
            "Release_billing": round(
                (total_talktime_value * (talktime_percent / 100)) +
                (total_subscription_value * (credit_percent / 100)),
                2
            ),

        "effective_opening_bill": round(effective_opening_billing,2),
        "Exposure_billing_vr": round(effective_opening_billing + Release_billing - consume_value, 2),
        # "to_be_billed" : round(((effective_opening_billing + Release_billing - consume_value) * 100)/talktime_percent,2)
        #                 if ((effective_opening_billing + Release_billing - consume_value) * 100)/talktime_percent < 0
        #                 else 0
        "to_be_billed": to_be_billed
        })

    return output




@router.get("/clients-rights_search")
def get_clients_rights_search(
    db: Session = Depends(get_db4),
    start_date: Optional[str] = Query(..., description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(..., description="YYYY-MM-DD"),
    client_id: int = Query(..., description="Client ID required for search"),
):
    """
    Fetch detailed DD client summary (single client search only).
    """
    print("Test")
    base_query = """
        SELECT
            rm.company_id,
            rm.company_name,
            COALESCE(eoc.Opening, 0) AS Opening
        FROM registration_master rm
        JOIN exp_opening_client eoc ON rm.company_id = eoc.ClientId
        WHERE rm.STATUS = 'A' AND rm.is_dd_client = 1
          AND rm.company_id = :client_id
    """

    client = db.execute(text(base_query), {"client_id": client_id}).fetchone()
    if not client:
        return {"message": "Client not found"}

    company_name = client.company_name
    opening = float(client.Opening or 0)

    base_opening = float(opening or 0)

    # Define start of financial month (here 2025-09-01)
    month_opening_date = "2025-09-01"

    # Compute all releases before the chosen start_date
    cost_master_name = text("""SELECT cost_center FROM cost_master WHERE dialdesk_client_id = :client_id""")
    cost_master_name_value = db.execute(
        cost_master_name,
        {
            "client_id": client_id
        }
    ).mappings().first()
    cost_value = cost_master_name_value["cost_center"] if cost_master_name_value else None
    release_query = text("""
                SELECT ti.bill_no,
                ti.Category,
                CASE
                    WHEN bpp.status = 'part payment'
                        THEN
                            SUM(bpp.net_amount)
                            - (IFNULL(ti.igst,0) + IFNULL(ti.cgst,0) + IFNULL(ti.sgst,0))
                    ELSE
                        SUM(bpp.net_amount)
                END AS release_sum
            FROM bill_pay_particulars bpp
            INNER JOIN tbl_invoice ti
                ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
                AND bpp.financial_year = ti.finance_year
                AND bpp.branch_name = ti.branch_name
            WHERE ti.cost_center = :cost_value
            AND DATE(ti.invoiceDate) >='2025-09-01'
            AND DATE(bpp.pay_dates) BETWEEN :month_opening_date AND date_sub(DATE(:start_date),interval 1 day)
            GROUP BY
                ti.bill_no,
             
                ti.status,
                ti.igst,
                ti.cgst,
                ti.sgst;

            """)

    release_rows = db.execute(
        release_query,
        {
            "cost_value": cost_value,
            "month_opening_date": month_opening_date,
            "start_date": start_date,
        }
    ).mappings().fetchall()  # 👈 mappings() is important

    total_talktime1 = 0.0
    total_subscription1 = 0.0

    for b in release_rows:
        category = (b["Category"] or "").strip().lower()
        total = float(b["release_sum"] or 0)

        if "talktime" in category:
            total_talktime1 += total
        elif category == "subscription":
            total_subscription1 += total

    # total release before (all categories)
    release_before_value = total_talktime1 + total_subscription1

    print(release_before_value, "release_before_value===")


#################################################################################

    release_query_billing = text("""select ti.Category,COALESCE(SUM(ti.total), 0) AS release_billing from tbl_invoice 
    ti WHERE ti.cost_center = :cost_value
                AND DATE(ti.invoiceDate)>='2025-09-01' AND DATE(ti.invoiceDate) BETWEEN :month_opening_date AND 
                DATE(:start_date)-1  AND Category IN ('talktime','subscription') group by Category""")

    release_rows_billing = db.execute(
        release_query_billing,
        {
            "cost_value": cost_value,
            "month_opening_date": month_opening_date,
            "start_date": start_date,
        }
    ).mappings().fetchall()  # 👈 mappings() is important

    total_talktime_billing = 0.0
    total_subscription_billing = 0.0

    for b in release_rows_billing:
        category_billing = (b["Category"] or "").strip().lower()
        total_billing = float(b["release_billing"] or 0)

        if "talktime" in category_billing:
            total_talktime_billing += total_billing
        elif category_billing == "subscription":
            total_subscription_billing += total_billing

    # total release before (all categories)
    release_before_billing = total_talktime_billing + total_subscription_billing

    print(release_before_billing, "release_before_billing===")

############################   End################################################################





    # Compute all consumption before the chosen start_date
    consume_before_query = text("""
                SELECT COALESCE(SUM(cm_total), 0) AS consume_sum
                FROM billing_consume_daily_new
                WHERE client_id = :client_id
                AND DATE(cm_date) BETWEEN :month_opening_date AND DATE(:start_date) - INTERVAL 1 DAY
            """)
    consume_before = db.execute(consume_before_query, {
        "client_id": client_id,
        "month_opening_date": month_opening_date,
        "start_date": start_date
    }).fetchone()
    consume_before_value = float(consume_before.consume_sum or 0)

    print(consume_before_value,"consume_before_value====")

    # Calculate effective opening as on selected start_date


    opening_query = text("""
        SELECT eoc.Opening
             + COALESCE((
                 SELECT SUM(cm_total) 
                 FROM billing_consume_daily_new bcd
                 WHERE bcd.client_id = eoc.ClientId
                   AND DATE(bcd.cm_date) < :start_date
             ), 0) AS dynamic_opening
        FROM exp_opening_client eoc
        WHERE eoc.ClientId = :client_id
    """)
    opening_row = db.execute(opening_query, {
        "client_id": client_id,
        "start_date": start_date,
    }).fetchone()

    opening = float(opening_row.dynamic_opening or 0)




    # Plan details
    plan_query = text("""
        SELECT 
            COALESCE(pm.CreditPointPercent, 0) AS CreditPointPercent,
            COALESCE(pm.TalktimePercent, 0) AS TalktimePercent
        FROM balance_master bm
        JOIN plan_master pm ON bm.PlanId = pm.id
        WHERE bm.clientId = :client_id
        LIMIT 1
    """)
    plan = db.execute(plan_query, {"client_id": client_id}).fetchone()
    credit_percent = float(str(plan.CreditPointPercent).replace('%', '') or 0) if plan else 0.0
    talktime_percent = float(str(plan.TalktimePercent).replace('%', '') or 0) if plan else 0.0

    # Cost centers
    cost_query = text("""
        SELECT cost_center 
        FROM cost_master 
        WHERE dialdesk_client_id = :client_id
    """)
    cost_centers = db.execute(cost_query, {"client_id": client_id}).fetchall()

    total_talktime = 0.0
    total_subscription = 0.0
    total_talktime_billing1 = 0.0
    total_subscription_billing1 = 0.0

    for cc in cost_centers:
        cost_center = (cc.cost_center or "").strip()
        if not cost_center:
            continue
############################  Krishna ####################################################
        bill_query_billing = text(""" select ti.Category,COALESCE(SUM(ti.total), 0) AS release_billing from tbl_invoice 
    ti WHERE ti.cost_center = :cost_center
                AND DATE(ti.invoiceDate)>='2025-09-01' AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date  
                AND Category IN ('talktime','subscription') group by Category""")
        bill_rows_billing = db.execute(bill_query_billing, {
            "cost_center": cost_center,
            "start_date": start_date,
            "end_date": end_date,
            "client_id": client_id
        }).fetchall()

        for b in bill_rows_billing:
            category_billing1 = (b.Category or "").strip().lower()
            release_billing = float(b.release_billing or 0)
            if "talktime" in category_billing1:
                total_talktime_billing1 += release_billing
            elif category_billing1 == "subscription":
                total_subscription_billing1 += release_billing


####################### End ####################################################################

        bill_query = text("""
                    SELECT
                        ti.bill_no,
                        ti.Category,
                        CASE
                            WHEN bpp.status = 'part payment'
                                THEN
                                    SUM(bpp.net_amount)
                                    - (IFNULL(ti.igst,0) + IFNULL(ti.cgst,0) + IFNULL(ti.sgst,0))
                            ELSE
                                SUM(ti.total)
                        END AS total
                    FROM bill_pay_particulars bpp
                    INNER JOIN tbl_invoice ti
                        ON bpp.bill_no = SUBSTRING_INDEX(ti.bill_no, '/', 1)
                        AND bpp.financial_year = ti.finance_year
                        AND bpp.branch_name = ti.branch_name
                    WHERE ti.cost_center = :cost_center
                    AND DATE(ti.invoiceDate)>='2025-09-01'
                    AND DATE(bpp.pay_dates) BETWEEN :start_date AND :end_date
                    GROUP BY
                        ti.bill_no,

                        ti.status,
                        ti.igst,
                        ti.cgst,
                        ti.sgst;
                """)
        bill_rows = db.execute(bill_query, {
            "cost_center": cost_center,
            "start_date": start_date,
            "end_date": end_date
        }).fetchall()

        for b in bill_rows:
            category = (b.Category or "").strip().lower()
            total = float(b.total or 0)
            if "talktime" in category:
                total_talktime += total
            elif category == "subscription":
                total_subscription += total




    talktime_value = round(total_talktime * (talktime_percent / 100), 2)
    subscription_value = round(total_subscription * (credit_percent / 100), 2)
    fresh_release = round(talktime_value + subscription_value, 2)

    talktime_value_billing = round(total_talktime_billing1 * (talktime_percent / 100), 2)
    subscription_value_billing = round(total_subscription_billing1 * (credit_percent / 100), 2)
    fresh_release_billing = round(talktime_value_billing + subscription_value_billing, 2)
    print(fresh_release_billing,"Billing++++++")

    total_talktime_value = 0.0
    total_subscription_value = 0.0

    for cc_row in cost_centers:
        cost_center = cc_row.cost_center.strip() if cc_row.cost_center else None
        if not cost_center:
            continue

        invoice_query = text("""
                            SELECT 
                                LOWER(TRIM(category)) AS category,
                                SUM(total) AS total_sum
                            FROM tbl_invoice ti
                            WHERE ti.cost_center = :cost_center
                              AND DATE(ti.invoiceDate) BETWEEN :start_date AND :end_date
                              AND LOWER(TRIM(ti.category)) IN ('talktime', 'subscription')
                            GROUP BY LOWER(TRIM(ti.category))
                        """)
        invoice_rows = db.execute(invoice_query, {
            "cost_center": cost_center,
            "start_date": start_date,
            "end_date": end_date,
        }).fetchall()

        for b in invoice_rows:
            category = (b.category or "").strip().lower()
            total = float(b.total_sum or 0)
            if category == "talktime":
                total_talktime_value += total
            elif category == "subscription":
                total_subscription_value += total

    consume_query = text("""
        SELECT COALESCE(SUM(cm_total), 0) AS consume
        FROM billing_consume_daily_new
        WHERE client_id = :client_id
        AND DATE(cm_date) BETWEEN :start_date AND :end_date
    """)
    consume_row = db.execute(consume_query, {
        "client_id": client_id,
        "start_date": start_date,
        "end_date": end_date
    }).fetchone()
    consume_value = float(consume_row.consume or 0)
    print(opening,"opening==")
    print(fresh_release,"fresh_release==")
    print(consume_value,"consume_value==")

    talktime_release_pct = total_talktime1 * (talktime_percent / 100)
    subscription_release_pct = total_subscription1 * (credit_percent / 100)

    release_after_percentage = round(
        talktime_release_pct + subscription_release_pct,
        2
    )

    talktime_release_pct_billing = total_talktime_billing * (talktime_percent / 100)
    subscription_release_pct_billing = total_subscription_billing * (credit_percent / 100)

    release_after_percentage_billing = round(
        talktime_release_pct_billing + subscription_release_pct_billing,
        2
    )

    if start_date=="2025-09-01":
        effective_opening = base_opening
        effective_opening_billing = base_opening
    else:
        effective_opening = base_opening + release_after_percentage - consume_before_value
        effective_opening_billing = base_opening + release_after_percentage_billing - consume_before_value

    print(effective_opening, "effective_opening===")
    print(effective_opening_billing,"effective_opening_billing----")

    balance = round((effective_opening + fresh_release - consume_value), 2)

    Release_billing = round(
            (total_talktime_value * (talktime_percent / 100)) +
            (total_subscription_value * (credit_percent / 100)),
            2
        )

    try:
        to_be_billed = round(
            ((effective_opening_billing + Release_billing - consume_value) * 100) / talktime_percent,
            2
        ) if (
                     ((effective_opening_billing + Release_billing - consume_value) * 100) / talktime_percent
             ) < 0 else 0
    except ZeroDivisionError:
        to_be_billed = 0




    return {
        "company_id": client_id,
        "company_name": company_name,
        "opening": effective_opening,
        "talktime_total": round(total_talktime, 2),
        "subscription_total": round(total_subscription, 2),
        "talktime_percent": talktime_percent,
        "credit_percent": credit_percent,
        "talktime_value": talktime_value,
        "subscription_value": subscription_value,
        "fresh_release": fresh_release,
        "consume": round(consume_value, 2),
        "balance": balance,
        "total_talktime_value": round(total_talktime_value, 2),
        "total_subscription_value": round(total_subscription_value, 2),
        # "Release_billing": round(total_talktime_value + total_subscription_value, 2),
        "Release_billing": round(
            (total_talktime_value * (talktime_percent / 100)) +
            (total_subscription_value * (credit_percent / 100)),
            2
        ),
        "effective_opening_bill": round(effective_opening_billing,2),
        "Exposure_billing_vr": round(effective_opening_billing + Release_billing - consume_value, 2),
        # "to_be_billed" : round(((effective_opening_billing + Release_billing - consume_value) * 100)/talktime_percent,2)
        #                 if ((effective_opening_billing + Release_billing - consume_value) * 100)/talktime_percent < 0
        #                 else 0
        "to_be_billed": to_be_billed
    }

################### clients-effective-month get start #################

@router.get("/clients-effective-month")
def get_effective_month(
    client_id: int = Query(..., description="Client ID"),
    db: Session = Depends(get_db4),
):
    """
    Fetch EffectiveMonth for a given client_id
    """

    query = text("""
        SELECT EffectiveMonth
        FROM exp_opening_client
        WHERE ClientId = :client_id
        LIMIT 1
    """)

    result = db.execute(query, {"client_id": client_id}).fetchone()

    if not result or not result.EffectiveMonth:
        raise HTTPException(
            status_code=404,
            detail="EffectiveMonth not found for this client"
        )

    return {
        "client_id": client_id,
        "effective_month": result.EffectiveMonth
    }


################### clients-effective-month get End  #################






@router.get("/clients-rights/{company_id}")
def get_client_right(company_id: int, db: Session = Depends(get_db4)):
    """
    Fetch single company by company_id as dictionary
    """
    query = text(
        "SELECT company_id, company_name FROM registration_master WHERE company_id = :company_id"
    )
    result = db.execute(query, {"company_id": company_id}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Company not found")

    return {"company_id": result[0], "company_name": result[1]}


@router.post("/save")
def create_agent(agent: dict, db: Session = Depends(get_db4)):
    try:
        raw_password = agent.get("password")

        # Hash the password before saving
        hashed_password = hash_password(agent.get("password"))

        query = text("""
            INSERT INTO agent_master
            (displayname, username, password, password2, processname, workmode, dob, 
             dateofjoining, agent_type, address, state, city, Gender, Versant, 
             email, phone_no, LanguagesKnown, ClientRights, createdate, status, employment_type)
            VALUES 
            (:displayname, :username, :password, :password2, :processname, :workmode, :dob,
             :dateofjoining, :agent_type, :address, :state, :city, :Gender, :Versant, 
             :email, :phone_no, :LanguagesKnown, :ClientRights, :createdate, 'A', :employment_type)
        """)

        db.execute(query, {
            **agent,
            "password": hashed_password,
            "password2": raw_password,
            "LanguagesKnown": ",".join(agent.get("LanguagesKnown", [])),
            "ClientRights": ",".join(agent.get("ClientRights", [])),
            "createdate": datetime.now()
        })
        db.commit()
        return {"status": "success", "agent": agent}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list")
def list_agents(db: Session = Depends(get_db4)):
    query = text("SELECT * FROM agent_master ORDER BY createdate DESC")
    result = db.execute(query).fetchall()

    agents = []
    for row in result:
        agents.append(dict(row._mapping))  # convert Row -> dict
    return agents


@router.put("/{agent_id}")
def update_agent(agent_id: int, agent: dict, db: Session = Depends(get_db4)):
    try:
        # Prepare password fields if password is provided
        if "password" in agent and agent["password"]:
            raw_password = agent["password"]
            hashed_password = hash_password(raw_password)
            agent["password"] = hashed_password
            agent["password2"] = raw_password
        else:
            # Remove password fields so they are not updated
            agent.pop("password", None)
            agent.pop("password2", None)

        dateofleaving = agent.get("dateofleaving")
        if dateofleaving in ("", None):
            agent["dateofleaving"] = None

        
        query = text("""
            UPDATE agent_master
            SET displayname=:displayname, username=:username, password=:password, password2=:password2,
                processname=:processname, workmode=:workmode, dob=:dob,
                dateofjoining=:dateofjoining, dateofleaving=:dateofleaving, agent_type=:agent_type, address=:address,
                state=:state, city=:city, Gender=:Gender, Versant=:Versant,
                email=:email, phone_no=:phone_no,
                LanguagesKnown=:LanguagesKnown, ClientRights=:ClientRights,
                update_date=:update_date,employment_type=:employment_type
            WHERE id=:id
        """)

        db.execute(query, {
            **agent,
            "id": agent_id,
            "LanguagesKnown": ",".join(agent.get("LanguagesKnown", [])),
            "ClientRights": ",".join(agent.get("ClientRights", [])),
            "update_date": datetime.now()
        })
        db.commit()
        return {"status": "success", "agent_id": agent_id, "agent": agent}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{agent_id}")
def delete_agent(agent_id: int, db: Session = Depends(get_db4)):
    try:
        query = text("DELETE FROM agent_master WHERE id = :id")
        result = db.execute(query, {"id": agent_id})

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Agent not found")

        db.commit()
        return {"status": "success", "deleted_id": agent_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
