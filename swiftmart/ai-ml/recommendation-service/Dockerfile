# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if any (e.g., for ML libraries if needed later)
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     build-essential \
#     # Add other libs like libgl1-mesa-glx if using OpenCV, etc.
#     && rm -rf /var/lib/apt/lists/*

# Copy the requirements file and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY src/ ./src/

# Expose the port the app runs on
EXPOSE 3005

# Define the command to run the FastAPI application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "3005"]