import { buildAssessmentQuestions } from "@/lib/services/generate-flow";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import type { AssessmentQuestion } from "@/lib/types/policy-schema";

/**
 * Generate assessment questions grounded in the parsed AUP sections.
 * Tries the server LLM route first, then falls back to the deterministic
 * template on any network/response failure — assessment content should
 * never be blocked on the LLM being reachable.
 */
export async function generateAssessmentQuestions(
  sections: ParsedAupSections,
  organizationName = "your organization"
): Promise<AssessmentQuestion[]> {
  try {
    const response = await fetch("/api/generate-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections, organizationName }),
    });

    if (response.ok) {
      const data = (await response.json()) as { questions?: AssessmentQuestion[] };
      if (data.questions?.length) {
        return data.questions;
      }
    }
  } catch {
    return buildAssessmentQuestions(sections);
  }

  return buildAssessmentQuestions(sections);
}
