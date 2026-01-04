
import { z } from 'zod';


// ==========================================
// 1. SCHEMAS (Data Contracts)
// ==========================================

export const QuestionTypeSchema = z.enum(['mcq', 'multi', 'tf']);

const BaseQuestionSchema = z.object({
    id: z.string().optional(),
    type: QuestionTypeSchema,
    question: z.string(),
    explanation: z.string(),
    category: z.string(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    relatedTerms: z.array(z.string()).optional(),
    sourceChunkId: z.string().optional(),
    isHtml: z.boolean().optional(),
});

export const MCQQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('mcq'),
    options: z.array(z.string()).min(2),
    correct: z.number().int().min(0),
});

export const MultiQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('multi'),
    options: z.array(z.string()).min(2),
    correct: z.array(z.number().int().min(0)),
});

export const TFQuestionSchema = BaseQuestionSchema.extend({
    type: z.literal('tf'),
    correct: z.boolean(),
});

export const QuestionSchema = z.discriminatedUnion('type', [
    MCQQuestionSchema,
    MultiQuestionSchema,
    TFQuestionSchema
]);

export const FlashcardSchema = z.array(z.object({
    front: z.string(),
    back: z.string(),
    type: z.enum(['term', 'question'])
}));

export const TerminologyItemSchema = z.object({
    Category: z.string(),
    Meaning: z.string(),
    Where_it_is_used: z.string().optional(),
    When_it_is_used: z.string().optional(),
    Analogy: z.string().optional(),
    Pros: z.array(z.string()).optional(),
    Cons: z.array(z.string()).optional(),
});

export const TerminologySchema = z.record(z.string(), TerminologyItemSchema);

// TypeScript Derived Types
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>[number];
export type TerminologyItem = z.infer<typeof TerminologyItemSchema>;
export type Terminology = z.infer<typeof TerminologySchema>;

// Meta Schema
export const SubjectMetaSchema = z.object({
    subject: z.object({
        id: z.string(),
        name: z.string()
    }),
    config: z.object({
        title: z.string(),
        description: z.string(),
        themeColor: z.string().optional(),
        version: z.string().optional(),
        storageKey: z.string().optional()
    })
});
export type SubjectMeta = z.infer<typeof SubjectMetaSchema>;

// ==========================================
// 2. GAME MODES (Configuration & Prompts)
// ==========================================

export interface GameModeConfig {
    id: string;
    label: string;
    description: string;
    icon: string;
    componentId: 'QuizScreen' | 'FlashcardScreen';
    schema: z.ZodType<any>;
    promptStrategy: (context: string) => string;
}

export const SUBJECT_MODES: Record<string, GameModeConfig> = {
    speedrun: {
        id: 'speedrun',
        label: 'Speedrun',
        description: 'Time Attack: Complete all questions.',
        icon: '⚡',
        componentId: 'QuizScreen',
        schema: z.array(QuestionSchema),
        promptStrategy: (context) => `
            GOAL: Generate the MASTER QUESTION SET (questions.json).
            STRATEGY: This file is used for ALL modes (Speedrun, Blitz, Revision).
            RULES:
            1. Pedagogical Order: From simple foundations to complex mastery.
            2. Comprehensive: Cover 100% of the material.
            3. Quantity: Generate as many as needed to cover the topics (Subject Specific).
            CONTEXT: ${context}
        `
    },
    blitz: {
        id: 'blitz',
        label: 'Blitz',
        description: 'Random subset for quick review.',
        icon: '🎯',
        componentId: 'QuizScreen',
        schema: z.array(QuestionSchema),
        promptStrategy: (context) => `
            GOAL: Generate the MASTER QUESTION SET (questions.json).
            NOTE: Blitz mode simply subsets this master file.
            STRATEGY: Same as Full Revision. Order matters. Coverage matters.
            CONTEXT: ${context}
        `
    },
    hardcore: {
        id: 'hardcore',
        label: 'Hardcore',
        description: 'Deep analysis & application',
        icon: '🔥',
        componentId: 'QuizScreen',
        schema: z.array(QuestionSchema),
        promptStrategy: (context) => `
            GOAL: Generate the MASTER QUESTION SET (Hardcore variant/tier).
            STRATEGY: Focus on deep analysis, edge cases, and "select all that apply".
            CONTEXT: ${context}
        `
    },
    practice: {
        id: 'practice',
        label: 'Practice',
        description: 'By category, no pressure',
        icon: '📚',
        componentId: 'QuizScreen',
        schema: z.array(QuestionSchema),
        promptStrategy: (context) => `
             GOAL: Generate the MASTER QUESTION SET (Practice view).
             STRATEGY: Ensure distinct Categories are assigned to every question for filtering.
            CONTEXT: ${context}
        `
    },
    'flashcards-term': {
        id: 'flashcards-term',
        label: 'Terminology',
        description: 'Memorize key terms',
        icon: '🃏',
        componentId: 'FlashcardScreen',
        schema: FlashcardSchema,
        promptStrategy: (context) => `
            ROLE: Lexicographer for this field.
            GOAL: Extract every significant technical term.
            STRATEGY:
            1. Front: The Term.
            2. Back: Precise Definition + a real-world Analogy (if applicable).
            3. OutputFormat: JSON array of objects with { front, back, type: 'term' }.
            CONTEXT: ${context}
        `
    },
    'flashcards-bank': {
        id: 'flashcards-bank',
        label: 'Question Bank',
        description: 'High-impact Q&A',
        icon: '🧠',
        componentId: 'FlashcardScreen',
        schema: FlashcardSchema,
        promptStrategy: (context) => `
            ROLE: Interview Coach.
            GOAL: Create a "Cheat Sheet" of high-impact Questions & Answers.
            STRATEGY:
            1. Front: A common interview or exam question.
            2. Back: The concisest "perfect score" answer.
            3. Focus on "Big Picture" concepts and critical relationships.
            CONTEXT: ${context}
        `
    },
    'full-revision': {
        id: 'full-revision',
        label: 'Full Revision',
        description: 'Strict order: Questions then Terminology. 100% Mastery.',
        icon: '🎓',
        componentId: 'QuizScreen',
        schema: z.array(QuestionSchema),
        promptStrategy: (context) => `
            ROLE: Pedagogical Architect.
            GOAL: Generate the MASTER QUESTION SET (questions.json).
            CRITICAL RULES:
            1. STRICT PEDAGOGICAL ORDER: Q1 is a foundation for Q2.
            2. NO GAPS: Assume zero prior knowledge.
            3. TOTAL COVERAGE: If it's in the text, it's in the questions.
            CONTEXT: ${context}
        `
    }
};


