# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file and install Python dependencies
COPY ai-ml-package/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY ai-ml-package/main.py ./main.py

# Copy all service directories
COPY chatbot-service/src ./chatbot-service/src
COPY demand-forecasting-service/src ./demand-forecasting-service/src
COPY pricing-service/src ./pricing-service/src
COPY recommendation-service/src ./recommendation-service/src

# Expose the ports the services run on
EXPOSE 3005 3006 3007 3009

# Define the command to run the combined application
CMD ["python", "main.py"]
