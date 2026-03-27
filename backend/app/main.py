import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# ── Logging Configuration ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("investorradar")
from app.services.market_data import run_market_data_pipeline
from app.services.pattern_detector import run_pattern_detector
from app.services.confluence_scorer import run_confluence_scorer
from app.services.opportunity_radar import run_opportunity_radar
from app.services.corporate_events import run_corporate_events_pipeline
from app.services.broker_service import broker_service  # Angel One session singleton
from app.models.broker import BrokerSession  # Ensure Alembic autogenerates the migration

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
    # Angel One daily token refresh: 06:00 IST = 00:30 UTC, before NSE open
    scheduler.add_job(broker_service.refresh_session, 'cron', hour=0, minute=30, id='broker_refresh_job')
    scheduler.start()
    
    # Run once immediately on startup but in the background so the server can accept requests
    import asyncio
    async def seed_data():
        try:
            await run_market_data_pipeline()
            await run_corporate_events_pipeline()
            await run_pattern_detector()
            await run_confluence_scorer()
            await run_opportunity_radar()
        except Exception as e:
            print(f"Error during initial pipeline seed: {e}")
            
    asyncio.create_task(seed_data())
    
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

from app.api.auth import router as auth_router
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

from app.api.watchlist import router as watchlist_router
app.include_router(watchlist_router, prefix="/api/watchlist", tags=["watchlist"])

from app.api.broker import router as broker_router
app.include_router(broker_router, prefix="/api/broker", tags=["broker"])
