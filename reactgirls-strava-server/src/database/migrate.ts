import pool from "./connection";

const createTables = async () => {
	const client = await pool.connect();

	try {
		// Create oauth_tokens table for storing Strava tokens
		await client.query(`
			CREATE TABLE IF NOT EXISTS oauth_tokens (
				id SERIAL PRIMARY KEY,
				access_token TEXT NOT NULL,
				refresh_token TEXT NOT NULL,
				expires_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create strava_members table for club members
		await client.query(`
			CREATE TABLE IF NOT EXISTS strava_members (
				id SERIAL PRIMARY KEY,
				strava_id BIGINT UNIQUE NOT NULL,
				username VARCHAR(255),
				firstname VARCHAR(255),
				lastname VARCHAR(255),
				profile_url TEXT,
				avatar_url TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create workouts table for storing member activities
		await client.query(`
			CREATE TABLE IF NOT EXISTS workouts (
				id SERIAL PRIMARY KEY,
				strava_activity_id BIGINT UNIQUE NOT NULL,
				member_id BIGINT REFERENCES strava_members(strava_id),
				name VARCHAR(255),
				type VARCHAR(100),
				distance DECIMAL,
				moving_time INTEGER,
				elapsed_time INTEGER,
				total_elevation_gain DECIMAL,
				start_date TIMESTAMP,
				start_date_local TIMESTAMP,
				average_speed DECIMAL,
				max_speed DECIMAL,
				average_heartrate DECIMAL,
				max_heartrate DECIMAL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`);

		// Create indexes for better performance
		await client.query(`
			CREATE INDEX IF NOT EXISTS idx_workouts_member_id ON workouts(member_id);
			CREATE INDEX IF NOT EXISTS idx_workouts_start_date ON workouts(start_date);
			CREATE INDEX IF NOT EXISTS idx_workouts_type ON workouts(type);
		`);

		console.log("✅ Database tables created successfully");
	} catch (error) {
		console.error("❌ Error creating tables:", error);
		throw error;
	} finally {
		client.release();
	}
};

// Run migration if this file is executed directly
if (require.main === module) {
	createTables()
		.then(() => {
			console.log("🎉 Migration completed successfully");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Migration failed:", error);
			process.exit(1);
		});
}

export default createTables;
