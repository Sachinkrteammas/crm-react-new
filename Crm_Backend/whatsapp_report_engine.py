import io
import os
import requests
import pandas as pd
from datetime import datetime, timedelta
from logger import logger

# ============================================================
# CONFIG
# ============================================================
CRM_BASE = "https://crmapi.dialdesk.in"
CRM_EMAIL = "ispark@dialdesk.in"
CRM_PASSWORD = "1234"

WHATSAPP_API_URL = "http://202.56.249.163:3001/api/send-media-group"
WHATSAPP_API_KEY = "3b844348ae08e59525509cb8cef2aabfd0a8a19182adee99"
WHATSAPP_SESSION_ID = "DialDesk"

# Crystal config
CRYSTAL_CLIENT_ID = "656"
CRYSTAL_TARGET_AGENTS = [
    'sourabh shukla', 'shubham sharma', 'megha tyagi',
    'akash awasthi', 'farheen khan', 'adiba parveen', 'khushi',
]


# ============================================================
# AUTH
# ============================================================
def get_auth_token():
    url = f"{CRM_BASE}/auth/login"
    payload = {"email": CRM_EMAIL, "password": CRM_PASSWORD}

    logger.info(f"Logging into CRM: {CRM_EMAIL}")
    res = requests.post(url, json=payload, timeout=120)

    if res.status_code != 200:
        raise Exception(f"Login failed ({res.status_code}): {res.text}")

    data = res.json()
    token = (
        data.get("token")
        or data.get("access_token")
        or (data.get("data") or {}).get("token")
        or (data.get("data") or {}).get("access_token")
        or data.get("authorization")
    )
    if not token:
        raise Exception(f"Token not found: {res.text}")

    logger.info("CRM token received")
    return token


