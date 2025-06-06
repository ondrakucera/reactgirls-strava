#!/bin/bash

echo "🚀 Setting up local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cat > .env << EOF
# Local Development Environment
PORT=3001
NODE_ENV=development

# Local PostgreSQL Database (Docker Compose)
DATABASE_URL=postgresql://developer:devpassword@localhost:5432/reactgirls_strava_dev

# Strava API Credentials
# Replace these with your actual Strava app credentials
STRAVA_CLIENT_ID=your_strava_client_id_here
STRAVA_CLIENT_SECRET=your_strava_client_secret_here
STRAVA_CLUB_ID=your_club_id_here

# Initial OAuth Tokens (optional - for automatic initialization)
# Get these from OAuth flow, leave empty to use database-only approach
STRAVA_INITIAL_ACCESS_TOKEN=
STRAVA_INITIAL_REFRESH_TOKEN=
STRAVA_INITIAL_EXPIRES_AT=
EOF
    echo "✅ Created .env file. Please update it with your Strava credentials."
fi

# Start Docker services
echo "🐳 Starting PostgreSQL and pgAdmin..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
timeout 60s bash -c "until docker exec reactgirls-strava-db pg_isready -U developer -d reactgirls_strava_dev; do sleep 2; done"

if [ $? -eq 0 ]; then
    echo "✅ Database is ready!"
    
    # Install dependencies if not already installed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Build and run migrations
    echo "🔧 Building project and running database migrations..."
    npm run build
    npm run db:migrate
    
    echo ""
    echo "🎉 Development environment is ready!"
    echo ""
    echo "📊 Access pgAdmin at: http://localhost:5050"
    echo "   Email: admin@reactgirls.com"
    echo "   Password: adminpassword"
    echo ""
    echo "🗄️  Database connection details:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: reactgirls_strava_dev"
    echo "   Username: developer"
    echo "   Password: devpassword"
    echo ""
    echo "🚀 Start the development server with: npm run dev"
    
else
    echo "❌ Database failed to start. Check Docker logs:"
    docker-compose logs postgres
    exit 1
fi
