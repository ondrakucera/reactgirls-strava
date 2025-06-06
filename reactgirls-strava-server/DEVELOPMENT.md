# Local Development Guide

This guide will help you set up and work with the ReactGirls Strava Server locally.

## 🚀 Quick Start

```bash
# One command setup - this does everything for you!
npm run db:setup

# Start development server
npm run dev
```

That's it! The setup script handles everything automatically.

## 📋 What You Get

After running `npm run db:setup`, you'll have:

- **PostgreSQL database** running in Docker
- **pgAdmin** web interface for database management
- **All dependencies** installed
- **Database tables** created and migrated
- **Environment file** created (`.env`)

## 🔧 Development Workflow

### 1. Daily Workflow
```bash
# Start your dev session
npm run db:start    # Start database (if not running)
npm run dev         # Start development server

# When you're done
npm run db:stop     # Stop database
```

### 2. Database Management
```bash
# Check if database is working
npm run db:utils check

# See what data you have
npm run db:utils stats

# Add some test data to play with
npm run db:utils seed

# Clear everything and start fresh
npm run db:utils clear
```

### 3. Viewing Database
**Option 1: pgAdmin (Web Interface)**
- Go to http://localhost:5050
- Login with `admin@reactgirls.com` / `adminpassword`
- Connect to server:
  - Host: `postgres` (container name)
  - Port: `5432`
  - Database: `reactgirls_strava_dev`
  - Username: `developer`
  - Password: `devpassword`

**Option 2: Command Line**
```bash
# Connect directly to PostgreSQL
docker exec -it reactgirls-strava-db psql -U developer -d reactgirls_strava_dev

# View tables
\dt

# View data
SELECT * FROM strava_members;
SELECT * FROM workouts;
SELECT * FROM oauth_tokens;
```

## 🧪 Testing the Application

### 1. Without Strava API (Mock Data)
```bash
# Add sample data
npm run db:utils seed

# Check via API
curl http://localhost:3001/admin/sync-stats
```

### 2. With Strava API
1. Get your Strava app credentials from https://www.strava.com/settings/api
2. Update `.env` file with real credentials:
   ```
   STRAVA_CLIENT_ID=your_real_client_id
   STRAVA_CLIENT_SECRET=your_real_client_secret
   STRAVA_CLUB_ID=your_club_id
   ```
3. Get OAuth tokens following the main README
4. Initialize tokens:
   ```bash
   curl -X POST http://localhost:3001/admin/init-oauth \
     -H "Content-Type: application/json" \
     -d '{"access_token":"...","refresh_token":"...","expires_at":123456789}'
   ```
5. Trigger a sync:
   ```bash
   curl -X POST http://localhost:3001/admin/trigger-sync
   ```

## 🐛 Troubleshooting

### Database Won't Start
```bash
# Check Docker is running
docker --version

# Check what's using port 5432
lsof -i :5432

# Reset everything
npm run db:reset
```

### Can't Connect to Database
```bash
# Check container status
docker-compose ps

# View logs
npm run db:logs

# Test connection
npm run db:utils check
```

### Strava API Issues
```bash
# Check your tokens
npm run db:utils stats

# View server logs for API errors
npm run dev

# Test with mock data first
npm run db:utils seed
```

## 📁 Project Structure

```
reactgirls-strava-server/
├── src/
│   ├── database/           # Database connection & migrations
│   ├── services/           # Strava API & data sync
│   ├── jobs/              # Cron scheduler
│   ├── utils/             # Development utilities
│   └── index.ts           # Main server file
├── scripts/               # Development scripts
├── docker-compose.yml     # Local database setup
└── .env                   # Local environment (created by setup)
```

## 🔄 Reset Everything

If you want to start completely fresh:

```bash
# Nuclear option - reset everything
npm run db:reset

# Or manually
docker-compose down
docker volume rm reactgirls-strava-server_postgres_data
docker volume rm reactgirls-strava-server_pgadmin_data
rm .env
npm run db:setup
```

## 💡 Development Tips

1. **Use sample data** for UI development: `npm run db:utils seed`
2. **Monitor database** with pgAdmin while developing
3. **Check sync stats** frequently: `curl localhost:3001/admin/sync-stats`
4. **Test manually** before setting up real Strava integration
5. **Use database utilities** to inspect and manipulate data easily

## 🚨 Important Notes

- The `.env` file is created automatically and **should not be committed**
- Database data persists between restarts (stored in Docker volumes)
- pgAdmin settings are saved in Docker volumes too
- Real Strava API has rate limits - use mock data for heavy testing
- The cron job runs every 15 minutes in development too
