import { DatabaseService } from "../../infrastructure/db/DatabaseService";
import { SubjectRepository } from "../../infrastructure/db/repositories/SubjectRepository";

export class DataSyncService {

    /**
     * Ensures validity of subject data in local DB. 
     * If missing, fetches full bundle from API and hydrates DB.
     */
    static async syncSubject(id: string): Promise<boolean> {
        const repo = SubjectRepository.getInstance();
        const exists = await repo.exists(id);

        if (exists) {
            console.log(`[DataSync] Subject ${id} exists in DB. Skipping fetch.`);
            return true;
        }

        console.log(`[DataSync] Subject ${id} missing. Fetching from API...`);
        return await this.fetchAndHydrate(id);
    }

    private static async fetchAndHydrate(id: string): Promise<boolean> {
        try {
            const safeId = encodeURIComponent(id);
            const apiUrl = `/api/subjects/${safeId}`;

            console.log(`[DataSync] Requesting: ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.warn(`[DataSync] First attempt failed: ${response.status} ${response.statusText}`);

                // Fallback logic for case sensitivity similar to Subject.ts (moved here)
                if (response.status === 404 && id !== id.toLowerCase()) {
                    const lowerUrl = `/api/subjects/${encodeURIComponent(id.toLowerCase())}`;
                    const retry = await fetch(lowerUrl);
                    if (retry.ok) {
                        return await this.processResponse(retry, id);
                    }
                }
                console.error(`[DataSync] Failed to fetch ${apiUrl}`);
                return false;
            }

            return await this.processResponse(response, id);
        } catch (e) {
            console.error(`[DataSync] Sync failed for ${id}`, e);
            return false;
        }
    }

    private static async processResponse(response: Response, originalId: string): Promise<boolean> {
        try {
            const data = await response.json();
            const subjectId = data.id || originalId;
            const meta = data.meta || {};
            const subjectName = meta.subject?.name || meta.config?.title || subjectId;
            const apiUri = `/api/subjects/${encodeURIComponent(subjectId)}`;
            const questions = Array.isArray(data.questions) ? data.questions : [];
            const terminology = Array.isArray(data.terminology) ? data.terminology : [];
            const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];

            // Use Repository for Transactional Save
            await SubjectRepository.getInstance().saveFullSubject(subjectId, subjectName, apiUri, questions, terminology, flashcards);

            console.log(`[DataSync] Successfully synced ${subjectId}`);
            return true;

        } catch (e) {
            console.error(`[DataSync] Sync processing failed`, e);
            return false;
        }
    }
}
