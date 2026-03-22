FROM continuumio/miniconda3

WORKDIR /app

# Install essential build requirements if needed by other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python extensions that require heavy c-compilation via conda-forge
RUN conda install -y -c conda-forge ta-lib psycopg2 greenlet

# Install pip requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Post-install playwright
RUN playwright install --with-deps chromium

COPY . .

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
