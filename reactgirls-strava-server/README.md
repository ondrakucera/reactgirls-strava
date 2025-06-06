# ReactGirls Strava Server

Express.js server with TypeScript for the ReactGirls Strava application. This server automatically fetches and stores Strava club member data and their public activities.

## Features

- **Express.js with TypeScript** - Modern server framework
- **Strava API Integration** - OAuth2 authentication and data fetching
- **PostgreSQL Database** - Stores club members and workout data
- **Automated Data Sync** - Cron job runs every 15 minutes
- **Token Management** - Automatic OAuth token refresh
- **Health Monitoring** - Railway-compatible health checks
- **Admin Endpoints** - Management and monitoring tools

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database (Railway provides this)
- Strava OAuth2 application credentials

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Strava API Credentials
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_CLUB_ID=your_club_id
```

## Strava OAuth2 Setup

### 1. Create Strava Application

1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Create a new application
3. Note down your `Client ID` and `Client Secret`
4. Set your application's callback URL (e.g., `http://localhost:3001/auth/callback`)

### 2. Get Initial OAuth Tokens

1. **Authorization URL**: Navigate to:
   ```
   https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_CALLBACK_URL&approval_prompt=force&scope=read,activity:read
   ```

2. **Exchange code for tokens**: After authorization, exchange the code for tokens:
   ```bash
   curl -X POST https://www.strava.com/oauth/token \
     -F client_id=YOUR_CLIENT_ID \
     -F client_secret=YOUR_CLIENT_SECRET \
     -F code=AUTHORIZATION_CODE \
     -F grant_type=authorization_code
   ```

3. **Initialize tokens in server**: Use the `/admin/init-oauth` endpoint:
   ```bash
   curl -X POST http://localhost:3001/admin/init-oauth \
     -H "Content-Type: application/json" \
     -d '{
       "access_token": "your_access_token",
       "refresh_token": "your_refresh_token",
       "expires_at": 1234567890
     }'
   ```

## Local Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js >= 18.0.0

### Quick Start

```bash
# 1. Set up the complete development environment (one command!)
npm run db:setup

# 2. Start the development server
npm run dev
```

The `db:setup` script will:
- Create a `.env` file with local database settings
- Start PostgreSQL and pgAdmin containers
- Install dependencies
- Run database migrations
- Display access information

### Manual Setup (Alternative)

```bash
# Install dependencies
npm install

# Start database
npm run db:start

# Run migrations
npm run build
npm run db:migrate

# Start development server
npm run dev
```

### Database Access

**PostgreSQL Connection:**
- Host: `localhost`
- Port: `5432`
- Database: `reactgirls_strava_dev`
- Username: `developer`
- Password: `devpassword`

**pgAdmin Web Interface:**
- URL: http://localhost:5050
- Email: `admin@reactgirls.com`
- Password: `adminpassword`

## API Endpoints

### Health & Status
- **GET** `/health` - Health check for Railway
- **GET** `/admin/db-status` - Database connection status
- **GET** `/admin/sync-stats` - Data synchronization statistics

### Admin Management
- **POST** `/admin/init-oauth` - Initialize OAuth tokens
- **POST** `/admin/trigger-sync` - Manually trigger data sync

### Data API (Future)
- **GET** `/api` - API status and information

## Database Schema

### Tables

#### `oauth_tokens`
- Stores Strava OAuth access and refresh tokens
- Automatically manages token refresh

#### `strava_members` 
- Club member information from Strava
- Updated every sync cycle

#### `workouts`
- Member activities/workouts from Strava
- Syncs last 7 days of activities every 15 minutes

## Automated Data Sync

The server runs a cron job every 15 minutes that:

1. **Fetches club members** from Strava API
2. **Updates member database** with latest information
3. **Fetches recent activities** for each member (last 7 days)
4. **Stores workout data** in PostgreSQL
5. **Handles token refresh** automatically

### Sync Schedule
- **Frequency**: Every 15 minutes
- **Initial sync**: 30 seconds after server start
- **Rate limiting**: 200ms delay between member requests
- **Error handling**: Continues with other members if one fails

## Development Commands

### Server Commands
```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code  
npm run format
```

### Database Commands
```bash
# Complete development setup (one command)
npm run db:setup

# Start/stop database services
npm run db:start
npm run db:stop

# View database logs
npm run db:logs

# Reset database (clear all data and restart)
npm run db:reset

# Run database migrations
npm run db:migrate

# Database utilities
npm run db:utils check   # Check connection
npm run db:utils stats   # Show statistics
npm run db:utils clear   # Clear all data
npm run db:utils seed    # Add sample data
```

## Railway Deployment

### Database Setup
1. Add PostgreSQL service to your Railway project
2. Copy the `DATABASE_URL` to your environment variables

### Environment Variables
Set these in Railway dashboard:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_CLUB_ID=your_club_id
```

### Initial OAuth Setup
After deployment:
1. Complete OAuth flow and get tokens
2. Use the `/admin/init-oauth` endpoint to initialize tokens
3. Monitor sync progress via `/admin/sync-stats`

## Monitoring

### Admin Endpoints for Monitoring

```bash
# Check sync statistics
curl http://localhost:3001/admin/sync-stats

# Check database status
curl http://localhost:3001/admin/db-status

# Trigger manual sync
curl -X POST http://localhost:3001/admin/trigger-sync
```

### Logs
The server provides detailed logging for:
- OAuth token refresh events
- Data sync progress
- Error handling
- Rate limiting

## Security Notes

- OAuth tokens are securely stored in PostgreSQL
- Automatic token refresh prevents expiration
- Admin endpoints should be protected in production
- Uses CORS and Helmet for basic security

## Rate Limiting

Strava API has rate limits:
- **200 requests per 15 minutes**
- **2,000 requests per day**

The server implements:
- 200ms delays between requests
- Error handling for rate limit responses
- Gradual backoff strategies
