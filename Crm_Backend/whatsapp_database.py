import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime

load_dotenv

WHATSAPP_DB_URL = os.getenv("SQL_DB_URL")

if not WHATSAPP_DB_URL:
    raise Exception(" WHATSAPP_DB_URL not found in .env file")

engine_wa = create_engine(WHATSAPP_DB_URL, echo=False, pool_pre_ping=True)
SessionLocalWA = sessionmaker(bind=engine_wa, autoflush=False, autocommit=False)
BaseWA = declarative_base()


class WhatsAppReportConfig(BaseWA):
    __tablename__ = "whatsapp_report_configs"

    id = Column(Integer, primary_key=True, index=True)
    report_key = Column(String(100), unique=True, nullable=False)
    report_name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=False)
    schedule_hours = Column(Integer, default=2)
    group_id = Column(String(200), nullable=True)
    last_run = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WhatsAppReportLog(BaseWA):
    __tablename__ = "whatsapp_report_logs"

    id = Column(Integer, primary_key=True, index=True)
    report_key = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    message = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


def get_wa_db():
    db = SessionLocalWA()
    try:
        yield db
    finally:
        db.close()


def get_wa_session():
    return SessionLocalWA()


def test_connection():
    try:
        with engine_wa.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        print(" WhatsApp DB connected successfully")
        return True
    except Exception as e:
        print(f" WhatsApp DB connection failed: {e}")
        return False


if __name__ == "__main__":
    test_connection()