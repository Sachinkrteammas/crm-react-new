from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db4
from schemas import LoginRequest, LoginResponse, CallMasterRecord
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from auth_utils import get_current_user
from sqlalchemy import text
from fastapi.security import OAuth2PasswordBearer


router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)



# Step 1: Login Api for Used User_type for Verify User type 
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db4)):
    # Step 1: Superadmin case
    query_user = text("SELECT * FROM tbl_user WHERE Email = :email AND user_active = '1'")
    user = db.execute(query_user, {"email": request.email}).mappings().fetchone()

    if user and verify_password(request.password, user["hash_password"]):
        if user["user_type"] == "Super-Admin":
            token = create_access_token({"sub": user["Email"]})
            return {
                "message": "Login successful (Superadmin)",
                "access_token": token,
                "company_id": None,   # ✅ allowed now
                "auth_person": user["name"],
                "user_type": "Super-Admin"
            }

    # ✅ Admin case (same flow as Superadmin)
        elif user["user_type"] in ["Admin", "admin"]:
            print("Admin user logged in",user["user_type"] )
            token = create_access_token({"sub": user["Email"]})
            return {
                "message": "Login successful (Admin)",
                "access_token": token,
                "company_id": None,   
                "auth_person": user["name"],
                "user_type": "Admin"
            }
        

    # Step 2: Client/Admin case
    # 🔹 1. Try from logincreation_master first
    query_login = text("SELECT * FROM logincreation_master WHERE username = :username")
    login_user = db.execute(query_login, {"username": request.email}).mappings().fetchone()

    if login_user and (request.password == login_user["password2"]):
        token = create_access_token({"sub": login_user["username"]})
        return {
            "message": "Login successful (Client - logincreation_master)",
            "access_token": token,
            "company_id": login_user["create_id"],
            "auth_person": login_user["name"],
            "user_type": "Client",
            "name": login_user["name"],
            "outbound_access": login_user["outbound_access"] 
        }
    
    # 🔹 2. If not found, try registration_master
    query_reg = text("SELECT * FROM registration_master WHERE email = :email")
    reg = db.execute(query_reg, {"email": request.email}).mappings().fetchone()

    if reg and verify_password(request.password, reg["password"]):
        token = create_access_token({"sub": reg["email"]})
        return {
            "message": "Login successful",
            "access_token": token,
            "company_id": reg["company_id"],   # ✅ required for clients/admins
            "auth_person": reg["company_name"],
            "user_type": "Client"  # or "Admin" if you want to separate
        }

    # Step 3: Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Invalid credentials"
    )



# @router.get("/clients")
# def list_clients(
#     db: Session = Depends(get_db4),
#     current_user: dict = Depends(get_current_user)
# ):
#     if current_user.get("role") != "Super-Admin":
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Only Super-Admin can access this."
#         )

#     query = text("SELECT company_id, company_name FROM registration_master")
#     clients = db.execute(query).mappings().fetchall()
#     return {"clients": [dict(client) for client in clients]}



@router.get("/call-master/", response_model=List[CallMasterRecord])
def get_calls_by_client(client_id: int = Query(...), db: Session = Depends(get_db4)):
    try:
        query = text("SELECT * FROM call_master WHERE client_id = :client_id LIMIT 3")
        result = db.execute(query, {"client_id": client_id}).mappings().fetchall()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
def get_profile(current_user: str = Depends(get_current_user)):
    return {"message": f"Authenticated as {current_user}"}



# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/call/oauth2/token")

# def verify_token(token: str = Depends(oauth2_scheme)):
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        client_id: str = payload.get("sub")
        if client_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return client_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )



# ✅ API: Search by Phone
@router.get("/search-by-phone")
def search_by_phone(phone: str = Query(...), db: Session = Depends(get_db4)):
    query = text("""
        SELECT *
        FROM check_out_db
        WHERE phone = :phone
    """)

    result = db.execute(query, {"phone": phone}).fetchall()

    if not result:
        return {"message": "No data found"}

    # Convert to dict
    data = [dict(row._mapping) for row in result]

    return {
        "count": len(data),
        "data": data
    }


from fastapi import FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import pandas as pd
import io
import math

