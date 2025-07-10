from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from auth import router as auth_router
from reports import router as reports_router

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
