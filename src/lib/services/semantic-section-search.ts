import type { ParsedAupSections } from "@/lib/types/parsed-sections";

type Candidate = { text: string; score: number; sourceTheme: string };

/**
 * Maps employee-facing question categories to the themes where their
 * answers typically appear in the source policy. Enables cross-sectional
 * retrieval instead of a single literal keyword lookup.
 */
const CATEGORY_TO_THEMES = {
  dataToProtect: ["data_restrictions", "sensitive_data", "security", "compliance"],
  approvedTools: ["approved_tools"],
  permittedUse: ["permitted_use"],
  accountability: ["output_review", "disclosure", "accountability"],
  whenUnsure: ["escalation"],
  topRulesToRemember: ["critical_rule"],
} as const;

const MIN_THEME_SCORE: Record<keyof typeof CATEGORY_TO_THEMES, number> = {
  dataToProtect: 4,
  approvedTools: 4,
  permittedUse: 4,
  accountability: 4,
  whenUnsure: 4,
  topRulesToRemember: 4,
};

/**
 * Named-entity allowlist for AI tools. Regex/allowlist matching is
 * deterministic and catches specific product names that generic "tools?"
 * theme matching cannot reliably distinguish from prose that merely
 * mentions the word "tool".
 */
const KNOWN_TOOL_PATTERN =
  /(microsoft\s*365\s*copilot|github\s*copilot|copilot|chatgpt(?:\s*enterprise)?|claude|gemini|azure\s*openai|openai|midjourney|dall-?e|bard|llama|anthropic|microsoft\s*teams|sharepoint|onedrive|outlook)/i;

interface ThematedLine {
  text: string;
  themes: string[];
  isProhibited: boolean;
  isPermitted: boolean;
  hasKnownTool: boolean;
  isStrongToolSignal: boolean;
}

