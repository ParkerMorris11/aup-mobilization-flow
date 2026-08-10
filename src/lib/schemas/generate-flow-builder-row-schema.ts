import { z } from "zod";

export const flowBuilderItemRowSchema = z.object({
  title: z.string().describe("Short, employee-facing title for this new flow step"),
  type: z
    .enum(["Video", "Pdf", "Survey", "Assessment", "Scorm", "Link", "Email"])
    .describe("Asset type this row represents"),
  description: z.string().describe("One or two sentences describing what this step covers"),
  labels: z.string().describe("Comma-separated labels, e.g. 'AUP, survey'"),
});

export const flowBuilderQuestionRowSchema = z.object({
  questionText: z.string().describe("The question text, in plain language for a non-technical employee"),
  options: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Answer options for this question"),
  correct: z
    .string()
    .optional()
    .describe("For a graded question, the exact text of the correct option — must match one of the options exactly. Omit for a plain survey question with no right answer."),
});

export type FlowBuilderItemRowOutput = z.infer<typeof flowBuilderItemRowSchema>;
export type FlowBuilderQuestionRowOutput = z.infer<typeof flowBuilderQuestionRowSchema>;