# ============================================================
# FONT LOADER
# ============================================================
def _load_font(size, bold=False):
    from PIL import ImageFont
    candidates = []
    if bold:
        candidates = [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/calibrib.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
    else:
        candidates = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/calibri.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


# ============================================================
# IMAGE GENERATOR 1: Standard Table
# ============================================================
def create_table_image(
    title, subtitle, headers, rows, col_widths,
    highlight_cols=None, total_row_index=None,
    output_prefix="report", legend=None,
):
    from PIL import Image, ImageDraw

    ROW_H = 42
    HEADER_H = 48
    TITLE_H = 90
    FOOTER_H = 70
    PADDING_X = 30

    IMG_W = sum(col_widths) + PADDING_X * 2
    IMG_H = TITLE_H + HEADER_H + (len(rows) * ROW_H) + FOOTER_H

    HEADER_BG = (28, 63, 148)
    TOTAL_BG = (28, 63, 148)
    GRID_COLOR = (199, 207, 221)
    WHITE = (255, 255, 255)
    BLACK = (0, 0, 0)
    TEXT_DARK = (30, 30, 30)

    highlight_cols = highlight_cols or {}

    def color_for_pct(pct):
        if pct <= 0:   return (255, 0, 0), WHITE
        if pct < 50:   return (255, 107, 107), BLACK
        if pct < 80:   return (255, 165, 0), BLACK
        if pct < 90:   return (255, 217, 61), BLACK
        if pct < 96:   return (107, 203, 119), BLACK
        return (45, 143, 92), WHITE

    def to_pct(v):
        try:
            s = str(v).replace('%', '').replace(',', '').strip()
            if s == '':
                return None
            n = float(s)
            return n * 100 if n <= 1 else n
        except Exception:
            return None

    font_title = _load_font(28, bold=True)
    font_subtitle = _load_font(15, bold=False)
    font_header = _load_font(13, bold=True)
    font_cell = _load_font(13, bold=False)
    font_cell_bold = _load_font(13, bold=True)
    font_footer = _load_font(12, bold=False)

    img = Image.new("RGB", (IMG_W, IMG_H), WHITE)
    draw = ImageDraw.Draw(img)

    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_W - tw) / 2, 22), title, fill=(17, 17, 17), font=font_title)

    bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    sw = bbox[2] - bbox[0]
    draw.text(((IMG_W - sw) / 2, 60), subtitle, fill=(85, 85, 85), font=font_subtitle)

    x = PADDING_X
    y = TITLE_H
    for i, h in enumerate(headers):
        w = col_widths[i]
        draw.rectangle([x, y, x + w, y + HEADER_H], fill=HEADER_BG, outline=WHITE)
        bbox = draw.textbbox((0, 0), str(h), font=font_header)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = x + 10 if i == 0 else x + (w - tw) / 2
        ty = y + (HEADER_H - th) / 2 - 2
        draw.text((tx, ty), str(h), fill=WHITE, font=font_header)
        x += w

    y = TITLE_H + HEADER_H
    for ri, row in enumerate(rows):
        is_total = (total_row_index is not None and ri == total_row_index)
        x = PADDING_X
        for ci, val in enumerate(row):
            w = col_widths[ci]
            bg = WHITE
            fg = TEXT_DARK
            font = font_cell

            if is_total:
                bg = TOTAL_BG
                fg = WHITE
                font = font_cell_bold
            elif ci in highlight_cols:
                p = to_pct(val)
                if p is not None:
                    bg, fg = color_for_pct(p)
                    font = font_cell_bold

            draw.rectangle([x, y, x + w, y + ROW_H], fill=bg, outline=GRID_COLOR)

            display_val = str(val) if val is not None else ""
            if ci == 0 and len(display_val) > 38:
                display_val = display_val[:36] + "..."

            bbox = draw.textbbox((0, 0), display_val, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            tx = x + 10 if ci == 0 else x + (w - tw) / 2
            ty = y + (ROW_H - th) / 2 - 3

            draw.text((tx, ty), display_val, fill=fg, font=font)
            x += w
        y += ROW_H

    if legend:
        legend_y = y + 20
        lx = PADDING_X
        for color, label in legend:
            draw.rectangle([lx, legend_y, lx + 14, legend_y + 14], fill=color, outline=(200, 200, 200))
            draw.text((lx + 20, legend_y + 1), label, fill=(68, 68, 68), font=font_footer)
            lx += 118

    gen_text = f"Generated by DialDesk MIS | {datetime.now().strftime('%d %b %Y %H:%M')}"
    bbox = draw.textbbox((0, 0), gen_text, font=font_footer)
    gw = bbox[2] - bbox[0]
    draw.text((IMG_W - gw - PADDING_X, y + 21), gen_text, fill=(150, 150, 150), font=font_footer)

    png_path = f"/tmp/{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    if not os.path.exists("/tmp"):
        png_path = os.path.join(
            os.path.dirname(__file__),
            f"{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        )

    img.save(png_path, "PNG")
    logger.info(f"Image generated: {png_path}")
    return png_path


# ============================================================
# IMAGE GENERATOR 2: Matrix
# ============================================================
def create_matrix_image(
    title, subtitle, rows,
    first_col_width=380, other_col_width=140,
    output_prefix="matrix",
    header_bg=(120, 152, 58),
    highlight_labels=None,
):
    from PIL import Image, ImageDraw

    ROW_H = 42
    HEADER_H = 52
    TITLE_H = 90
    FOOTER_H = 45
    PADDING_X = 25

    num_cols = len(rows[0])
    num_data_cols = num_cols - 1
    IMG_W = PADDING_X * 2 + first_col_width + (other_col_width * num_data_cols)
    IMG_H = TITLE_H + HEADER_H + (len(rows) - 1) * ROW_H + FOOTER_H

    WHITE = (255, 255, 255)
    BLACK = (0, 0, 0)
    TEXT_DARK = (20, 20, 20)
    GRID = (80, 80, 80)
    HIGHLIGHT_BG = (196, 215, 155)
    TOTAL_BG = (242, 242, 242)
    highlight_labels = highlight_labels or ["Buy Lead", "Sell Lead"]

    font_title = _load_font(26, bold=True)
    font_subtitle = _load_font(16, bold=True)
    font_header = _load_font(15, bold=True)
    font_cell = _load_font(14, bold=False)
    font_cell_bold = _load_font(14, bold=True)
    font_footer = _load_font(12, bold=False)

    img = Image.new("RGB", (IMG_W, IMG_H), WHITE)
    draw = ImageDraw.Draw(img)

    bbox = draw.textbbox((0, 0), title, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_W - tw) / 2, 25), title, fill=(17, 17, 17), font=font_title)

    bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    sw = bbox[2] - bbox[0]
    draw.text(((IMG_W - sw) / 2, 62), subtitle, fill=(68, 68, 68), font=font_subtitle)

    y = TITLE_H
    x = PADDING_X
    for ci, h in enumerate(rows[0]):
        w = first_col_width if ci == 0 else other_col_width
        draw.rectangle([x, y, x + w, y + HEADER_H], fill=header_bg, outline=GRID)
        bbox = draw.textbbox((0, 0), str(h), font=font_header)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = x + (w - tw) / 2
        ty = y + (HEADER_H - th) / 2 - 2
        draw.text((tx, ty), str(h), fill=WHITE, font=font_header)
        x += w

    y += HEADER_H

    for ri, row in enumerate(rows[1:]):
        label = str(row[0]) if row[0] is not None else ""
        is_highlight = label in highlight_labels
        is_total = label.lower() == "grand total"

        if is_total:
            bg = TOTAL_BG
            font = font_cell_bold
            fg = TEXT_DARK
        elif is_highlight:
            bg = HIGHLIGHT_BG
            font = font_cell_bold
            fg = BLACK
        else:
            bg = WHITE
            font = font_cell
            fg = TEXT_DARK

        x = PADDING_X
        for ci, val in enumerate(row):
            w = first_col_width if ci == 0 else other_col_width
            draw.rectangle([x, y, x + w, y + ROW_H], fill=bg, outline=GRID)

            display_val = ""
            if val is not None and val != 0 and val != "":
                display_val = str(val)

            bbox = draw.textbbox((0, 0), display_val, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]

            if ci == 0:
                if len(display_val) > 40:
                    display_val = display_val[:38] + "..."
                    bbox = draw.textbbox((0, 0), display_val, font=font)
                    tw = bbox[2] - bbox[0]
                    th = bbox[3] - bbox[1]
                tx = x + 10
            else:
                tx = x + (w - tw) / 2

            ty = y + (ROW_H - th) / 2 - 3
            draw.text((tx, ty), display_val, fill=fg, font=font)
            x += w

        y += ROW_H

    gen_text = "Generated by DialDesk MIS"
    bbox = draw.textbbox((0, 0), gen_text, font=font_footer)
    gw = bbox[2] - bbox[0]
    draw.text(((IMG_W - gw) / 2, IMG_H - 22), gen_text, fill=(120, 120, 120), font=font_footer)

    png_path = f"/tmp/{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    if not os.path.exists("/tmp"):
        png_path = os.path.join(
            os.path.dirname(__file__),
            f"{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        )

    img.save(png_path, "PNG")
    logger.info(f"Matrix image generated: {png_path}")
    return png_path


# ============================================================
# IMAGE GENERATOR 3: Simple 2-column
# ============================================================
def create_simple_2col_image(report, report_name, date_display, output_prefix="crystal"):
    from PIL import Image, ImageDraw

    IMG_W = 900
    COL1_W = 630
    COL2_W = 220
    ROW_H = 42
    HEADER_H = 52
    TITLE_H = 90
    FOOTER_H = 45
    PADDING_X = 25

    rows = report.get("rows", [])
    headers = report.get("headers", ["Label", "Count"])

    IMG_H = TITLE_H + HEADER_H + (len(rows) * ROW_H) + FOOTER_H

    WHITE = (255, 255, 255)
    TEXT_DARK = (20, 20, 20)
    GRID = (60, 60, 60)
    HEADER_BG = (30, 60, 114)
    HIGHLIGHT_BG = (232, 245, 233)

    font_title = _load_font(24, bold=True)
    font_subtitle = _load_font(15, bold=False)
    font_header = _load_font(16, bold=True)
    font_cell = _load_font(15, bold=False)
    font_cell_bold = _load_font(15, bold=True)
    font_footer = _load_font(11, bold=False)

    img = Image.new("RGB", (IMG_W, IMG_H), WHITE)
    draw = ImageDraw.Draw(img)

    draw.rectangle([6, 6, IMG_W - 6, IMG_H - 6], outline=(30, 60, 114), width=3)

    bbox = draw.textbbox((0, 0), report_name, font=font_title)
    tw = bbox[2] - bbox[0]
    draw.text(((IMG_W - tw) / 2, 30), report_name, fill=(17, 17, 17), font=font_title)

    subtitle = f"Date: {date_display}"
    bbox = draw.textbbox((0, 0), subtitle, font=font_subtitle)
    sw = bbox[2] - bbox[0]
    draw.text(((IMG_W - sw) / 2, 62), subtitle, fill=(85, 85, 85), font=font_subtitle)

    y = TITLE_H
    draw.rectangle([PADDING_X, y, PADDING_X + COL1_W, y + HEADER_H], fill=HEADER_BG, outline=GRID)
    draw.rectangle([PADDING_X + COL1_W, y, PADDING_X + COL1_W + COL2_W, y + HEADER_H], fill=HEADER_BG, outline=GRID)

    bbox = draw.textbbox((0, 0), str(headers[0]), font=font_header)
    th = bbox[3] - bbox[1]
    draw.text((PADDING_X + 12, y + (HEADER_H - th) / 2 - 2),
              str(headers[0]), fill=WHITE, font=font_header)

    bbox = draw.textbbox((0, 0), str(headers[1]), font=font_header)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((PADDING_X + COL1_W + (COL2_W - tw) / 2, y + (HEADER_H - th) / 2 - 2),
              str(headers[1]), fill=WHITE, font=font_header)

    y += HEADER_H

    for ri, row in enumerate(rows):
        cells = row.get("cells", ["", ""])
        is_highlight = row.get("highlight", False)

        if is_highlight:
            bg = HIGHLIGHT_BG
            font = font_cell_bold
        else:
            bg = WHITE if ri % 2 == 0 else (249, 249, 249)
            font = font_cell

        draw.rectangle([PADDING_X, y, PADDING_X + COL1_W, y + ROW_H], fill=bg, outline=GRID)
        draw.rectangle([PADDING_X + COL1_W, y, PADDING_X + COL1_W + COL2_W, y + ROW_H], fill=bg, outline=GRID)

        label = str(cells[0]) if len(cells) > 0 else ""
        if len(label) > 55:
            label = label[:53] + "..."
        bbox = draw.textbbox((0, 0), label, font=font)
        th = bbox[3] - bbox[1]
        draw.text((PADDING_X + 12, y + (ROW_H - th) / 2 - 2), label, fill=TEXT_DARK, font=font)

        count = str(cells[1]) if len(cells) > 1 else ""
        bbox = draw.textbbox((0, 0), count, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((PADDING_X + COL1_W + (COL2_W - tw) / 2, y + (ROW_H - th) / 2 - 2),
                  count, fill=TEXT_DARK, font=font)

        y += ROW_H

    gen_text = "Generated by DialDesk MIS"
    bbox = draw.textbbox((0, 0), gen_text, font=font_footer)
    gw = bbox[2] - bbox[0]
    draw.text(((IMG_W - gw) / 2, IMG_H - 22), gen_text, fill=(120, 120, 120), font=font_footer)

    png_path = f"/tmp/{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.png"
    if not os.path.exists("/tmp"):
        png_path = os.path.join(
            os.path.dirname(__file__),
            f"{output_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}.png"
        )

    img.save(png_path, "PNG")
    logger.info(f"2col image: {png_path}")
    return png_path


# ============================================================
# WHATSAPP SEND
# ============================================================
def send_whatsapp_image(image_path, caption, group_id):
    with open(image_path, 'rb') as f:
        files = {'file': (os.path.basename(image_path), f, 'image/png')}
        data = {
            "sessionId": WHATSAPP_SESSION_ID,
            "groupId": group_id,
            "caption": caption
        }
        headers = {"x-api-key": WHATSAPP_API_KEY}

        logger.info(f"Sending to WhatsApp: {group_id}")
        res = requests.post(WHATSAPP_API_URL, headers=headers, files=files, data=data, timeout=120)

    logger.info(f"WhatsApp status: {res.status_code} | {res.text}")

    if res.status_code not in (200, 201):
        raise Exception(f"WhatsApp send failed: {res.status_code} | {res.text}")

    try:
        os.remove(image_path)
    except Exception:
        pass


# ============================================================
# SHARED: SLA Report processing
# ============================================================
def _process_sla_report(raw_df):
    raw_df.columns = [str(c).strip() for c in raw_df.columns]

    header_map = {
        'client name': 'Client Name', 'client': 'Client Name',
        'offered': 'Offered', 'answered': 'Handled', 'handled': 'Handled',
        'sl% (20 sec)': 'SL% (20 Sec)', 'sl': 'SL% (20 Sec)',
        'al': 'AL', 'abandon': 'Total Calls Abandoned',
        'abandoned': 'Total Calls Abandoned',
        'total calls abandoned': 'Total Calls Abandoned',
        'rl%': 'RL%', 'rl': 'RL%',
        'tagging': 'Total Number Of Tagging',
        'total number of tagging': 'Total Number Of Tagging'
    }
    raw_df.rename(columns=lambda x: header_map.get(x.lower(), x), inplace=True)

    required = ['Client Name', 'Offered', 'Handled', 'SL% (20 Sec)',
                'AL', 'Total Calls Abandoned', 'RL%', 'Total Number Of Tagging']
    for col in required:
        if col not in raw_df.columns:
            raw_df[col] = 0
    df = raw_df[required].copy()

    df['_al'] = df['AL'].astype(str).str.replace('%', '', regex=False).str.strip().replace('', '0').astype(float)
    mask_total = df['Client Name'].astype(str).str.lower().str.contains('total|grand', na=False)
    data_rows = df[~mask_total].sort_values('_al', ascending=True)
    total_rows = df[mask_total]
    df = pd.concat([data_rows, total_rows]).drop(columns=['_al']).reset_index(drop=True)

    return df


def _fetch_sla_excel(sd_type):
    token = get_auth_token()
    today = datetime.now().strftime("%Y-%m-%d")

    url = f"{CRM_BASE}/sla_clientwise_report_excel"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "from_date": today, "to_date": today,
        "company_id": "ALL", "sd_type": sd_type,
        "filter_type": "without_0"
    }

    logger.info(f"Fetching SLA report (sd_type={sd_type}) for {today}")
    res = requests.post(url, json=payload, headers=headers, timeout=300)
    if res.status_code != 200:
        raise Exception(f"Fetch failed ({res.status_code}): {res.text}")

    return pd.read_excel(io.BytesIO(res.content))


def _build_sla_rows(df):
    headers = ['Client Name', 'Offered', 'Handled', 'SL% (20 Sec)',
               'AL', 'Total Calls Abandoned', 'RL%', 'Total Number Of Tagging']
    col_widths = [280, 80, 80, 100, 80, 140, 80, 160]

    rows = []
    total_idx = None
    for i, (_, r) in enumerate(df.iterrows()):
        name = str(r['Client Name'])
        if 'total' in name.lower() or 'grand' in name.lower():
            total_idx = i
        rows.append([
            name,
            str(r['Offered']), str(r['Handled']), str(r['SL% (20 Sec)']),
            str(r['AL']), str(r['Total Calls Abandoned']),
            str(r['RL%']), str(r['Total Number Of Tagging'])
        ])

    return rows, total_idx, headers, col_widths


SLA_LEGEND = [
    ((45, 143, 92), "Excellent"), ((107, 203, 119), "Good"),
    ((255, 217, 61), "Average"), ((255, 165, 0), "Poor"),
    ((255, 107, 107), "Very Poor"), ((255, 0, 0), "Critical"),
]


# ============================================================
# REPORT 1: CLIENT WISE SLA
# ============================================================
def run_client_wise_sla(group_id):
    raw_df = _fetch_sla_excel(sd_type="1")
    df = _process_sla_report(raw_df)
    rows, total_idx, headers, col_widths = _build_sla_rows(df)

    date_display = datetime.now().strftime("%d %b %Y")
    img_path = create_table_image(
        title="Client Wise SLA Report",
        subtitle=f"Date: {date_display} | Sorted by AL % (Lowest to Highest)",
        headers=headers, rows=rows, col_widths=col_widths,
        highlight_cols={3: "percent", 4: "percent", 6: "percent"},
        total_row_index=total_idx, output_prefix="sla_report",
        legend=SLA_LEGEND
    )
    send_whatsapp_image(img_path, "Client Wise SLA Report", group_id)
    return True


# ============================================================
# REPORT 2: IB DEDICATED SLA
# ============================================================
def run_ib_dedicated_sla(group_id):
    raw_df = _fetch_sla_excel(sd_type="0")
    df = _process_sla_report(raw_df)
    rows, total_idx, headers, col_widths = _build_sla_rows(df)

    date_display = datetime.now().strftime("%d %b %Y")
    img_path = create_table_image(
        title="IB Dedicated SLA Report",
        subtitle=f"Date: {date_display} | Sorted by AL % (Lowest to Highest)",
        headers=headers, rows=rows, col_widths=col_widths,
        highlight_cols={3: "percent", 4: "percent", 6: "percent"},
        total_row_index=total_idx, output_prefix="ib_sla_report",
        legend=SLA_LEGEND
    )
    send_whatsapp_image(img_path, "IB Dedicated SLA Report", group_id)
    return True


# ============================================================
# SHARED: Slot-wise fetch
# ============================================================
def _fetch_slot_wise_hourly(client_id, sd_type="Shared"):
    token = get_auth_token()
    today = datetime.now().strftime("%Y-%m-%d")

    url = f"{CRM_BASE}/sla/slot-wise-utilization"
    params = {"startdate": today, "enddate": today,
              "clientID": client_id, "sd_type": sd_type}
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    logger.info(f"Fetching slot-wise for clientID={client_id}, sd_type={sd_type}")
    res = requests.get(url, params=params, headers=headers, timeout=300)
    if res.status_code != 200:
        raise Exception(f"Slot-wise fetch failed ({res.status_code}): {res.text}")

    json_data = res.json()

    hourly_obj = None
    if isinstance(json_data, dict):
        if isinstance(json_data.get("data"), dict):
            hourly_obj = json_data["data"].get(today)
            if not hourly_obj:
                keys = list(json_data["data"].keys())
                hourly_obj = json_data["data"].get(keys[0]) if keys else None
        elif json_data.get("result"):
            hourly_obj = json_data["result"]
        elif json_data.get("list"):
            hourly_obj = json_data["list"]
        else:
            hourly_obj = json_data

    hours = []
    if isinstance(hourly_obj, list):
        hours = hourly_obj
    elif isinstance(hourly_obj, dict):
        for hour_key, item in hourly_obj.items():
            if isinstance(item, dict):
                item["hour"] = hour_key
                hours.append(item)

    if not hours:
        raise Exception("No slot-wise data found")

    def to_num(v):
        if v is None or v == "":
            return 0
        try:
            return float(str(v).replace("%", "").strip()) or 0
        except Exception:
            return 0

    data_rows = []
    for h in hours:
        hour = h.get("hour") or h.get("Hour") or ""
        offered = to_num(h.get("Total") or h.get("total") or 0)
        handled = to_num(h.get("Answered") or h.get("answered") or 0)
        manpower = to_num(h.get("Manpower") or h.get("manpower") or 0)
        al = (handled / offered * 100) if offered > 0 else 0
        sl = to_num(h.get("SL %") or h.get("sl") or 0)
        rl = to_num(h.get("RL %") or h.get("rl") or 0)

        if offered > 0:
            data_rows.append([hour, offered, handled, manpower, al, sl, rl])

    if not data_rows:
        raise Exception("No rows with offered > 0")

    total_offered = sum(r[1] for r in data_rows)
    total_handled = sum(r[2] for r in data_rows)
    total_manpower = sum(r[3] for r in data_rows)
    sl_weighted = sum(r[5] * r[1] for r in data_rows)
    rl_weighted = sum(r[6] * r[1] for r in data_rows)

    total_al = (total_handled / total_offered * 100) if total_offered > 0 else 0
    total_sl = (sl_weighted / total_offered) if total_offered > 0 else 0
    total_rl = (rl_weighted / total_offered) if total_offered > 0 else 0

    data_rows.append(["Grand Total", total_offered, total_handled,
                      total_manpower, total_al, total_sl, total_rl])

    return data_rows


def _build_hourly_rows(data_rows):
    headers = ['Hour', 'Offered', 'Handled', 'Manpower', 'AL %', 'SL %', 'RL %']
    col_widths = [120, 110, 110, 110, 120, 120, 120]

    rows = []
    total_idx = None
    for i, r in enumerate(data_rows):
        if str(r[0]).lower() == "grand total":
            total_idx = i
        rows.append([
            str(r[0]), str(r[1]), str(r[2]), str(r[3]),
            f"{r[4]:.2f}%", f"{r[5]:.2f}%", f"{r[6]:.2f}%"
        ])

    return rows, total_idx, headers, col_widths


# ============================================================
# REPORT 3: FORTUM HOURLY
# ============================================================
def run_fortum_hourly(group_id):
    data_rows = _fetch_slot_wise_hourly(client_id=395, sd_type="Shared")
    rows, total_idx, headers, col_widths = _build_hourly_rows(data_rows)

    date_display = datetime.now().strftime("%d %b %Y")
    img_path = create_table_image(
        title="Fortum Hourly Report",
        subtitle=f"Date: {date_display} | Client: Fortum | Type: Shared",
        headers=headers, rows=rows, col_widths=col_widths,
        highlight_cols={4: "percent", 5: "percent", 6: "percent"},
        total_row_index=total_idx, output_prefix="fortum_hourly",
        legend=[
            ((255, 107, 107), "AL<50%"), ((255, 165, 0), "50-80%"),
            ((255, 217, 61), "80-95%"), ((107, 203, 119), "AL>=95%"),
        ]
    )
    send_whatsapp_image(img_path, f"Fortum Hourly Report - {date_display}", group_id)
    return True


# ============================================================
# REPORT 4: HOURLY WISE (All Clients)
# ============================================================
def run_hourly_wise(group_id):
    data_rows = _fetch_slot_wise_hourly(client_id="All", sd_type="Shared")
    rows, total_idx, headers, col_widths = _build_hourly_rows(data_rows)

    date_display = datetime.now().strftime("%d %b %Y")
    img_path = create_table_image(
        title="Hourly Wise Report",
        subtitle=f"Date: {date_display} | Client: All | Type: Shared",
        headers=headers, rows=rows, col_widths=col_widths,
        highlight_cols={4: "percent", 5: "percent", 6: "percent"},
        total_row_index=total_idx, output_prefix="hourly_wise",
        legend=[
            ((255, 107, 107), "AL<50%"), ((255, 165, 0), "50-80%"),
            ((255, 217, 61), "80-95%"), ((107, 203, 119), "AL>=95%"),
        ]
    )
    send_whatsapp_image(img_path, f"Hourly Wise Report - {date_display}", group_id)
    return True


# ============================================================
# REPORT 8: CRYSTAL SLOT WISE SLA (clientID=656, Dedicated)
# ============================================================
def run_crystal_slot_wise(group_id):
    """Crystal Slot Wise SLA — clientID=656, sd_type=Dedicated"""
    data_rows = _fetch_slot_wise_hourly(client_id=656, sd_type="Dedicated")

    # Sort by hour ascending, Grand Total last
    def sort_key(r):
        if str(r[0]).lower() == "grand total":
            return 99999
        try:
            return float(str(r[0]).strip())
        except Exception:
            return 99998

    data_rows.sort(key=sort_key)

    rows, total_idx, headers, col_widths = _build_hourly_rows(data_rows)

    date_display = datetime.now().strftime("%d %b %Y")
    img_path = create_table_image(
        title="Slot Wise SLA Report",
        subtitle=f"Date: {date_display} | Client ID: 656 | Type: Dedicated",
        headers=headers, rows=rows, col_widths=col_widths,
        highlight_cols={4: "percent", 5: "percent", 6: "percent"},
        total_row_index=total_idx, output_prefix="crystal_slot_wise",
        legend=[
            ((255, 107, 107), "AL<50%"), ((255, 165, 0), "50-80%"),
            ((255, 217, 61), "80-95%"), ((107, 203, 119), "AL>=95%"),
        ]
    )
    send_whatsapp_image(img_path, f"Slot Wise SLA Report - {date_display}", group_id)
    return True


# ============================================================
# Roam Prime helpers
# ============================================================
def _fetch_roam_prime_data(token, date_api):
    url = f"{CRM_BASE}/call/outcalls"
    params = [
        ("CLIENT_ID", "682"),
        ("campaignType", "RoamPrimeOB0001"),
        ("campaign", "699"),
        ("allocation", "10259"),
        ("allocation", "10342"),
        ("allocation", "10354"),
        ("allocation", "10362"),
        ("allocation", "10365"),
        ("allocation", "10377"),
        ("allocation", "10381"),
        ("startDate", date_api),
        ("endDate", date_api),
    ]
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    res = requests.get(url, params=params, headers=headers, timeout=300)
    if res.status_code != 200:
        raise Exception(f"Roam Prime fetch failed ({res.status_code}): {res.text}")

    return res.json().get("data") or []


# ============================================================
# REPORT 5: ROAM PRIME HOURLY
# ============================================================
def run_roam_prime_hourly(group_id):
    token = get_auth_token()
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    date_header = now.strftime("%d-%b-%Y")
    hour_label = now.strftime("%H:00")

    data = _fetch_roam_prime_data(token, today)
    if not data:
        raise Exception("No Roam Prime data found")

    call_created_order = []
    call_created_set = set()
    scenario_map = {}
    scenario_order = []
    sub_scenario_order = {}
    sub_scenario_set = {}

    def clean(v):
        return "" if v is None else str(v).strip()

    for row in data:
        scenario = clean(row.get("scenario"))
        sub_scenario = clean(row.get("subScenario1"))
        call_created = clean(row.get("Call Created"))

        if not scenario:
            continue

        call_key = call_created or "Unknown"

        if call_key not in call_created_set:
            call_created_set.add(call_key)
            call_created_order.append(call_key)

        if scenario not in scenario_map:
            scenario_map[scenario] = {"total": {}, "subs": {}}
            scenario_order.append(scenario)
            sub_scenario_order[scenario] = []
            sub_scenario_set[scenario] = set()

        scenario_map[scenario]["total"][call_key] = scenario_map[scenario]["total"].get(call_key, 0) + 1

        if sub_scenario:
            if sub_scenario not in scenario_map[scenario]["subs"]:
                scenario_map[scenario]["subs"][sub_scenario] = {}
            scenario_map[scenario]["subs"][sub_scenario][call_key] = (
                scenario_map[scenario]["subs"][sub_scenario].get(call_key, 0) + 1
            )
            if sub_scenario not in sub_scenario_set[scenario]:
                sub_scenario_set[scenario].add(sub_scenario)
                sub_scenario_order[scenario].append(sub_scenario)

    call_created_order.sort()

    matrix = []
    matrix.append([date_header] + call_created_order + ["Grand Total"])
    grand_total_per_col = {k: 0 for k in call_created_order}

    for scenario in scenario_order:
        scenario_row = [scenario]
        scenario_total = 0
        for k in call_created_order:
            val = scenario_map[scenario]["total"].get(k, 0)
            scenario_row.append(val if val else "")
            scenario_total += val
            grand_total_per_col[k] += val
        scenario_row.append(scenario_total)
        matrix.append(scenario_row)

        for sub in sub_scenario_order[scenario]:
            sub_row = [sub]
            sub_total = 0
            for k in call_created_order:
                val = scenario_map[scenario]["subs"][sub].get(k, 0)
                sub_row.append(val if val else "")
                sub_total += val
            sub_row.append(sub_total)
            matrix.append(sub_row)

    grand_row = ["Grand Total"]
    row_total = 0
    for k in call_created_order:
        grand_row.append(grand_total_per_col[k] if grand_total_per_col[k] else "")
        row_total += grand_total_per_col[k]
    grand_row.append(row_total)
    matrix.append(grand_row)

    num_data_cols = len(call_created_order) + 1
    other_col_width = 140 if num_data_cols <= 4 else 120

    img_path = create_matrix_image(
        title="Roam Prime Tagged Calls Summary",
        subtitle=f"Date: {date_header} | Hour: {hour_label}",
        rows=matrix, first_col_width=380, other_col_width=other_col_width,
        output_prefix="roam_prime_hourly",
        header_bg=(120, 152, 58),
        highlight_labels=["Buy Lead", "Sell Lead"],
    )
    send_whatsapp_image(img_path, f"Roam Prime Hourly Report - {hour_label}", group_id)
    return True


# ============================================================
# REPORT 6: ROAM PRIME DAILY
# ============================================================
def run_roam_prime_daily(group_id):
    token = get_auth_token()
    now = datetime.now()
    today = now.strftime("%Y-%m-%d")
    date_header = now.strftime("%d-%b-%Y")

    data = _fetch_roam_prime_data(token, today)
    if not data:
        raise Exception("No Roam Prime data found")

    scenario_map = {}
    scenario_order = []
    grand_total = 0

    def clean(v):
        return "" if v is None else str(v).strip()

    for row in data:
        scenario = clean(row.get("scenario"))
        sub_scenario = clean(row.get("subScenario1"))

        if not scenario:
            continue

        if scenario not in scenario_map:
            scenario_map[scenario] = {"total": 0, "subs": {}, "subs_order": []}
            scenario_order.append(scenario)

        scenario_map[scenario]["total"] += 1
        grand_total += 1

        if sub_scenario:
            if sub_scenario not in scenario_map[scenario]["subs"]:
                scenario_map[scenario]["subs"][sub_scenario] = 0
                scenario_map[scenario]["subs_order"].append(sub_scenario)
            scenario_map[scenario]["subs"][sub_scenario] += 1

    rows = [[date_header, "Count Of Tagged Calls"]]
    for scenario in scenario_order:
        rows.append([scenario, scenario_map[scenario]["total"]])
        for sub in scenario_map[scenario]["subs_order"]:
            rows.append([sub, scenario_map[scenario]["subs"][sub]])
    rows.append(["Grand Total", grand_total])

    report = {
        "headers": [str(rows[0][0]), str(rows[0][1])],
        "rows": [
            {"cells": [str(r[0]), str(r[1])],
             "highlight": str(r[0]) == "Grand Total"}
            for r in rows[1:]
        ]
    }

    img_path = create_simple_2col_image(
        report=report,
        report_name="Roam Prime Tagged Calls Summary",
        date_display=date_header,
        output_prefix="roam_prime_daily",
    )

    send_whatsapp_image(img_path, "EOD REPORT", group_id)
    return True


# ============================================================
# CRYSTAL EOD — HELPERS
# ============================================================
def _crystal_fetch_call_data(token, date_str):
    url = f"{CRM_BASE}/call/call-master/{CRYSTAL_CLIENT_ID}"
    params = {
        "client_id": CRYSTAL_CLIENT_ID,
        "from_date": date_str,
        "to_date": date_str,
        "in_call_action": "",
        "Category1": "",
        "Category2": "",
        "Category3": "",
        "Category4": "",
        "Category5": "",
    }
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    res = requests.get(url, params=params, headers=headers, timeout=300)
    if res.status_code != 200:
        raise Exception(f"Crystal call data failed ({res.status_code}): {res.text}")

    json_data = res.json()
    if isinstance(json_data, list):
        return json_data
    return json_data.get("data") or json_data.get("result") or json_data.get("records") or []


def _crystal_fetch_apr_data(token, date_str):
    url = f"{CRM_BASE}/apr-report/xlsx"
    params = {
        "query_date": date_str,
        "end_date": date_str,
        "agent_type": "All",
        "process": "IB Dedicated",
        "shift": "ALL",
    }
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    try:
        logger.info(f"Fetching Crystal APR for {date_str}")
        res = requests.get(url, params=params, headers=headers, timeout=300)
        if res.status_code != 200:
            logger.warning(f"APR API returned {res.status_code}")
            return []

        df = pd.read_excel(io.BytesIO(res.content))
        if df.empty or len(df.columns) < 2:
            return []

        agent_col = None
        calls_col = None
        for col in df.columns:
            c = str(col).lower().strip()
            if agent_col is None and ("agent" in c or "name" in c):
                agent_col = col
            if calls_col is None and ("call" in c):
                calls_col = col

        if agent_col is None or calls_col is None:
            logger.warning(f"APR columns not found. Cols: {list(df.columns)}")
            return []

        result = []
        for _, row in df.iterrows():
            name = str(row[agent_col] or "").strip()
            if not name:
                continue
            try:
                calls = int(float(row[calls_col] or 0))
            except Exception:
                calls = 0
            if name.lower() in CRYSTAL_TARGET_AGENTS:
                result.append({"Agent Name": name, "Calls": calls})

        logger.info(f"APR: Found {len(result)} target agents")
        return result

    except Exception as e:
        logger.error(f"APR error: {e}", exc_info=True)
        return []


def _crystal_fetch_ob_shared_cdr(token, date_str):
    url = f"{CRM_BASE}/report/ob_shared_cdr_report"
    payload = {"company_id": CRYSTAL_CLIENT_ID,
               "from_date": date_str, "to_date": date_str}
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=300)
        if res.status_code != 200:
            return []
        json_data = res.json()
        if isinstance(json_data, list):
            return json_data
        return json_data.get("data") or json_data.get("result") or json_data.get("records") or []
    except Exception as e:
        logger.error(f"OB shared CDR error: {e}")
        return []


