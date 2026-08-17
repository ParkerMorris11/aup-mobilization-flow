import ExcelJS from "exceljs";
import type {
  AssessmentQuestion,
  FlowStep,
  MobilizationFlow,
  PdfAssetOverrides,
  SurveyQuestion,
} from "@/lib/types/policy-schema";
import { EMPTY_PDF_ASSET_OVERRIDES } from "@/lib/types/policy-schema";
import {
  FLOW_BUILDER_SHEETS,
  FLOW_LABELS,
  ITEM_COLUMNS,
  type FlowBuilderItem,
  type FlowBuilderQuestion,
} from "@/lib/types/flow-builder-excel-schema";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  bold: true,
  size: 10,
};

const BODY_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
};

function applyHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
}

function applyBodyFont(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = BODY_FONT;
  });
}

function optionLetters(count: number) {
  return Array.from({ length: count }, (_, index) =>
    String.fromCharCode(65 + index)
  );
}

function correctAnswerLetter(options: string[], correctAnswer: string) {
  const index = options.findIndex((option) => option === correctAnswer);
  return index >= 0 ? String.fromCharCode(65 + index) : "";
}

function mapSurveyQuestionType(type: SurveyQuestion["type"]) {
  switch (type) {
    case "single_select":
      return "single-select";
    case "multi_select":
      return "multi-select";
    case "scale":
      return "rating";
    case "free_text":
      return "text";
  }
}

function mapFlowStepKind(kind: FlowStep["kind"]): FlowBuilderItem["type"] {
  switch (kind) {
    case "video":
      return "Video";
    case "pdf":
      return "Pdf";
    case "survey":
      return "Survey";
    case "assessment":
      return "Assessment";
    case "acknowledgment":
      return "Survey";
    default:
      return "Survey";
  }
}

function defaultSourceForType(type: FlowBuilderItem["type"]): FlowBuilderItem["source"] {
  if (type === "Survey" || type === "Assessment") {
    return "New";
  }
  return "Existing";
}

function sectionHeaderForGroup(
  group: FlowStep["group"],
  isFirstInGroup: boolean
): string | undefined {
  if (!isFirstInGroup) return undefined;

  switch (group) {
    case "start":
      return "Introduction";
    case "review":
      return "The Policy";
    case "apply":
      return "Check Your Understanding";
    case "complete":
      return "Wrap Up";
  }
}

function buildItems(
  flow: MobilizationFlow,
  pdfAssetOverrides: PdfAssetOverrides = EMPTY_PDF_ASSET_OVERRIDES
): FlowBuilderItem[] {
  const seenGroups = new Set<FlowStep["group"]>();

  return flow.flowSteps.map((step) => {
    const type = mapFlowStepKind(step.kind);
    const isFirstInGroup = !seenGroups.has(step.group);
    seenGroups.add(step.group);

    const item: FlowBuilderItem = {
      title: step.title,
      type,
      source: defaultSourceForType(type),
      sectionHeader: sectionHeaderForGroup(step.group, isFirstInGroup),
    };

    if (item.source === "New") {
      item.description = step.description;
      if (step.kind === "survey") {
        item.labels = step.id.includes("exit") ? "AUP, exit" : "AUP, baseline";
      } else if (step.kind === "assessment") {
        item.labels = "AUP, assessment";
      } else if (step.kind === "acknowledgment") {
        item.labels = "AUP, acknowledgment";
      }
    }

    if (step.kind === "pdf" && step.id === "your-ai-policy-at-a-glance") {
      applyPdfAssetOverride(item, step, pdfAssetOverrides.policyAtAGlance, "AUP, employee-pdf");
    }

    if (step.kind === "pdf" && step.id === "official-company-aup") {
      applyPdfAssetOverride(item, step, pdfAssetOverrides.officialAup, "AUP, source-policy");
    }

    if (step.kind === "video" && step.id === "why-ai-safe-use-matters") {
      applyExistingAssetOverride(item, pdfAssetOverrides.video);
    }

    return item;
  });
}

/**
 * These two PDFs are client-specific: the first export creates them fresh
 * ("New"), but once uploaded to Flow Builder they get a real platform Asset
 * ID — every export after that should reference the existing upload instead
 * of asking the platform to recreate it.
 */
function applyPdfAssetOverride(
  item: FlowBuilderItem,
  step: FlowStep,
  override: { title?: string; assetId?: string } | undefined,
  newLabels: string
) {
  const assetId = override?.assetId?.trim();
  if (assetId) {
    item.source = "Existing";
    item.assetId = assetId;
    item.title = override?.title?.trim() || step.title;
    item.description = undefined;
    item.labels = undefined;
    return;
  }

  item.source = "New";
  item.description = step.description;
  item.labels = newLabels;
}

