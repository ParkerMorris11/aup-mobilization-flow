import { extractParsedSectionsWithFallbackFlags } from "@/lib/services/extract-parsed-sections-from-text";
import { deriveRulesFromSections } from "@/lib/services/derive-rules-from-sections";
import {
  computeParseConfidence,
  type ParseConfidenceBreakdown,
} from "@/lib/services/compute-parse-confidence";
import { countRulesPerSection } from "@/lib/services/sparse-sections";
import {
  citationsFromHeuristicResult,
  type ParsedSectionsCitations,
} from "@/lib/types/section-citations";
import type { ParsedAupSections, OriginalSectionLabels } from "@/lib/types/parsed-sections";
import type { ParseMethod, StructuredPolicyRule } from "@/lib/types/policy-schema";

export interface ParseAupResult {
  rules: StructuredPolicyRule[];
  sections: ParsedAupSections;
  parseMethod: ParseMethod;
  confidence: number;
  confidenceBreakdown: ParseConfidenceBreakdown;
  citations: ParsedSectionsCitations;
  sparseRuleCounts: Record<keyof ParsedAupSections, number>;
  clarifyingPrompts: Record<string, string[]>;
  /** Client's own heading/label per section, when their document used one — not populated by the heuristic fallback */
  originalSectionLabels: OriginalSectionLabels;
  /** Set when parsing fell back to the local heuristic scan instead of AI — surfaced so staff know why */
  fallbackReason?: string;
  /** Set when the source document was too long and had to be truncated before AI parsing */
  truncationWarning?: string;
}

function normalizeSections(sections: ParsedAupSections): ParsedAupSections {
  return {
    topRulesToRemember: sections.topRulesToRemember.slice(0, 3),
    permittedUse: sections.permittedUse.filter(Boolean),
    approvedTools: sections.approvedTools.filter(Boolean),
    dataToProtect: sections.dataToProtect.filter(Boolean),
    accountability: sections.accountability.filter(Boolean),
    whenUnsure: sections.whenUnsure.filter(Boolean),
  };
}

function heuristicParse(
  rawText: string,
  organizationName: string,
  fallbackReason?: string
): ParseAupResult {
  const extracted = extractParsedSectionsWithFallbackFlags(rawText);
  const sections = normalizeSections(extracted.sections);
  const citations = citationsFromHeuristicResult(extracted);
  const { score, breakdown } = computeParseConfidence(rawText, sections);

  return {
    rules: deriveRulesFromSections(sections, organizationName),
    sections,
    parseMethod: "heuristic",
    confidence: score,
    confidenceBreakdown: breakdown,
    citations,
    sparseRuleCounts: countRulesPerSection(sections),
    // Clarifying-prompt generation needs the Anthropic SDK, which only runs
    // server-side (in /api/parse-aup) — this local fallback only fires when
    // that network request fails entirely, so there's no LLM call available
    // to make here. Sparse sections still show, just without prompts.
    clarifyingPrompts: {},
    // Heuristic fallback doesn't link detected headings to specific sections.
    originalSectionLabels: {},
    fallbackReason,
  };
}

/**
 * Parse raw AUP text into structured policy rules and employee sections.
 * Tries the server LLM route first, then falls back to local heuristics.
 * Rules are always derived from the parsed sections of the uploaded policy —
 * never mock/hardcoded data.
 *
 * Confidence is always recomputed locally from the final (rawText, sections)
 * pair via computeParseConfidence — never trusted verbatim from the network
 * response — so it can never silently drift from what's actually on screen.
 * Citations (per-bullet source quotes, verified server-side against the raw
 * text) are passed through as-is so the review UI can show exactly what was
 * or wasn't grounded in the source document. Clarifying prompts for sparse
 * sections are likewise generated server-side and passed through as-is.
 */
export async function parseAup(
  rawText: string,
  organizationName = "your organization"
): Promise<ParseAupResult> {
  if (!rawText.trim()) {
    throw new Error("No policy content to parse.");
  }

  let response: Response;
  try {
    response = await fetch("/api/parse-aup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, organizationName }),
    });
  } catch {
    return heuristicParse(
      rawText,
      organizationName,
      "Could not reach the parsing service — used the local heuristic scan offline."
    );
  }

  if (response.ok) {
    let data: Partial<ParseAupResult>;
    try {
      data = (await response.json()) as Partial<ParseAupResult>;
    } catch {
      return heuristicParse(
        rawText,
        organizationName,
        "The parsing service returned an unreadable response — used the local heuristic scan."
      );
    }

    if (data.sections && data.citations) {
      const sections = normalizeSections(data.sections);
      const { score, breakdown } = computeParseConfidence(rawText, sections);
      return {
        rules:
          data.rules?.length
            ? data.rules
            : deriveRulesFromSections(sections, organizationName),
        sections,
        parseMethod: data.parseMethod ?? "heuristic",
        confidence: score,
        confidenceBreakdown: breakdown,
        citations: data.citations,
        sparseRuleCounts: data.sparseRuleCounts ?? countRulesPerSection(sections),
        clarifyingPrompts: data.clarifyingPrompts ?? {},
        originalSectionLabels: data.originalSectionLabels ?? {},
        fallbackReason: data.fallbackReason,
        truncationWarning: data.truncationWarning,
      };
    }
  }

  return heuristicParse(
    rawText,
    organizationName,
    "The parsing service returned an unexpected response — used the local heuristic scan."
  );
}
