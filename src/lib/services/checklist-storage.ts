/**
 * Persists the clarifying-checklist overrides (dismiss/answer/custom-question state)
 * in localStorage, keyed by organization name — separate from the main sessionStorage
 * state so that revisiting the same client's AUP days later restores where you left
 * off, while everything else still resets per session.
 */

const CHECKLIST_STORAGE_PREFIX = "aup-checklist:";

export interface StoredChecklistState {
  customClarifyingQuestions: Record<string, string[]>;
  dismissedClarifyingFlags: Record<string, true>;
  clarifyingAnswerNotes: Record<string, string>;
}

export function checklistStorageKey(organizationName: string): string {
  const slug = organizationName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${CHECKLIST_STORAGE_PREFIX}${slug || "unknown-org"}`;
}

export function loadChecklistState(organizationName: string): StoredChecklistState | null {
  try {
    const raw = localStorage.getItem(checklistStorageKey(organizationName));
    if (!raw) return null;
    return JSON.parse(raw) as StoredChecklistState;
  } catch {
    return null;
  }
}

export function saveChecklistState(organizationName: string, data: StoredChecklistState): void {
  try {
    localStorage.setItem(checklistStorageKey(organizationName), JSON.stringify(data));
  } catch {
    /* storage unavailable or full — checklist just won't persist across sessions */
  }
}

export function clearChecklistState(organizationName: string): void {
  try {
    localStorage.removeItem(checklistStorageKey(organizationName));
  } catch {
    /* ignore */
  }
}
