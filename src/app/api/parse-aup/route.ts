import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  groundedAupSectionsSchema,
  type GroundedAupSectionsOutput,
} from "@/lib/schemas/parse-aup-schema";
import { extractParsedSectionsWithFallbackFlags } from "@/lib/services/extract-parsed-sections-from-text";
import { extractStructureOutline } from "@/lib/services/extract-structure-outline";
import { deriveRulesFromSections } from "@/lib/services/derive-rules-from-sections";
import { computeParseConfidence } from "@/lib/services/compute-parse-confidence";
import {
  countRulesPerSection,
  findSparseSections,
  generateClarifyingPrompts,
} from "@/lib/services/generate-clarifying-prompts";
import {
  CITATION_SECTION_KEYS,
  citationsFromHeuristicResult,
  verifyQuoteInSource,
  type ParsedSectionsCitations,
} from "@/lib/types/section-citations";
import type { ParsedAupSections, OriginalSectionLabels } from "@/lib/types/parsed-sections";

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

async function heuristicParse(
  rawText: string,
  organizationName: string,
  fallbackReason?: string
) {
  const extracted = extractParsedSectionsWithFallbackFlags(rawText);
  const sections = normalizeSections(extracted.sections);
  const citations = citationsFromHeuristicResult(extracted);
  const { score, breakdown } = computeParseConfidence(rawText, sections);
  const sparseRuleCounts = countRulesPerSection(sections);
  const clarifyingPrompts = await generateClarifyingPrompts(
    sections,
    rawText,
    findSparseSections(sparseRuleCounts)
  );

  return {
    sections,
    citations,
    rules: deriveRulesFromSections(sections, organizationName),
    confidence: score,
    confidenceBreakdown: breakdown,
    sparseRuleCounts,
    clarifyingPrompts,
    // Heuristic fallback doesn't link detected headings to specific sections,
    // so original labels are simply omitted on this path.
    originalSectionLabels: {} as OriginalSectionLabels,
    parseMethod: "heuristic" as const,
    fallbackReason,
  };
}

/** Verify every bullet's quote against the source; cap each section back to its normal length. */
function verifyAndBuild(
  object: GroundedAupSectionsOutput,
  rawText: string
): {
  sections: ParsedAupSections;
  citations: ParsedSectionsCitations;
  originalSectionLabels: OriginalSectionLabels;
} {
  const sections = {} as ParsedAupSections;
  const citations = {} as ParsedSectionsCitations;
  const originalSectionLabels: OriginalSectionLabels = {};

  for (const key of CITATION_SECTION_KEYS) {
    const bullets = object[key];
    citations[key] = bullets.map((b) => ({
      text: b.text,
      quote: b.quote,
      grounded: verifyQuoteInSource(b.quote, rawText),
    }));
    sections[key] = bullets.map((b) => b.text);

    const label = object.originalSectionLabels[key];
    if (label) originalSectionLabels[key] = label;
  }

  return {
    sections: normalizeSections(sections),
    citations,
    originalSectionLabels,
  };
}

export async function POST(request: Request) {
  let rawText = "";
  let organizationName = "your organization";

  try {
    const body = (await request.json()) as {
      rawText?: string;
      organizationName?: string;
    };
    rawText = body.rawText?.trim() ?? "";
    organizationName = body.organizationName?.trim() || organizationName;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!rawText) {
    return Response.json({ error: "No policy content to parse." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = await heuristicParse(
      rawText,
      organizationName,
      "No Anthropic API key configured on the server — used the local heuristic scan instead of AI parsing."
    );
    return Response.json(fallback);
  }

  const MAX_POLICY_CHARS = 120000;
  const truncationWarning =
    rawText.length > MAX_POLICY_CHARS
      ? `This policy is long (${rawText.length.toLocaleString()} characters) — only the first ${MAX_POLICY_CHARS.toLocaleString()} characters were sent to the AI parser. Content past that point was not scanned.`
      : undefined;

  try {
    const headings = extractStructureOutline(rawText);
    const headingContext = headings.length
      ? `\n\nDetected section headings in this document (use these to anchor your mapping):\n${headings.map((h) => `- ${h}`).join("\n")}`
      : "";

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: groundedAupSectionsSchema,
      prompt: `You are parsing a company AI Acceptable Use Policy into employee-facing sections.

For each bullet, return:
- text: a concise, plain-language employee-facing bullet
- quote: a short quote (a few words to one sentence) copied EXACTLY, verbatim, from the policy text below that directly supports this bullet. Do not paraphrase the quote — it must be an exact substring of the source text so it can be verified.

Map content to these sections:
- topRulesToRemember: highest-priority rules (up to 3)
- permittedUse: allowed AI uses
- approvedTools: named approved tools/platforms
- dataToProtect: sensitive data categories to keep out of AI
- accountability: employee responsibilities
- whenUnsure: escalation steps when uncertain

Be thorough: content for a section is often scattered across the document in prose or bullet lists that aren't under an obviously matching heading — for example, "dataToProtect" material can appear inside a section about security features, compliance, or a product overview, not just under a heading literally called "Data" or "Restrictions." Read the ENTIRE document and pull every distinct statement relevant to each section's topic, not just the first or most obvious match. Aim for 3-5 bullets per section when the document contains that much genuinely relevant material.

IMPORTANT: This policy may not address every section — that is expected and fine. Only after reading the full document should you conclude a section has no real support — if so, return an EMPTY ARRAY for it. Do not invent, generalize from industry norms, or borrow content from a "typical" AI policy to fill a section that this specific document doesn't cover. An empty (or thin, 1-item) section is the correct, honest answer only when the source is genuinely silent or nearly silent on that topic — not when the content simply wasn't under a matching heading.${headingContext}

Also return originalSectionLabels: for each of the 6 sections, if the client's document had a clearly corresponding heading or label of its own (e.g. "Remote Work Tools", "Vendor Software"), report that exact heading text. If the section's content was inferred from scattered text without a clear original heading, return null for that section. Do not invent a heading that wasn't actually in the document.

Policy text:
${rawText.slice(0, MAX_POLICY_CHARS)}`,
    });

    const { sections, citations, originalSectionLabels } = verifyAndBuild(object, rawText);
    const { score, breakdown } = computeParseConfidence(rawText, sections);
    const sparseRuleCounts = countRulesPerSection(sections);
    const clarifyingPrompts = await generateClarifyingPrompts(
      sections,
      rawText,
      findSparseSections(sparseRuleCounts)
    );

    return Response.json({
      sections,
      citations,
      rules: deriveRulesFromSections(sections, organizationName),
      confidence: score,
      confidenceBreakdown: breakdown,
      sparseRuleCounts,
      clarifyingPrompts,
      originalSectionLabels,
      parseMethod: "llm" as const,
      truncationWarning,
    });
  } catch (error) {
    console.error("LLM parse failed, using heuristic fallback:", error);
    const message = error instanceof Error ? error.message : "unknown error";
    const fallback = await heuristicParse(
      rawText,
      organizationName,
      `AI parsing failed (${message}) — used the local heuristic scan instead.`
    );
    return Response.json(fallback);
  }
}
