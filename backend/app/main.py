from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.market_data import run_market_data_pipeline
from app.services.pattern_detector import run_pattern_detector
from app.services.confluence_scorer import run_confluence_scorer
from app.services.opportunity_radar import run_opportunity_radar
from app.services.corporate_events import run_corporate_events_pipeline

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(run_market_data_pipeline, 'interval', minutes=15, id='market_data_job')
    scheduler.add_job(run_pattern_detector, 'interval', minutes=15, id='pattern_job', max_instances=1)
    scheduler.add_job(run_corporate_events_pipeline, 'interval', minutes=60, id='corporate_events_job', max_instances=1)
    scheduler.add_job(run_confluence_scorer, 'interval', minutes=15, id='scorer_job', max_instances=1)
    scheduler.add_job(run_opportunity_radar, 'interval', minutes=15, id='radar_job', max_instances=1)
    # Signal expiry: runs every day at midnight IST (18:30 UTC)
    from app.api.endpoints import expire_old_signals
    scheduler.add_job(expire_old_signals, 'cron', hour=18, minute=30, id='signal_expiry_job')
    scheduler.start()
    
    # Run once immediately on startup sequentially to seed DB
    await run_market_data_pipeline()
    await run_corporate_events_pipeline()
    await run_pattern_detector()
    await run_confluence_scorer()
    await run_opportunity_radar()
    
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
