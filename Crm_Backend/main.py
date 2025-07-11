from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from auth import router as auth_router
from reports import router as reports_router
from core_api import router as core_api
from call_master import router as call_master_router



app = FastAPI(title="CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(reports_router, prefix="/report", tags=["Reports"])
app.include_router(core_api, prefix="/core_api", tags=["core_api"])
app.include_router(call_master_router, prefix="/call", tags=["Call Master"])
