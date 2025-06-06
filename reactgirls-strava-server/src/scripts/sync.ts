#!/usr/bin/env node

import dotenv from "dotenv";
import createTables from "../database/migrate";
import DataSyncService from "../services/dataSyncService";

// Load environment variables
dotenv.config();

async function runSync() {
	console.log("🔄 Starting scheduled Strava data synchronization...");
	console.log(`📅 Timestamp: ${new Date().toISOString()}`);

	try {
		// Ensure database tables exist
		await createTables();

		// Run the sync
		const syncService = new DataSyncService();
		await syncService.syncClubData();

		// Get final stats
		const stats = await syncService.getSyncStats();
		console.log("📊 Sync completed successfully!");
		console.log(`   - Members: ${stats.totalMembers}`);
		console.log(`   - Total workouts: ${stats.totalWorkouts}`);
		console.log(`   - Recent workouts: ${stats.recentWorkouts}`);

		process.exit(0);
	} catch (error) {
		console.error("❌ Sync failed:", error);
		process.exit(1);
	}
}

// Run if this script is executed directly
if (require.main === module) {
	runSync();
}

export default runSync;
