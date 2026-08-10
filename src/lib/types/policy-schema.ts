/**
 * Structured policy schema — output of AUP parsing.
 * V2: LLM parsing, branding, downloads hub, and Flow Builder export.
 */

export type PolicyCategory =
  | "approved_tools"
  | "data_protection"
  | "output_review"
  | "disclosure"
  | "hr_sensitive"
  | "intellectual_property"
  | "general";

export type DecisionType = "allowed" | "caution" | "prohibited" | "escalate";

export interface StructuredPolicyRule {
  id: string;
  section_title: string;
  policy_rule: string;
  category: PolicyCategory;
  decision_type: DecisionType;
  rationale: string;
  safer_alternative: string;
  escalation_path: string;
  employee_example: string;
}

export interface MobilizationScenario {
  id: string;
  title: string;
  situation: string;
  decision: DecisionType;
  guidance: string;
  safer_path: string;
  escalate_when: string;
}

export interface SurveyQuestion {
  id: string;
  prompt: string;
  type: "single_select" | "multi_select" | "scale" | "free_text";
  options?: string[];
  helperText?: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  rationale: string;
  /** Which of the 6 employee sections this question is grounded in, when LLM-generated */
  sourceSection?: keyof ParsedAupSections;
  /** Verbatim quote from the source section bullets this question tests, when LLM-generated */
  sourceQuote?: string;
}

export interface FlowStep {
  id: string;
  group: "start" | "review" | "apply" | "complete";
  title: string;
  kind:
    | "video"
    | "survey"
    | "pdf"
    | "assessment"
    | "acknowledgment"
    | "completion";
  description: string;
  detail?: string;
 }

export interface MobilizationFlow {
  organizationName: string;
  generatedAt: string;
  plainLanguageSummary: string;
  whatEmployeesCanDo: string[];
  whatEmployeesShouldAvoid: string[];
  baselineSurvey: SurveyQuestion[];
  assessmentQuestions: AssessmentQuestion[];
  exitSurvey: SurveyQuestion[];
  flowSteps: FlowStep[];
  acknowledgmentStatement: string;
  managerRolloutNote: string;
}

export interface AckRecord {
  id: string;
  employeeName: string;
  department: string;
  completedAt: string | null;
  status: "completed" | "in_progress" | "not_started";
}

export interface PolicyQaAnswer {
  decision: DecisionType;
  why: string;
  safer_path: string;
  when_to_escalate: string;
  matched_rule_ids: string[];
  confidence: number;
}

export interface UploadedAup {
  fileName: string;
  sourceType: "paste" | "file" | "sample";
  rawText: string;
  uploadedAt: string;
  mimeType?: string;
  /** Inline base64 for smaller uploads */
  originalFileBase64?: string;
  /** IndexedDB key for larger original files */
  storageKey?: string;
}

import type { ParsedAupSections, OriginalSectionLabels } from "@/lib/types/parsed-sections";
import type { OrgBranding } from "@/lib/types/org-branding";
import { DEFAULT_ORG_BRANDING } from "@/lib/types/org-branding";
import type { ParsedSectionsCitations } from "@/lib/types/section-citations";
import type { FlowBuilderItem, FlowBuilderQuestion } from "@/lib/types/flow-builder-excel-schema";

export type ParseMethod = "llm" | "heuristic";

export interface PdfAssetOverride {
  title?: string;
  assetId?: string;
}

export type PdfAssetKey = "policyAtAGlance" | "officialAup";

export type PdfAssetOverrides = Record<PdfAssetKey, PdfAssetOverride>;

export const EMPTY_PDF_ASSET_OVERRIDES: PdfAssetOverrides = {
  policyAtAGlance: {},
  officialAup: {},
};

export interface ParseMeta {
  method: ParseMethod;
  confidence: number;
  confidenceBreakdown?: {
    sectionCoverage: number;
    textGrounding: number;
    structureSignal: number;
  };
  /** Rule count per section (post-parse) — sections below the sparse threshold get clarifying prompts */
  sparseRuleCounts?: Record<keyof ParsedAupSections, number>;
  /** Set when parsing fell back to the local heuristic scan instead of AI — surfaced so staff know why */
  fallbackReason?: string;
  /** Set when the source document was too long and had to be truncated before AI parsing */
  truncationWarning?: string;
}

export interface MobilizationState {
  uploadedAup: UploadedAup | null;
  structuredRules: StructuredPolicyRule[];
  parsedSections: ParsedAupSections | null;
  originalParsedSections: ParsedAupSections | null;
  mobilizationFlow: MobilizationFlow | null;
  orgBranding: OrgBranding;
  /** True when organizationName was inferred from the uploaded filename rather than found in the document text — prompts staff to confirm it before export */
  orgNameNeedsReview: boolean;
  parseMeta: ParseMeta | null;
  /** Per-bullet source citations from the most recent parse, for the review gate */
  sectionCitations: ParsedSectionsCitations | null;
  /** Client's own heading/label per section, when their document used one — admin-portal display only, never shown in the PDF */
  originalSectionLabels: OriginalSectionLabels;
  /** Keys (from citationFlagKey) of ungrounded bullets the user has explicitly reviewed */
  reviewedCitationFlags: Record<string, true>;
  /** LLM-generated clarifying questions for sparse sections, for LX staff client outreach — never shown in the PDF */
  clarifyingPrompts: Record<string, string[]>;
  /** Staff-added clarifying questions per section, layered on top of the AI-generated ones */
  customClarifyingQuestions: Record<string, string[]>;
  /** Flag keys (ai:index or staff:index) excluded from the outreach summary — not deleted, just unchecked */
  dismissedClarifyingFlags: Record<string, true>;
  /** Flag key -> staff note; a non-empty note means the client has answered that question */
  clarifyingAnswerNotes: Record<string, string>;
  /** Staff-provided platform Asset IDs for the two client-specific PDF exports, once uploaded to Flow Builder */
  pdfAssetOverrides: PdfAssetOverrides;
  processingStatus: "idle" | "uploading" | "parsing" | "generating" | "ready" | "error";
  errorMessage: string | null;
  /** Status of the separate, retriable LLM assessment-question generation step */
  assessmentStatus: "idle" | "generating" | "ready" | "error";
  assessmentError: string | null;
  /** Manual edits to the Excel-shaped Items/Questions rows, layered on top of what's derived from mobilizationFlow — null means "use the derived rows as-is" */
  flowBuilderOverrides: { items: FlowBuilderItem[]; questions: FlowBuilderQuestion[] } | null;
}

export { DEFAULT_ORG_BRANDING };

export const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  approved_tools: "Approved tools",
  data_protection: "Data protection",
  output_review: "Output review",
  disclosure: "Disclosure & transparency",
  hr_sensitive: "HR-sensitive content",
  intellectual_property: "Intellectual property",
  general: "General guidance",
};

export const DECISION_LABELS: Record<DecisionType, string> = {
  allowed: "Allowed",
  caution: "Use with caution",
  prohibited: "Not allowed",
  escalate: "Escalate for approval",
};

export const DECISION_VARIANTS: Record<
  DecisionType,
  "success" | "warning" | "danger" | "info"
> = {
  allowed: "success",
  caution: "warning",
  prohibited: "danger",
  escalate: "info",
};
