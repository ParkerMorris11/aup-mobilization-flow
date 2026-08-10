import { EMPLOYEE_SECTION_LABELS } from "@/lib/types/parsed-sections";

/** Hardcoded left-panel helper text for each employee PDF section slide */
export const SECTION_LEFT_COPY: Record<
  | "top-rules"
  | "permitted-use"
  | "approved-tools"
  | "data-protect"
  | "accountability"
  | "when-unsure",
  string
> = {
  "top-rules": "Keep these three rules top of mind whenever you use AI at work.",
  "permitted-use": "Approved ways to use AI tools in your daily work.",
  "approved-tools": "Only use AI tools that your organization has approved.",
  "data-protect": "Never put this information into AI tools or prompts.",
  "accountability": "You are responsible for how you use AI and its output.",
  "when-unsure": "When in doubt, pause and ask before proceeding.",
};

export const SECTION_SLIDE_META = [
  {
    id: "top-rules" as const,
    eyebrow: "Remember these",
    title: EMPLOYEE_SECTION_LABELS.topRulesToRemember,
    numbered: true as const,
    decision: undefined,
  },
  {
    id: "permitted-use" as const,
    eyebrow: "Permitted use",
    title: EMPLOYEE_SECTION_LABELS.permittedUse,
    numbered: false as const,
    decision: "allowed" as const,
  },
  {
    id: "approved-tools" as const,
    eyebrow: "Approved tools",
    title: EMPLOYEE_SECTION_LABELS.approvedTools,
    numbered: false as const,
    decision: "allowed" as const,
  },
  {
    id: "data-protect" as const,
    eyebrow: "Data protection",
    title: EMPLOYEE_SECTION_LABELS.dataToProtect,
    numbered: false as const,
    decision: "prohibited" as const,
  },
  {
    id: "accountability" as const,
    eyebrow: "Your responsibility",
    title: EMPLOYEE_SECTION_LABELS.accountability,
    numbered: false as const,
    decision: "caution" as const,
  },
  {
    id: "when-unsure" as const,
    eyebrow: "When in doubt",
    title: EMPLOYEE_SECTION_LABELS.whenUnsure,
    numbered: false as const,
    decision: "escalate" as const,
  },
];
