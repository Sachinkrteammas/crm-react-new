from fastapi import FastAPI
from auth import router as auth_router

app = FastAPI(title="CRM Backend")

# Register all routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
