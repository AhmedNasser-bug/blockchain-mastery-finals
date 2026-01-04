# ⚡ Mold V2: Gamified Learning Platform

A powerful, extensible platform for mastering subjects through gamified quizzes, flashcards, and spaced repetition. Built with **Astro**.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```sh
    npm install
    ```
2.  **Start Development Server**:
    ```sh
    npm run dev
    ```
3.  **Build for Production**:
    ```sh
    npm run build
    ```

---

## 📚 How to Add a New Subject ("Mold")

A **Mold** is a self-contained subject package (e.g., *Blockchain*, *Web Programming*). To add a new subject, you simply create a folder and add JSON files.

### 1. Create the Directory
Go to `src/data/subjects/` and create a new folder. The folder name itself (e.g., `MySubject`) is used as the internal ID.
> **Example**: `src/data/subjects/WebProgramming/`

### 2. Create `meta.json` (Required)
This file governs how the subject appears in the menu. It **MUST** contain both `subject` and `config` objects.

**File Path**: `.../[YourFolder]/meta.json`
```json
{
  "subject": {
    "id": "my-subject-id",
    "name": "My Subject Name"
  },
  "config": {
    "title": "My Subject Name",
    "description": "A short description displayed on the card.",
    "themeColor": "#FFD700",
    "version": "1.0.0"
  }
}
```

### 3. Add Content Files
The system automatically loads files starting with specific prefixes.

#### A. `questions.json` (The Question Bank)
This file drives **Speedrun**, **Blitz**, **Hardcore**, **Practice**, and **Full Revision** modes.

**File Path**: `.../[YourFolder]/questions.json`
```json
[
  {
    "id": "q1",
    "type": "mcq", 
    "category": "Basic Concepts",
    "question": "What is the capital of France?",
    "options": ["Berlin", "Madrid", "Paris", "Rome"],
    "correct": 2,
    "explanation": "Paris is the capital.",
    "difficulty": "Easy",
    "relatedTerms": ["Capital_City"]
  },
  {
    "id": "q2",
    "type": "multi",
    "category": "Advanced",
    "question": "Select all prime numbers.",
    "options": ["2", "4", "5", "9"],
    "correct": [0, 2],
    "explanation": "2 and 5 are prime.",
    "difficulty": "Hard"
  },
  {
    "id": "q3",
    "type": "tf",
    "category": "Logic",
    "question": "True or False: The sky is usually green.",
    "correct": false,
    "explanation": "It's blue.",
    "difficulty": "Easy"
  }
]
```
> **Important**: `difficulty` must be one of: `"Easy"`, `"Medium"`, `"Hard"`.

#### B. `terminology.json` (The Encyclopedia)
Defines terms for the Encyclopedia view and auto-generates questions for **Full Revision** mode.

**File Path**: `.../[YourFolder]/terminology.json`
```json
{
  "API": {
    "Category": "Software",
    "Meaning": "Application Programming Interface.",
    "Analogy": "A waiter at a restaurant.",
    "Where_it_is_used": "Software integration.",
    "When_it_is_used": "Connecting two systems.",
    "Pros": ["Modular", "Reusable"],
    "Cons": ["Overhead"]
  },
  "HTTP": {
    "Category": "Protocol",
    "Meaning": "Hypertext Transfer Protocol.",
    "Analogy": "The language of the web."
  }
}
```

#### C. `flashcards.json` (Memorization)
Manually defined flashcards for **Flashcard** mode.

**File Path**: `.../[YourFolder]/flashcards.json`
```json
[
  {
    "front": "What does SQL stand for?",
    "back": "Structured Query Language",
    "type": "term" 
  }
]
```
> `type` can be `"term"` or `"question"`.

### 4. Verify
After adding these files, simply run `npm run dev`. The new subject will appear on the dashboard automatically.

---

---

## 🎓 Full Revision Mode

**Full Revision Mode** is designed for pedagogical mastery. Unlike other modes that randomize questions, this mode:
1.  **Strict Order**: Presents questions in the exact order they are defined in `questions.json`. This allows for a "bottom-up" learning experience where concepts build upon each other.
2.  **Terminology Integration**: After all standard questions are completed, the system will present every term from `terminology.json` as a verification question.
3.  **100% Mastery**: The goal is to verify knowledge of the *entire* material without gaps.

> **Note**: For Subject Creators, ensure your `questions.json` is ordered logically from easiest/foundational to hardest/complex for this mode to be most effective.

## 🎮 How to Add a New Game Mode

Game modes (e.g., "Speedrun", "Hardcore") are defined in the code to control how questions are selected and presented.

### Step 1: Open definition file
Open `src/data/subjects/Subject.ts`.

### Step 2: Add to `SUBJECT_MODES` Dictionary
Locate the `SUBJECT_MODES` export and add your new mode configuration.

```typescript
export const SUBJECT_MODES: Record<string, GameModeConfig> = {
    // ... existing modes ...
    
    mymode: {
        id: 'mymode',
        label: 'My Custom Mode',
        description: 'Describe your mode here',
        icon: '🚀', // Emoji or icon code
        
        // componentId determines the UI screen to use:
        // 'QuizScreen' -> Standard multiple choice/TF quiz layout
        // 'FlashcardScreen' -> Front/Back card swiping layout
        componentId: 'QuizScreen', 
        
        // Zod schema to validate data for this mode
        schema: z.array(QuestionSchema),
        
        // AI Prompt strategy (if using AI generation features)
        promptStrategy: (context) => `
            GOAL: Generate questions for My Custom Mode.
            STRATEGY: Focus on ...
            CONTEXT: ${context}
        `
    }
};
```

### Step 3: Verify
Save the file. Your new mode will automatically appear in the "Select Mode" section on the Home Screen for every subject.

---

## 🛠️ Project Structure

```text
/
├── src/
│   ├── components/    # Reusable UI components
│   ├── data/
│   │   └── subjects/  # <--- YOUR DATA LIVES HERE
│   │       ├── Subject.ts  # Game Mode definitions
│   │       └── [SubjectName]/
│   │           ├── meta.json
│   │           ├── questions.json
│   │           └── ...
│   ├── pages/         # Astro routes
│   └── layouts/       # Page layouts
└── public/            # Static assets
```