def _crystal_fetch_ob_cdr(token, date_str):
    url = f"{CRM_BASE}/report/ob_cdr_report"
    payload = {"company_id": CRYSTAL_CLIENT_ID,
               "from_date": date_str, "to_date": date_str}
    headers = {"Authorization": f"Bearer {token}", "accept": "application/json"}

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=300)
        if res.status_code != 200:
            return []
        json_data = res.json()
        if isinstance(json_data, list):
            return json_data
        return json_data.get("data") or json_data.get("result") or json_data.get("records") or []
    except Exception as e:
        logger.error(f"OB CDR error: {e}")
        return []


def _crystal_extract_call_type(row):
    for key in ("CallType", "callType", "Call Type", "call_type",
                "Status", "status", "Call Status", "call_status"):
        if key in row and row[key]:
            return str(row[key])
    return "Uncategorized"


def _crystal_extract_value(row):
    for key in ("Count", "count", "Total", "total",
                "Value", "value", "Call Count", "call_count"):
        if key in row and row[key] not in (None, ""):
            try:
                return float(row[key])
            except Exception:
                continue
    return 1


# ============================================================
# CRYSTAL EOD — REPORT BUILDERS
# ============================================================
def _crystal_build_report1(data):
    m = {}
    total = 0
    for row in data:
        cat = row.get("Category1") or row.get("category1") or "Uncategorized"
        m[cat] = m.get(cat, 0) + 1
        total += 1

    rows = []
    order = ["Appointments Booked", "Abandoned Call Back", "Inquiry Call",
             "Other", "Request", "Ticket Raised"]
    for key in order:
        if key in m:
            rows.append({"cells": [key, m.pop(key)]})
    for key in sorted(m.keys()):
        rows.append({"cells": [key, m[key]]})
    rows.append({"cells": ["Grand Total", total], "highlight": True})

    return {"title": "Call Scenario by Category 1",
            "headers": ["Call Scenario", "Count"], "rows": rows}


