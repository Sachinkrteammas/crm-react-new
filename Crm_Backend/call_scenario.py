from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4, get_db2
from email_utils import send_email
import os, html


router = APIRouter()



@router.get("/send-call-summary")
def send_call_summary(
    client_id: int = Query(...),
    report_date: date = Query(...),
    db: Session = Depends(get_db4),
    db2: Session = Depends(get_db2)
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

        query5 = text("""
            SELECT 
                u.full_name AS `Agent Name`,
                COUNT(v.user) AS `Calls taken in OB+IB`
            FROM vicidial_agent_log v
            JOIN vicidial_users u ON v.user = u.user
            WHERE DATE(v.event_time) = CURDATE()
              AND v.campaign_id IN ('Cryst002')
              AND v.lead_id IS NOT NULL
            GROUP BY v.user
        """)

        agent_rows = db2.execute(query5).mappings().all()
        agent_rows = [dict(r) for r in agent_rows]



        # 6️⃣ Hourly Call Summary (Your Provided Query)
        hourly_query = text("""
            SELECT DATE(call_date) `Date`, HOUR(call_date) `Time Slot`,COUNT(1) Total, SUM(IF(t2.user!='VDCL',1,0)) `Answered`,

                IF(t2.user!='VDCL',COUNT(DISTINCT(t2.user))-1,COUNT(DISTINCT(t2.user))) `Manpower`,

                ROUND(SUM(IF(t2.user!='VDCL',1,0))/COUNT(1)*100,2) `AL %`,ROUND(SUM(IF(t2.`user` !='VDCL' AND

                t2.queue_seconds<=20,1,0))/COUNT(1)*100,2) `SL %` FROM asterisk.vicidial_closer_log t2

            LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid  AND t2.user=t3.user

            LEFT JOIN (SELECT uniqueid,SUM(parked_sec) p FROM park_log WHERE STATUS='GRABBED' AND DATE(parked_time) BETWEEN '$FromDate' AND '$ToDate' GROUP BY uniqueid)

            t6 ON t2.uniqueid=t6.uniqueid LEFT JOIN vicidial_users vc ON t2.user=vc.user

            WHERE DATE(t2.call_date)=CURDATE() AND t2.campaign_id IN('CrystalEyeCentr00000','Cryst000') AND  t2.lead_id IS NOT NULL GROUP BY HOUR(t2.call_date);
        """)

        hourly_rows = db2.execute(hourly_query).mappings().all()
        hourly_data = [dict(r) for r in hourly_rows]


        # Compute totals
        total_total = sum(row["Total"] for row in hourly_data)
        total_answered = sum(row["Answered"] for row in hourly_data)

        # AL% Total = (sum answered / sum total) * 100
        total_al = round((total_answered / total_total) * 100, 2) if total_total else 0

        # SL% Total = Weighted average
        weighted_sl_num = sum(
            (row["SL %"] * row["Total"]) for row in hourly_data
        )
        total_sl = round(weighted_sl_num / total_total, 2) if total_total else 0

        # Add bottom total row exactly like your screenshot
        hourly_data.append({
            "Date": "Total",
            "Time Slot": "",
            "Total": total_total,
            "Answered": total_answered,
            "Manpower": "",    # No total for manpower
            "AL %": total_al,
            "SL %": total_sl
        })


        # 7️⃣ Abandoned & Disconnection Callback Summary
        callback_query = text("""
            SELECT 
                CASE 
                    WHEN call_status = 'Answer' THEN 'Connected'
                    WHEN call_status = '' OR call_status IS NULL THEN 'Not Connected'
                    ELSE call_status
                END AS status,
                COUNT(*) AS Count
            FROM aband_call_master
            WHERE CompanyName = 'Crystal Eye Centre Private Limited'
            AND DATE(CallDate) = CURDATE()
            AND Callbackdate IS NOT NULL
            GROUP BY status;
        """)

        callback_rows = db.execute(callback_query).mappings().all()
        callback_data = [dict(r) for r in callback_rows]

        # Ensure both rows exist even if empty
        final_callback = [
            {"Abandoned & Disconnection Callback": "Connected", "Count of Abandoned & Disconnection Callback": 0},
            {"Abandoned & Disconnection Callback": "Not Connected", "Count of Abandoned & Disconnection Callback": 0},
        ]

        # Fill values
        for row in callback_data:
            if row["status"] == "Connected":
                final_callback[0]["Count of Abandoned & Disconnection Callback"] = row["Count"]
            elif row["status"] == "Not Connected":
                final_callback[1]["Count of Abandoned & Disconnection Callback"] = row["Count"]

        # Total
        callback_total = (
            final_callback[0]["Count of Abandoned & Disconnection Callback"] +
            final_callback[1]["Count of Abandoned & Disconnection Callback"]
        )


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
        
        def make_agent_table(agent_data):
            if not agent_data:
                return "<p>No Agent Call Summary Available</p>"

            rows = "".join(
                f"""
                <tr>
                    <td style='text-align:center;'>{html.escape(row['Agent Name'])}</td>
                    <td style='text-align:center;'>{row['Calls taken in OB+IB']}</td>
                </tr>
                """
                for row in agent_data
            )

            return f"""
            <h3>APR</h3>
             <table border='1' cellspacing='0' cellpadding='6' style="border-collapse:collapse; font-family:Arial; font-size:14px; width:60%; table-layout:fixed; text-align:center; margin-bottom:10px;">
                <tr style="background:rgb(184, 204, 228); font-weight:bold;">
                    <th style="width:70%;">Agent Name</th>
                    <th style="width:30%;">Calls taken in OB+IB</th>
                </tr>
                {rows}
            </table>
            """
        


        def make_hourly_table(data):
            rows = ""
            for row in data:
                rows += f"""
                <tr>
                    <td>{row['Date']}</td>
                    <td>{row['Time Slot']}</td>
                    <td>{row['Total']}</td>
                    <td>{row['Answered']}</td>
                    <td>{row['Manpower']}</td>
                    <td>{row['AL %']}</td>
                    <td>{row['SL %']}</td>
                </tr>
                """

            return f"""
            <h3>Hourly Call Summary</h3>
            <table border='1' cellspacing='0' cellpadding='6' style="border-collapse:collapse; font-family:Arial; font-size:14px; width:60%; table-layout:fixed; text-align:center; margin-bottom:10px;">
                <tr style="background:rgb(184, 204, 228); font-weight:bold;">
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Total</th>
                    <th>Answered</th>
                    <th>Manpower</th>
                    <th>AL %</th>
                    <th>SL %</th>
                </tr>
                {rows}
            </table>
            """
        

        def make_callback_table(data, total):
            rows = "".join(
                f"""
                <tr>
                    <td style='text-align:center; width:70%;'>{row['Abandoned & Disconnection Callback']}</td>
                    <td style='text-align:center; width:30%;'>{row['Count of Abandoned & Disconnection Callback']}</td>
                </tr>
                """
                for row in data
            )

            return f"""
            <h3>Abandoned & Disconnection Callback</h3>
            <table border='1' cellspacing='0' cellpadding='6' 
                style="border-collapse:collapse; font-family:Arial; font-size:14px; width:60%; text-align:center; margin-bottom:10px;">
                <tr style="background:rgb(184, 204, 228); font-weight:bold;">
                    <th>Abandoned & Disconnection Callback</th>
                    <th>Count of Abandoned & Disconnection Callback</th>
                </tr>
                {rows}
                <tr style="font-weight:bold; background:rgb(184, 204, 228);">
                    <td>Grand Total</td>
                    <td>{total}</td>
                </tr>
            </table>
            """


        html_content = f"""
        <p>Hi,</p>

        {''.join([make_html_table(sec['title'], sec['data'], sec['total']) for sec in sections])}
        {make_agent_table(agent_rows)}
        {make_hourly_table(hourly_data)}
        {make_callback_table(final_callback, callback_total)}

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



