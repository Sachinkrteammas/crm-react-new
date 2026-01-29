from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date, datetime, timedelta
from database import get_db2, get_db4  # adjust to your actual import path
from call_scenario import send_call_summary  # adjust path
from sqlalchemy.orm import Session
import os
from sqlalchemy import text
from daily_consume import BillingDailyRequest, compute_ib_consumption
from auth import router as auth_router
from reports import router as reports_router
from core_api import router as core_api
from call_master import router as call_master_router
from dashboard import router as dashboard_router
from agents import router as agents_router
from real_time_agents import router as real_time_agents_router
from plan import router as plan_router
from company import router as company_router
from dynamic_menu import router as dynamic_menu_router
from in_call_management import router as in_call_management_router
from ecr import router as ecr_router
from field_master import router as field_master_router
from close_field import router as close_field_router
from vicidial_list import router as vicidial_list_router
from templates import router as templates_router
from fortum_dashboard import router as fortum_dashboard_router
from outbound_dashboard import router as outbound_dashboard_router
from call_scenario import router as call_scenario_router
from Login_log import router as Login_log_router
from auto_tagging import router as auto_tagging_router
from create_manual_call import router as create_manual_call_router
from manage_campaigns import router as manage_campaigns_router
from manage_allocations import router as manage_allocations_router
from manage_out_call_required_fields import router as manage_out_call_required_fields_router 
from out_call_manage_scenarios import router as out_call_manage_scenarios_router
from manage_out_call_mis_report import router as manage_out_call_mis_report_router
from manage_out_call_close_fields import router as manage_out_call_close_fields_router
from channel_utilizations import router as channel_utilizations_router
from didlogs_reports import router as didlogs_reports_router
from agents_productivity_reports import router as agents_productivity_reports_router
from sla_reports import router as sla_reports_router
from did_mapping import router as did_mapping_router
from campaigns_mapping import router as campaigns_mapping_router
# ---------------- Scheduler Function ----------------
from schedular import scheduled_sla_email  # Import only the function
from daily_consume import router as daily_consume_router
from logincreation_master import router as logincreation_master_router
from corrective_report import router as corrective_report_router
from allocate_plan import router as allocate_plan_router
from reallocate_plan import router as reallocate_plan_router
from forgot_password import router as forgot_password_router
from usage_summary import router as usage_summary_router
from statement_summary import router as statement_summary_router
from invoice import router as invoice_router

from new_outbound_dashboard import router as new_outbound_dashboard
from customer_date_wise_density_of_calls import router as customer_date_wise_density_of_calls_router
from SLA_client_wise import router as SLA_client_wise_router
from skilled_reports import router as skilled_reports_router
from Agent_Apr import router as Agent_Apr_router
from anestwatta import router as anest_dashboard_router






