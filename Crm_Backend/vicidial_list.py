from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from typing import Optional, List
from pydantic import BaseModel ,create_model
from datetime import date, datetime
from dotenv import load_dotenv
import pymysql, os

load_dotenv()


router = APIRouter()


class Lead(BaseModel):
    phone_number: str
    first_name: str
    middle_initial: Optional[str] = None
    last_name: str
    email: str
    address1: str
    gmt_offset_now: Optional[str] = None
    address2: Optional[str] = None
    address3: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country_code: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    alt_phone: Optional[str] = None
    security_phrase: Optional[str] = None
    comments: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    called_since_last_reset: Optional[str] = None
    phone_code: Optional[int] = None


@router.post("/receive-data/")
def insert_leads(leads: List[Lead]):
    if not leads:
        raise HTTPException(status_code=400, detail="No leads provided")

    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            db=os.getenv("DB_NAME"),
            autocommit=True
        )
        with conn.cursor() as cur:
            insert_query = """
                INSERT INTO vicidial_list (
                    entry_date, phone_number, first_name, middle_initial, last_name, email,
                    address1, address2, address3, city, state, province, postal_code,
                    country_code, gender, date_of_birth, alt_phone, security_phrase,
                    comments, title, status, called_since_last_reset, phone_code, list_id,
                    gmt_offset_now
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s
                )
            """
            for lead in leads:
                entry_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                list_id = 88888888

                values = [
                    entry_date,
                    lead.phone_number,
                    lead.first_name,
                    lead.middle_initial,
                    lead.last_name,
                    lead.email,
                    lead.address1,
                    lead.address2 or " ",
                    lead.address3 or " ",
                    lead.city or " ",
                    lead.state or " ",
                    lead.province or " ",
                    lead.postal_code or " ",
                    lead.country_code or " ",
                    lead.gender or " ",
                    lead.date_of_birth or " ",
                    lead.alt_phone or " ",
                    lead.security_phrase or " ",
                    lead.comments or " ",
                    lead.title or " ",
                    lead.status or " ",
                    lead.called_since_last_reset or " ",
                    lead.phone_code or " ",
                    list_id,
                    lead.gmt_offset_now or " "
                ]

                cur.execute(insert_query, values)

        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

    return {
        "message": f"{len(leads)} leads inserted successfully"
    }


@router.get("/export/")
def get_leads(start_date: date = Query(None), end_date: date = Query(None)):
    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            db=os.getenv("DB_NAME"),
            autocommit=True,
            cursorclass=pymysql.cursors.DictCursor  # returns rows as dictionaries
        )
        with conn.cursor() as cur:
            base_query = "SELECT * FROM vicidial_list WHERE 1=1"
            values = []

            if start_date:
                base_query += " AND DATE(entry_date) >= %s"
                values.append(start_date)
            if end_date:
                base_query += " AND DATE(entry_date) <= %s"
                values.append(end_date)

            cur.execute(base_query, values)
            leads = cur.fetchall()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        try:
            conn.close()
        except:
            pass

    return leads