// ==========================================
// 3. SUBJECT DATA MODEL (The "Class")
// ==========================================

export interface SubjectData {
    id: string;
    name: string; // Add name explicitly
    config: {
        title: string;
        description: string;
        themeColor?: string;
        version?: string;
        storageKey?: string;
    };
    questions: Question[];
    flashcards: Flashcard[];
    terminology: Terminology;
    achievements: any[];
    [key: string]: any;
}

// ==========================================
// 4. LOADER LOGIC (Runtime)
// ==========================================

export class Subject {

    /**
     * Loads a full subject by ID, aggregating all generated content.
     */
    static async load(subjectId: string): Promise<SubjectData | null> {
        try {
            const metas = import.meta.glob('../../data/subjects/*/meta.json');
            let metaPath = `../../data/subjects/${subjectId}/meta.json`;

            // Handle potential URL encoding issues or mismatch
            if (!metas[metaPath]) {
                const found = Object.keys(metas).find(k => {
                    const parts = k.split('/');
                    const dir = parts[parts.length - 2];
                    return dir === subjectId || dir === decodeURIComponent(subjectId);
                });
                if (found) metaPath = found;
                else return null;
            }

            const metaMod: any = await metas[metaPath]();
            const config = metaMod.default.config;
            const subjectMeta = metaMod.default.subject || {};
            const name = subjectMeta.name || config.title || subjectId;

            // Load Content
            const jsonFiles = import.meta.glob('../../data/subjects/**/*.json', { eager: true });
            let questions: Question[] = [];
            let flashcards: Flashcard[] = [];
            let terminology: Terminology = {};
            let achievements: any[] = [];

            // We need to match files in the same relative directory as metaPath
            // metaPath is like ../../data/subjects/Theory of computation/meta.json
            const subjectDirPart = metaPath.split('/').slice(0, -1).join('/'); // ../../data/subjects/Theory of computation

            for (const filePath in jsonFiles) {
                // strict check: filePath must start with the subject directory path
                // normalizing paths might be needed if slashes differ, but import.meta.glob usually standardizes to '/'
                if (!filePath.startsWith(subjectDirPart + '/')) continue;

                const fileName = filePath.split('/').pop() || '';
                const content = (jsonFiles[filePath] as any).default;

                if (fileName.startsWith('questions')) {
                    if (Array.isArray(content)) questions = questions.concat(content);
                } else if (fileName.startsWith('flashcards')) {
                    if (Array.isArray(content)) flashcards = flashcards.concat(content);
                } else if (fileName.startsWith('terminology')) {
                    terminology = { ...terminology, ...content };
                } else if (fileName.startsWith('achievements')) {
                    if (Array.isArray(content)) achievements = achievements.concat(content);
                }
            }

            return {
                id: subjectId,
                name,
                config,
                questions,
                flashcards,
                terminology,
                achievements
            };

        } catch (error) {
            console.error(`Failed to load subject ${subjectId}`, error);
            return null;
        }
    }

    /**
     * Returns a list of all available subjects (for the Index page).
     */
    static async listAll(): Promise<SubjectData[]> {
        const metas = import.meta.glob('../../data/subjects/*/meta.json');
        const subjects: SubjectData[] = [];

        for (const metaPath in metas) {
            try {
                // Extract ID from path: ../../data/subjects/blockchain/meta.json -> blockchain
                const parts = metaPath.split('/');
                const id = parts[parts.length - 2];
                // Use the extracted ID to load the full subject
                const subj = await this.load(id);
                if (subj) subjects.push(subj);
            } catch (e) {
                console.error(`Error listing subject ${metaPath}`, e);
            }
        }
        return subjects;
    }
}
