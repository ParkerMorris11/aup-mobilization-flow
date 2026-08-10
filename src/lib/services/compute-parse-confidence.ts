import { extractStructureOutline } from "@/lib/services/extract-structure-outline";
import { SECTION_KEYS, type ParsedAupSections } from "@/lib/types/parsed-sections";

const STOPWORDS = new Set([
  "this", "that", "with", "from", "your", "have", "will", "must", "shall",
  "must not", "never", "before", "after", "into", "onto", "when", "where",
  "which", "while", "their", "there", "these", "those", "employee",
  "employees", "policy", "company", "acme", "used", "using", "such", "than",
  "then", "been", "being", "about", "above", "below", "over", "under",
]);

export interface ParseConfidenceBreakdown {
  /** Fraction of the 6 employee sections that got at least one extracted bullet */
  sectionCoverage: number;
  /** Fraction of significant words in the extracted bullets that are actually present in the source text */
  textGrounding: number;
  /** Fraction of expected document structure (headings) detected, capped at 1 */
  structureSignal: number;
}

export interface ParseConfidenceResult {
  /** Overall 0–1 confidence score */
  score: number;
  breakdown: ParseConfidenceBreakdown;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []).filter(
    (w) => !STOPWORDS.has(w)
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * A real, computable confidence signal — not a placeholder.
 *
 * - sectionCoverage: did we actually find content for all 6 employee sections,
 *   or did some fall back to generic defaults?
 * - textGrounding: do the extracted/summarized bullets actually reuse
 *   vocabulary from the source document, or do they look invented?
 * - structureSignal: did the source document have detectable section
 *   headings to parse from in the first place?
 */
export function computeParseConfidence(
  rawText: string,
  sections: ParsedAupSections
): ParseConfidenceResult {
  const sourceWords = new Set(tokenize(rawText));

  const populatedSections = SECTION_KEYS.filter(
    (key) => sections[key].length > 0
  ).length;
  const sectionCoverage = populatedSections / SECTION_KEYS.length;

  const allBullets = SECTION_KEYS.flatMap((key) => sections[key]);
  let groundedWords = 0;
  let totalWords = 0;
  for (const bullet of allBullets) {
    for (const word of tokenize(bullet)) {
      totalWords += 1;
      if (sourceWords.has(word)) groundedWords += 1;
    }
  }
  const textGrounding = totalWords > 0 ? groundedWords / totalWords : 0;

  const headingCount = extractStructureOutline(rawText).length;
  const structureSignal = Math.min(headingCount / 6, 1);

  const score = clamp(
    textGrounding * 0.55 + sectionCoverage * 0.3 + structureSignal * 0.15,
    0,
    1
  );

  return {
    score,
    breakdown: { sectionCoverage, textGrounding, structureSignal },
  };
}
