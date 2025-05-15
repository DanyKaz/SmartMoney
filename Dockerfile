FROM python:3.11

WORKDIR /app

RUN apt-get update && apt-get install -y netcat-openbsd && apt-get clean

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./web ./web
COPY wait_for_postgres.sh ./wait_for_postgres.sh

RUN chmod +x ./wait_for_postgres.sh

CMD ["sh", "-c", "./wait_for_postgres.sh && uvicorn web.main:app --host 0.0.0.0 --port 8000"]