import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import { extractWithSemanticSearch } from "@/lib/services/semantic-section-search";

type Candidate = { text: string; score: number };

const TOOL_KEYWORDS = [
  "copilot",
  "chatgpt",
  "claude",
  "gemini",
  "github copilot",
  "azure openai",
  "microsoft copilot",
];

const DATA_KEYWORDS = [
  "pii",
  "personally identifiable",
  "customer",
  "email",
  "phone",
  "address",
  "financial",
  "revenue",
  "invoice",
  "account",
  "compensation",
  "salary",
  "payment",
  "credential",
  "password",
  "api key",
  "token",
  "trade secret",
  "source code",
  "proprietary",
  "hipaa",
  "health",
  "phi",
  "protected health",
  "hr",
  "performance review",
  "disciplinary",
  "hiring",
  "employee record",
];

const EMPTY_SECTIONS: ParsedAupSections = {
  topRulesToRemember: [],
  permittedUse: [],
  approvedTools: [],
  dataToProtect: [],
  accountability: [],
  whenUnsure: [],
};

const allGaps: Record<keyof ParsedAupSections, boolean> = {
  topRulesToRemember: true,
  permittedUse: true,
  approvedTools: true,
  dataToProtect: true,
  accountability: true,
  whenUnsure: true,
};

export interface ExtractedSectionsResult {
  sections: ParsedAupSections;
  /**
   * True for any section with no real match found in the source document.
   * These are left as an honest empty array rather than filled with
   * invented/generic content — the UI should prompt the company to write
   * their own content for these, not silently ship someone else's defaults.
   */
  sectionGaps: Record<keyof ParsedAupSections, boolean>;
  /** True when the source document had too little usable text to parse reliably at all */
  documentTooShort: boolean;
}

