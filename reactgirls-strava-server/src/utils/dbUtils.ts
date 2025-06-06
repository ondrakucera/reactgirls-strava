import pool from "../database/connection";

export class DatabaseUtils {
	// Check database connection
	static async checkConnection(): Promise<boolean> {
		try {
			const client = await pool.connect();
			await client.query("SELECT 1");
			client.release();
			return true;
		} catch (error) {
			console.error("Database connection failed:", error);
			return false;
		}
	}

	// Get database statistics
	static async getStats(): Promise<any> {
		const client = await pool.connect();
		try {
			const [members, workouts, tokens] = await Promise.all([
				client.query("SELECT COUNT(*) as count FROM strava_members"),
				client.query("SELECT COUNT(*) as count FROM workouts"),
				client.query("SELECT COUNT(*) as count FROM oauth_tokens"),
			]);

			return {
				members: parseInt(members.rows[0].count),
				workouts: parseInt(workouts.rows[0].count),
				tokens: parseInt(tokens.rows[0].count),
			};
		} finally {
			client.release();
		}
	}

	// Clear all data (for development/testing)
	static async clearAllData(): Promise<void> {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query("DELETE FROM workouts");
			await client.query("DELETE FROM strava_members");
			await client.query("DELETE FROM oauth_tokens");
			await client.query("COMMIT");
			console.log("✅ All data cleared");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	// Seed sample data for development
	static async seedSampleData(): Promise<void> {
		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			// Add sample members
			await client.query(`
				INSERT INTO strava_members (strava_id, username, firstname, lastname, profile_url, avatar_url)
				VALUES 
					(12345, 'john_runner', 'John', 'Doe', 'https://strava.com/athletes/12345', 'https://avatar.url/john'),
					(67890, 'jane_cyclist', 'Jane', 'Smith', 'https://strava.com/athletes/67890', 'https://avatar.url/jane')
				ON CONFLICT (strava_id) DO NOTHING
			`);

			// Add sample workouts
			await client.query(`
				INSERT INTO workouts (
					strava_activity_id, member_id, name, type, distance, moving_time, elapsed_time,
					total_elevation_gain, start_date, start_date_local, average_speed, max_speed
				) VALUES 
					(111111, 12345, 'Morning Run', 'Run', 5000, 1800, 1900, 50, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 2.78, 4.2),
					(222222, 67890, 'Evening Ride', 'Ride', 25000, 3600, 3700, 200, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 6.94, 12.5)
				ON CONFLICT (strava_activity_id) DO NOTHING
			`);

			await client.query("COMMIT");
			console.log("✅ Sample data seeded");
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}

// CLI commands for development
if (require.main === module) {
	const command = process.argv[2];

	switch (command) {
		case "check":
			DatabaseUtils.checkConnection().then((isConnected) => {
				console.log(isConnected ? "✅ Database connected" : "❌ Database connection failed");
				process.exit(isConnected ? 0 : 1);
			});
			break;

		case "stats":
			DatabaseUtils.getStats().then((stats) => {
				console.log("📊 Database Statistics:");
				console.log(`  Members: ${stats.members}`);
				console.log(`  Workouts: ${stats.workouts}`);
				console.log(`  OAuth Tokens: ${stats.tokens}`);
				process.exit(0);
			});
			break;

		case "clear":
			DatabaseUtils.clearAllData()
				.then(() => {
					console.log("🗑️ All data cleared");
					process.exit(0);
				})
				.catch((error) => {
					console.error("❌ Failed to clear data:", error);
					process.exit(1);
				});
			break;

		case "seed":
			DatabaseUtils.seedSampleData()
				.then(() => {
					console.log("🌱 Sample data seeded");
					process.exit(0);
				})
				.catch((error) => {
					console.error("❌ Failed to seed data:", error);
					process.exit(1);
				});
			break;

		default:
			console.log("Available commands:");
			console.log("  npm run db:utils check  - Check database connection");
			console.log("  npm run db:utils stats  - Show database statistics");
			console.log("  npm run db:utils clear  - Clear all data");
			console.log("  npm run db:utils seed   - Seed sample data");
			process.exit(1);
	}
}