def _crystal_build_report2(data):
    filtered = [r for r in data
                if str(r.get("Category1") or r.get("category1") or "").lower() == "other"]
    m = {}
    for row in filtered:
        cat = row.get("Category2") or row.get("category2") or "Uncategorized"
        m[cat] = m.get(cat, 0) + 1

    rows = []
    order = ["Other", "Blank Call", "Call disconnected between conversation", "Wrong Number"]
    for key in order:
        if key in m:
            rows.append({"cells": [key, m.pop(key)]})
    for key in sorted(m.keys()):
        rows.append({"cells": [key, m[key]]})
    rows.append({"cells": ["Grand Total", len(filtered)], "highlight": True})

    return {"title": "Other Category Breakdown",
            "headers": ["Call Scenario", "Count"], "rows": rows}


def _crystal_build_report3(data):
    m = {}
    total = 0
    for row in data:
        cat = (row.get("Consultation Mode?")
               or row.get("ConsultationMode")
               or row.get("consultationMode")
               or row.get("consultation_mode")
               or "Uncategorized")
        m[cat] = m.get(cat, 0) + 1
        total += 1

    rows = []
    order = ["Dr. AB", "Emergency Booking", "Fastrack/VIP Booking",
             "General Ophthalmology", "Other ( No Booking )"]
    for key in order:
        if key in m:
            rows.append({"cells": [key, m.pop(key)]})
    for key in sorted(m.keys()):
        rows.append({"cells": [key, m[key]]})
    rows.append({"cells": ["Grand Total", total], "highlight": True})

    return {"title": "Consultation Category Breakdown",
            "headers": ["Consultation Category", "Count"], "rows": rows}