function normalizeLine(line: string) {
  return line
    .replace(/^[\s•\-•\*·]+/, "")
    .replace(/^\s*\d+(\.\d+)?[\s:\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function capBullet(text: string, maxChars: number) {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trim()}…`;
}

function uniqByText(items: Candidate[]) {
  const map = new Map<string, Candidate>();
  for (const c of items) {
    const key = c.text;
    const prev = map.get(key);
    if (!prev || c.score > prev.score) map.set(key, c);
  }
  return [...map.values()];
}

function topCandidates(cands: Candidate[], limit: number) {
  return uniqByText(cands)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.text);
}

function usableLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((l) => normalizeLine(l))
    .filter((l) => l.length >= 4);
}

/** A document with fewer than this many usable lines is too thin to reliably parse into 6 sections. */
const MIN_USABLE_LINES = 10;

/** Purely a property of the source document — independent of which parse method (LLM or heuristic) is used. */
export function isDocumentTooShortToParse(rawText: string): boolean {
  return usableLines(rawText).length < MIN_USABLE_LINES;
}

/** Leaves any section with no real extracted candidates as an honest gap (empty array), not generic filler. */
function finalizeSections(extracted: ParsedAupSections): ExtractedSectionsResult {
  const sections = {} as ParsedAupSections;
  const sectionGaps = {} as Record<keyof ParsedAupSections, boolean>;

  for (const key of Object.keys(EMPTY_SECTIONS) as (keyof ParsedAupSections)[]) {
    const items = extracted[key];
    sections[key] = items;
    sectionGaps[key] = items.length === 0;
  }

  return { sections, sectionGaps, documentTooShort: false };
}

/**
 * Heuristic (non-LLM) extraction with semantic search for improved coverage.
 * Reports which sections had no real match in the source document ("gaps")
 * rather than silently filling them with generic boilerplate — used both as
 * the no-API-key parse path and to build source citations for the review gate.
 *
 * V2: Uses semantic search (cross-sectional theme matching + synonym expansion)
 * as the primary extraction method, falling back to the original regex-based
 * heuristic only if semantic search returns no results at all.
 */
export function extractParsedSectionsWithFallbackFlags(
  rawText: string
): ExtractedSectionsResult {
  // Try semantic search first (handles prose documents better)
  const semanticResult = extractWithSemanticSearch(rawText);

  // If semantic search found meaningful content, use it
  const totalSemanticResults = Object.values(semanticResult.sections).reduce(
    (sum, section) => sum + section.length,
    0
  );

  if (totalSemanticResults > 0) {
    return {
      sections: semanticResult.sections,
      sectionGaps: semanticResult.sectionGaps,
      documentTooShort: semanticResult.documentTooShort,
    };
  }

  // Fallback: if semantic search found nothing, try the original heuristic
  // (This handles edge cases where the document structure is highly unusual)
  const lines = usableLines(rawText);

  if (lines.length < MIN_USABLE_LINES) {
    return {
      sections: { ...EMPTY_SECTIONS },
      sectionGaps: { ...allGaps },
      documentTooShort: true,
    };
  }

  const mustNot = /(must\s+not|never|do\s+not|prohibit|no\s+.+enter|not\s+paste|not\s+enter)/i;
  const mayAllowed = /(may|can|allowed|permitted|approved)\b/i;
  const escalate = /(escalate|when\s+in\s+doubt|when\s+unsure|if\s+unsure|contact\s+it|it\s+security|ask\s+approval|manager)/i;
  const review = /(review|verify|approve|approval|human|editor|quality gate)/i;
  const accountable = /(responsible|accountable|you\s+are\s+responsible|your\s+responsibility)/i;
  const disclosure = /(disclose|transparency|label)\b/i;

  const permittedCands: Candidate[] = [];
  const approvedToolsCands: Candidate[] = [];
  const dataProtectCands: Candidate[] = [];
  const accountabilityCands: Candidate[] = [];
  const whenUnsureCands: Candidate[] = [];
  const topRulesCands: Candidate[] = [];

  for (const rawLine of lines) {
    const line = rawLine.toLowerCase();
    const text = rawLine;

    const containsTool = TOOL_KEYWORDS.some((k) => line.includes(k));
    const containsData = DATA_KEYWORDS.some((k) => line.includes(k));
    const isMustNot = mustNot.test(text);
    const isMay = mayAllowed.test(text);
    const isEsc = escalate.test(text);
    const isReview = review.test(text);
    const isAcc = accountable.test(text);
    const isDisclosure = disclosure.test(text);

    // Permitted use (what employees can do)
    if (isMay && /(use|using|use\s+ai|draft|brainstorm|structure|summarize|outline|tone|draft)/i.test(text) && !isMustNot) {
      permittedCands.push({ text: capBullet(text, 140), score: 8 });
    }
    if (/(allowed|permitted).{0,30}(draft|brainstorm|structure|outline|tone|summarize)/i.test(text) && !isMustNot) {
      permittedCands.push({ text: capBullet(text, 140), score: 7 });
    }

    // Approved tools
    if (containsTool) {
      approvedToolsCands.push({ text: capBullet(text, 140), score: 10 });
    }
    // Data protection
    if (containsData && (isMustNot || /must\s+never|never\s+enter|do\s+not\s+enter|prohibited/i.test(text))) {
      dataProtectCands.push({ text: capBullet(text, 140), score: 12 });
    } else if (containsData && isMustNot) {
      dataProtectCands.push({ text: capBullet(text, 140), score: 10 });
    } else if (containsData && /(must|required|never|prohibit|no\s+)/i.test(text) && isMustNot) {
      dataProtectCands.push({ text: capBullet(text, 140), score: 9 });
    }

    // Accountability
    if ((isReview || isAcc) && /(output|generated|ai|content)/i.test(text)) {
      accountabilityCands.push({ text: capBullet(text, 140), score: 10 });
    } else if (isAcc) {
      accountabilityCands.push({ text: capBullet(text, 140), score: 8 });
    } else if (isReview && /(before|prior|use|external|publish|send)/i.test(text)) {
      accountabilityCands.push({ text: capBullet(text, 140), score: 8 });
    }

    // Disclosure
    if (isDisclosure && /(customer|external|deliverable|report|email|marketing)/i.test(text)) {
      accountabilityCands.push({ text: capBullet(text, 140), score: 7 });
    }

    // Escalation
    if (isEsc) {
      whenUnsureCands.push({ text: capBullet(text, 140), score: 12 });
    } else if (/(security@|helpdesk@|it\s+security|contact\s+it)/i.test(text)) {
      whenUnsureCands.push({ text: capBullet(text, 140), score: 9 });
    } else if (/(ask\s+approval|escalat)/i.test(text)) {
      whenUnsureCands.push({ text: capBullet(text, 140), score: 8 });
    }

    // Top rules (strong "must not"/escalation/accountability)
    if (isMustNot && containsData) {
      topRulesCands.push({ text: capBullet(text, 140), score: 14 });
    } else if (isMustNot && /ai/i.test(text)) {
      topRulesCands.push({ text: capBullet(text, 140), score: 12 });
    } else if (isEsc) {
      topRulesCands.push({ text: capBullet(text, 140), score: 11 });
    }
  }

  const permittedUse = topCandidates(permittedCands, 5);
  const approvedTools = topCandidates(approvedToolsCands, 5);
  const dataToProtect = topCandidates(dataProtectCands, 5);
  const accountability = topCandidates(accountabilityCands, 5);
  const whenUnsure = topCandidates(whenUnsureCands, 5);
  const topRulesToRemember = topCandidates(topRulesCands, 3);

  return finalizeSections({
    topRulesToRemember,
    permittedUse,
    approvedTools,
    dataToProtect,
    accountability,
    whenUnsure,
  });
}

/** Heuristic (non-LLM) extraction — plain sections only, no gap metadata. */
export function extractParsedSectionsFromText(rawText: string): ParsedAupSections {
  return extractParsedSectionsWithFallbackFlags(rawText).sections;
}
