/**
 * Heuristic extraction of "section headings" from uploaded AUP text.
 *
 * Goal (MVP): show the user a quick outline / structure signal so we can
 * align the AUP Creator output template without copying its branding.
 *
 * FUTURE: replace with a better document-structure parser (PDF layout +
 * LLM extraction).
 */

/** Lowercase connector words ignored when checking a heading's capitalization. */
const TITLE_CASE_CONNECTORS = new Set([
  "of", "the", "in", "and", "for", "with", "to", "a", "an", "on", "at", "&",
]);

/**
 * Detects a short, un-numbered, non-all-caps heading where every meaningful
 * word is capitalized (Title Case) and the line isn't a full sentence —
 * e.g. "Why Microsoft Copilot" or "Enhanced Privacy & Security Protections".
 */
function isTitleCaseHeading(line: string): boolean {
  if (line.length < 4 || line.length > 70) return false;
  if (/[.!?]$/.test(line)) return false;
  if (line === line.toUpperCase()) return false; // already handled by the ALL CAPS check
  if (/^[-•*·]/.test(line)) return false; // bullet-list item, not a heading
  if (/\d/.test(line)) return false; // dates, bylines, numbered items aren't prose headings
  if (line.includes("|")) return false; // byline-style metadata lines

  const words = line.split(" ").filter(Boolean);
  if (words.length < 2 || words.length > 8) return false;

  let capitalizedContentWords = 0;
  for (const word of words) {
    const bare = word.replace(/[^A-Za-z&]/g, "");
    if (!bare) continue;
    if (TITLE_CASE_CONNECTORS.has(bare.toLowerCase())) continue;
    if (!/^[A-Z]/.test(bare)) return false; // any real word not capitalized breaks the heading pattern
    capitalizedContentWords += 1;
  }

  return capitalizedContentWords >= 2;
}

export function extractStructureOutline(rawText: string): string[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: { line: string; score: number }[] = [];

  for (const line of lines.slice(0, 2500)) {
    const normalized = line.replace(/\s+/g, " ");

    // 1) Numbered headings: "1. PURPOSE" / "3 Data Restrictions" / "4.1 Approved tools"
    // The separator class includes "." so a plain top-level "1. Purpose" style
    // heading matches too, not just decimal sub-headings like "4.1 ...".
    const numbered =
      /^(\d+(\.\d+)?)[\s\-–—:.]*[A-Z0-9][A-Z0-9\s/&()\-]{4,}$/.test(
        normalized.toUpperCase()
      );
    if (numbered) {
      candidates.push({ line: normalized, score: 10 });
      continue;
    }

    // 2) ALL CAPS short-ish headings (often: "DATA RESTRICTIONS")
    const noPunct = normalized.replace(/[^A-Za-z0-9 ]/g, "");
    const wordCount = noPunct.split(" ").filter(Boolean).length;
    const allCaps =
      normalized.length >= 8 &&
      wordCount >= 2 &&
      normalized === normalized.toUpperCase() &&
      /[A-Z]/.test(normalized);

    if (allCaps && wordCount <= 10) {
      candidates.push({ line: normalized, score: 7 });
      continue;
    }

    // 3) Title Case prose headings: "Why Microsoft Copilot", "Enhanced Privacy
    // & Security Protections" — no numbering, not all-caps, but every
    // meaningful word is capitalized and it isn't a full sentence.
    if (isTitleCaseHeading(normalized)) {
      candidates.push({ line: normalized, score: 6 });
      continue;
    }

    // 4) Headings starting with "Section"/"Chapter"/"Policy" keywords
    if (/^(section|chapter|policy|purpose|scope|approved tools|data restrictions)/i.test(normalized)) {
      candidates.push({ line: normalized, score: 4 });
    }
  }

  // De-dupe while keeping highest score
  const byText = new Map<string, number>();
  for (const c of candidates) {
    const key = c.line;
    byText.set(key, Math.max(byText.get(key) ?? 0, c.score));
  }

  return [...byText.entries()]
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([line]) => line)
    .slice(0, 12);
}

