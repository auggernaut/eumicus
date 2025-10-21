#!/bin/bash

# Eumicus Startup Script
# This script kills any existing Eumicus processes and starts the app fresh

echo "🚀 Starting Eumicus Knowledge Reinforcement App..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the Eumicus project directory."
    exit 1
fi

# Kill existing Eumicus processes
print_status "Checking for existing Eumicus processes..."

# Find and kill processes running node src/index.js
PIDS=$(pgrep -f "node src/index.js" 2>/dev/null)

if [ ! -z "$PIDS" ]; then
    print_warning "Found existing Eumicus processes: $PIDS"
    print_status "Stopping existing processes..."
    
    for PID in $PIDS; do
        print_status "Killing process $PID..."
        kill -TERM $PID 2>/dev/null
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            print_warning "Process $PID still running, force killing..."
            kill -KILL $PID 2>/dev/null
        fi
    done
    
    print_success "Existing processes stopped"
else
    print_status "No existing Eumicus processes found"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_status "Dependencies already installed"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f "env.example" ]; then
        print_warning ".env file not found. Please copy env.example to .env and configure your settings:"
        print_status "cp env.example .env"
        print_status "Then edit .env with your OpenAI API key and other settings"
        echo ""
        print_status "Starting app anyway (some features may not work without proper configuration)..."
    else
        print_warning ".env file not found and no env.example found"
    fi
fi

# Start the application
print_status "Starting Eumicus application..."
print_status "The app will be available at: http://localhost:3000"
print_status "Press Ctrl+C to stop the server"
echo ""

# Start the server
node src/index.js

# Handle cleanup on exit
cleanup() {
    print_status "Shutting down Eumicus..."
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM
