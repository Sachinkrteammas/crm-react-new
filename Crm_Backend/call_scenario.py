from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import date
from database import get_db4, get_db2
from email_utils import send_email
import os, html
from datetime import datetime
from email_utils import send_email_with_excel
from logger import logger

router = APIRouter()




def format_date_with_suffix(date_obj):
    day = date_obj.day

    # Get suffix
    if 11 <= day <= 13:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")

    return f"{day}{suffix}{date_obj.strftime('%b')}'{date_obj.strftime('%Y')}"


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
                COUNT(v.user) AS `Total Calls Taken - IB`
            FROM vicidial_agent_log v
            JOIN vicidial_users u ON v.user = u.user
            WHERE DATE(v.event_time) = CURDATE()
              AND v.campaign_id IN ('Cryst002')
              AND v.lead_id IS NOT NULL
              AND length(v.status)>0 
            GROUP BY v.user
        """)

        agent_rows = db2.execute(query5).mappings().all()
        agent_rows = [dict(r) for r in agent_rows]



        # 6️⃣ Hourly Call Summary (Updated Query)
        campaign_ids = ["CrystalEyeCentr00000", "Cryst000"]
        client_ids = [str(client_id)]

        # 6️⃣ Hourly Call Summary
        hourly_query = text(f"""
            SELECT
                DATE(t2.call_date) AS `Date`,
                HOUR(t2.call_date) AS `Time Slot`,
                COUNT(*) AS Total,
                SUM(IF(t2.user!='VDCL',1,0)) AS Answered,
                COUNT(DISTINCT IF(t2.user!='VDCL', t2.user, NULL)) AS Manpower,
                ROUND(SUM(IF(t2.user!='VDCL',1,0))/COUNT(*)*100,2) AS `AL %`,
                ROUND(IFNULL(SUM(IF(t2.user!='VDCL' AND t2.queue_seconds <= 20,1,0))/ NULLIF(SUM(IF(t2.user!='VDCL',1,0)), 0) * 100,0),2) AS `SL %`
            FROM asterisk.vicidial_closer_log t2
            LEFT JOIN vicidial_agent_log t1 ON t1.uniqueid = t2.uniqueid AND t1.user = t2.user
            WHERE DATE(t2.call_date) = '{report_date}'
              AND t2.campaign_id IN ({','.join([f"'{c}'" for c in campaign_ids])})
              AND t2.lead_id IS NOT NULL
            GROUP BY HOUR(t2.call_date);
        """)

        hourly_rows = db2.execute(hourly_query).mappings().all()
        hourly_data = [dict(r) for r in hourly_rows]

        # Fetch RL counts separately from db (aband_call_master)
        rl_query = text(f"""
            SELECT 
                HOUR(calldate) AS hour_slot,
                COUNT(*) AS RL
            FROM aband_call_master
            WHERE ClientId IN ({','.join([f"'{c}'" for c in client_ids])})
            AND call_status='answer'
            AND DATE(calldate) = '{report_date}'
            GROUP BY HOUR(calldate)
        """)

        rl_result = db.execute(rl_query).mappings().all()

        # RL_total must be SUM of all hourly RLs
        RL_total = sum(r["RL"] for r in rl_result)

        # Convert to {hour: RL_count}
        rl_map = {r["hour_slot"]: r["RL"] for r in rl_result}

        # Compute per-hour RL % and add to each row
        for row in hourly_data:
            hour = row["Time Slot"]
            Total = row["Total"] or 0
            Answered = row["Answered"] or 0

            # Get RL for this hour
            RL_hour = rl_map.get(hour, 0)

            # RL = Answered + Abandoned (from aband_call_master)
            RL_count = Answered + RL_hour

            # Save RL count
            row["RL"] = RL_count

            # RL %
            row["RL %"] = round((RL_count / Total) * 100, 2) if Total else 0


        # Compute totals
        total_total = sum(row.get("Total") or 0 for row in hourly_data)
        total_answered = sum(row.get("Answered") or 0 for row in hourly_data)
 
        total_al = round((total_answered / total_total) * 100, 2) if total_total else 0
        weighted_sl_num = sum(((row.get("SL %") or 0) * (row.get("Answered") or 0)) for row in hourly_data)
        total_sl = round(weighted_sl_num / total_answered, 2) if total_answered else 0
        total_rl = round((RL_total + total_answered) / total_total * 100, 2) if total_total else 0

        # Add bottom total row
        hourly_data.append({
            "Date": "Total",
            "Time Slot": "",
            "Total": total_total,
            "Answered": total_answered,
            "Manpower": "",
            "AL %": f"{total_al} %",
            "SL %": f"{total_sl} %",
            "RL %": f"{total_rl} %"
        })


        # 7️⃣ Abandoned & Disconnection Callback Summary
        callback_query = text("""
            SELECT
                SUM(CASE WHEN mcl.id IS NOT NULL THEN 1 ELSE 0 END) AS Connected,
                SUM(CASE WHEN mcl.id IS NULL THEN 1 ELSE 0 END) AS `Not Connected`
            FROM
                asterisk.vicidial_log t2
                LEFT JOIN asterisk.manual_call_log mcl
                    ON mcl.uniqueid = t2.uniqueid
                    AND RIGHT(mcl.phone_number,10) = RIGHT(t2.phone_number,10)
            WHERE
                DATE(t2.call_date)=CURDATE()
                AND t2.campaign_id ='Cryst002'
                AND t2.list_id IN ('998','2001')
                AND t2.lead_id IS NOT NULL;
        """)

        callback_rows = db2.execute(callback_query).mappings().all()
        callback_data = [dict(r) for r in callback_rows]

        vicidial_query = text("""
            SELECT 
                SUM(IF(t2.user='VDAD' OR t2.end_epoch IS NULL OR t3.talk_sec IS NULL OR t3.talk_sec=0 ,1,0)) AS Notconnected,
                SUM(IF(t2.user!='VDAD' AND t2.end_epoch IS NOT NULL AND t3.talk_sec IS NOT NULL AND t3.talk_sec!=0  ,1,0)) AS Connected
            FROM vicidial_log t2
            LEFT JOIN vicidial_agent_log t3 ON t2.uniqueid=t3.uniqueid
            WHERE t2.campaign_id='Cryst000'
            AND DATE(call_date) = CURDATE();
        """)

        vicidial_row = db2.execute(vicidial_query).mappings().first()
        vic_connected = vicidial_row.get("Connected", 0) or 0
        vic_notconnected = vicidial_row.get("Notconnected", 0) or 0

        # Ensure both rows exist even if empty
        final_callback = [
            {"Abandoned & Disconnection Callback": "Connected", "Count of Abandoned & Disconnection Callback": 0},
            {"Abandoned & Disconnection Callback": "Not Connected", "Count of Abandoned & Disconnection Callback": 0},
        ]

        # Fill values correctly (aggregate query returns a single row)
        if callback_data:
            row = callback_data[0]

            final_callback[0]["Count of Abandoned & Disconnection Callback"] = row.get("Connected", 0) or 0
            final_callback[1]["Count of Abandoned & Disconnection Callback"] = row.get("Not Connected", 0) or 0


        # ✅ Add Vicidial Counts
        final_callback[0]["Count of Abandoned & Disconnection Callback"] += vic_connected
        final_callback[1]["Count of Abandoned & Disconnection Callback"] += vic_notconnected

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
                    <td style='text-align:center;'>{row['Total Calls Taken - IB']}</td>
                </tr>
                """
                for row in agent_data
            )

            return f"""
            <h3>APR</h3>
             <table border='1' cellspacing='0' cellpadding='6' style="border-collapse:collapse; font-family:Arial; font-size:14px; width:60%; table-layout:fixed; text-align:center; margin-bottom:10px;">
                <tr style="background:rgb(184, 204, 228); font-weight:bold;">
                    <th style="width:70%;">Agent Name</th>
                    <th style="width:30%;">Total Calls Taken - IB</th>
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
                    <td>{row.get('RL %', '')}</td>
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
                    <th>RL %</th>
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

        # # 📧 Send email
        # recipient = os.getenv("EMAIL_RECEIVER")
        # cc_recipient = os.getenv("EMAIL_CC")

        # if not recipient:
        #     raise HTTPException(status_code=500, detail="EMAIL_RECEIVER not set in .env")

        # recipient_list = [email.strip() for email in recipient.split(",") if email.strip()]
        # cc_list = [email.strip() for email in cc_recipient.split(",") if email.strip()] if cc_recipient else []

        current_time = datetime.now().strftime("%H:%M")

        # Fetch email configuration from reportmatrix_master_new
        email_query = text("""
            SELECT user_email, cc
            FROM reportmatrix_master_new
            WHERE report = 'Crystal'
            AND client_id = :client_id
            AND report_type = 'daily'
            AND report_value = :time
        """)

        email_row = db.execute(email_query, {"client_id": client_id, "time": current_time}).mappings().first()

        if not email_row:
            logger.info(f"Email configuration not found for Crystal report")
            raise HTTPException(status_code=404, detail="Email configuration not found for Crystal report")

        # Extract emails
        recipient = email_row["user_email"]
        cc_recipient = email_row["cc"]

        recipient_list = [email.strip() for email in recipient.split(",") if email.strip()]
        cc_list = [email.strip() for email in cc_recipient.split(",") if email.strip()] if cc_recipient else []

        formatted_date = format_date_with_suffix(report_date)

        # # ✅ Send ONCE (No loop needed)
        # send_email(
        #     to_emails=recipient_list,
        #     cc_emails=cc_list,
        #     subject=f"CL Crystal EOD Report_{formatted_date}",
        #     html_content=html_content
        # )

        logger.info(f"send_email_with_excel function called.")
        send_email_with_excel(
            to_email=recipient_list,
            cc_emails=cc_list,
            subject=f"CL Crystal EOD Report_{formatted_date}",
            body=html_content
        )
        logger.info(f"Successfully executed send_email_with_excel function.")



        # Sends message for multiple emails.
        return {
            "message": f"Email sent successfully to {', '.join(recipient_list)}"
               + (f" with CC to {', '.join(cc_list)}" if cc_list else ""),
            "client_id": client_id,
            "report_date": str(report_date),
            "sections": sections
        }


        # ✅ Return preview response also
        return {
            "message": f"Email sent successfully to {recipient}",
            "client_id": client_id,
            "report_date": str(report_date),
            "sections": sections
        }

    except Exception as e:
        logger.info(f"Failed : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



