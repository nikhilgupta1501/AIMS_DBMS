FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

ENV PATH="/opt/venv/bin:${PATH}"
ENV PYTHON_BIN="/opt/venv/bin/python"
ENV DB_PATH="/var/data/aims.db"
ENV FORECAST_CACHE_PATH="/var/data/forecast_cache.json"

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
