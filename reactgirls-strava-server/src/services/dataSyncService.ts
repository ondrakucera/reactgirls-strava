import StravaClient from "./stravaClient";
import pool from "../database/connection";
import { subDays } from "date-fns";

class DataSyncService {
	private stravaClient: StravaClient;

	constructor() {
		this.stravaClient = new StravaClient();
	}

	async syncClubData(): Promise<void> {
		console.log("🔄 Starting club data synchronization...");

		try {
			// Step 1: Sync club members
			await this.syncClubMembers();

			// Step 2: Sync recent activities for all members
			await this.syncMemberActivities();

			console.log("✅ Club data synchronization completed successfully");
		} catch (error) {
			console.error("❌ Error during club data synchronization:", error);
			throw error;
		}
	}

	private async syncClubMembers(): Promise<void> {
		console.log("📋 Syncing club members...");

		const members = await this.stravaClient.getClubMembers();
		const client = await pool.connect();

		try {
			for (const member of members) {
				await client.query(
					`INSERT INTO strava_members (strava_id, username, firstname, lastname, profile_url, avatar_url, updated_at)
					 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
					 ON CONFLICT (strava_id) 
					 DO UPDATE SET 
						username = EXCLUDED.username,
						firstname = EXCLUDED.firstname,
						lastname = EXCLUDED.lastname,
						profile_url = EXCLUDED.profile_url,
						avatar_url = EXCLUDED.avatar_url,
						updated_at = CURRENT_TIMESTAMP`,
					[member.id, member.username, member.firstname, member.lastname, member.profile, member.avatar],
				);
			}

			console.log(`✅ Synced ${members.length} club members`);
		} finally {
			client.release();
		}
	}

	private async syncMemberActivities(): Promise<void> {
		console.log("🏃 Syncing member activities...");

		const client = await pool.connect();

		try {
			// Get all member IDs
			const membersResult = await client.query("SELECT strava_id FROM strava_members");
			const memberIds = membersResult.rows.map((row) => row.strava_id);

			// Get activities from last 7 days to catch any updates
			const afterDate = subDays(new Date(), 7);

			for (const memberId of memberIds) {
				try {
					console.log(`📊 Fetching activities for member ${memberId}...`);

					const activities = await this.stravaClient.getAthleteActivities(memberId, afterDate);

					for (const activity of activities) {
						await this.storeActivity(activity, memberId);
					}

					console.log(`✅ Synced ${activities.length} activities for member ${memberId}`);

					// Small delay to avoid hitting rate limits
					await this.delay(200);
				} catch (error) {
					console.error(`❌ Error syncing activities for member ${memberId}:`, error);
					// Continue with other members even if one fails
				}
			}
		} finally {
			client.release();
		}
	}

	private async storeActivity(activity: any, memberId: number): Promise<void> {
		const client = await pool.connect();

		try {
			await client.query(
				`INSERT INTO workouts (
					strava_activity_id, member_id, name, type, distance, moving_time, elapsed_time,
					total_elevation_gain, start_date, start_date_local, average_speed, max_speed,
					average_heartrate, max_heartrate, updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
				ON CONFLICT (strava_activity_id) 
				DO UPDATE SET 
					name = EXCLUDED.name,
					type = EXCLUDED.type,
					distance = EXCLUDED.distance,
					moving_time = EXCLUDED.moving_time,
					elapsed_time = EXCLUDED.elapsed_time,
					total_elevation_gain = EXCLUDED.total_elevation_gain,
					start_date = EXCLUDED.start_date,
					start_date_local = EXCLUDED.start_date_local,
					average_speed = EXCLUDED.average_speed,
					max_speed = EXCLUDED.max_speed,
					average_heartrate = EXCLUDED.average_heartrate,
					max_heartrate = EXCLUDED.max_heartrate,
					updated_at = CURRENT_TIMESTAMP`,
				[
					activity.id,
					memberId,
					activity.name,
					activity.type,
					activity.distance,
					activity.moving_time,
					activity.elapsed_time,
					activity.total_elevation_gain,
					new Date(activity.start_date),
					new Date(activity.start_date_local),
					activity.average_speed,
					activity.max_speed,
					activity.average_heartrate || null,
					activity.max_heartrate || null,
				],
			);
		} finally {
			client.release();
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	// Method to get sync statistics
	async getSyncStats(): Promise<any> {
		const client = await pool.connect();

		try {
			const membersResult = await client.query("SELECT COUNT(*) as count FROM strava_members");
			const workoutsResult = await client.query("SELECT COUNT(*) as count FROM workouts");
			const recentWorkoutsResult = await client.query(
				"SELECT COUNT(*) as count FROM workouts WHERE created_at > NOW() - INTERVAL '24 hours'",
			);
			const lastTokenUpdate = await client.query(
				"SELECT updated_at FROM oauth_tokens ORDER BY updated_at DESC LIMIT 1",
			);

			return {
				totalMembers: parseInt(membersResult.rows[0].count),
				totalWorkouts: parseInt(workoutsResult.rows[0].count),
				recentWorkouts: parseInt(recentWorkoutsResult.rows[0].count),
				lastTokenUpdate: lastTokenUpdate.rows[0]?.updated_at || null,
				lastSyncTime: new Date().toISOString(),
			};
		} finally {
			client.release();
		}
	}
}

export default DataSyncService;