def _crystal_build_report4(data):
    filtered = []
    for r in data:
        cons = (r.get("Consultation Mode?")
                or r.get("ConsultationMode")
                or r.get("consultationMode")
                or r.get("consultation_mode")
                or "")
        cl = str(cons).lower()
        if "other" in cl and "no booking" in cl:
            filtered.append(r)

    m = {}
    for row in filtered:
        cat = row.get("Category2") or row.get("category2") or "Uncategorized"
        m[cat] = m.get(cat, 0) + 1

    rows = []
    order = [
        "Other ( No Booking )", "Abandoned Call Back", "Appointment Cancellation",
        "Appointment Confirmation", "Blank Call", "Call disconnected between conversation",
        "discussion on a call with a counselor", "General Consultation", "Investigation Enquiry",
        "Other", "Pre Operative Inquires", "Reshedule Appointment",
        "Specialist Appointment Consultation", "Timings of the Centre", "Timings of the Director",
        "Wrong Number"
    ]
    for key in order:
        if key in m:
            rows.append({"cells": [key, m.pop(key)]})
    for key in sorted(m.keys()):
        rows.append({"cells": [key, m[key]]})
    rows.append({"cells": ["Grand Total", len(filtered)], "highlight": True})

    return {"title": "Other (No Booking) Consultation Breakdown",
            "headers": ["Consultation Mode", "Count"], "rows": rows}


