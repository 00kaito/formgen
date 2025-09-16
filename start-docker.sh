#!/bin/bash

# Form Builder Docker Startup Script
# This script sets up and starts the Form Builder application with PostgreSQL database

set -e

echo "🚀 Starting Form Builder with Docker..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
mkdir -p uploads form-backups

# Set up environment variables if .env file doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please update the SESSION_SECRET in .env file before running in production!"
fi

# Choose docker-compose file
COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🏭 Using production configuration..."
else
    echo "🔧 Using development configuration..."
fi

# Build and start the services
echo "🔨 Building and starting services..."
docker-compose -f $COMPOSE_FILE up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose -f $COMPOSE_FILE ps | grep -q "Up (healthy)"; then
    echo "✅ Services are running and healthy!"
    echo ""
    echo "🌐 Form Builder is available at: http://localhost:5000"
    echo "🗄️  PostgreSQL is available at: localhost:5432"
    echo ""
    echo "📋 Default admin credentials:"
    echo "   Username: admin"
    echo "   Password: Procesy123"
    echo ""
    echo "🛑 To stop the services, run: docker-compose -f $COMPOSE_FILE down"
    echo "📝 To view logs, run: docker-compose -f $COMPOSE_FILE logs -f"
else
    echo "❌ Some services failed to start. Check the logs:"
    docker-compose -f $COMPOSE_FILE logs
fi