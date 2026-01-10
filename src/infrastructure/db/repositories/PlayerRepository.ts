
import { DatabaseService } from "../DatabaseService";

export class PlayerRepository {
    private static instance: PlayerRepository;

    private constructor() { }

    public static getInstance(): PlayerRepository {
        if (!PlayerRepository.instance) {
            PlayerRepository.instance = new PlayerRepository();
        }
        return PlayerRepository.instance;
    }

    private async getDB() {
        return await DatabaseService.getInstance();
    }

    public async createPlayer(name: string): Promise<any> {
        const db = await this.getDB();
        // Check if exists
        const exists = db.query("SELECT * FROM player WHERE name = ?", [name]);
        if (exists.length > 0) return exists[0];

        db.run("INSERT INTO player (name, exp) VALUES (?, 0)", [name]);
        const newPlayer = db.query("SELECT * FROM player WHERE name = ?", [name]);
        return newPlayer[0];
    }

    public async getPlayer(id: number): Promise<any> {
        const db = await this.getDB();
        const res = db.query("SELECT * FROM player WHERE id = ?", [id]);
        return res[0];
    }

    public async updateExp(playerId: number, exp: number): Promise<void> {
        const db = await this.getDB();
        db.run("UPDATE player SET exp = ? WHERE id = ?", [exp, playerId]);
    }

    public async updateName(playerId: number, name: string): Promise<void> {
        const db = await this.getDB();
        db.run("UPDATE player SET name = ? WHERE id = ?", [name, playerId]);
    }

    public async getStats(playerId: number, subjectId: string): Promise<any> {
        const db = await this.getDB();
        const res = db.query(
            "SELECT * FROM player_stats WHERE player_id = ? AND subject_id = ?",
            [playerId, subjectId]
        );
        return res[0];
    }

    public async saveStats(playerId: number, subjectId: string, highScore: number, totalRuns: number): Promise<void> {
        const db = await this.getDB();
        const existing = await this.getStats(playerId, subjectId);
        if (existing) {
            db.run(
                "UPDATE player_stats SET high_score = ?, total_runs = ? WHERE id = ?",
                [highScore, totalRuns, existing.id]
            );
        } else {
            db.run(
                "INSERT INTO player_stats (player_id, subject_id, high_score, total_runs) VALUES (?, ?, ?, ?)",
                [playerId, subjectId, highScore, totalRuns]
            );
        }
    }
}
