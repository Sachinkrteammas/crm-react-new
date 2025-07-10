from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# DB Setup
engine = create_engine("mysql+pymysql://root:dial%40mas123@172.12.10.22/db_dialdesk?charset=utf8mb4")

# Bcrypt setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fetch and hash all
with engine.connect() as conn:
    result = conn.execute(text("SELECT company_id, password FROM registration_master"))
    for row in result.mappings():
        plain_pw = row["password"]
        hashed_pw = pwd_context.hash(plain_pw)

        update_stmt = text("UPDATE registration_master SET password = :hpw WHERE company_id = :company_id")
        conn.execute(update_stmt, {"hpw": hashed_pw, "company_id": row["company_id"]})
    conn.commit()

print("✅ Password migration completed.")
