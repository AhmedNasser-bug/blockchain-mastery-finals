
export interface GameConfig {
    subjectId: string;
    modeType: 'practice' | 'challenge';
    specificMode?: 'speedrun' | 'blitz' | 'exam' | 'hardcore';
    settings: {
        timeLimitSeconds: number; // 0 for infinite
        isSurvival: boolean;
        difficulty?: 'hardcore' | 'normal';
    };
}
