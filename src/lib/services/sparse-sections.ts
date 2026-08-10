import type { ParsedAupSections } from "@/lib/types/parsed-sections";

/** Sections with fewer rules than this are considered too thin to reliably reflect the client's actual policy */
export const SPARSE_THRESHOLD = 2;

/** Per-section overrides for sections where the default threshold doesn't fit (e.g. a single approved tool is a valid, complete policy) */
export const SECTION_SPARSE_THRESHOLDS: Partial<Record<keyof ParsedAupSections, number>> = {
  approvedTools: 1,
};

export function countRulesPerSection(
  sections: ParsedAupSections
): Record<keyof ParsedAupSections, number> {
  return {
    topRulesToRemember: sections.topRulesToRemember.filter(Boolean).length,
    permittedUse: sections.permittedUse.filter(Boolean).length,
    approvedTools: sections.approvedTools.filter(Boolean).length,
    dataToProtect: sections.dataToProtect.filter(Boolean).length,
    accountability: sections.accountability.filter(Boolean).length,
    whenUnsure: sections.whenUnsure.filter(Boolean).length,
  };
}

export function findSparseSections(
  ruleCounts: Record<keyof ParsedAupSections, number>
): (keyof ParsedAupSections)[] {
  return (Object.keys(ruleCounts) as (keyof ParsedAupSections)[]).filter(
    (key) => ruleCounts[key] < (SECTION_SPARSE_THRESHOLDS[key] ?? SPARSE_THRESHOLD)
  );
}
