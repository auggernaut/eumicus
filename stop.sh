#!/bin/bash

# Stop Eumicus script
# Kills all running Eumicus processes

echo "🛑 Stopping Eumicus..."

# Find and kill processes
PIDS=$(pgrep -f "node src/index.js" 2>/dev/null)

if [ ! -z "$PIDS" ]; then
    echo "Found Eumicus processes: $PIDS"
    
    for PID in $PIDS; do
        echo "Stopping process $PID..."
        kill -TERM $PID 2>/dev/null
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            echo "Force killing process $PID..."
            kill -KILL $PID 2>/dev/null
        fi
    done
    
    echo "✅ Eumicus stopped successfully"
else
    echo "ℹ️  No Eumicus processes found"
fi
