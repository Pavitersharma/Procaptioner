FROM python:3.11-slim

# Install system dependencies (ffmpeg, curl, and multilingual fonts for subtitles)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fonts-noto \
    fonts-deva \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Ensure storage directories exist
RUN mkdir -p uploads outputs models fonts

EXPOSE 8000

ENV PORT=8000
ENV API_HOST=0.0.0.0

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
