from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db4, get_db2
from email_utils import send_email_with_excel
from corrective_report import generate_corrective_excel
from logger import logger
from call_scenario import send_call_summary
from datetime import date
from reports import generate_outbound_excel
from sla_reports import generate_rl_sl_excel

def run_report_scheduler():

    db_gen = get_db4()
    db: Session = next(db_gen)

    db2_gen = get_db2()
    db2: Session = next(db2_gen)

    try:

        current_time = datetime.now().strftime("%H:%M")

        sql = text("""
            SELECT *
            FROM reportmatrix_master_new
            WHERE report_type = 'daily'
            AND report_value = :time
        """)

        rows = db.execute(sql, {"time": current_time}).fetchall()

        for row in rows:

            data = dict(row._mapping)

            # Skip if send type is not email
            if "email" not in str(data["send_type"]).lower():
                continue

            report_name = data["report"]
            client_id = data["client_id"]
            to_email = data["user_email"]
            cc = data["cc"]

            # Only corrective report for now
            if report_name == "Corrective Report":

                start_date = datetime.today().strftime("%Y-%m-%d")

                excel_stream = generate_corrective_excel(
                    client_id,
                    start_date,
                    db
                )

                send_email_with_excel(
                    to_email=to_email,
                    cc_emails=cc,
                    subject=f"DLF : Complaints Ticket Status ({start_date})",
                    body="""
                    <p>Please find the status of complaint tickets.</p>
                    <br>
                    <p>Best Regards,<br>Team Ispark Data Connect</p>
                    """,
                    excel_stream=excel_stream,
                    filename="Corrective_Report.xlsx"
                )

                print(f"Report sent to {to_email}")
            
            # -------------------------------------------------
            # 2️⃣ Crystal Report (reuse existing API logic)
            # -------------------------------------------------
            elif report_name == "Crystal":

                report_date = date.today()

                logger.info(
                    f"Running Crystal report | client={client_id} | date={report_date}"
                )

                send_call_summary(
                    client_id=client_id,
                    report_date=report_date,
                    db=db,
                    db2=db2
                )

                print(f"Crystal report sent for client {client_id}")
                
            # -------------------------------------------------
            # DIGICOFFER Report (reuse existing API logic)
            # -------------------------------------------------
            elif report_name == "Digicoffer Report":

                start_date = datetime.today().strftime("%Y-%m-%d")

                excel_stream = generate_outbound_excel(
                    client_id,
                    start_date,
                    db,
                    db2
                )

                send_email_with_excel(
                    to_email=to_email,
                    cc_emails=cc,
                    subject=f"DIGICOFFER SOFTWARE PRIVATE LIMITED REPORT ({start_date})",
                    body="""
                    <p>Please find the DIGICOFFER report.</p>
                    <br>
                    <p>Best Regards,<br>Team Ispark Data Connect</p>
                    """,
                    excel_stream=excel_stream,
                    filename=f"DIGICOFFER_SOFTWARE_PRIVATE_LIMITED_Report_{start_date}.xlsx"
                )

                print(f"DIGICOFFER report sent to {to_email}")

            elif report_name == "RL/SL":

                today = datetime.today().strftime("%Y-%m-%d")

                excel_stream = generate_rl_sl_excel(
                    startdate=today,
                    enddate=today,
                    clientID=client_id,
                    sd_type="All",
                    db1=db,
                    db2=db2
                )

                send_email_with_excel(
                    to_email=to_email,
                    cc_emails=cc,
                    subject=f"RL/SL Report ({today})",
                    body="""
                    <p>Please find attached RL/SL Report.</p>
                    <br>
                    <p>Best Regards,<br>Team Ispark Data Connect</p>
                    """,
                    excel_stream=excel_stream,
                    filename="RL_SL_Report.xlsx"
                )

                print(f"RL_SL_Report sent to {to_email}")
            

    except Exception as e:
        print(f"Scheduler error: {str(e)}")

    finally:
        db.close()
        db2.close()