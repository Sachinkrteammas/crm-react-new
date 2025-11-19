from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import date
from database import get_db4  # adjust to your actual import path
from call_scenario import send_call_summary  # adjust path
from sqlalchemy.orm import Session
import os
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





# ✅ Create a function that runs the API logic automatically
def scheduled_call_summary():
    try:
        # Create a DB session manually since we're outside FastAPI dependency injection
        db_gen = get_db4()
        db: Session = next(db_gen)

        client_id = int(os.getenv("DEFAULT_CLIENT_ID", 1))  # fallback to 1
        report_date = date.today()

        print(f"Running scheduled report for client {client_id} on {report_date}")
        send_call_summary(client_id=client_id, report_date=report_date, db=db)
    except Exception as e:
        print("Error in scheduled job:", e)
    finally:
        db_gen.close()


# ✅ Create scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_call_summary, "cron", hour=21, minute=00)  # every day 9:00 PM
scheduler.start()

@app.on_event("startup")
def on_startup():
    print("🚀 Scheduler started — Call Summary job will run daily at 9:00 PM")

@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()
