from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="InvestorRadar API", version="1.0.0")

# Configure CORS (Though Nginx proxy should handle most of this in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import endpoints
from app.db.database import engine, Base

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app.include_router(endpoints.router)
