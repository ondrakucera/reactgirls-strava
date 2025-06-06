#!/bin/bash

echo "🔄 Resetting local development database..."

# Stop and remove containers
echo "🛑 Stopping containers..."
docker-compose down

# Remove volumes to completely reset data
echo "🗑️  Removing database volumes..."
docker volume rm reactgirls-strava-server_postgres_data 2>/dev/null || true
docker volume rm reactgirls-strava-server_pgadmin_data 2>/dev/null || true

# Start fresh
echo "🚀 Starting fresh database..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout 60s bash -c "until docker exec reactgirls-strava-db pg_isready -U developer -d reactgirls_strava_dev; do sleep 2; done"

if [ $? -eq 0 ]; then
    echo "✅ Database is ready!"
    
    # Run migrations
    echo "🔧 Running database migrations..."
    npm run build
    npm run db:migrate
    
    echo ""
    echo "🎉 Database reset complete!"
    echo "🚀 Start the development server with: npm run dev"
else
    echo "❌ Database failed to start. Check Docker logs:"
    docker-compose logs postgres
    exit 1
fi
