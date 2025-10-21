#!/bin/bash

# Quick restart script for Eumicus
# Kills existing processes and starts the app

echo "🔄 Restarting Eumicus..."

# Kill existing processes
pkill -f "node src/index.js" 2>/dev/null

# Wait a moment
sleep 1

# Start the app
echo "🚀 Starting Eumicus..."
node src/index.js
