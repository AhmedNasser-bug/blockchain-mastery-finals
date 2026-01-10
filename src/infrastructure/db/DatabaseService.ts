
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export class DatabaseService {
    private static instance: DatabaseService;
    private db: any;

    private constructor() { }

    public static async getInstance(): Promise<DatabaseService> {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
            await DatabaseService.instance.init();
        }
        return DatabaseService.instance;
    }

    private async init() {
        try {
            const sqlite3 = await sqlite3InitModule({
                print: console.log,
                printErr: console.error,
                locateFile: (file: string) => `/sqlite3.wasm` // Load from public root
            });

            // Try OPFS first, fall back to memory if not supported
            if ('opfs' in sqlite3) {
                this.db = new sqlite3.oo1.OpfsDb('/game_data.sqlite3');
                console.log('Database initialized with OPFS persistence.');
            } else {
                console.warn("OPFS not available, falling back to transient memory DB.");
                this.db = new sqlite3.oo1.DB('/game_data.sqlite3', 'ct');
            }
            this.migrate();
        } catch (e) {
            console.error("Failed to initialize database:", e);
            throw e;
        }
    }

    private migrate() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS player (id INTEGER PRIMARY KEY, name TEXT, exp INTEGER);
            CREATE TABLE IF NOT EXISTS subject (
                id TEXT PRIMARY KEY, 
                name TEXT, 
                subject_api_uri TEXT,
                terminology TEXT,
                flashcards TEXT
            );
            CREATE TABLE IF NOT EXISTS question (
                id INTEGER,
                subject_id TEXT,
                category TEXT,
                type TEXT,
                question TEXT,
                options TEXT,
                correct TEXT,
                explanation TEXT,
                PRIMARY KEY (id, subject_id),
                FOREIGN KEY(subject_id) REFERENCES subject(id)
            );
            CREATE TABLE IF NOT EXISTS player_stats (
                id INTEGER PRIMARY KEY, 
                player_id INTEGER, 
                subject_id TEXT, 
                high_score INTEGER,
                total_runs INTEGER DEFAULT 0,
                FOREIGN KEY(player_id) REFERENCES player(id),
                FOREIGN KEY(subject_id) REFERENCES subject(id)
            );
        `);

        // Migration for existing databases (Schema Evolution)
        try {
            this.db.exec("ALTER TABLE subject ADD COLUMN subject_api_uri TEXT;");
        } catch (e) { }

        try {
            this.db.exec("ALTER TABLE subject ADD COLUMN terminology TEXT;");
        } catch (e) { }

        try {
            this.db.exec("ALTER TABLE subject ADD COLUMN flashcards TEXT;");
        } catch (e) { }
    }

    // Generic query wrapper
    public query(sql: string, params: any[] = []): any[] {
        const result: any[] = [];
        this.db.exec({
            sql,
            bind: params,
            rowMode: 'object',
            callback: (row: any) => result.push(row)
        });
        return result;
    }

    public run(sql: string, params: any[] = []): void {
        this.db.exec({ sql, bind: params });
    }

    public async subjectExists(id: string): Promise<boolean> {
        const res = this.query("SELECT id FROM subject WHERE id = ?", [id]);
        return res.length > 0;
    }
}
