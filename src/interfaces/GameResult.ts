export interface AnswerRecord {
    question: string;
    correct: boolean;
    userAnswer: any;
    correctAnswer: any;
    explanation?: string;
    skipped?: boolean;
}

export interface GameResult {
    score: number;
    total: number;
    time: number;
    answers: AnswerRecord[];
    maxStreak: number;
    mode: string;
}
