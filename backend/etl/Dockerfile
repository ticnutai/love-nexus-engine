# Python ETL image
FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir asyncpg httpx

COPY . /app/backend/etl/
WORKDIR /app

# ETL pipeline entrypoint
ENTRYPOINT ["python", "-m", "backend.etl.pipeline"]
