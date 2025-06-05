import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
		},
	});
});

// API routes placeholder
app.get("/api", (req, res) => {
	res.json({
		message: "API is working",
		version: "0.0.0",
	});
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

// Start server
app.listen(PORT, () => {
	console.log(`🚀 Server is running on port ${PORT}`);
	console.log(`📍 Health check available at http://localhost:${PORT}/health`);
	console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
});
