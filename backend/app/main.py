from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.market_data import run_market_data_pipeline

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(run_market_data_pipeline, 'interval', minutes=15, id='market_data_job')
    scheduler.start()
    
    # Run once immediately on startup
    await run_market_data_pipeline()
    
    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(
    title="InvestorRadar API",
    description="AI-powered market intelligence platform API",
    version="1.0.0",
    lifespan=lifespan
)

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "InvestorRadar API is running",
        "version": "1.0.0"
    }

from app.api.endpoints import router as api_router
app.include_router(api_router, prefix="/api")
