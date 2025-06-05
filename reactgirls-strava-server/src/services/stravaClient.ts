import axios, { AxiosInstance } from "axios";
import pool from "../database/connection";

interface StravaTokens {
	access_token: string;
	refresh_token: string;
	expires_at: number;
}

interface StravaClubMember {
	id: number;
	username: string;
	firstname: string;
	lastname: string;
	profile: string;
	avatar: string;
}

interface StravaActivity {
	id: number;
	name: string;
	type: string;
	distance: number;
	moving_time: number;
	elapsed_time: number;
	total_elevation_gain: number;
	start_date: string;
	start_date_local: string;
	average_speed: number;
	max_speed: number;
	average_heartrate?: number;
	max_heartrate?: number;
}

class StravaClient {
	private apiClient: AxiosInstance;
	private readonly clientId: string;
	private readonly clientSecret: string;
	private readonly clubId: string;

	constructor() {
		this.clientId = process.env.STRAVA_CLIENT_ID!;
		this.clientSecret = process.env.STRAVA_CLIENT_SECRET!;
		this.clubId = process.env.STRAVA_CLUB_ID!;

		this.apiClient = axios.create({
			baseURL: "https://www.strava.com/api/v3",
			timeout: 10000,
		});

		// Add request interceptor to include access token
		this.apiClient.interceptors.request.use(async (config) => {
			const accessToken = await this.getValidAccessToken();
			config.headers.Authorization = `Bearer ${accessToken}`;
			return config;
		});

		// Add response interceptor to handle token refresh on 401
		this.apiClient.interceptors.response.use(
			(response) => response,
			async (error) => {
				if (error.response?.status === 401) {
					console.log("🔄 Access token expired, refreshing...");
					await this.refreshAccessToken();
					// Retry the original request with new token
					const accessToken = await this.getValidAccessToken();
					error.config.headers.Authorization = `Bearer ${accessToken}`;
					return this.apiClient.request(error.config);
				}
				return Promise.reject(error);
			},
		);
	}

	private async getValidAccessToken(): Promise<string> {
		const client = await pool.connect();
		try {
			const result = await client.query(
				"SELECT access_token, expires_at FROM oauth_tokens ORDER BY created_at DESC LIMIT 1",
			);

			if (result.rows.length === 0) {
				throw new Error("No OAuth tokens found in database");
			}

			const { access_token, expires_at } = result.rows[0];
			const now = new Date();
			const expiresAt = new Date(expires_at);

			// If token expires in less than 5 minutes, refresh it
			if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
				console.log("🔄 Token expires soon, refreshing...");
				return await this.refreshAccessToken();
			}

			return access_token;
		} finally {
			client.release();
		}
	}

	private async refreshAccessToken(): Promise<string> {
		const client = await pool.connect();
		try {
			// Get current refresh token
			const result = await client.query("SELECT refresh_token FROM oauth_tokens ORDER BY created_at DESC LIMIT 1");

			if (result.rows.length === 0) {
				throw new Error("No refresh token found in database");
			}

			const { refresh_token } = result.rows[0];

			// Exchange refresh token for new access token
			const response = await axios.post("https://www.strava.com/oauth/token", {
				client_id: this.clientId,
				client_secret: this.clientSecret,
				refresh_token: refresh_token,
				grant_type: "refresh_token",
			});

			const { access_token, refresh_token: new_refresh_token, expires_at } = response.data;

			// Store new tokens in database
			await client.query("INSERT INTO oauth_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)", [
				access_token,
				new_refresh_token,
				new Date(expires_at * 1000),
			]);

			console.log("✅ OAuth tokens refreshed successfully");
			return access_token;
		} finally {
			client.release();
		}
	}

	async getClubMembers(): Promise<StravaClubMember[]> {
		try {
			const response = await this.apiClient.get(`/clubs/${this.clubId}/members`);
			console.log(`📋 Fetched ${response.data.length} club members`);
			return response.data;
		} catch (error) {
			console.error("❌ Error fetching club members:", error);
			throw error;
		}
	}

	async getAthleteActivities(athleteId: number, after?: Date): Promise<StravaActivity[]> {
		try {
			const params: any = { per_page: 50 };
			if (after) {
				params.after = Math.floor(after.getTime() / 1000);
			}

			const response = await this.apiClient.get(`/athletes/${athleteId}/activities`, { params });
			console.log(`🏃 Fetched ${response.data.length} activities for athlete ${athleteId}`);
			return response.data;
		} catch (error) {
			console.error(`❌ Error fetching activities for athlete ${athleteId}:`, error);
			throw error;
		}
	}

	// Initialize tokens from manual OAuth flow
	async initializeTokens(accessToken: string, refreshToken: string, expiresAt: number): Promise<void> {
		const client = await pool.connect();
		try {
			await client.query("INSERT INTO oauth_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)", [
				accessToken,
				refreshToken,
				new Date(expiresAt * 1000),
			]);
			console.log("✅ Initial OAuth tokens stored successfully");
		} finally {
			client.release();
		}
	}
}

export default StravaClient;
