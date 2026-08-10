/**
 * BrainStorm Flow Builder bulk-import template — exact column order.
 * App reads Items and Questions columns by position, not header name.
 */

export const FLOW_BUILDER_SHEETS = {
  flow: "Flow",
  items: "Items",
  questions: "Questions",
} as const;

export const FLOW_LABELS = [
  "Flow Title",
  "Flow Description",
  "Software Application",
] as const;

export const ITEM_COLUMNS = [
  "#",
  "Title",
  "Type",
  "Source",
  "Section Header",
  "Description",
  "Labels",
  "Asset ID",
  "Show Correct Answers",
  "Percentage Required",
  "Percentage Value",
] as const;

export type FlowItemType =
  | "Video"
  | "Pdf"
  | "Survey"
  | "Assessment"
  | "Scorm"
  | "Link"
  | "Email";

export type FlowItemSource = "Existing" | "New";

export interface FlowBuilderItem {
  title: string;
  type: FlowItemType;
  source: FlowItemSource;
  sectionHeader?: string;
  description?: string;
  labels?: string;
  assetId?: string;
  showCorrectAnswers?: "Yes" | "No";
  percentageRequired?: "Yes" | "No";
  percentageValue?: number;
}

export interface FlowBuilderQuestion {
  assetTitle: string;
  questionNumber: number;
  questionText: string;
  type: string;
  options: string[];
  correct?: string;
  required?: "Yes" | "No";
  branching?: "Yes" | "No";
  requireAllCorrect?: "Yes" | "No";
}
