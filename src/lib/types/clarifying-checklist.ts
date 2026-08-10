import {
  SECTION_KEYS as CHECKLIST_SECTION_KEYS,
  type ParsedAupSections,
} from "@/lib/types/parsed-sections";

export type ClarifyingQuestionSource = "ai" | "staff";

export interface ClarifyingChecklistItem {
  flagKey: string;
  sectionKey: keyof ParsedAupSections;
  question: string;
  source: ClarifyingQuestionSource;
  /** false = dismissed — excluded from client-facing use, but not deleted */
  included: boolean;
  /** presence of a non-empty note means the client has answered this */
  note: string;
}

export function aiFlagKey(sectionKey: keyof ParsedAupSections, index: number): string {
  return `${sectionKey}:ai:${index}`;
}

export function staffFlagKey(sectionKey: keyof ParsedAupSections, id: number): string {
  return `${sectionKey}:staff:${id}`;
}

/**
 * Build the full interactive checklist (AI-generated + staff-added questions,
 * with dismiss/answer state layered on) from the underlying parse state.
 * Pure function of state — nothing here is persisted directly, so the UI
 * always reflects the current clarifyingPrompts + overrides.
 */
export function buildClarifyingChecklist({
  clarifyingPrompts,
  customQuestions,
  dismissedFlags,
  notes,
}: {
  clarifyingPrompts: Record<string, string[]>;
  customQuestions: Record<string, string[]>;
  dismissedFlags: Record<string, true>;
  notes: Record<string, string>;
}): ClarifyingChecklistItem[] {
  const items: ClarifyingChecklistItem[] = [];

  for (const sectionKey of CHECKLIST_SECTION_KEYS) {
    (clarifyingPrompts[sectionKey] ?? []).forEach((question, index) => {
      const flagKey = aiFlagKey(sectionKey, index);
      items.push({
        flagKey,
        sectionKey,
        question,
        source: "ai",
        included: !dismissedFlags[flagKey],
        note: notes[flagKey] ?? "",
      });
    });

    (customQuestions[sectionKey] ?? []).forEach((question, index) => {
      const flagKey = staffFlagKey(sectionKey, index);
      items.push({
        flagKey,
        sectionKey,
        question,
        source: "staff",
        included: !dismissedFlags[flagKey],
        note: notes[flagKey] ?? "",
      });
    });
  }

  return items;
}
