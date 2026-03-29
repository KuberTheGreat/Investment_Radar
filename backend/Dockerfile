FROM continuumio/miniconda3

WORKDIR /app

# ── Layer 1: System deps (cached unless apt packages change) ──────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Layer 2: Heavy conda packages (cached unless this line changes) ───────────
RUN conda install -y -c conda-forge ta-lib psycopg2 greenlet

# ── Layer 3: Python packages (cached until requirements.txt changes) ──────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Layer 4: Application code (invalidated on every code change) ──────────────
COPY . .

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

