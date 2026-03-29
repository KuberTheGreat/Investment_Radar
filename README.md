<div align="center">
  <h1>🎯 Investment Radar</h1>
  <p><strong>An AI-Powered Stock Market Intelligence Platform</strong></p>
  <p>Built for the ET AI Hackathon 2026, equipping retail investors in the Indian Stock Market with real-time technical trading signal detections, rich multi-factor confluence scoring, and an autonomous AI Market Advisor.</p>
</div>

---

## ✨ Key Features

- **📡 Real-Time Technical Pattern Scanners**: Automatically scans NSE stocks at 15-min intervals using `TA-Lib` for advanced charting patterns (Bullish Engulfing, MACD Divergence, RSI Overbought/Oversold, Moving Average Crossovers).
- **🧠 AI Confluence Scorer**: Generates an intelligent `0-3` scoring metric overlaying fundamental corporate data on top of pure technical momentum to find high-probability breakout opportunities.
- **💬 Streaming AI Market Advisor**: Interactive Chatbot native to the platform. Powered by **Groq / LLaMA 3.3**, acting as your personal Indian Market educator to explain jargon, digest charts, and suggest strategies in real-time.
- **⚡ High-Performance Architecture**: Scalable **FastAPI** backend with asynchronous workers utilizing **SQLAlchemy/Asyncpg** connected to a time-series **TimescaleDB** instance.
- **🎨 Next-Gen Glassmorphism Dashboard**: Fully responsive **Next.js 15 App Router** frontend. Features buttery-smooth layout animations (`framer-motion`), real-time interactive charting (`lightweight-charts`), and premium dark-mode aesthetics.
- **📚 RAG Knowledge Base**: Integrated **ChromaDB** vector storage backend to dynamically feed context about recent fundamental corporate events and market movements natively into the AI explaining engines.

## 🏗️ Architecture & Stack

| Layer          | Technology Choice                                                                                |
|----------------|--------------------------------------------------------------------------------------------------|
| **Frontend**   | Next.js, React 19, Tailwind CSS, Framer Motion, Lightweight Charts, React Query, Fetch Streams.  |
| **Backend API**| Python 3.11+, FastAPI, Uvicorn, SQLAlchemy, Asyncpg, Pydantic.                                   |
| **Database**   | TimescaleDB (PostgreSQL) for time-series signals & event logging.                                |
| **ML Engine**  | TA-Lib, Pandas, AsyncGroq Client, ChromaDB, Langchain concepts.                                  |
| **Infrastructure**| Docker & Docker Compose for zero-configuration backend booting.                              |

## 🚀 Getting Started

### 1. Environment Configuration

Copy the example environment settings to `.env.local` / `.env` in both the `backend` and `frontend-v2` directories:
```env
# Backend Required Variables
GROQ_API_KEY="gsk_..."  # Required for AI Features
DATABASE_URL="postgresql+asyncpg://investor_user:investor_password@db-host:5433/investorradar"
```

### 2. Booting the Backend (Docker)

The complete backend ecosystem (FastAPI, Context Scanners, Timescale Database) runs orchestrated in Docker Compose.

```bash
cd backend
docker compose up --build
```
> **Note:** The API will be available at `http://localhost:8000`. The pattern extraction orchestrator fires every 15 minutes automatically in the background.

### 3. Launching the Dashboard

The premium UI lives inside the `frontend-v2` directory.

```bash
cd frontend-v2
npm install
npm run dev
```
> Application becomes accessible at `http://localhost:3000`.

## 📂 Project Structure

- `/ml` - Core Machine Learning pipelines, pure Python backtesting modules, Vector DB scripts, and TA-Lib indicators engine.
- `/backend` - The fast and robust FastAPI endpoints routing the DB logic into the API structure.
- `/frontend-v2` - Our modern redesign of the client application (`frontend` contains deprecated v1 legacy structure).

---
<div align="center">
  <p>Engineered for retail resilience.</p>
</div>