function thematizeLine(line: string): ThematedLine {
  const lower = line.toLowerCase();
  const themes: string[] = [];

  const isProhibited = /(must\s+not|never|prohibited|forbidden|do\s+not|cannot|can not|no\s+employee)/i.test(line);
  const isPermitted = /\b(may|can|allowed|permitted|approved for use)\b/i.test(line);
  const hasKnownTool = KNOWN_TOOL_PATTERN.test(lower);

  // A "strong" tool signal is a line that actually states policy about the
  // tool (which one is authorized/for what), not a heading or a bare mention.
  const isStrongToolSignal =
    hasKnownTool &&
    /(only\s+(approved|authorized|supported)|authorized\s+(ai\s+)?tools?|official\s+(ai\s+)?(platform|tool)|standardizing\s+(on|the\s+use)|approved\s+and\s+supported|the\s+only\s+ai\s+tool|organization[- ]approved|enterprise\s+license|provisioned\s+accounts?|business\s+purposes|engineering\s+teams\s+only)/i.test(
      lower
    );

  // Approved tools: requires either a known tool name, OR explicit
  // "approved/authorized tool(s)" phrasing — not just the bare word "tool".
  if (
    hasKnownTool ||
    /(approved|authorized|official|enterprise|provisioned|organization[- ]approved)\s+(ai\s+)?tools?/i.test(lower) ||
    /tools?\s+(include|are|list)/i.test(lower)
  ) {
    themes.push("approved_tools");
  }

  // Data protection: specific sensitive-data categories, not generic "data".
  if (
    /(customer|client)\s+(data|information|pii|records)/i.test(lower) ||
    /(personally identifiable|\bpii\b|social security|email address|phone number)/i.test(lower) ||
    /(financial\s+(data|information|figures|records)|revenue|invoice|salary|payroll)/i.test(lower) ||
    /(credential|password|api\s*key|secret\s*key|access\s*token)/i.test(lower) ||
    /(trade secret|source code|proprietary|confidential|classified|restricted)/i.test(lower) ||
    /(hipaa|health\s+(information|record)|phi\b)/i.test(lower) ||
    /(employee\s+record|hr\s+data|performance review)/i.test(lower) ||
    /(encrypt|data\s+loss\s+prevention|\bdlp\b|sensitive\s+data|protect.*data|safeguard)/i.test(lower)
  ) {
    themes.push("data_restrictions", "sensitive_data", "security", "compliance");
  }

  // Output review / accountability
  if (
    /(review|verify|validat|human[- ]in[- ]the[- ]loop|quality\s+(gate|check)|before\s+(publish|sending|external))/i.test(
      lower
    )
  ) {
    themes.push("output_review", "accountability");
  }

  if (/(disclos|transparen|label.*ai|ai[- ]generated|materially\s+ai)/i.test(lower)) {
    themes.push("disclosure", "accountability");
  }

  if (/(responsib|accountab|you\s+are\s+ultimately)/i.test(lower)) {
    themes.push("accountability");
  }

  // Escalation: needs an action verb + a destination, not just the word "unsure".
  if (
    /(contact|reach out|ask|report|escalate|notify)\b[\s\S]{0,60}\b(it\b|it\s*security|help\s*desk|helpdesk|manager|supervisor|compliance|legal)/i.test(
      lower
    ) ||
    /(when\s+(in\s+doubt|unsure|uncertain))/i.test(lower)
  ) {
    themes.push("escalation");
  }

  // Permitted use: a concrete task description (draft, automate, brainstorm,
  // etc.) — the modal verb ("may"/"can") is often implied by a preceding
  // sentence (e.g. "This gives staff the ability to: ...") so we don't
  // require isPermitted directly on the line.
  if (
    /(draft|brainstorm|summariz|outline|template|structure|tone|automat|efficient|research|first draft|work more|find information)/i.test(
      lower
    )
  ) {
    themes.push("permitted_use");
  }

  // Top/critical rules: strong prohibition or a clearly load-bearing statement.
  if (isProhibited && themes.includes("data_restrictions")) {
    themes.push("critical_rule");
  }
  if (isProhibited && themes.includes("escalation")) {
    themes.push("critical_rule");
  }
  if (/(this policy|zero\s*tolerance|violation|disciplinary|strictly)/i.test(lower) && isProhibited) {
    themes.push("critical_rule");
  }

  return { text: line, themes: [...new Set(themes)], isProhibited, isPermitted, hasKnownTool, isStrongToolSignal };
}

