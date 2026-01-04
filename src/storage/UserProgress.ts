export interface CardProgress {
    cardId: string;
    xp: number;
    lastReviewed: number; // timestamp
    masteryLevel: 'Novice' | 'Apprentice' | 'Adept' | 'Master' | 'Grandmaster';
}

export class UserProgressService {
    private static STORAGE_KEY_PREFIX = 'mold_progress_';

    private static getStorageKey(subjectId: string): string {
        return `${this.STORAGE_KEY_PREFIX}${subjectId}`;
    }

    private static loadProgress(subjectId: string): Record<string, CardProgress> {
        try {
            const data = localStorage.getItem(this.getStorageKey(subjectId));
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to load progress', e);
            return {};
        }
    }

    private static saveProgress(subjectId: string, progress: Record<string, CardProgress>) {
        try {
            localStorage.setItem(this.getStorageKey(subjectId), JSON.stringify(progress));
        } catch (e) {
            console.error('Failed to save progress', e);
        }
    }

    static getCardXP(subjectId: string, cardId: string): number {
        const progress = this.loadProgress(subjectId);
        return progress[cardId]?.xp || 0;
    }

    static updateCardXP(subjectId: string, cardId: string, rating: 'bad' | 'hard' | 'good' | 'easy'): number {
        const progress = this.loadProgress(subjectId);
        const current = progress[cardId] || { cardId, xp: 0, lastReviewed: 0, masteryLevel: 'Novice' };

        let xpChange = 0;
        switch (rating) {
            case 'bad': xpChange = -5; break;
            case 'hard': xpChange = 2; break;
            case 'good': xpChange = 5; break;
            case 'easy': xpChange = 10; break;
        }

        current.xp = Math.max(0, current.xp + xpChange);
        current.lastReviewed = Date.now();
        current.masteryLevel = this.getMasteryLevel(current.xp);

        progress[cardId] = current;
        this.saveProgress(subjectId, progress);

        return current.xp;
    }

    static getMasteryLevel(xp: number): CardProgress['masteryLevel'] {
        if (xp >= 100) return 'Grandmaster';
        if (xp >= 75) return 'Master';
        if (xp >= 50) return 'Adept';
        if (xp >= 25) return 'Apprentice';
        return 'Novice';
    }

    /**
     * Sorts flashcards based on XP (Ascending).
     * Lower XP = Higher Priority (Shown first).
     * Also mixes in a bit of "Last Reviewed" logic could go here, but for now strict XP sort as requested.
     */
    static sortFlashcardsByPriority(subjectId: string, flashcards: any[]): any[] {
        const progress = this.loadProgress(subjectId);

        return [...flashcards].sort((a, b) => {
            const xpA = progress[a.front]?.xp || 0; // Using Front text as ID if no explicit ID
            const xpB = progress[b.front]?.xp || 0;
            return xpA - xpB;
        });
    }
}
