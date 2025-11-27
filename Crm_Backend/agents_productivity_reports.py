from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text



router = APIRouter(prefix="/agent-productivity", tags=["Agent Productivity Reports"])




