import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import type { FlowBuilderItem, FlowBuilderQuestion } from "@/lib/types/flow-builder-excel-schema";

function fallbackItem(): FlowBuilderItem {
  return {
    title: "New step",
    type: "Survey",
    source: "New",
    description: "Describe what this step covers.",
    labels: "AUP",
  };
}

function fallbackQuestion(assetTitle: string, questionNumber: number): FlowBuilderQuestion {
  return {
    assetTitle,
    questionNumber,
    questionText: "Describe the new question here.",
    type: "single-choice",
    options: ["Option A", "Option B", "Option C"],
    required: "No",
    branching: "No",
  };
}

/** AI-drafted new Item row, grounded loosely in the flow's own summary and existing step titles. */
export async function generateFlowBuilderItemRow(
  organizationName: string,
  flowSummary: string,
  existingTitles: string[]
): Promise<FlowBuilderItem> {
  try {
    const response = await fetch("/api/generate-flow-builder-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "item", organizationName, flowSummary, existingTitles }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        item?: { title: string; type: FlowBuilderItem["type"]; description: string; labels: string };
      };
      if (data.item) {
        return {
          title: data.item.title,
          type: data.item.type,
          source: "New",
          description: data.item.description,
          labels: data.item.labels,
        };
      }
    }
  } catch {
    return fallbackItem();
  }

  return fallbackItem();
}

/** AI-drafted new Question row for a given asset group, grounded in the parsed AUP sections when relevant. */
export async function generateFlowBuilderQuestionRow(
  organizationName: string,
  assetTitle: string,
  questionNumber: number,
  existingQuestions: string[],
  sections?: ParsedAupSections | null
): Promise<FlowBuilderQuestion> {
  try {
    const response = await fetch("/api/generate-flow-builder-row", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "question",
        organizationName,
        assetTitle,
        existingQuestions,
        sections: sections ?? undefined,
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        question?: { questionText: string; options: string[]; correct?: string };
      };
      if (data.question) {
        return {
          assetTitle,
          questionNumber,
          questionText: data.question.questionText,
          type: data.question.correct ? "single-choice" : "single-select",
          options: data.question.options,
          correct: data.question.correct,
          required: data.question.correct ? "Yes" : "No",
          branching: "No",
        };
      }
    }
  } catch {
    return fallbackQuestion(assetTitle, questionNumber);
  }

  return fallbackQuestion(assetTitle, questionNumber);
}
