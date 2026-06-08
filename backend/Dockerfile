# Use an official lightweight Python image.
# Python 3.10 is highly compatible with PyTorch and Stable Diffusion dependencies.
FROM python:3.10-slim

# Set environment variables
# - PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr (useful for Docker logs)
# - PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files
# - PIP_NO_CACHE_DIR: Disables pip cache to keep the image size smaller
# - PORT: Default port the application will bind to
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# - build-essential: Required if any package needs compilation
# - libpq-dev: PostgreSQL client library (helpful for database connections)
# - curl: Useful for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker's build cache
COPY requirements.txt /app/

# Install Python packages
# OPTIMIZATION TIP FOR CPU-ONLY SERVERS (GCP Cloud Run, AWS Fargate, Render, etc.):
# To drastically reduce image size, you can install the CPU-only version of PyTorch
# by uncommenting the line below and running it BEFORE installing the rest of requirements.txt.
# RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Create directories for persistent data
# - /app/data/uploads: Where user uploaded files are stored
# - /app/stable_diffusion/data: Where Stable Diffusion weights are expected
RUN mkdir -p /app/data/uploads /app/stable_diffusion/data

# Copy the rest of the application code to the container
COPY . /app/

# Expose the mandatory Hugging Face port
EXPOSE 7860

# Health check to ensure the backend is responsive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:7860/ || exit 1

# Update your startup command to use 7860
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:7860"]


