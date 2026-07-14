# recording_sync.py

import requests

from io import BytesIO
from mutagen.mp3 import MP3
from sqlalchemy import text

from database import get_db2


def get_last_id(db):
    row = db.execute(
        text(
            """
            SELECT last_recording_id
            FROM sync_status
            WHERE id = 1
            """
        )
    ).fetchone()

    return row[0] if row else 0


def save_last_id(db, recording_id):
    db.execute(
        text(
            """
            UPDATE sync_status
            SET last_recording_id = :recording_id
            WHERE id = 1
            """
        ),
        {
            "recording_id": recording_id
        }
    )

    db.commit()


def get_mp3_duration(url):
    try:
        response = requests.get(url, timeout=30)

        if response.status_code != 200:
            return None

        audio = MP3(BytesIO(response.content))

        return round(audio.info.length)

    except Exception:
        return None


def sync_recordings():

    db = next(get_db2())

    try:

        last_id = get_last_id(db)

        print(f"Starting from recording_id > {last_id}")

        query = text(
            """
            SELECT DISTINCT r.*
            FROM vicidial_closer_log v
            INNER JOIN recording_log r
                ON v.lead_id = r.lead_id
                AND v.user = r.user
            WHERE v.call_date >= '2026-07-01'
                AND v.campaign_id IN (
                    'Sotrue_IN','Sotrue_IN2','girish',                                                                                                   
                    'E_Motherson','H_Motherson',                                                                                
                    'DLF','DLF_OB','DLFDE000',                                                                                   
                    'lapcare','lapcare_sale','lapcare_support','RXinfotechFeedbackcalling',                                       
                    'Harvest_Food','Harvest_Food_Hindi','Harvest','Harvest_outbond',                                              
                    'AKAI_Hindi','AKAI','AKAI_Telugu',                                                                            
                    'Fortum','Fortum_O','Fortum_Remote',                                                                          
                    'IA_Sound_Healing','IASHO000','InternationalAc00000',                                                         
                    'Sandook_Sutras','Sandook_','Sandook_OB','Sando000','Sando001',                                               
                    'Travel_Port','Clubmahi',                                                                                     
                    'OMEGA_English','OMEGA_Hindi','OMEGA_OB',                                                                     
                    'Hybon_Elevators','Hybon_OB',                                                                                 
                    'Radian_OB','Radian_Book_Company','Radian_O',                                                                 
                    'Worksmart_Retail_LLP','wosh_OB1',                                                                            
                    'Perfect_Infinet',                                                                                            
                    'Zarf_Studio','Zarf_OB',                                                                                      
                    'Colorful',                                                                                                   
                    'Glac_OB','Glacier_Ceramic',                                                                                  
                    'Rajesh_Digital','Rajesh_Cable_TV','Rajesh_Internet',                                                         
                    'Alpino_Health_Foods',                                                                                        
                    'Charotar_Telelink',                                                                                          
                    'Indcool_Electricals',                                                                                        
                    'Medvital_Ventures','Medvi000',                                                                               
                    'DLF_Limited','DLF_OB','DLFDedicated_OB0000','DLF_OB5Dedicated',                                              
                    'Anest_Motherson_Eng','Anest_Motherson_Hin',                                                                  
                    'Usha_Shriram_New',                                                                                           
                    'GADREMARINEEXPO00000','Gadre000',                                                                            
                    'Multibyte_OB','MultybyteMarket00000','Multi001',                                                             
                    'EdenO000','EDENSDELICACIES00000',                                                                            
                    'GREENTOKRIFARMS00000','Green000',                                                                            
                    '63SATSCybertech00001','63SAT001','63SATS_OB','63CYBX0001','63CYB000',                                        
                    'FaboN000','faboe000','FaboIN0000','Fabonow0000','FaboinboundOB000','FaboOBH000','FaboOBF0000','FaboOBP000',  
                    'CAPTUREATRIPIND00000',                                                                                       
                    'PRITTECTECHNOLO00000',                                                                                       
                    'KLFNIRMALINDUST00001',                                                                                       
                    'Karaulidiagnostics0001','Karau0001',                                                                         
                    'Supr00001','Supr0000',                                                                                       
                    'FaboPristino00001',                                                                                          
                    'Weebo00001',                                                                                                 
                    'Hariom_IB','HariOM_OB','Hari000',                                                                            
                    'MAANIINBOUND'
                )
                AND v.user <> 'VDCL'
                AND r.recording_id > :last_id
            ORDER BY r.recording_id
            """
        )

        rows = db.execute(
            query,
            {
                "last_id": last_id
            }
        ).mappings().all()

        if not rows:
            print("No new records found")
            return

        print(f"Fetched {len(rows)} records")

        for row in rows:

            try:

                row = dict(row)

                date_folder = row["start_time"].strftime("%Y%m%d")

                mp3_url = (
                    f"http://192.168.10.3/"
                    f"192_168_10_5/"
                    f"{date_folder}/"
                    f"{row['filename']}-all.mp3"
                )

                actual_duration = get_mp3_duration(mp3_url)

                original_duration = row["length_in_sec"]

                row["original_length_in_sec"] = original_duration

                if actual_duration:
                    row["length_in_sec"] = actual_duration

                columns = ",".join(row.keys())

                placeholders = ",".join(
                    [f":{key}" for key in row.keys()]
                )

                insert_query = text(
                    f"""
                    REPLACE INTO recording_log_audio
                    ({columns})
                    VALUES
                    ({placeholders})
                    """
                )

                db.execute(insert_query, row)

                save_last_id(
                    db,
                    row["recording_id"]
                )

                print(
                    f"ID={row['recording_id']} | "
                    f"Old={original_duration} | "
                    f"Actual={actual_duration}"
                )

            except Exception as e:

                print(
                    f"ERROR ID={row['recording_id']} : {e}"
                )

        db.commit()

        print("Sync completed")

    finally:

        db.close()