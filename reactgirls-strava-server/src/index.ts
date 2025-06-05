import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import pool from "./database/connection";
import createTables from "./database/migrate";
import JobScheduler from "./jobs/scheduler";
import StravaClient from "./services/stravaClient";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const jobScheduler = new JobScheduler();
const stravaClient = new StravaClient();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Railway
app.get("/health", (req, res) => {
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || "development",
	});
});

// Root endpoint
app.get("/", (req, res) => {
	res.json({
		message: "ReactGirls Strava Server is running!",
		version: "0.0.0",
		endpoints: {
			health: "/health",
			api: "/api",
			admin: "/admin",
		},
	});
});

// API routes placeholder
app.get("/api", (req, res) => {
	res.json({
		message: "API is working",
		version: "0.0.0",
		description: "Public endpoints for Strava club data will be available here",
	});
});

// Admin endpoints for monitoring and management
app.get("/admin/sync-stats", async (req, res) => {
	try {
		const stats = await jobScheduler.getSyncStats();
		res.json(stats);
	} catch (error) {
		console.error("Error fetching sync stats:", error);
		res.status(500).json({ error: "Failed to fetch sync statistics" });
	}
});

app.post("/admin/trigger-sync", async (req, res) => {
	try {
		const stats = await jobScheduler.triggerSync();
		res.json({
			message: "Sync triggered successfully",
			stats,
		});
	} catch (error) {
		console.error("Error triggering sync:", error);
		res.status(500).json({ error: "Failed to trigger sync" });
	}
});

app.get("/admin/db-status", async (req, res) => {
	try {
		const client = await pool.connect();
		const result = await client.query("SELECT NOW() as current_time");
		client.release();

		res.json({
			status: "connected",
			timestamp: result.rows[0].current_time,
		});
	} catch (error) {
		console.error("Database connection error:", error);
		res.status(500).json({
			status: "error",
			error: "Database connection failed",
		});
	}
});

// OAuth initialization endpoint (for initial setup)
app.post("/admin/init-oauth", async (req, res) => {
	try {
		const { access_token, refresh_token, expires_at } = req.body;

		if (!access_token || !refresh_token || !expires_at) {
			return res.status(400).json({
				error: "Missing required fields: access_token, refresh_token, expires_at",
			});
		}

		await stravaClient.initializeTokens(access_token, refresh_token, expires_at);

		res.json({
			message: "OAuth tokens initialized successfully",
		});
	} catch (error) {
		console.error("Error initializing OAuth tokens:", error);
		res.status(500).json({ error: "Failed to initialize OAuth tokens" });
	}
});

// 404 handler
app.use("*", (req, res) => {
	res.status(404).json({
		error: "Route not found",
		path: req.originalUrl,
	});
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
	console.error(err.stack);
	res.status(500).json({
		error: "Something went wrong!",
		message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
	});
});

// Initialize database and start server
async function startServer() {
	try {
		console.log("🔧 Initializing database...");
		await createTables();

		console.log("⏰ Starting job scheduler...");
		jobScheduler.startScheduler();

		// Start server
		app.listen(PORT, () => {
			console.log(`🚀 Server is running on port ${PORT}`);
			console.log(`📍 Health check available at http://localhost:${PORT}/health`);
			console.log(`🔧 Admin panel available at http://localhost:${PORT}/admin`);
			console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
		});
	} catch (error) {
		console.error("❌ Failed to start server:", error);
		process.exit(1);
	}
}

// Graceful shutdown
process.on("SIGTERM", () => {
	console.log("🛑 Received SIGTERM signal, shutting down gracefully...");
	jobScheduler.stopScheduler();
	pool.end();
	process.exit(0);
});

process.on("SIGINT", () => {
	console.log("🛑 Received SIGINT signal, shutting down gracefully...");
	jobScheduler.stopScheduler();
	pool.end();
	process.exit(0);
});

startServer();
