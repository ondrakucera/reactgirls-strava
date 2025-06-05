# ReactGirls Strava Server

Express.js server with TypeScript for the ReactGirls Strava application.

## Features

- Express.js with TypeScript
- Health check endpoint for Railway deployment
- CORS and security middleware (Helmet)
- Environment variable support
- ESLint and Prettier configuration
- Development and production build scripts

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm

### Installation

```bash
npm install
```

### Development

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

## API Endpoints

### Health Check
- **GET** `/health` - Health check endpoint for Railway
- **Response**:
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "uptime": 123.456,
    "environment": "development"
  }
  ```

### Root
- **GET** `/` - Server information
- **Response**:
  ```json
  {
    "message": "ReactGirls Strava Server is running!",
    "version": "0.0.0",
    "endpoints": {
      "health": "/health",
      "api": "/api"
    }
  }
  ```

### API
- **GET** `/api` - API status endpoint

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3001
NODE_ENV=development
```

## Railway Deployment

This server is configured for Railway deployment with:
- Health check endpoint at `/health`
- Automatic deployment configuration in `railway.json`
- Proper error handling and logging

The server will automatically use the `PORT` environment variable provided by Railway.

## Project Structure

```
src/
├── index.ts          # Main server file
├── (future routes)   # API routes will go here
└── (future middleware) # Custom middleware will go here
```
