import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
load_dotenv()

SQL_DB_URL = os.getenv("SQL_DB_URL")
SQL_DB_URL2 = os.getenv("SQL_DB_URL2")
SQL_DB_URL3 = os.getenv("SQL_DB_URL3")

engine2 = create_engine(SQL_DB_URL2)
SessionLocal2 = sessionmaker(bind=engine2)

def get_db2():
    db = SessionLocal2()
    try:
        yield db
    finally:
        db.close()


engine4 = create_engine(SQL_DB_URL)
SessionLocal4 = sessionmaker(bind=engine4)

def get_db4():
    db = SessionLocal4()
    try:
        yield db
    finally:
        db.close()

engine3 = create_engine(SQL_DB_URL3)
SessionLocal3 = sessionmaker(bind=engine3)

def get_db3():
    db = SessionLocal3()
    try:
        yield db
    finally:
        db.close()


# ---------- Raw Access (Better than yield-based) ----------
def get_engine2():
    return engine2

def get_engine4():
    return engine4

def get_engine3():
    return engine3