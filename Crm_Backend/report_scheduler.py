from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db4
from email_utils import send_email_with_excel
from corrective_report import generate_corrective_excel


def run_report_scheduler():

    db_gen = get_db4()
    db: Session = next(db_gen)

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

    except Exception as e:
        print(f"Scheduler error: {str(e)}")

    finally:
        db.close()