/**
 * The welcome video is already `Existing` by default (it's the same
 * reused asset for every client, not regenerated per company) — unlike
 * the PDFs above, a missing Asset ID here doesn't mean "flip to New," it
 * just means the platform will resolve it by title-text search instead
 * of an exact ID.
 */
function applyExistingAssetOverride(
  item: FlowBuilderItem,
  override: { title?: string; assetId?: string } | undefined
) {
  const assetId = override?.assetId?.trim();
  if (assetId) item.assetId = assetId;
  if (override?.title?.trim()) item.title = override.title.trim();
}

function buildQuestions(flow: MobilizationFlow, items: FlowBuilderItem[]) {
  const questions: FlowBuilderQuestion[] = [];

  // `items` is built 1:1 from flow.flowSteps (same order), so look up each
  // asset by its stable step id/kind rather than by (user-editable) title text.
  const itemForStepId = (stepId: string) => {
    const index = flow.flowSteps.findIndex((step) => step.id === stepId);
    return index >= 0 ? items[index] : undefined;
  };

  const welcomeSurvey = itemForStepId("aup-welcome-survey");
  if (welcomeSurvey) {
    flow.baselineSurvey.forEach((question, index) => {
      const type = mapSurveyQuestionType(question.type);
      questions.push({
        assetTitle: welcomeSurvey.title,
        questionNumber: index + 1,
        questionText: question.helperText
          ? `${question.prompt} (${question.helperText})`
          : question.prompt,
        type,
        options:
          type === "text" || type === "rating" ? [] : (question.options ?? []),
        required: question.required ? "Yes" : "No",
        branching: "No",
      });
    });
  }

  const assessment = itemForStepId("aup-assessment");
  if (assessment) {
    flow.assessmentQuestions.forEach((question, index) => {
      questions.push(mapAssessmentQuestion(assessment.title, index + 1, question));
    });
  }

  const acknowledgment = itemForStepId("acknowledgment-of-policy");
  if (acknowledgment) {
    questions.push({
      assetTitle: acknowledgment.title,
      questionNumber: 1,
      questionText: flow.acknowledgmentStatement,
      type: "single-select",
      options: ["I Acknowledge", "I Do Not Acknowledge"],
      required: "Yes",
      branching: "No",
    });
  }

  const exitSurvey = itemForStepId("aup-exit-survey");
  if (exitSurvey) {
    flow.exitSurvey.forEach((question, index) => {
      const type = mapSurveyQuestionType(question.type);
      questions.push({
        assetTitle: exitSurvey.title,
        questionNumber: index + 1,
        questionText: question.helperText
          ? `${question.prompt} (${question.helperText})`
          : question.prompt,
        type,
        options:
          type === "text" || type === "rating" ? [] : (question.options ?? []),
        required: question.required ? "Yes" : "No",
        branching: "No",
      });
    });
  }

  return questions;
}

function mapAssessmentQuestion(
  assetTitle: string,
  questionNumber: number,
  question: AssessmentQuestion
): FlowBuilderQuestion {
  return {
    assetTitle,
    questionNumber,
    questionText: question.prompt,
    type: "single-choice",
    options: question.options,
    correct: correctAnswerLetter(question.options, question.correctAnswer),
    required: "Yes",
    branching: "No",
  };
}

function maxOptionCount(questions: FlowBuilderQuestion[]) {
  return questions.reduce((max, question) => {
    if (question.type === "text" || question.type === "rating") {
      return max;
    }
    return Math.max(max, question.options.length);
  }, 0);
}

function addFlowSheet(workbook: ExcelJS.Workbook, flow: MobilizationFlow) {
  const sheet = workbook.addWorksheet(FLOW_BUILDER_SHEETS.flow);
  const values: Record<(typeof FLOW_LABELS)[number], string> = {
    "Flow Title": `${flow.organizationName} AI AUP Mobilization`,
    "Flow Description": flow.plainLanguageSummary,
    "Software Application": "",
  };

  FLOW_LABELS.forEach((label, index) => {
    const row = sheet.getRow(index + 1);
    row.getCell(1).value = label;
    row.getCell(2).value = values[label];
    applyBodyFont(row);
  });

  sheet.getColumn(1).width = 24;
  sheet.getColumn(2).width = 80;
}

