#!/bin/bash

# Form Builder Docker Stop Script
# This script stops and optionally removes the Form Builder Docker containers

set -e

echo "🛑 Stopping Form Builder Docker services..."

# Choose docker-compose file based on first argument
COMPOSE_FILE="docker-compose.yml"
if [ "$1" = "prod" ] || [ "$1" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
    echo "🏭 Using production configuration..."
else
    echo "🔧 Using development configuration..."
fi

# Stop the services
docker-compose -f $COMPOSE_FILE down

if [ "$2" = "--volumes" ] || [ "$2" = "-v" ]; then
    echo "🗑️  Removing volumes (this will delete all data)..."
    docker-compose -f $COMPOSE_FILE down -v
    echo "⚠️  All data has been removed!"
fi

if [ "$2" = "--clean" ] || [ "$2" = "-c" ]; then
    echo "🧹 Cleaning up containers and images..."
    docker-compose -f $COMPOSE_FILE down --rmi all --volumes --remove-orphans
    echo "✅ Cleanup complete!"
fi

echo "✅ Form Builder services stopped successfully!"