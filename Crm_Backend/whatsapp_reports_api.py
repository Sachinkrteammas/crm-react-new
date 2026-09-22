from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
import threading

from whatsapp_database import (
    get_wa_db, get_wa_session,
    WhatsAppReportConfig, WhatsAppReportLog
)
from whatsapp_report_engine import run_report, REPORT_HANDLERS
from auth import verify_token
from logger import logger

router = APIRouter()


class ReportActionRequest(BaseModel):
    report_key: str


class ReportUpdateRequest(BaseModel):
    report_key: str
    schedule_hours: Optional[int] = None
    group_id: Optional[str] = None
    is_active: Optional[bool] = None


def _ensure_all_reports_in_db(db: Session):
    """Engine me jo reports hain, unke liye DB row ensure karo."""
    for key, cfg in REPORT_HANDLERS.items():
        existing = db.query(WhatsAppReportConfig).filter_by(report_key=key).first()
        if not existing:
            db.add(WhatsAppReportConfig(
                report_key=key,
                report_name=cfg["name"],
                group_id=cfg["default_group"],
                schedule_hours=cfg["default_schedule_hours"],
                is_active=False
            ))
    db.commit()


@router.get("/list")
def list_reports(db: Session = Depends(get_wa_db), user=Depends(verify_token)):
    _ensure_all_reports_in_db(db)
    configs = db.query(WhatsAppReportConfig).all()
    return [
        {
            "report_key": c.report_key,
            "report_name": c.report_name,
            "is_active": c.is_active,
            "schedule_hours": c.schedule_hours,
            "group_id": c.group_id,
            "last_run": c.last_run
        } for c in configs
    ]


@router.post("/run")
def run_now(req: ReportActionRequest, db: Session = Depends(get_wa_db), user=Depends(verify_token)):
    if req.report_key not in REPORT_HANDLERS:
        raise HTTPException(404, "Report not found")

    cfg = db.query(WhatsAppReportConfig).filter_by(report_key=req.report_key).first()
    if not cfg:
        raise HTTPException(404, "Report config not found")

    cfg.is_active = True
    cfg.last_run = datetime.utcnow()
    db.commit()
    group_id = cfg.group_id
    report_key = req.report_key

    def _bg():
        bg_db = get_wa_session()
        try:
            run_report(report_key, group_id=group_id)
            bg_db.add(WhatsAppReportLog(
                report_key=report_key, status="SUCCESS",
                message="Report sent to WhatsApp"
            ))
            bg_db.commit()
        except Exception as e:
            logger.error(f"Report failed ({report_key}): {e}", exc_info=True)
            bg_db.add(WhatsAppReportLog(
                report_key=report_key, status="FAILED",
                message=str(e)[:490]
            ))
            bg_db.commit()
        finally:
            bg_db.close()

    threading.Thread(target=_bg, daemon=True).start()
    return {"status": "started", "message": "Report is being generated"}


@router.post("/stop")
def stop_report(req: ReportActionRequest, db: Session = Depends(get_wa_db), user=Depends(verify_token)):
    cfg = db.query(WhatsAppReportConfig).filter_by(report_key=req.report_key).first()
    if not cfg:
        raise HTTPException(404, "Report not found")
    cfg.is_active = False
    db.commit()
    return {"status": "stopped", "message": f"{cfg.report_name} stopped"}


@router.post("/update")
def update_report(req: ReportUpdateRequest, db: Session = Depends(get_wa_db), user=Depends(verify_token)):
    cfg = db.query(WhatsAppReportConfig).filter_by(report_key=req.report_key).first()
    if not cfg:
        raise HTTPException(404, "Report not found")

    if req.schedule_hours is not None:
        if req.schedule_hours < 1 or req.schedule_hours > 168:
            raise HTTPException(400, "Schedule must be between 1 and 168 hours")
        cfg.schedule_hours = req.schedule_hours

    if req.group_id is not None and req.group_id.strip():
        cfg.group_id = req.group_id.strip()

    if req.is_active is not None:
        cfg.is_active = req.is_active

    db.commit()
    db.refresh(cfg)

    return {
        "status": "updated",
        "report_key": cfg.report_key,
        "schedule_hours": cfg.schedule_hours,
        "group_id": cfg.group_id,
        "is_active": cfg.is_active
    }


@router.get("/logs")
def get_logs(report_key: str = None, db: Session = Depends(get_wa_db), user=Depends(verify_token)):
    q = db.query(WhatsAppReportLog)
    if report_key:
        q = q.filter_by(report_key=report_key)
    logs = q.order_by(WhatsAppReportLog.timestamp.desc()).limit(50).all()
    return [
        {
            "report_key": l.report_key,
            "status": l.status,
            "message": l.message,
            "timestamp": l.timestamp
        } for l in logs
    ]