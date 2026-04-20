from fastapi import APIRouter, Query, Depends, HTTPException
from sqlalchemy import text
from database import get_db2, get_db4
from fastapi.responses import StreamingResponse
from io import BytesIO
from datetime import datetime
from sqlalchemy import text


router = APIRouter()



@router.get("/get_cdr_report_data")
def get_cdr_report_data(
    client_id: int = Query(...),
    start_date: str = Query(...),  # format: YYYY-MM-DD
    end_date: str = Query(...),  # format: YYYY-MM-DD
    db = Depends(get_db4)
):
    try:
        query = text("""
            SELECT *
            FROM cdr_report_data
            WHERE client_id = :client_id
            AND DATE(report_date) BETWEEN :start_date AND :end_date
        """)

        result = db.execute(query, {
            "client_id": client_id,
            "start_date": start_date,
            "end_date": end_date
        }).mappings().all()

        if not result:
            return {
                "status": "success",
                "message": "No data found",
                "data": []
            }

        return {
            "status": "success",
            "client_id": client_id,
            "total_records": len(result),
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



@router.get("/get_agent_apr_data")
def get_agent_apr_data(
    start_date: str = Query(..., description="Format: YYYY-MM-DD"),
    end_date: str = Query(..., description="Format: YYYY-MM-DD"),
    agent_type: str = Query("All"),
    process: str = Query("All"),
    db = Depends(get_db4)
):
    try:
        from datetime import datetime

        # ✅ Validate dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )

        if start > end:
            raise HTTPException(
                status_code=400,
                detail="start_date cannot be greater than end_date"
            )

        # ✅ Base query
        base_query = """
            SELECT *
            FROM agent_apr_data
            WHERE report_date BETWEEN :start_date AND :end_date
        """

        params = {
            "start_date": start,
            "end_date": end
        }

        # ✅ Dynamic filters
        if agent_type != "All":
            base_query += " AND agent_type = :agent_type"
            params["agent_type"] = agent_type

        if process != "All":
            base_query += " AND process = :process"
            params["process"] = process

        base_query += " ORDER BY report_date ASC"

        query = text(base_query)

        result = db.execute(query, params).mappings().all()

        if not result:
            return {
                "status": "success",
                "message": "No data found",
                "data": []
            }

        return {
            "status": "success",
            "start_date": start_date,
            "end_date": end_date,
            "filters": {
                "agent_type": agent_type,
                "process": process
            },
            "total_records": len(result),
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    






@router.get("/get_billing_summary")
def get_billing_summary(
    client_id: int = Query(...),
    start_date: str = Query(..., description="Format: YYYY-MM-DD"),
    end_date: str = Query(..., description="Format: YYYY-MM-DD"),
    db = Depends(get_db4)
):
    try:
        # ✅ Validate dates
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d").date()
            end = datetime.strptime(end_date, "%Y-%m-%d").date()
        except:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )

        if start > end:
            raise HTTPException(
                status_code=400,
                detail="start_date cannot be greater than end_date"
            )

        # ✅ Fetch client details
        client_result = db.execute(text("""
            SELECT company_name, reg_office_address1, phone_no, email, auth_person
            FROM registration_master
            WHERE company_id = :client_id
        """), {"client_id": client_id}).fetchone()

        # ✅ Fetch summary data
        query = text("""
            SELECT 
                description,
                SUM(pulse_unit) AS total_pulse_unit,
                rate,
                SUM(amount) AS total_amount
            FROM billing_statement_data
            WHERE client_id = :client_id
            AND DATE(summary_month) BETWEEN :start_date AND :end_date
            GROUP BY description, rate
        """)

        result = db.execute(query, {
            "client_id": client_id,
            "start_date": start,
            "end_date": end
        }).mappings().all()


        # ✅ Grand total
        grand_total = sum(float(row["total_amount"]) for row in result)

        # ===============================
        # ✅ BUILD EXCEL (HTML FORMAT)
        # ===============================
        html = f"""
        <html>
        <head>
        <meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=utf-8" />
        </head>
        <body>

        <table border='0' width='700'>
            <tr>
                <td colspan='6' align='center'>
                    <strong style='font-size:16pt;'>A UNIT OF ISPARK DATA CONNECT PVT LTD</strong>
                </td>
            </tr>
        </table>

        <table border='1' width='700' style='font-size:11pt;'>
            <tr>
                <td colspan='6' style='background-color:#607d8b;color:#fff;font-size:14pt;'>Client Details</td>
            </tr>
            <tr>
                <th>Company</th>
                <th>Address</th>
                <th>Mobile No</th>
                <th>Email</th>
                <th>Authorised Person</th>
            </tr>
            <tr>
                <td>{client_result.company_name if client_result else ''}</td>
                <td>{client_result.reg_office_address1 if client_result else ''}</td>
                <td>{client_result.phone_no if client_result else ''}</td>
                <td>{client_result.email if client_result else ''}</td>
                <td>{client_result.auth_person if client_result else ''}</td>
            </tr>
        </table>

        <br><br>

        <table border='1' width='500' style='font-size:11pt;'>
            <tr>
                <td colspan='4' style='background-color:#607d8b;color:#fff;font-size:14pt;'>Summary</td>
            </tr>
            <tr>
                <th>Description</th>
                <th>Pulse/Unit</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        """

        # ✅ Add rows
        for row in result:
            html += f"""
            <tr>
                <td>{row['description']}</td>
                <td>{row['total_pulse_unit']}</td>
                <td>{row['rate']}</td>
                <td>{round(float(row['total_amount']), 2)}</td>
            </tr>
            """

        # ✅ Grand Total row
        html += f"""
            <tr style='font-weight:bold; background-color:#e0e0e0;'>
                <td colspan='3' align='right'>
                    Grand Total ({start_date}/{end_date})
                </td>
                <td>{round(grand_total, 2)}</td>
            </tr>
        </table>

        </body>
        </html>
        """

        # ===============================
        # ✅ RETURN EXCEL FILE
        # ===============================
        buffer = BytesIO(html.encode('utf-8'))

        filename = f"billing_summary_{datetime.now().strftime('%d_%m_%Y_%H_%M_%S')}.xls"

        headers = {
            "Content-Disposition": f"attachment; filename={filename}",
            "Pragma": "no-cache",
            "Expires": "0"
        }

        return StreamingResponse(
            buffer,
            media_type="application/vnd.ms-excel",
            headers=headers
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))