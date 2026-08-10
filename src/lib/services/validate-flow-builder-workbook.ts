import type {
  FlowBuilderItem,
  FlowBuilderQuestion,
} from "@/lib/types/flow-builder-excel-schema";

export interface FlowBuilderValidationResult {
  /** Would get the file rejected (or the item silently skipped) by the platform */
  errors: string[];
  /** Legal, but worth a human glance before uploading */
  warnings: string[];
}

/**
 * Checks the in-memory workbook contents against the Flow Builder platform's
 * upload rules, scoped to what this app's generated data can actually
 * violate — not a general-purpose spreadsheet linter.
 */
export function validateFlowBuilderWorkbook(
  items: FlowBuilderItem[],
  questions: FlowBuilderQuestion[]
): FlowBuilderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    if (item.source === "Existing" && !item.assetId && !item.title.trim()) {
      errors.push(
        `"${item.title || "(untitled item)"}" is Existing with no Asset ID and no usable title — the platform has nothing to search for and will skip this item.`
      );
    }

    if (item.percentageValue !== undefined) {
      const isInteger = Number.isInteger(item.percentageValue);
      const inRange = item.percentageValue >= 0 && item.percentageValue <= 100;
      if (!isInteger || !inRange) {
        errors.push(
          `"${item.title}" has an invalid Percentage Value (${item.percentageValue}) — must be a whole number 0–100.`
        );
      }
    }
  }

  const itemTitles = new Set(items.map((item) => item.title));
  for (const question of questions) {
    if (!itemTitles.has(question.assetTitle)) {
      errors.push(
        `Question "${question.questionText}" has Asset Title "${question.assetTitle}", which doesn't match any Items row — this question will be orphaned.`
      );
    }

    const isAssessmentChoice =
      question.type === "single-choice" || question.type === "multiple-choice";
    if (isAssessmentChoice && !question.correct) {
      warnings.push(
        `Assessment question "${question.questionText}" has no Correct answer marked — it has no way to be scored.`
      );
    }
  }

  return { errors, warnings };
}