function normalizeLine(line: string): string {
  return line
    .replace(/^[\s•\-•\*·]+/, "")
    .replace(/^\s*\d+(\.\d+)?[\s:\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractThematedLines(rawText: string): ThematedLine[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.length >= 4)
    .map((line) => thematizeLine(line));
}

/**
 * Score = theme overlap weight + sentiment/entity boosts. Higher score
 * means higher confidence the line actually answers the category's question,
 * not just that it shares a keyword.
 */
function scoreForCategory(candidate: ThematedLine, category: keyof typeof CATEGORY_TO_THEMES): number {
  const expectedThemes = CATEGORY_TO_THEMES[category];
  const overlap = candidate.themes.filter((t) => (expectedThemes as readonly string[]).includes(t)).length;
  if (overlap === 0) return 0;

  let score = overlap * 4;

  if (category === "approvedTools" && candidate.isStrongToolSignal) score += 8;
  else if (category === "approvedTools" && candidate.hasKnownTool) score += 1;
  if (category === "dataToProtect" && candidate.isProhibited) score += 5;
  if (category === "permittedUse" && candidate.isPermitted) score += 3;
  if (category === "whenUnsure" && candidate.themes.includes("escalation")) score += 5;
  if (category === "topRulesToRemember" && candidate.isProhibited) score += 4;

  // Penalize section-header-like lines (all caps, very short, ends without punctuation)
  const isLikelyHeader = /^[A-Z0-9 .,'&-]{3,60}$/.test(candidate.text) && candidate.text.length < 60;
  if (isLikelyHeader) score -= 6;

  return score;
}

function topCandidates(cands: Candidate[], limit: number): Candidate[] {
  const map = new Map<string, Candidate>();
  for (const c of cands) {
    const prev = map.get(c.text);
    if (!prev || c.score > prev.score) map.set(c.text, c);
  }
  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function extractWithSemanticSearch(rawText: string): {
  sections: ParsedAupSections;
  sectionGaps: Record<keyof ParsedAupSections, boolean>;
  documentTooShort: boolean;
} {
  const lines = extractThematedLines(rawText);
  const MIN_USABLE_LINES = 6;
  const MIN_RESULTS_PER_SECTION = 2;
  const MAX_RESULTS_PER_SECTION = 5;

  if (lines.length < MIN_USABLE_LINES) {
    const empty: ParsedAupSections = {
      topRulesToRemember: [],
      permittedUse: [],
      approvedTools: [],
      dataToProtect: [],
      accountability: [],
      whenUnsure: [],
    };
    const allGaps = Object.fromEntries(
      Object.keys(empty).map((k) => [k, true])
    ) as Record<keyof ParsedAupSections, boolean>;
    return { sections: empty, sectionGaps: allGaps, documentTooShort: true };
  }

  const extractSection = (
    category: keyof typeof CATEGORY_TO_THEMES
  ): { results: Candidate[]; hasGap: boolean } => {
    const expectedThemes = CATEGORY_TO_THEMES[category];

    // Pass 1: strict — require a scored theme match above the confidence floor.
    let candidates: Candidate[] = [];
    for (const line of lines) {
      const overlap = line.themes.filter((t) => (expectedThemes as readonly string[]).includes(t)).length;
      if (overlap === 0) continue;
      const score = scoreForCategory(line, category);
      if (score >= MIN_THEME_SCORE[category]) {
        candidates.push({ text: line.text, score, sourceTheme: line.themes[0] || "general" });
      }
    }

    // Pass 2: auto-widen — if sparse, accept any theme overlap regardless
    // of score (still ranked, but lower-confidence lines are allowed in).
    if (candidates.length < MIN_RESULTS_PER_SECTION) {
      const widened: Candidate[] = [];
      for (const line of lines) {
        const overlap = line.themes.filter((t) => (expectedThemes as readonly string[]).includes(t)).length;
        if (overlap === 0) continue;
        widened.push({
          text: line.text,
          score: scoreForCategory(line, category),
          sourceTheme: line.themes[0] || "general",
        });
      }
      if (widened.length > candidates.length) candidates = widened;
    }

    const results = topCandidates(candidates, MAX_RESULTS_PER_SECTION);
    return { results, hasGap: results.length === 0 };
  };

  const dataToProtect = extractSection("dataToProtect");
  const approvedTools = extractSection("approvedTools");
  const permittedUse = extractSection("permittedUse");
  const accountability = extractSection("accountability");
  const whenUnsure = extractSection("whenUnsure");
  const topRulesToRemember = extractSection("topRulesToRemember");

  return {
    sections: {
      topRulesToRemember: topRulesToRemember.results.map((c) => c.text),
      permittedUse: permittedUse.results.map((c) => c.text),
      approvedTools: approvedTools.results.map((c) => c.text),
      dataToProtect: dataToProtect.results.map((c) => c.text),
      accountability: accountability.results.map((c) => c.text),
      whenUnsure: whenUnsure.results.map((c) => c.text),
    },
    sectionGaps: {
      topRulesToRemember: topRulesToRemember.hasGap,
      permittedUse: permittedUse.hasGap,
      approvedTools: approvedTools.hasGap,
      dataToProtect: dataToProtect.hasGap,
      accountability: accountability.hasGap,
      whenUnsure: whenUnsure.hasGap,
    },
    documentTooShort: false,
  };
}