def raw(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val




@router.post("/upload-raw-excel")
async def upload_raw_excel(file: UploadFile = File(...), db: Session = Depends(get_db4)):

    contents = await file.read()

    # ❗ No dtype=str → keep Excel original types
    filename = file.filename.lower()

    if filename.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")

    elif filename.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(contents), engine="xlrd")

    elif filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(contents))

    else:
        return {"error": "Unsupported file format"}

    # ❗ Only normalize column names (required to match DB)
    df.columns = [col.strip().replace(" ", "_") for col in df.columns]

    df = df.where(pd.notnull(df), None)

    inserted = 0

    for _, row in df.iterrows():

        # ✅ Convert entire row: NaN → None
        row = row.where(pd.notnull(row), None)

        query = text("""
            INSERT INTO check_out_db (
                NAME, Email, Financial_Status, Paid_at, Fulfillment_Status, Fulfilled_at,
                Accepts_Marketing, Currency, Subtotal, Shipping, Taxes, Total,
                Discount_Code, Discount_Amount, Shipping_Method, Created_at,
                Lineitem_quantity, Lineitem_name, Lineitem_price, Lineitem_compare_at_price,
                Lineitem_sku, Lineitem_requires_shipping, Lineitem_taxable,
                Lineitem_fulfillment_status, Billing_Name, Billing_Street,
                Billing_Address1, Billing_Address2, Billing_Company, Billing_City,
                Billing_Zip, Billing_Province, Billing_Country, Billing_Phone,
                Shipping_Name, Shipping_Street, Shipping_Address1, Shipping_Address2,
                Shipping_Company, Shipping_City, Shipping_Zip, Shipping_Province,
                Shipping_Country, Shipping_Phone, Notes, Note_Attributes,
                Cancelled_at, Payment_Method, Payment_Reference, Refunded_Amount,
                Vendor, Id, Tags, Risk_Level, Source, Lineitem_discount,
                Tax_1_Name, Tax_1_Value, Tax_2_Name, Tax_2_Value,
                Tax_3_Name, Tax_3_Value, Tax_4_Name, Tax_4_Value,
                Tax_5_Name, Tax_5_Value, Phone, Receipt_Number,
                Billing_Province_Name, Shipping_Province_Name
            )
            VALUES (
                :Name, :Email, :Financial_Status, :Paid_at, :Fulfillment_Status, :Fulfilled_at,
                :Accepts_Marketing, :Currency, :Subtotal, :Shipping, :Taxes, :Total,
                :Discount_Code, :Discount_Amount, :Shipping_Method, :Created_at,
                :Lineitem_quantity, :Lineitem_name, :Lineitem_price, :Lineitem_compare_at_price,
                :Lineitem_sku, :Lineitem_requires_shipping, :Lineitem_taxable,
                :Lineitem_fulfillment_status, :Billing_Name, :Billing_Street,
                :Billing_Address1, :Billing_Address2, :Billing_Company, :Billing_City,
                :Billing_Zip, :Billing_Province, :Billing_Country, :Billing_Phone,
                :Shipping_Name, :Shipping_Street, :Shipping_Address1, :Shipping_Address2,
                :Shipping_Company, :Shipping_City, :Shipping_Zip, :Shipping_Province,
                :Shipping_Country, :Shipping_Phone, :Notes, :Note_Attributes,
                :Cancelled_at, :Payment_Method, :Payment_Reference, :Refunded_Amount,
                :Vendor, :Id, :Tags, :Risk_Level, :Source, :Lineitem_discount,
                :Tax_1_Name, :Tax_1_Value, :Tax_2_Name, :Tax_2_Value,
                :Tax_3_Name, :Tax_3_Value, :Tax_4_Name, :Tax_4_Value,
                :Tax_5_Name, :Tax_5_Value, :Phone, :Receipt_Number,
                :Billing_Province_Name, :Shipping_Province_Name
            )
            """)

        db.execute(query, {
            "Name": row["Name"],
            "Email": row["Email"],
            "Financial_Status": row["Financial_Status"],
            "Paid_at": row["Paid_at"],
            "Fulfillment_Status": row["Fulfillment_Status"],
            "Fulfilled_at": row["Fulfilled_at"],
            "Accepts_Marketing": row["Accepts_Marketing"],
            "Currency": row["Currency"],
            "Subtotal": row["Subtotal"],
            "Shipping": row["Shipping"],
            "Taxes": row["Taxes"],
            "Total": row["Total"],
            "Discount_Code": row["Discount_Code"],
            "Discount_Amount": row["Discount_Amount"],
            "Shipping_Method": row["Shipping_Method"],
            "Created_at": row["Created_at"],
            "Lineitem_quantity": row["Lineitem_quantity"],
            "Lineitem_name": row["Lineitem_name"],
            "Lineitem_price": row["Lineitem_price"],
            "Lineitem_compare_at_price": row["Lineitem_compare_at_price"],
            "Lineitem_sku": row["Lineitem_sku"],
            "Lineitem_requires_shipping": row["Lineitem_requires_shipping"],
            "Lineitem_taxable": row["Lineitem_taxable"],
            "Lineitem_fulfillment_status": row["Lineitem_fulfillment_status"],
            "Billing_Name": row["Billing_Name"],
            "Billing_Street": row["Billing_Street"],
            "Billing_Address1": row["Billing_Address1"],
            "Billing_Address2": row["Billing_Address2"],
            "Billing_Company": row["Billing_Company"],
            "Billing_City": row["Billing_City"],
            "Billing_Zip": row["Billing_Zip"],
            "Billing_Province": row["Billing_Province"],
            "Billing_Country": row["Billing_Country"],
            "Billing_Phone": row["Billing_Phone"],
            "Shipping_Name": row["Shipping_Name"],
            "Shipping_Street": row["Shipping_Street"],
            "Shipping_Address1": row["Shipping_Address1"],
            "Shipping_Address2": row["Shipping_Address2"],
            "Shipping_Company": row["Shipping_Company"],
            "Shipping_City": row["Shipping_City"],
            "Shipping_Zip": row["Shipping_Zip"],
            "Shipping_Province": row["Shipping_Province"],
            "Shipping_Country": row["Shipping_Country"],
            "Shipping_Phone": row["Shipping_Phone"],
            "Notes": row["Notes"],
            "Note_Attributes": row["Note_Attributes"],
            "Cancelled_at": row["Cancelled_at"],
            "Payment_Method": row["Payment_Method"],
            "Payment_Reference": row["Payment_Reference"],
            "Refunded_Amount": row["Refunded_Amount"],
            "Vendor": row["Vendor"],
            "Id": row["Id"],
            "Tags": row["Tags"],
            "Risk_Level": row["Risk_Level"],
            "Source": row["Source"],
            "Lineitem_discount": row["Lineitem_discount"],
            "Tax_1_Name": row["Tax_1_Name"],
            "Tax_1_Value": row["Tax_1_Value"],
            "Tax_2_Name": row["Tax_2_Name"],
            "Tax_2_Value": row["Tax_2_Value"],
            "Tax_3_Name": row["Tax_3_Name"],
            "Tax_3_Value": row["Tax_3_Value"],
            "Tax_4_Name": row["Tax_4_Name"],
            "Tax_4_Value": row["Tax_4_Value"],
            "Tax_5_Name": row["Tax_5_Name"],
            "Tax_5_Value": row["Tax_5_Value"],
            "Phone": row["Phone"],
            "Receipt_Number": row["Receipt_Number"],
            "Billing_Province_Name": row["Billing_Province_Name"],
            "Shipping_Province_Name": row["Shipping_Province_Name"],
        })

        inserted += 1

    db.commit()

    return {
        "message": "Raw upload successful",
        "rows_inserted": inserted
    }





