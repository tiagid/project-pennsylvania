#python 3.10 since basic-pitch wont install on newer versions
FROM python:3.10-slim

#ffmpeg is what lets librosa read m4a voice memos and mp3s
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

#install packages before copying code so rebuilds are faster when only code changes
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend

#save numba's compiled code in the image so it doesnt recompile every time render wakes up
ENV NUMBA_CACHE_DIR=/app/.numba_cache
RUN python -m backend.warm_up

#run as a normal user instead of root so a hacked server cant take over the container
RUN useradd --create-home app && chown -R app /app
USER app

#render gives us the port in $PORT
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
