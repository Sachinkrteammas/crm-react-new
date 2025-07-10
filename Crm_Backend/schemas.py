from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    message: str
    access_token: str
    company_id: int
    auth_person: str


class CallMasterRecord(BaseModel):
    Id: int
    client_id: int
    DeptId: Optional[int] = None
    UserType: Optional[str] = None
    RefrenceId: Optional[int] = None
    ContactId: Optional[int] = None
    SubTagType: Optional[str] = None
    TagStatus: Optional[int] = None
    campaign_id: Optional[int] = None
    SrNo: Optional[int] = None
    MSISDN: Optional[int] = None
    Subject: Optional[str] = None
    AgentId: Optional[int] = None
    priority: Optional[str] = None
    CallDate: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_tat_defined: Optional[bool] = None
    tat: Optional[str] = None
    tat_status: Optional[int] = None
    tat_date: Optional[datetime] = None
    Category1: Optional[str] = None
    Category2: Optional[str] = None
    Category3: Optional[str] = None
    Category4: Optional[str] = None
    Category5: Optional[str] = None
    Field1: Optional[str] = None
    Field2: Optional[str] = None
    Field3: Optional[str] = None
    Field4: Optional[str] = None
    Field5: Optional[str] = None
    Field6: Optional[str] = None
    Field7: Optional[str] = None
    Field8: Optional[str] = None
    Field9: Optional[str] = None
    Field10: Optional[str] = None
    Field11: Optional[str] = None
    Field12: Optional[str] = None
    Field13: Optional[str] = None
    Field14: Optional[str] = None
    Field15: Optional[str] = None
    Field16: Optional[str] = None
    Field17: Optional[str] = None
    Field18: Optional[str] = None
    Field19: Optional[str] = None
    Field20: Optional[str] = None
    Field21: Optional[str] = None
    Field22: Optional[str] = None
    Field23: Optional[str] = None
    Field24: Optional[str] = None
    Field25: Optional[str] = None
    Field26: Optional[str] = None
    Field27: Optional[str] = None
    Field28: Optional[str] = None
    Field29: Optional[str] = None
    Field30: Optional[str] = None
    Field31: Optional[str] = None
    Field32: Optional[str] = None
    Field33: Optional[str] = None
    Field34: Optional[str] = None
    Field35: Optional[str] = None
    Field36: Optional[str] = None
    Field37: Optional[str] = None
    Field38: Optional[str] = None
    Field39: Optional[str] = None
    Field40: Optional[str] = None
    Field41: Optional[str] = None
    Field42: Optional[str] = None
    Field43: Optional[str] = None
    Field44: Optional[str] = None
    Field45: Optional[str] = None
    Field46: Optional[str] = None
    Field47: Optional[str] = None
    Field48: Optional[str] = None
    Field49: Optional[str] = None
    Field50: Optional[str] = None
    LeadId: Optional[int] = None
    close_loop: Optional[str] = None
    CloseLoopCate1: Optional[str] = None
    CloseLoopCate2: Optional[str] = None
    CloseLoopingDate: Optional[str] = None
    FollowupDate: Optional[str] = None
    closelooping_remarks: Optional[str] = None
    CloseLoopStatus: Optional[str] = None
    UpdateDate: Optional[datetime] = None
    emailSend: Optional[str] = None
    smsSend: Optional[str] = None
    escalation_no: Optional[int] = None
    escalation_status: Optional[str] = None
    CallType: Optional[str] = None
    TagType: Optional[str] = None
    Escalation: Optional[str] = None
    Escalation_date: Optional[str] = None
    Escalation1: Optional[str] = None
    Escalation1_date: Optional[str] = None
    Escalation2: Optional[str] = None
    Escalation2_date: Optional[str] = None
    Escalation3: Optional[str] = None
    Escalation3_date: Optional[str] = None
    duedate: Optional[str] = None
    callcreated: Optional[str] = None
    MailStatus: Optional[str] = None
    MailDateTime: Optional[str] = None
    CField1: Optional[str] = None
    CField2: Optional[str] = None
    CField3: Optional[str] = None
    CField4: Optional[str] = None
    CField5: Optional[str] = None
    CField6: Optional[str] = None
    CField7: Optional[str] = None
    CField8: Optional[str] = None
    CField9: Optional[str] = None
    CField10: Optional[str] = None
    CField11: Optional[str] = None
    CField12: Optional[str] = None
    CField13: Optional[str] = None
    CField14: Optional[str] = None
    CField15: Optional[str] = None
    CField16: Optional[str] = None
    CField17: Optional[str] = None
    CField18: Optional[str] = None
    CField19: Optional[str] = None
    CField20: Optional[str] = None
    CField21: Optional[str] = None
    CField22: Optional[str] = None
    CField23: Optional[str] = None
    CField24: Optional[str] = None
    CField25: Optional[str] = None
    CField26: Optional[str] = None
    CField27: Optional[str] = None
    CField28: Optional[str] = None
    CField29: Optional[str] = None
    CField30: Optional[str] = None
    CFieldUpdate: Optional[str] = None
    AbandLeadId: Optional[str] = None
    AbandStatus: Optional[str] = None
    AbandDate: Optional[str] = None
    Urandom: Optional[str] = None
    OrderNo: Optional[str] = None
    AWBNo: Optional[str] = None
    CCRCRDREF: Optional[str] = None
    DestinationArea: Optional[str] = None
    DestinationLocation: Optional[str] = None
    TokenNumber: Optional[str] = None
    AreaCode: Optional[str] = None
    AreaPincode: Optional[str] = None
    AreaPlace: Optional[str] = None
    AreaAddress: Optional[str] = None
    AreaServiceCenterCode: Optional[str] = None
    Ret_AWBNo: Optional[str] = None
    Ret_CCRCRDREF: Optional[str] = None
    Ret_DestinationArea: Optional[str] = None
    Ret_DestinationLocation: Optional[str] = None
    Ret_TokenNumber: Optional[str] = None
    Ret_PikupDate: Optional[str] = None
    OtherStatus: Optional[str] = None
    OtherId: Optional[str] = None
    OtherDate: Optional[str] = None
    OtherDiscription: Optional[str] = None
    CaseCloseBy: Optional[str] = None
    response_time: Optional[str] = None
    cat1: Optional[str] = None
    cat2: Optional[str] = None
    cat3: Optional[str] = None
    cat4: Optional[str] = None
    cat5: Optional[str] = None