def _crystal_build_report5(apr_data):
    if not apr_data:
        return {"title": "APR - Agent Performance",
                "headers": ["Agent Name", "Calls"],
                "rows": [{"cells": ["No Data Available", 0]}]}

    rows = []
    for row in apr_data:
        name = row.get("Agent Name", "Unknown")
        try:
            calls = int(row.get("Calls", 0))
        except Exception:
            calls = 0
        rows.append({"cells": [name, calls], "_sort": calls})

    rows.sort(key=lambda x: x["_sort"], reverse=True)
    total = 0
    for r in rows:
        total += r["_sort"]
        del r["_sort"]
    rows.append({"cells": ["Grand Total", total], "highlight": True})

    return {"title": "APR - Agent Performance",
            "headers": ["Agent Name", "Calls"], "rows": rows}


def _crystal_build_report6(shared_data, ob_data):
    m = {}
    total = 0

    for dataset in (shared_data or [], ob_data or []):
        for row in dataset:
            if not row:
                continue
            ct = _crystal_extract_call_type(row)
            val = _crystal_extract_value(row)
            if val > 0:
                m[ct] = m.get(ct, 0) + val
                total += val

    rows = []
    for key in ("Connected", "Not Connected"):
        if key in m:
            rows.append({"cells": [key, m.pop(key)]})
    for key in sorted(m.keys()):
        rows.append({"cells": [key, m[key]]})

    if not rows:
        rows = [
            {"cells": ["Connected", 0]},
            {"cells": ["Not Connected", 0]},
        ]
    rows.append({"cells": ["Grand Total", total], "highlight": True})

    return {"title": "Abandoned & Disconnection Callback",
            "headers": ["Call Type", "Count"], "rows": rows}