function addItemsSheet(workbook: ExcelJS.Workbook, items: FlowBuilderItem[]) {
  const sheet = workbook.addWorksheet(FLOW_BUILDER_SHEETS.items);
  const header = sheet.addRow([...ITEM_COLUMNS]);
  applyHeaderRow(header);

  items.forEach((item, index) => {
    const row = sheet.addRow([
      index + 1,
      item.title,
      item.type,
      item.source,
      item.sectionHeader ?? "",
      item.source === "New" ? item.description ?? "" : "",
      item.source === "New" ? item.labels ?? "" : "",
      item.source === "Existing" ? item.assetId ?? "" : "",
      item.type === "Assessment" && item.source === "New"
        ? item.showCorrectAnswers ?? ""
        : "",
      item.type === "Assessment" && item.source === "New"
        ? item.percentageRequired ?? ""
        : "",
      item.type === "Assessment" && item.source === "New"
        ? item.percentageValue ?? ""
        : "",
    ]);
    applyBodyFont(row);
  });

  sheet.columns = [
    { width: 6 },
    { width: 40 },
    { width: 14 },
    { width: 12 },
    { width: 24 },
    { width: 48 },
    { width: 24 },
    { width: 12 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addQuestionsSheet(
  workbook: ExcelJS.Workbook,
  questions: FlowBuilderQuestion[]
) {
  const sheet = workbook.addWorksheet(FLOW_BUILDER_SHEETS.questions);
  const optionCount = Math.max(maxOptionCount(questions), 1);
  const optionHeaders = optionLetters(optionCount).map(
    (letter) => `Option ${letter}`
  );
  const headers = [
    "Asset Title",
    "Question #",
    "Question Text",
    "Type",
    ...optionHeaders,
    "Correct",
    "Required",
    "Branching",
    "Require All Correct",
  ];

  const header = sheet.addRow(headers);
  applyHeaderRow(header);

  questions.forEach((question) => {
    // Leave option cells beyond this question's own answers with no value at
    // all (not ""), so a wider question elsewhere in the sheet (e.g. the
    // 5-option confidence scale) doesn't leave Flow Builder rendering a real,
    // empty answer slot for questions that only have 4 options.
    const optionCells = optionHeaders.map((_, index) => question.options[index]);
    const row = sheet.addRow([
      question.assetTitle,
      question.questionNumber,
      question.questionText,
      question.type,
      ...optionCells,
      question.correct ?? "",
      question.required ?? (question.type.includes("choice") ? "Yes" : "No"),
      question.branching ?? "No",
      question.requireAllCorrect ?? "",
    ]);
    applyBodyFont(row);
  });

  sheet.getColumn(1).width = 40;
  sheet.getColumn(3).width = 60;
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildFlowBuilderWorkbook(
  flow: MobilizationFlow,
  pdfAssetOverrides?: PdfAssetOverrides,
  overrides?: { items: FlowBuilderItem[]; questions: FlowBuilderQuestion[] }
) {
  const workbook = new ExcelJS.Workbook();
  const items = overrides?.items ?? buildItems(flow, pdfAssetOverrides);
  const questions = overrides?.questions ?? buildQuestions(flow, items);

  addFlowSheet(workbook, flow);
  addItemsSheet(workbook, items);
  addQuestionsSheet(workbook, questions);

  return { workbook, items, questions };
}

export function flowBuilderFileName(organizationName: string) {
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "organization"}-flow-builder-template.xlsx`;
}

export async function downloadFlowBuilderExcel(
  flow: MobilizationFlow,
  pdfAssetOverrides?: PdfAssetOverrides,
  overrides?: { items: FlowBuilderItem[]; questions: FlowBuilderQuestion[] }
) {
  const { workbook } = await buildFlowBuilderWorkbook(flow, pdfAssetOverrides, overrides);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = flowBuilderFileName(flow.organizationName);
  link.click();
  URL.revokeObjectURL(url);
}

export function getFlowBuilderSheetSummary(
  items: FlowBuilderItem[],
  questions: FlowBuilderQuestion[]
) {
  return [
    {
      sheet: FLOW_BUILDER_SHEETS.flow,
      rows: 3,
      description: "Flow Title, Flow Description, Software Application",
    },
    {
      sheet: FLOW_BUILDER_SHEETS.items,
      rows: items.length,
      description: "Ordered flow items with type, source, and section headers",
    },
    {
      sheet: FLOW_BUILDER_SHEETS.questions,
      rows: questions.length,
      description: "Survey and assessment questions for New items only",
    },
  ];
}

export function getFlowBuilderFlags(items: FlowBuilderItem[]) {
  const flags: string[] = [];

  const existingItemsWithoutAssetId = items.filter(
    (item) => item.source === "Existing" && !item.assetId
  );
  if (existingItemsWithoutAssetId.length > 0) {
    flags.push(
      `${existingItemsWithoutAssetId.map((item) => `"${item.title}"`).join(", ")} — set to Existing with no Asset ID; confirm this title matches a platform asset exactly, or add the Asset ID.`
    );
  }

  const newPdfs = items.filter(
    (item) => item.source === "New" && item.type === "Pdf"
  );
  if (newPdfs.length > 0) {
    flags.push(
      `${newPdfs.map((item) => `"${item.title}"`).join(", ")} — marked New Pdf; upload the generated PDF assets to the platform before running the flow.`
    );
  }

  flags.push(
    'Pack ID is not a spreadsheet field — enter it in the Flow Builder app Setup screen at run time if needed.'
  );

  return flags;
}
