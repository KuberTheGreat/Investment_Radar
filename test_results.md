# Backend API Test Results

## Health Check
**URL:** `http://localhost:8000/health`

**Status:** `200`

**Response:**
```json
{
  "status": "healthy",
  "message": "InvestorRadar API is running",
  "version": "1.0.0"
}
```

## Pipeline Health
**URL:** `http://localhost:8000/api/health/pipeline`

**Status:** `200`

**Response:**
```json
{
  "status": "healthy",
  "last_refresh_at": "2026-03-23T09:45:00+00:00",
  "active_signal_count": 8,
  "data_stale": true,
  "version": "1.0.0"
}
```

## Get Signals
**URL:** `http://localhost:8000/api/signals?limit=5`

**Status:** `200`

**Response:**
```json
{
  "data": [
    {
      "id": "14aaa271-76b6-4365-b7cd-21c3bf236fcd",
      "symbol": "RELIANCE",
      "signal_type": "opportunity",
      "pattern_id": null,
      "win_rate_5d": null,
      "win_rate_15d": null,
      "confluence_score": 3,
      "high_confluence": true,
      "signal_rank": 100.0,
      "one_liner": null,
      "paragraph_explanation": null,
      "low_confidence": false,
      "is_active": true,
      "created_at": "2026-03-23T14:34:05.996890+00:00",
      "source_reference": null
    },
    {
      "id": "9fe2137a-e99d-4e1e-8d2b-33bd128d6fd8",
      "symbol": "LT",
      "signal_type": "pattern",
      "pattern_id": "b76d91bb-5354-4233-b4b3-dde0597ea83f",
      "win_rate_5d": null,
      "win_rate_15d": null,
      "confluence_score": 0,
      "high_confluence": false,
      "signal_rank": null,
      "one_liner": "LT is bearish with no short-term wins and no confluence from indicators.",
      "paragraph_explanation": "This Indian stock market signal suggests LT might be a bearish opportunity, especially considering no recent winning trades and low confluence score. For a beginner, this means LT could be selling, so it might be best to avoid buying at current prices.",
      "low_confidence": true,
      "is_active": true,
      "created_at": "2026-03-23T14:33:49.571447+00:00",
      "source_reference": null
    },
    {
      "...": "3 more items"
    }
  ],
  "skip": 0,
  "limit": 5,
  "total": 5
}
```

## Get Stock OHLCV (Reliance)
**URL:** `http://localhost:8000/api/stock/RELIANCE?timeframe=1d`

**Status:** `200`

**Response:**
```json
[]
```

## Get Stock Patterns (Reliance)
**URL:** `http://localhost:8000/api/stock/RELIANCE/patterns`

**Status:** `200`

**Response:**
```json
[
  {
    "id": "f9cd4169-6059-4127-aa64-9b1afcf37009",
    "symbol": "RELIANCE",
    "pattern_name": "CDLSPINNINGTOP",
    "signal_direction": "bullish",
    "timeframe": "15m",
    "detected_at": "2026-03-23T09:45:00+00:00"
  }
]
```

## Get Stock Events (Reliance)
**URL:** `http://localhost:8000/api/stock/RELIANCE/events`

**Status:** `200`

**Response:**
```json
[
  {
    "id": "038aa139-b1e2-4cb7-8a6f-de0498955e28",
    "symbol": "RELIANCE",
    "event_type": "bulk_deal",
    "event_date": "2026-03-23",
    "party_name": "ABC Capital",
    "quantity": 500000,
    "price_per_share": 2900.5,
    "total_value_cr": 145.02,
    "is_anomaly": true,
    "source_reference": "https://www.bseindia.com/markets/equity/EQReports/bulk_deals.aspx"
  }
]
```

