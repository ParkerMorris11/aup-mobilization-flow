import { SECTION_KEYS, type ParsedAupSections } from "@/lib/types/parsed-sections";
import type { ExtractedSectionsResult } from "@/lib/services/extract-parsed-sections-from-text";

/** One extracted bullet plus the evidence used to verify it against the source document */
export interface SectionCitation {
  text: string;
  /** Verbatim (or near-verbatim) quote from the source document supporting this bullet */
  quote: string;
  /** Whether `quote` was actually verified to appear in the source document */
  grounded: boolean;
}

export type ParsedSectionsCitations = Record<
  keyof ParsedAupSections,
  SectionCitation[]
>;

export const CITATION_SECTION_KEYS: (keyof ParsedAupSections)[] = SECTION_KEYS;

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Verify a claimed quote actually appears in the source document (whitespace/case-insensitive) */
export function verifyQuoteInSource(quote: string, sourceText: string): boolean {
  const normalizedQuote = normalizeForMatch(quote);
  if (normalizedQuote.length < 8) return false;
  return normalizeForMatch(sourceText).includes(normalizedQuote);
}

/** Flatten all citations across sections, tagged with their section key and index */
export function flattenCitations(
  citations: ParsedSectionsCitations
): { sectionKey: keyof ParsedAupSections; index: number; citation: SectionCitation }[] {
  return CITATION_SECTION_KEYS.flatMap((sectionKey) =>
    citations[sectionKey].map((citation, index) => ({
      sectionKey,
      index,
      citation,
    }))
  );
}

export function citationFlagKey(
  sectionKey: keyof ParsedAupSections,
  index: number
): string {
  return `${sectionKey}:${index}`;
}

/**
 * Heuristic-extracted bullets are already verbatim lines lifted directly from
 * the source document, so grounding is known outright rather than estimated.
 * Sections with no real match are left as an honest empty array (a "gap") —
 * there's nothing to cite because there's nothing there, rather than a fake
 * bullet standing in for content the document never actually contained.
 */
export function citationsFromHeuristicResult(
  result: ExtractedSectionsResult
): ParsedSectionsCitations {
  const citations = {} as ParsedSectionsCitations;
  for (const key of CITATION_SECTION_KEYS) {
    citations[key] = result.sections[key].map((text) => ({
      text,
      quote: text,
      grounded: true,
    }));
  }
  return citations;
}
