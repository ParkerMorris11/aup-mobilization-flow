import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  flowBuilderItemRowSchema,
  flowBuilderQuestionRowSchema,
} from "@/lib/schemas/generate-flow-builder-row-schema";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

interface RequestBody {
  kind?: "item" | "question";
  organizationName?: string;
  flowSummary?: string;
  existingTitles?: string[];
  assetTitle?: string;
  existingQuestions?: string[];
  sections?: ParsedAupSections;
}

function fallbackItem(organizationName: string) {
  return {
    title: `${organizationName} follow-up step`,
    type: "Survey" as const,
    description: "Describe what this step covers.",
    labels: "AUP",
  };
}

function fallbackQuestion() {
  return {
    questionText: "Describe the new question here.",
    options: ["Option A", "Option B", "Option C"],
    correct: undefined,
  };
}

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const organizationName = body.organizationName?.trim() || "your organization";

  if (body.kind !== "item" && body.kind !== "question") {
    return Response.json({ error: "kind must be 'item' or 'question'." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      body.kind === "item"
        ? { item: fallbackItem(organizationName) }
        : { question: fallbackQuestion() }
    );
  }

  try {
    if (body.kind === "item") {
      const existing = body.existingTitles?.length
        ? `Existing steps already in this flow (don't duplicate these): ${body.existingTitles.join(", ")}`
        : "";

      const { object } = await generateObject({
        model: anthropic("claude-sonnet-4-5"),
        schema: flowBuilderItemRowSchema,
        prompt: `You are adding one new step to an employee AI Acceptable Use Policy mobilization flow for ${organizationName}.

Flow summary: ${body.flowSummary ?? "No summary provided."}
${existing}

Draft ONE new flow step that would reasonably fit alongside the existing ones (e.g. an extra video, PDF reference, survey, or knowledge check). Keep the title short and the description to one or two plain-language sentences.`,
      });
      return Response.json({ item: object });
    }

    const sections = body.sections;
    const sectionContext = sections
      ? Object.entries(sections)
          .filter(([, bullets]) => Array.isArray(bullets) && bullets.length > 0)
          .map(([key, bullets]) => `${key}: ${(bullets as string[]).join("; ")}`)
          .join("\n")
      : "";
    const existingQuestions = body.existingQuestions?.length
      ? `Existing questions already in this group (don't duplicate these): ${body.existingQuestions.join(" | ")}`
      : "";

    const { object } = await generateObject({
      model: anthropic("claude-sonnet-4-5"),
      schema: flowBuilderQuestionRowSchema,
      prompt: `You are adding one new question to the "${body.assetTitle ?? "flow"}" asset in an employee AI Acceptable Use Policy mobilization flow for ${organizationName}.
${sectionContext ? `\nRelevant policy content to ground the question in:\n${sectionContext}\n` : ""}
${existingQuestions}

Draft ONE new question. If this is a knowledge-check/assessment question, give it a clear correct answer (must exactly match one of the options). If this is a plain survey/feedback question with no right answer, omit "correct".`,
    });
    return Response.json({ question: object });
  } catch (error) {
    console.error("Flow builder row generation failed, using fallback:", error);
    return Response.json(
      body.kind === "item"
        ? { item: fallbackItem(organizationName) }
        : { question: fallbackQuestion() }
    );
  }
}
