#!/bin/bash

# Start services script for Store to Door Shopify application
echo "Starting Store to Door services..."

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with the required environment variables."
  exit 1
fi

# Install dependencies for order service if needed
echo "Setting up Order Service..."
cd order-service
npm install
cd ..

# Start the order service in the background
echo "Starting Order Service..."
cd order-service
node order-service.js &
ORDER_SERVICE_PID=$!
cd ..

# Give the order service a moment to start up
echo "Waiting for Order Service to initialize..."
sleep 3

# Rename the new server.js file to replace the old one
if [ -f server.js.new ]; then
  echo "Updating main server.js file..."
  mv server.js server.js.old
  mv server.js.new server.js
fi

# Start the main application
echo "Starting Main Application..."
node server.js

# If the main application exits, also kill the order service
kill $ORDER_SERVICE_PID
