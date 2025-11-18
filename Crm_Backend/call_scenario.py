from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4
from email_utils import send_email
import os, html


router = APIRouter()



@router.get("/send-call-summary")
def send_call_summary(
    client_id: int = Query(...),
    report_date: date = Query(...),
    db: Session = Depends(get_db4),
):
    try:
        # 1️⃣ Call Scenario
        query1 = text("""
            SELECT Category1 AS `Call Scenario`, COUNT(1) AS Count
            FROM call_master
            WHERE DATE(CallDate)=:report_date AND ClientId=:client_id
            GROUP BY Category1
        """)
        call_scenario = db.execute(query1, {"report_date": report_date, "client_id": client_id}).mappings().all()

        # Find "Other" count from main query
        other_row = next((row for row in call_scenario if row["Call Scenario"] == "Other"), None)
        other_total = other_row["Count"] if other_row else 0

        # 2️⃣ Call Scenario (Other subcategory)
        query2 = text("""
            SELECT Category2 AS `Call Scenario`, COUNT(1) AS Count
            FROM call_master
            WHERE DATE(CallDate)=:report_date AND ClientId=:client_id AND Category1='Other'
            GROUP BY Category2
        """)
        call_other_data = db.execute(query2, {"report_date": report_date, "client_id": client_id}).mappings().all()

        # Include the main "Other" count for display but not in total
        call_other = []
        if other_total:
            call_other.append({"Call Scenario": "Other", "Count": other_total})
        call_other.extend(call_other_data)

        # 3️⃣ Consultation Category
        query3 = text("""
            SELECT Field7 AS `Consultation Category`, COUNT(1) AS Count
            FROM call_master
            WHERE DATE(CallDate)=:report_date AND ClientId=:client_id
            GROUP BY Field7
        """)
        consultation_category = db.execute(query3, {"report_date": report_date, "client_id": client_id}).mappings().all()

        # Find "Other" count from main query
        other_row_data = next((row for row in consultation_category if row["Consultation Category"] == "Other ( No Booking )"), None)
        other_total_data = other_row_data["Count"] if other_row_data else 0

        # 4️⃣ Consultation Mode (Other subcategory)
        query4 = text("""
            SELECT Category2 AS `Consultation Mode`, COUNT(1) AS Count
            FROM call_master
            WHERE DATE(CallDate)=:report_date AND ClientId=:client_id AND Field7='Other ( No Booking )'
            GROUP BY Category2
        """)
        consultation_mode_data = db.execute(query4, {"report_date": report_date, "client_id": client_id}).mappings().all()

        # Include the main "Other ( No Booking )" count for display but not in total
        consultation_mode = []
        if other_total_data:
            consultation_mode.append({"Consultation Mode": "Other ( No Booking )", "Count": other_total_data})
        consultation_mode.extend(consultation_mode_data)

        # 🧱 Helper to build structured section data
        def make_table(title, data, exclude_first_from_total=False):
            if not data:
                return {"title": title, "data": [], "total": 0}
            total = (
                sum(row["Count"] for row in data[1:])
                if exclude_first_from_total and len(data) > 1
                else sum(row["Count"] for row in data)
            )
            return {"title": title, "data": data, "total": total}


        # Build final sections
        sections = [
            make_table("Call Scenario", call_scenario),
            make_table("Call Scenario", call_other, exclude_first_from_total=True),
            make_table("Consultation Category", consultation_category),
            make_table("Consultation Mode", consultation_mode, exclude_first_from_total=True)
        ]

        # 🧩 Generate HTML email
        def make_html_table(title, data, total):
            if not data:
                return f"<p>No data available</p>"
            
            data = [dict(r) for r in data]
            headers = list(data[0].keys())

            rows = "".join(
                f"<tr>"
                f"<td style='text-align:center; width:70%;'>{html.escape(str(row.get(headers[0], '')))}</td>"
                f"<td style='text-align:center; width:30%;'>{html.escape(str(row.get('Count', 0)))}</td>"
                f"</tr>"
                for row in data
            )
            return f"""
            
            <table border='1' cellspacing='0' cellpadding='6' style="border-collapse:collapse; font-family:Arial; font-size:14px; width:60%; table-layout:fixed; text-align:center; margin-bottom:10px;">
                <tr style="background:rgb(184, 204, 228); font-weight:bold;">
                    <th style="width:70%;">{headers[0]}</th>
                    <th style="width:30%;">Count</th>
                </tr>
                {rows}
                <tr style="font-weight:bold; background:rgb(184, 204, 228);">
                    <td>Grand Total</td><td>{total}</td>
                </tr>
            </table><br>
            """

        html_content = f"""
        <p>Hi,</p>

        {''.join([make_html_table(sec['title'], sec['data'], sec['total']) for sec in sections])}
        <p>Regards,</p>
        """

        # 📧 Send email
        recipient = os.getenv("EMAIL_RECEIVER")
        if not recipient:
            raise HTTPException(status_code=500, detail="EMAIL_RECEIVER not set in .env")
        
        # # Split multiple emails by comma and strip spaces
        # recipient_list = [email.strip() for email in recipients.split(",") if email.strip()]

        # for recipient in recipient_list:
        #     send_email(
        #         to_email=recipient,
        #         subject=f"Call Summary Report - {report_date}, For Client-ID: {client_id}",
        #         html_content=html_content
        #     )

        send_email(
            to_email=recipient,
            subject=f"Call Summary Report - {report_date}, For Client-ID: {client_id}",
            html_content=html_content
        )

        # # Sends message for multiple emails.
        # return {
        #     "message": f"Email sent successfully to {', '.join(recipient_list)}",
        #     "client_id": client_id,
        #     "report_date": str(report_date),
        #     "sections": sections
        # }


        # ✅ Return preview response also
        return {
            "message": f"Email sent successfully to {recipient}",
            "client_id": client_id,
            "report_date": str(report_date),
            "sections": sections
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



