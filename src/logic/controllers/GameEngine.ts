
import type { Subject } from "../entities/Subject";
import type { Player } from "../entities/Player";
import type { GameConfig } from "../interfaces/GameConfig";
import { DatabaseService } from "../../infrastructure/db/DatabaseService";

export class GameEngine {
    private score: number = 0;
    private questions: any[] = [];
    private currentIndex: number = 0;
    private isGameOver: boolean = false;
    private startTime: number = 0;

    // Stats
    private streak: number = 0;
    private maxStreak: number = 0;
    private correctCount: number = 0;
    private incorrectCount: number = 0;

    constructor(
        private readonly subject: Subject,
        private readonly player: Player,
        private readonly config: GameConfig,
        private readonly onStateChange: (state: any) => void
    ) { }

    public async start() {
        this.resetStats();

        // Load questions
        this.questions = await this.subject.loadQuestions();

        if (this.questions.length === 0) {
            console.warn("No questions loaded.");
            this.endGame();
            return;
        }

        this.startTime = Date.now();
        this.notify();
    }

    private resetStats() {
        this.score = 0;
        this.currentIndex = 0;
        this.isGameOver = false;
        this.streak = 0;
        this.maxStreak = 0;
        this.correctCount = 0;
        this.incorrectCount = 0;
    }

    public submitAnswer(isCorrect: boolean) {
        if (this.isGameOver) return;

        if (isCorrect) {
            this.handleCorrect();
        } else {
            this.handleIncorrect();
        }
    }

    private handleCorrect() {
        this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
        this.correctCount++;

        // Combo Multiplier?
        const multiplier = 1 + (Math.floor(this.streak / 5) * 0.1);
        this.score += Math.round(10 * multiplier);

        this.nextQuestion();
    }

    private handleIncorrect() {
        this.streak = 0;
        this.incorrectCount++;

        if (this.config.settings.isSurvival) {
            this.endGame();
        } else {
            this.nextQuestion();
        }
    }

    private nextQuestion() {
        this.currentIndex++;
        if (this.currentIndex >= this.questions.length) {
            this.endGame();
        } else {
            this.notify();
        }
    }

    public endGame() {
        this.isGameOver = true;
        const totalTime = (Date.now() - this.startTime) / 1000;
        this.saveResults(this.score, totalTime);
        this.notify();
    }

    private async saveResults(score: number, time: number) {
        await this.player.addExp(score);

        const db = await DatabaseService.getInstance();
        const stats = await db.query(
            "SELECT * FROM player_stats WHERE player_id = ? AND subject_id = ?",
            [this.player.id, this.subject.id]
        );

        if (stats.length === 0) {
            await db.run(
                "INSERT INTO player_stats (player_id, subject_id, high_score, total_runs) VALUES (?, ?, ?, 1)",
                [this.player.id, this.subject.id, score]
            );
        } else {
            const currentHigh = stats[0].high_score;
            const newHigh = Math.max(currentHigh, score);
            await db.run(
                "UPDATE player_stats SET high_score = ?, total_runs = total_runs + 1 WHERE id = ?",
                [newHigh, stats[0].id]
            );
        }
    }

    private notify() {
        this.onStateChange({
            score: this.score,
            streak: this.streak,
            maxStreak: this.maxStreak,
            correctCount: this.correctCount,
            incorrectCount: this.incorrectCount,
            totalQuestions: this.questions.length,
            currentQuestion: this.questions[this.currentIndex],
            isGameOver: this.isGameOver,
            progress: (this.currentIndex / this.questions.length) * 100
        });
    }
}
