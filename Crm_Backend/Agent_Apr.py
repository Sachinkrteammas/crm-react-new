from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
import requests
import io

router = APIRouter()

PHP_URL = (
    "https://dialdesk.co.in/dialdesk/app/webroot/"
    "billing_statement/apr_report/"
    "AST_agent_time_detail.php"
)

@router.get("/agent-apr-export")
def agent_apr_export(
    start_date: str = Query(..., example="2026-01-01"),
    end_date: str = Query(..., example="2026-01-02"),
    agent_type: str = Query("All", example="All"),   # All | Unit 1 | Unit 2
    dialer: str = Query("ALL", example="ALL")        # ALL | Dialer5 | Dialer8
):

    # Dialer mapping (matches PHP exactly)
    group_value = "--ALL--" if dialer == "ALL" else dialer

    # EXACT params as PHP expects
    params = {
        "agent_type": agent_type,          # All / Unit 1 / Unit 2
        "DB": "",
        "query_date": start_date,
        "end_date": end_date,
        "group[]": group_value,
        "user_group[]": "--ALL--",
        "shift": "ALL",
        "report_display_type": "TEXT",
        "SUBMIT": "SUBMIT",
    }

    # Call PHP export
    response = requests.get(PHP_URL, params=params, timeout=300)

    filename = f"APR_Report_{start_date}_to_{end_date}.xlsx"

    return StreamingResponse(
        io.BytesIO(response.content),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