# ============================================================
# REPORT 7: CRYSTAL EOD (6 sub-reports, 9:30 PM)
# ============================================================
def run_crystal_eod(group_id):
    logger.info("Crystal EOD report started")

    token = get_auth_token()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    date_display = now.strftime("%d-%b-%Y")

    logger.info(f"Crystal EOD date: {date_str}")

    try:
        call_data = _crystal_fetch_call_data(token, date_str)
    except Exception as e:
        logger.warning(f"Call data failed: {e}")
        call_data = []

    apr_data = _crystal_fetch_apr_data(token, date_str)
    ob_shared = _crystal_fetch_ob_shared_cdr(token, date_str)
    ob_data = _crystal_fetch_ob_cdr(token, date_str)

    logger.info(f"Crystal data: calls={len(call_data)}, apr={len(apr_data)}, "
                f"ob_shared={len(ob_shared)}, ob={len(ob_data)}")

    reports = [
        (_crystal_build_report1(call_data), "Call Scenario by Category 1"),
        (_crystal_build_report2(call_data), "Other Category Breakdown"),
        (_crystal_build_report3(call_data), "Consultation Category Breakdown"),
        (_crystal_build_report4(call_data), "Other (No Booking) Consultation"),
        (_crystal_build_report5(apr_data), "APR - Agent Performance"),
        (_crystal_build_report6(ob_shared, ob_data), "Abandoned & Disconnection Callback"),
    ]

    sent_count = 0
    for report, report_name in reports:
        if not report or not report.get("rows"):
            logger.warning(f"Skipping {report_name}: no rows")
            continue

        try:
            logger.info(f"Sending Crystal: {report_name}")
            img_path = create_simple_2col_image(
                report=report,
                report_name=report_name,
                date_display=date_display,
                output_prefix="crystal_eod",
            )
            caption = f"Crystal EOD - {report_name} | {date_display}"
            send_whatsapp_image(img_path, caption, group_id)
            sent_count += 1
            import time
            time.sleep(3)
        except Exception as e:
            logger.error(f"Crystal send failed ({report_name}): {e}", exc_info=True)

    logger.info(f"Crystal EOD completed — {sent_count}/6 reports sent")
    if sent_count == 0:
        raise Exception("Crystal EOD: no reports were sent successfully")

    return True


