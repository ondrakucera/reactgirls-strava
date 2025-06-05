import * as cron from "node-cron";
import DataSyncService from "../services/dataSyncService";

class JobScheduler {
	private dataSyncService: DataSyncService;
	private syncJob: cron.ScheduledTask | null = null;

	constructor() {
		this.dataSyncService = new DataSyncService();
	}

	startScheduler(): void {
		console.log("⏰ Starting job scheduler...");

		// Run every 15 minutes
		this.syncJob = cron.schedule(
			"*/15 * * * *",
			async () => {
				console.log("🔄 Executing scheduled data sync job...");
				try {
					await this.dataSyncService.syncClubData();
				} catch (error) {
					console.error("❌ Scheduled sync job failed:", error);
				}
			},
			{
				scheduled: true,
				timezone: "UTC",
			},
		);

		console.log("✅ Job scheduler started - syncing every 15 minutes");

		// Run initial sync after 30 seconds to allow server to fully start
		setTimeout(async () => {
			console.log("🚀 Running initial data sync...");
			try {
				await this.dataSyncService.syncClubData();
			} catch (error) {
				console.error("❌ Initial sync failed:", error);
			}
		}, 30000);
	}

	stopScheduler(): void {
		if (this.syncJob) {
			this.syncJob.stop();
			console.log("⏹️ Job scheduler stopped");
		}
	}

	// Manual sync trigger for testing/admin purposes
	async triggerSync(): Promise<any> {
		console.log("🔄 Manual sync triggered...");
		await this.dataSyncService.syncClubData();
		return await this.dataSyncService.getSyncStats();
	}

	async getSyncStats(): Promise<any> {
		return await this.dataSyncService.getSyncStats();
	}
}

export default JobScheduler;
