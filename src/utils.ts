
/**
 * Safely formats text for display, handling HTML entities and undefined values.
 * Useful for rendering pseudo-HTML tags (like <meta>) as visible text.
 */
export function formatText(input: string | undefined | null): string {
    if (input === undefined || input === null) return '';

    // If it's not a string, force it
    const text = String(input);

    return text;
}

import * as he from 'he';

/**
 * Escapes HTML characters to prevent invisible rendering using 'he' library.
 */
export function escapeHtml(text: string): string {
    if (!text) return '';
    return he.encode(text);
}
