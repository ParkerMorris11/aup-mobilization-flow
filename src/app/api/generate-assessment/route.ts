import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  assessmentQuestionsSchema,
  type AssessmentQuestionOutput,
} from "@/lib/schemas/generate-assessment-schema";
import { buildAssessmentQuestions } from "@/lib/services/generate-flow";
import { SECTION_KEYS, EMPLOYEE_SECTION_LABELS, type ParsedAupSections } from "@/lib/types/parsed-sections";
import { verifyQuoteInSource } from "@/lib/types/section-citations";
import type { AssessmentQuestion } from "@/lib/types/policy-schema";

function toAssessmentQuestions(
  questions: AssessmentQuestionOutput[],
  sections: ParsedAupSections
): AssessmentQuestion[] {
  return questions.map((q, index) => {
    const sectionText = sections[q.sourceSection].join("\n");
    return {
      id: `assessment-${index + 1}`,
      prompt: q.prompt,
      options: q.options,
      correctAnswer: q.correctAnswer,
      rationale: q.rationale,
      sourceSection: q.sourceSection,
      sourceQuote: verifyQuoteInSource(q.sourceQuote, sectionText) ? q.sourceQuote : undefined,
    };
  });
}

export async function POST(request: Request) {
  let sections: ParsedAupSections | null = null;
  let organizationName = "your organization";

  try {
    const body = (await request.json()) as {
      sections?: ParsedAupSections;
      organizationName?: string;
    };
    sections = body.sections ?? null;
    organizationName = body.organizationName?.trim() || organizationName;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!sections) {
    return Response.json({ error: "No parsed sections provided." }, { status: 400 });
  }

  const nonEmptySections = SECTION_KEYS.filter((key) => sections![key].length > 0);

  if (nonEmptySections.length === 0) {
    return Response.json({ questions: buildAssessmentQuestions(sections), parseMethod: "heuristic" as const });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ questions: buildAssessmentQuestions(sections), parseMethod: "heuristic" as const });
  }

  try {
    const sectionsBlock = nonEmptySections
      .map((key) => `${EMPLOYEE_SECTION_LABELS[key]} (key: ${key}):\n${sections![key].map((b) => `- ${b}`).join("\n")}`)
      .join("\n\n");

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: assessmentQuestionsSchema,
      prompt: `You are writing a short knowledge-check quiz for employees of ${organizationName} based on their AI Acceptable Use Policy. The policy has already been condensed into these employee-facing sections and bullets:

${sectionsBlock}

Write exactly 5 multiple-choice questions total — this is a short knowledge check, not a comprehensive exam. Select the 5 most important, most testable pieces of policy content across all the sections above:
- Favor content where a wrong answer could cause real harm (data exposure, using an unapproved tool, skipping escalation) over minor or procedural details.
- Aim for broad coverage across sections, but it's fine for a less critical section to get zero questions rather than force weak questions everywhere — do not invent extra sections.
- If a section has very little content, it's fine to write more than one question from the same bullet rather than inventing new material — every question must still be grounded in a real, exact quote.

Each question must:
- Test comprehension of ONE specific bullet — not a vague generality.
- Have 3-4 answer options: one correct, and 2-3 plausible-but-wrong distractors that relate to the SAME section/topic (not obviously unrelated or silly), so the question actually tests understanding rather than obvious elimination.
- correctAnswer must be an exact string match of one of the options.
- sourceQuote must be an exact verbatim substring copied from the bullet(s) of that section above — do not paraphrase it.
- rationale is one sentence explaining why the correct answer is right, suitable to show the employee after they answer.
- Vary the POSITION of the correct answer within the options list across the 5 questions — don't list it first every time, or let it fall into any other obvious pattern. An employee should not be able to guess "the answer is always first" after seeing a couple of questions.

Keep prompts and options concise and in plain language suitable for a non-technical employee.`,
    });

    const questions = toAssessmentQuestions(object.questions, sections);
    return Response.json({ questions, parseMethod: "llm" as const });
  } catch (error) {
    console.error("LLM assessment generation failed, using deterministic fallback:", error);
    return Response.json({ questions: buildAssessmentQuestions(sections), parseMethod: "heuristic" as const });
  }
}
