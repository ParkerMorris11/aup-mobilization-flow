import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { clarifyingPromptsSchema } from "@/lib/schemas/parse-aup-schema";
import { EMPLOYEE_SECTION_LABELS, type ParsedAupSections } from "@/lib/types/parsed-sections";

export { countRulesPerSection, findSparseSections } from "@/lib/services/sparse-sections";

/**
 * For sections with too little content to reliably extract (fewer than 2
 * rules), ask the LLM for clarifying questions LX staff can use in client
 * outreach — never fabricated policy content, just questions grounded in
 * what the document does and doesn't say. One batched call covers every
 * sparse section at once rather than one call per section.
 *
 * Failure is always non-fatal: if the LLM call fails or there's no API key,
 * this returns {} and the sparse sections simply show no guidance — the
 * parse pipeline itself never breaks because of this.
 */
export async function generateClarifyingPrompts(
  sections: ParsedAupSections,
  rawText: string,
  sparseKeys: (keyof ParsedAupSections)[]
): Promise<Record<string, string[]>> {
  if (sparseKeys.length === 0) return {};
  if (!process.env.ANTHROPIC_API_KEY) return {};

  try {
    const sectionSummaries = sparseKeys
      .map((key) => {
        const existing = sections[key];
        const existingText =
          existing.length > 0
            ? existing.map((r) => `- ${r}`).join("\n")
            : "(No rules found for this section)";
        return `### ${EMPLOYEE_SECTION_LABELS[key]} (key: ${key})\n${existingText}`;
      })
      .join("\n\n");

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: clarifyingPromptsSchema,
      prompt: `You are helping an LX Consulting staff member prepare to follow up with a client whose AI Acceptable Use Policy is thin or silent on some topics.

For each section below, the client's policy had fewer than 2 usable rules. Generate up to 3 clarifying questions per section that the staff member can ask the client directly (by email or call) to fill the gap.

Each question must:
- Be phrased as a question to ask the CLIENT, not an instruction to the staff member
- Be grounded in what we actually know about their policy and organization — reference specifics from the document where relevant, don't ask generically
- Help uncover what the client's actual (possibly informal/undocumented) process is, not suggest what it should be
- Avoid presuming an answer or steering them toward a specific tool/vendor

Sparse sections:
${sectionSummaries}

Full policy document for context:
${rawText.slice(0, 60000)}`,
    });

    const result: Record<string, string[]> = {};
    for (const entry of object.sections) {
      result[entry.sectionKey] = entry.questions;
    }
    return result;
  } catch (error) {
    console.error("Clarifying prompt generation failed, skipping:", error);
    return {};
  }
}
