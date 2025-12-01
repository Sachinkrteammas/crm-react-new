# # # schedular.py
# from apscheduler.schedulers.background import BackgroundScheduler
# from datetime import date
# from database import get_db2
# from sla_reports import generate_sla_excel_bytes
# from utils.email_manager import send_sla_report_email

# def scheduled_sla_email():
#     try:
#         print("📬 Running SLA email scheduler...")

#         db_gen = get_db2()
#         db = next(db_gen)

#         today = date.today().strftime("%Y-%m-%d")
        
#         # Replace with REAL campaign IDs
#         campaign_ids = ["CrystalEyeCentr00000"]  # Example

#         excel_stream = generate_sla_excel_bytes(
#             start_date=today,
#             end_date=today,
#             campaign_ids=campaign_ids,
#             db=db
#         )

#         send_sla_report_email(excel_stream)
#         print(f"✅ SLA report sent successfully for {today}")

#     except Exception as e:
#         print(f"❌ Scheduled SLA email failed: {e}")

#     finally:
#         db_gen.close()

# scheduler = BackgroundScheduler()
# scheduler.add_job(scheduled_sla_email, "cron", hour=21, minute=30)
# scheduler.start()

# print("🚀 Scheduler started. SLA email every day @ 9:30 PM")







from datetime import date
from database import get_db2
from sla_reports import generate_sla_excel_bytes
from utils.email_manager import send_sla_report_email

def scheduled_sla_email():
    try:
        print("📬 Running SLA email scheduler...")

        db_gen = get_db2()
        db = next(db_gen)

        today = date.today().strftime("%Y-%m-%d")
        campaign_ids = ["CrystalEyeCentr00000"]

        excel_stream = generate_sla_excel_bytes(
            start_date=today,
            end_date=today,
            campaign_ids=campaign_ids,
            db=db
        )

        send_sla_report_email(excel_stream)
        print(f"✅ SLA report sent successfully for {today}")

    except Exception as e:
        print(f"❌ Scheduled SLA email failed: {e}")

    finally:
        db_gen.close()