from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import requests
import os

from database import get_db2, get_db3


LOCAL_SAVE_PATH = "/var/www/html/download-recording/mp3_play"
PUBLIC_PATH = "/download-recording/mp3_play"


def download_file(file_url, filename):
    local_path = os.path.join(LOCAL_SAVE_PATH, filename)

    try:
        res = requests.get(file_url)
        res.raise_for_status()

        if os.path.exists(local_path):
            os.remove(local_path)

        with open(local_path, "wb") as f:
            f.write(res.content)

        return f"{PUBLIC_PATH}/{filename}"
    except Exception:
        return None


@router.get("/recordings/dd-html", response_class=HTMLResponse)
def dd_html(
    filename: str = Query(...),
    agent: str = Query(...),
    dater: str = Query(...),
    phno: str = Query(""),
    db: Session = Depends(get_db2)
):

    sr = 1
    table_rows = ""

    # 🔹 STEP 1: initial query (NO DATE FILTER)
    query1 = text("""
        SELECT start_time, length_in_min, location, filename
        FROM recording_log
        WHERE lead_id = :filename
        AND lead_id != '0'
        AND SUBSTRING_INDEX(filename,'_',-1) = :agent
        ORDER BY start_time DESC
    """)

    rsc = db.execute(query1, {
        "filename": filename,
        "agent": agent
    }).fetchall()

    

    dt = rsc[0] if rsc else None

    # 🔴 STEP 2: fallback if empty
    # if not dt:
    #     query_fallback = text("""
    #         SELECT start_time, location, filename
    #         FROM recording_log_26jan23
    #         WHERE lead_id = :filename
    #         AND lead_id != '0'
    #         AND SUBSTRING_INDEX(filename,'_',-1) = :agent
    #         ORDER BY start_time DESC
    #     """)

    #     rsc_fb = db.execute(query_fallback, {
    #         "filename": filename,
    #         "agent": agent
    #     }).fetchall()

    #     dt = rsc_fb[0] if rsc_fb else None

    # else:
    # 🔹 STEP 3: date-based filtering
    query2 = text("""
        SELECT start_time, length_in_min, location, filename
        FROM recording_log
        WHERE lead_id = :filename
        AND DATE(start_time) = :dater
        AND lead_id != '0'
        AND SUBSTRING_INDEX(filename,'_',-1) = :agent
        ORDER BY start_time DESC
    """)

    rsc2 = db.execute(query2, {
        "filename": filename,
        "dater": dater,
        "agent": agent
    }).fetchall()
    print(rsc2,"#######")

    # 🔴 If multiple recordings → loop
    if len(rsc2) > 1:
        for row in rsc2:
            tmp_filename = row.location.split("/")[-1]
            dir = str(row.start_time)[:10].replace("-", "")
            tmp_filename = row.location.split("/")[-1]
            file_url = f"http://192.168.10.3/192_168_10_5/{dir}/{tmp_filename}"

            # public_file = download_file(file_url, tmp_filename)
            public_file = file_url

            if public_file:
                table_rows += f"""
                <tr>
                    <td>{sr}</td>
                    <td>{row.start_time}</td>
                    <td>{row.length_in_min}</td>
                    <td><a href="#" onclick="play_audio('{public_file}')">Play</a></td>
                    <td><a href="{public_file}">Download {sr}</a></td>
                </tr>
                """
                sr += 1

    # 🔹 STEP 4: Always print last record (PHP behavior)
    if dt:
        tmp_filename = dt.location.split("/")[-1]
        dir = str(dt.start_time)[:10].replace("-", "")

        file_url = f"http://192.168.10.3/192_168_10_5/{dir}/{tmp_filename}"
        public_file = file_url


        if public_file:
            table_rows += f"""
            <tr>
                <td>{sr}</td>
                <td>{dt.start_time}</td>
                <td>{getattr(dt, 'length_in_min', '')}</td>
                <td><a href="#" onclick="play_audio('{public_file}')">Play</a></td>
                <td><a href="{public_file}">Download {sr}</a></td>
            </tr>
            """

    # 🔹 FINAL HTML RESPONSE
    html_content = f"""
    <html>
    <head>
        <link rel="stylesheet"
        href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css">

        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>

        <style>
        .styled-table {{
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 0.9em;
            min-width: 400px;
        }}
        .styled-table th, .styled-table td {{
            padding: 10px;
        }}
        .styled-table thead {{
            background: #009879;
            color: white;
        }}
        </style>

        <script>
        function play_audio(file_name){{
            var snd = new Audio(file_name);
            snd.play();
        }}
        function close_this(){{
            window.close();
        }}
        $(document).ready(function(){{
            $("#exampleModal").modal("show");
        }});
        </script>
    </head>

    <body>
    <div class="modal fade show" id="exampleModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5>Recordings</h5>
            <button onclick="close_this()">&times;</button>
          </div>

          <div class="modal-body">
            <table border="1" class="styled-table">
              <tr>
                <td colspan="5" style="color:red">
                Multiple Recordings are Available. Please choose appropriate one
                </td>
              </tr>
              <tr><td colspan="5">Contact No: {phno}</td></tr>
              <tr>
                <td>Sr No</td>
                <td>Call Date</td>
                <td>Duration</td>
                <td>Play</td>
                <td>Recordings</td>
              </tr>

              {table_rows if table_rows else "<tr><td colspan='5'>No recordings found</td></tr>"}

            </table>
          </div>

          <div class="modal-footer">
            <button onclick="close_this()">Close</button>
          </div>

        </div>
      </div>
    </div>
    </body>
    </html>
    """

    return html_content






