/**
 * Employee-facing sections produced by AUP parsing.
 * Maps scanned policy rules into the mobilization PDF structure.
 */
export interface ParsedAupSections {
  /** Top 3 rules every employee should remember */
  topRulesToRemember: string[];
  /** Permitted uses — what employees can do with AI */
  permittedUse: string[];
  /** Approved tools list */
  approvedTools: string[];
  /** Data types and categories that must be protected */
  dataToProtect: string[];
  /** Employee accountability and responsibilities */
  accountability: string[];
  /** Escalation paths when uncertain */
  whenUnsure: string[];
}

export const EMPLOYEE_SECTION_LABELS = {
  topRulesToRemember: "Top rules to remember",
  permittedUse: "What can I do?",
  approvedTools: "What tools can I use?",
  dataToProtect: "What data must I protect?",
  accountability: "What am I responsible for?",
  whenUnsure: "What do I do if I'm unsure?",
} as const;

/** Canonical list of the 6 fixed section keys — import this instead of re-declaring it. */
export const SECTION_KEYS: (keyof ParsedAupSections)[] = [
  "topRulesToRemember",
  "permittedUse",
  "approvedTools",
  "dataToProtect",
  "accountability",
  "whenUnsure",
];

/**
 * The client's own heading/label for a section, when their document used one,
 * captured during LLM parsing so admin staff can see "as written in their
 * policy" alongside our standardized label. Admin-portal display only — the
 * employee-facing PDF always uses EMPLOYEE_SECTION_LABELS for consistency.
 * Not populated by the heuristic fallback path.
 */
export type OriginalSectionLabels = Partial<Record<keyof ParsedAupSections, string>>;