app = FastAPI(title="CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Register all routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(reports_router, prefix="/report", tags=["Reports"])
app.include_router(core_api, prefix="/core_api", tags=["core_api"])
app.include_router(call_master_router, prefix="/call", tags=["Call Master"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Home2"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(real_time_agents_router, prefix="/real_time_agents", tags=["Real Time Agents"])
app.include_router(plan_router, prefix="/plan", tags=["Plan Management"])
app.include_router(company_router, prefix="/company", tags=["Company Management"])
app.include_router(dynamic_menu_router, prefix="/dynamic_menu", tags=["Dynamic Menu"])
app.include_router(in_call_management_router, prefix="/in_call", tags=["In Call Management"])
app.include_router(ecr_router)
app.include_router(field_master_router)
app.include_router(close_field_router)
app.include_router(vicidial_list_router, prefix="/dialer", tags=["Vicidial List"])
app.include_router(templates_router, tags=["Templates"])
app.include_router(fortum_dashboard_router, tags=["Fortum Dashboard"])
app.include_router(outbound_dashboard_router, tags=["OutBound Dashboard"])
app.include_router(call_scenario_router, tags=["Call Scenario"])
app.include_router(Login_log_router, tags=["Login Log"])
app.include_router(auto_tagging_router, tags=["Auto Tagging"])
app.include_router(create_manual_call_router, tags=["Create Manual Call"])
app.include_router(manage_campaigns_router)
app.include_router(manage_allocations_router)
app.include_router(manage_out_call_required_fields_router)
app.include_router(out_call_manage_scenarios_router)
app.include_router(manage_out_call_mis_report_router)
app.include_router(manage_out_call_close_fields_router)
app.include_router(channel_utilizations_router)
app.include_router(didlogs_reports_router)
app.include_router(agents_productivity_reports_router)
app.include_router(sla_reports_router)
app.include_router(did_mapping_router)
app.include_router(campaigns_mapping_router)
app.include_router(daily_consume_router, tags=["Daily Consume"])
app.include_router(logincreation_master_router, tags=["Login Creation Master"])
app.include_router(corrective_report_router, tags=["Corrective Report"])
app.include_router(allocate_plan_router, tags=["Allocate Plan"])
app.include_router(reallocate_plan_router, tags=["Re Allocate Plan"])
app.include_router(forgot_password_router, tags=["Forgot Password"])
app.include_router(usage_summary_router, tags=["Usage Summary"])
app.include_router(statement_summary_router, tags=["Statement Summary"])
app.include_router(invoice_router, tags=["Invoice"])
app.include_router(new_outbound_dashboard, tags=["New Outbound Dashboard"])
app.include_router(customer_date_wise_density_of_calls_router, tags=["Customere Date wise density"])
app.include_router(SLA_client_wise_router, tags=["SLA Client Wise"])
app.include_router(skilled_reports_router, tags=["Skilled Reports"])
app.include_router(Agent_Apr_router, tags=["Agent APR"])
app.include_router(anest_dashboard_router)



# ✅ Create a function that runs the API logic automatically
def scheduled_call_summary():
    try:
        # Create a DB session manually since we're outside FastAPI dependency injection
        db_gen = get_db4()
        db: Session = next(db_gen)

        # DB connection for vicidial tables
        db2_gen = get_db2()
        db2 = next(db2_gen)

        client_id = int(os.getenv("DEFAULT_CLIENT_ID", 1))  # fallback to 1
        report_date = date.today()

        print(f"Running scheduled report for client {client_id} on {report_date}")
        send_call_summary(client_id=client_id, report_date=report_date, db=db, db2=db2)
    except Exception as e:
        print("Error in scheduled job:", e)
    finally:
        db_gen.close()
        db2_gen.close()


# -------------------------------------------------------
# DAILY BILLING SCHEDULER (runs at 3 AM)
# -------------------------------------------------------
def scheduled_daily_billing():
    try:
        # Manual DB session
        db_gen = get_db4()
        db: Session = next(db_gen)

        # 1️⃣ Fetch all eligible DD clients
        sql = text("""
            SELECT rm.company_id
            FROM registration_master rm
            JOIN exp_opening_client eoc ON rm.company_id = eoc.ClientId
            WHERE rm.STATUS = 'A' AND rm.is_dd_client = 1
        """)

        rows = db.execute(sql).mappings().fetchall()
        client_ids = [r["company_id"] for r in rows]

        if not client_ids:
            print("⚠ No DD clients found for scheduler")
            return

        # 2️⃣ Compute billing date = yesterday
        billing_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        #billing_date = '2026-01-13'

        print(f"Running daily billing scheduler on {billing_date} → Clients: {client_ids}")

        # 3️⃣ Call your API logic exactly as it is
        for cid in client_ids:
            print(f"→ Billing client: {cid}")

            req = BillingDailyRequest(
                company_id=cid,
                billing_date=billing_date
            )

            db2_gen = None
            try:
                db2_gen = get_db2()
                db2 = next(db2_gen)

                # This calls your FULL existing logic (no changes)
                compute_ib_consumption(
                    request=req,
                    db=db,
                    db2=db2
                )
            
            finally:
                if db2_gen:
                    db2_gen.close()

    except Exception as e:
        print("Error in daily billing scheduler:", e)

    finally:
        try:
            db_gen.close()
        except:
            pass




# ✅ Create scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_call_summary, "cron", hour=21, minute=30)  # every day 9:30 PM
#scheduler.add_job(scheduled_daily_billing, "cron", hour=3, minute=0)   # every day 3:00 AM
scheduler.start()

@app.on_event("startup")
def on_startup():
    print("🚀 Scheduler started — Call Summary job will run daily at 9:30 PM")
    print("🚀 Scheduler started — Daily Billing active will run daily at 3:00 AM")

@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()
