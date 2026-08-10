import { z } from "zod";

const SECTION_KEYS = [
  "topRulesToRemember",
  "permittedUse",
  "approvedTools",
  "dataToProtect",
  "accountability",
  "whenUnsure",
] as const;

export const assessmentQuestionSchema = z.object({
  prompt: z.string().describe("A knowledge-check question testing comprehension of one specific AUP bullet"),
  options: z
    .array(z.string())
    .min(3)
    .max(4)
    .describe("Answer choices — one correct, the rest plausible same-topic distractors"),
  correctAnswer: z
    .string()
    .describe("Must be an exact match of one of the strings in options"),
  rationale: z.string().describe("One sentence explaining why the correct answer is right"),
  sourceSection: z
    .enum(SECTION_KEYS)
    .describe("Which of the 6 employee sections this question is grounded in"),
  sourceQuote: z
    .string()
    .describe(
      "A short verbatim quote (a few words to one sentence) copied EXACTLY from that section's bullets that this question tests. Must be an exact substring — do not paraphrase."
    ),
});

// Matches the real BSI platform's Knowledge Check (5 questions, verified
// against a live "Town of Brookhaven" flow) — the model is asked to select
// the 5 most important, most testable pieces of policy content across
// sections, not to mechanically cover every section.
export const assessmentQuestionsSchema = z.object({
  questions: z.array(assessmentQuestionSchema).length(5),
});

export type AssessmentQuestionOutput = z.infer<typeof assessmentQuestionSchema>;
export type AssessmentQuestionsOutput = z.infer<typeof assessmentQuestionsSchema>;
