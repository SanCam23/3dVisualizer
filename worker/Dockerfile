# ==============================================================================
# Dockerfile for Blender Headless Conversion Worker
# Deployable to Fly.io, Render, Railway, AWS ECS, or any Docker host
# ==============================================================================
FROM linuxserver/blender:latest

WORKDIR /app

# Install python3 and pip if needed in container
USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY worker/ /app/

ENV BLENDER_PATH="/usr/bin/blender"

CMD ["python3", "blender_worker.py", "--poll", "5"]