@router.get("/recordings/dd-html_old", response_class=HTMLResponse)
def dd_html_old(
    filename: str = Query(...),
    agent: str = Query(...),
    dater: str = Query(...),
    phno: str = Query(""),
    db: Session = Depends(get_db3)
):

    sr = 1
    table_rows = ""

    # 🔹 STEP 1: initial query (NO DATE FILTER)
    query1 = text("""
        SELECT start_time, length_in_min, location, filename
        FROM recording_log
        WHERE lead_id = :filename
        AND lead_id != '0'
        AND SUBSTRING_INDEX(filename,'_',-1) = :agent
        ORDER BY start_time DESC
    """)

    rsc = db.execute(query1, {
        "filename": filename,
        "agent": agent
    }).fetchall()

    

    dt = rsc[0] if rsc else None

    # 🔴 STEP 2: fallback if empty
    # if not dt:
    #     query_fallback = text("""
    #         SELECT start_time, location, filename
    #         FROM recording_log_26jan23
    #         WHERE lead_id = :filename
    #         AND lead_id != '0'
    #         AND SUBSTRING_INDEX(filename,'_',-1) = :agent
    #         ORDER BY start_time DESC
    #     """)

    #     rsc_fb = db.execute(query_fallback, {
    #         "filename": filename,
    #         "agent": agent
    #     }).fetchall()

    #     dt = rsc_fb[0] if rsc_fb else None

    # else:
    # 🔹 STEP 3: date-based filtering
    query2 = text("""
        SELECT start_time, length_in_min, location, filename
        FROM recording_log
        WHERE lead_id = :filename
        AND DATE(start_time) = :dater
        AND lead_id != '0'
        AND SUBSTRING_INDEX(filename,'_',-1) = :agent
        ORDER BY start_time DESC
    """)

    rsc2 = db.execute(query2, {
        "filename": filename,
        "dater": dater,
        "agent": agent
    }).fetchall()
    print(rsc2,"#######")

    # 🔴 If multiple recordings → loop
    if len(rsc2) > 1:
        for row in rsc2:
            tmp_filename = row.location.split("/")[-1]
            dir = str(row.start_time)[:10].replace("-", "")
            tmp_filename = row.location.split("/")[-1]
            file_url = f"http://192.168.10.3/192_168_10_5/{dir}/{tmp_filename}"

            # public_file = download_file(file_url, tmp_filename)
            public_file = file_url

            if public_file:
                table_rows += f"""
                <tr>
                    <td>{sr}</td>
                    <td>{row.start_time}</td>
                    <td>{row.length_in_min}</td>
                    <td><a href="#" onclick="play_audio('{public_file}')">Play</a></td>
                    <td><a href="{public_file}">Download {sr}</a></td>
                </tr>
                """
                sr += 1

    # 🔹 STEP 4: Always print last record (PHP behavior)
    if dt:
        tmp_filename = dt.location.split("/")[-1]
        dir = str(dt.start_time)[:10].replace("-", "")

        file_url = f"http://192.168.10.3/192_168_10_5/{dir}/{tmp_filename}"
        public_file = file_url


        if public_file:
            table_rows += f"""
            <tr>
                <td>{sr}</td>
                <td>{dt.start_time}</td>
                <td>{getattr(dt, 'length_in_min', '')}</td>
                <td><a href="#" onclick="play_audio('{public_file}')">Play</a></td>
                <td><a href="{public_file}">Download {sr}</a></td>
            </tr>
            """

    # 🔹 FINAL HTML RESPONSE
    html_content = f"""
    <html>
    <head>
        <link rel="stylesheet"
        href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css">

        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js"></script>

        <style>
        .styled-table {{
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 0.9em;
            min-width: 400px;
        }}
        .styled-table th, .styled-table td {{
            padding: 10px;
        }}
        .styled-table thead {{
            background: #009879;
            color: white;
        }}
        </style>

        <script>
        function play_audio(file_name){{
            var snd = new Audio(file_name);
            snd.play();
        }}
        function close_this(){{
            window.close();
        }}
        $(document).ready(function(){{
            $("#exampleModal").modal("show");
        }});
        </script>
    </head>

    <body>
    <div class="modal fade show" id="exampleModal">
      <div class="modal-dialog">
        <div class="modal-content">

          <div class="modal-header">
            <h5>Recordings</h5>
            <button onclick="close_this()">&times;</button>
          </div>

          <div class="modal-body">
            <table border="1" class="styled-table">
              <tr>
                <td colspan="5" style="color:red">
                Multiple Recordings are Available. Please choose appropriate one
                </td>
              </tr>
              <tr><td colspan="5">Contact No: {phno}</td></tr>
              <tr>
                <td>Sr No</td>
                <td>Call Date</td>
                <td>Duration</td>
                <td>Play</td>
                <td>Recordings</td>
              </tr>

              {table_rows if table_rows else "<tr><td colspan='5'>No recordings found</td></tr>"}

            </table>
          </div>

          <div class="modal-footer">
            <button onclick="close_this()">Close</button>
          </div>

        </div>
      </div>
    </div>
    </body>
    </html>
    """

    return html_content