# ============================================================
# REPORT REGISTRY — 8 reports
# ============================================================
REPORT_HANDLERS = {
    "client_wise_sla": {
        "name": "Client Wise SLA Report",
        "handler": run_client_wise_sla,
        "default_group": "120363047345397502@g.us",
        "default_schedule_hours": 2,
        "is_cron": False,
    },
    "ib_dedicated_sla": {
        "name": "IB Dedicated SLA Report",
        "handler": run_ib_dedicated_sla,
        "default_group": "120363047345397502@g.us",
        "default_schedule_hours": 2,
        "is_cron": False,
    },
    "fortum_hourly": {
        "name": "Fortum Hourly Report",
        "handler": run_fortum_hourly,
        "default_group": "120363047345397502@g.us",
        "default_schedule_hours": 2,
        "is_cron": False,
    },
    "hourly_wise": {
        "name": "Hourly Wise Report (All Clients)",
        "handler": run_hourly_wise,
        "default_group": "120363047345397502@g.us",
        "default_schedule_hours": 2,
        "is_cron": False,
    },
    "roam_prime_hourly": {
        "name": "Roam Prime Hourly Summary",
        "handler": run_roam_prime_hourly,
        "default_group": "120363407114811705@g.us",
        "default_schedule_hours": 1,
        "is_cron": False,
    },
    "roam_prime_daily": {
        "name": "Roam Prime Daily Summary (EOD)",
        "handler": run_roam_prime_daily,
        "default_group": "120363409220356840@g.us",
        "default_schedule_hours": 24,
        "is_cron": True,
    },
    "crystal_eod": {
        "name": "Crystal EOD Report",
        "handler": run_crystal_eod,
        "default_group": "120363420464486987@g.us",
        "default_schedule_hours": 24,
        "is_cron": True,
    },
    "crystal_slot_wise": {
        "name": "Slot Wise SLA Report (Crystal)",
        "handler": run_crystal_slot_wise,
        "default_group": "120363420464486987@g.us",
        "default_schedule_hours": 24,
        "is_cron": True,
    },
}


# ============================================================
# UNIVERSAL RUNNER
# ============================================================
def run_report(report_key, group_id=None):
    if report_key not in REPORT_HANDLERS:
        raise Exception(f"Unknown report: {report_key}")

    config = REPORT_HANDLERS[report_key]
    group_id = group_id or config["default_group"]

    logger.info(f"Starting report: {report_key}")
    config["handler"](group_id=group_id)
    logger.info(f"Report completed: {report_key}")
    return True


def run_client_wise_sla_report(group_id="120363047345397502@g.us"):
    return run_report("client_wise_sla", group_id=group_id)