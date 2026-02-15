FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OR-Tools
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 3016

# Run the application
CMD ["python", "src/server.py"]
