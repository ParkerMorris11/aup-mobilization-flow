import type {
  AssessmentQuestion,
  FlowStep,
  MobilizationFlow,
  SurveyQuestion,
} from "@/lib/types/policy-schema";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

/**
 * Generate employee-facing mobilization flow from parsed sections.
 * V2: deterministic template from parsed sections and org branding.
 */
export function generateMobilizationFlow(
  sections: ParsedAupSections,
  organizationName = "Your Organization"
): MobilizationFlow {
  const whatEmployeesCanDo = [
    ...sections.permittedUse,
    ...sections.approvedTools.slice(0, 2),
  ].slice(0, 6);

  const whatEmployeesShouldAvoid = [
    ...sections.dataToProtect,
    ...sections.accountability
      .filter((item) => /review|responsible|disclose|approval/i.test(item))
      .map((item) => `${item}`),
  ].slice(0, 7);

  return {
    organizationName,
    generatedAt: new Date().toISOString(),
    plainLanguageSummary: `At ${organizationName}, AI is a productivity tool — not a shortcut around data protection, quality, or compliance. This guide translates our AI Acceptable Use Policy into everyday decisions: which tools to use, what data to keep out, when to review output, and when to ask for help. Most sessions take under 10 minutes.`,
    whatEmployeesCanDo,
    whatEmployeesShouldAvoid,
    baselineSurvey: buildBaselineSurvey(),
    assessmentQuestions: buildAssessmentQuestions(sections),
    exitSurvey: buildExitSurvey(),
    flowSteps: buildFlowSteps(organizationName),
    acknowledgmentStatement:
      "I have read and understand the AI Acceptable Use Policy. I will use only approved tools, protect sensitive data, review AI output before external use, and escalate when uncertain.",
    managerRolloutNote:
      "Managers: share this flow in your next team standup (5 min). Emphasize that escalation is encouraged, not penalized. Track completion in your department dashboard. Direct repeated questions to IT Security.",
  };
}

function buildBaselineSurvey(): SurveyQuestion[] {
  return [
    {
      id: "baseline-1",
      prompt: "How often do you currently use AI tools in your work?",
      type: "single_select",
      options: ["Daily", "Weekly", "Monthly", "Rarely", "Never"],
    },
    {
      id: "baseline-2",
      prompt: "How confident are you that you know which data should never go into AI tools?",
      type: "scale",
      options: ["1", "2", "3", "4", "5"],
      helperText: "1 = not confident, 5 = very confident",
    },
    {
      id: "baseline-3",
      prompt: "Which AI tools do you currently use or want access to?",
      type: "free_text",
      helperText: "List any tools you use today or expect to use soon.",
    },
  ];
}

/**
 * Deterministic fallback question set — used when LLM assessment generation
 * is unavailable (no API key, network failure, malformed response) so the
 * flow always has usable assessment content.
 */
export function buildAssessmentQuestions(
  sections: ParsedAupSections
): AssessmentQuestion[] {
  return [
    {
      id: "assessment-1",
      prompt: "Which of these best reflects a top rule to remember?",
      options: [
        sections.topRulesToRemember[0] ?? "Use only approved AI tools for work.",
        "Use any AI tool if it helps you move faster.",
        "Skip policy review when the content is internal only.",
      ],
      correctAnswer:
        sections.topRulesToRemember[0] ?? "Use only approved AI tools for work.",
      rationale: "The top rules slide highlights the highest priority employee behaviors.",
    },
    {
      id: "assessment-2",
      prompt: "Which action is closest to permitted use?",
      options: [
        sections.permittedUse[0] ?? "Use approved AI tools to draft and structure work.",
        "Paste sensitive customer data into a personal AI account.",
        "Send AI output externally without review.",
      ],
      correctAnswer:
        sections.permittedUse[0] ?? "Use approved AI tools to draft and structure work.",
      rationale: "Permitted use focuses on approved tools and safe drafting workflows.",
    },
    {
      id: "assessment-3",
      prompt: "What should an employee do if they are unsure?",
      options: [
        sections.whenUnsure[0] ?? "Contact IT Security or your manager before proceeding.",
        "Proceed if the task feels low risk.",
        "Use a personal AI account as a workaround.",
      ],
      correctAnswer:
        sections.whenUnsure[0] ?? "Contact IT Security or your manager before proceeding.",
      rationale: "Escalation is the safe fallback for edge cases and uncertainty.",
    },
  ];
}

function buildExitSurvey(): SurveyQuestion[] {
  return [
    {
      id: "exit-1",
      prompt: "After this flow, how clear is the policy to you?",
      type: "scale",
      options: ["1", "2", "3", "4", "5"],
      helperText: "1 = unclear, 5 = very clear",
    },
    {
      id: "exit-2",
      prompt: "What part of the policy still feels confusing?",
      type: "free_text",
    },
    {
      id: "exit-3",
      prompt: "Would a manager follow-up session be helpful for your team?",
      type: "single_select",
      options: ["Yes", "No", "Not sure"],
    },
  ];
}

/**
 * Titles here match the real BSI Flow Builder platform naming convention
 * exactly (confirmed against a live "Town of Brookhaven" flow) — only the
 * organization name should ever change between clients. Don't reword these
 * without checking against an actual platform export first: the platform
 * matches "Existing" assets by title text when no Asset ID is given, so an
 * inconsistent title silently breaks that lookup instead of erroring.
 */
function buildFlowSteps(organizationName: string): FlowStep[] {
  return [
    {
      id: "why-ai-safe-use-matters",
      group: "start",
      title: "Why an AI Acceptable Use Policy Matters",
      kind: "video",
      description: "Short intro video that explains why the policy exists.",
    },
    {
      id: "aup-welcome-survey",
      group: "start",
      title: "AI Baseline Survey",
      kind: "survey",
      description: "Baseline survey to understand current AI use and confidence.",
      detail: "3 questions",
    },
    {
      id: "your-ai-policy-at-a-glance",
      group: "review",
      title: `${organizationName} AI Employee Quick Reference`,
      kind: "pdf",
      description: "Employee-friendly PDF summary deck built from the parsed policy.",
    },
    {
      id: "official-company-aup",
      group: "review",
      title: `${organizationName} AI Acceptable Use Policy`,
      kind: "pdf",
      description: "Full company AI policy document for reference.",
    },
    {
      id: "aup-assessment",
      group: "apply",
      title: `${organizationName} AI Knowledge Check`,
      kind: "assessment",
      description: "Knowledge check covering tools, data protection, and escalation.",
      detail: "3 questions",
    },
    {
      id: "aup-exit-survey",
      group: "complete",
      title: `${organizationName} AI Outcomes Survey`,
      kind: "survey",
      description: "Feedback survey to measure clarity and remaining friction.",
      detail: "3 questions",
    },
    {
      id: "acknowledgment-of-policy",
      group: "complete",
      title: "Policy Review & Acknowledgment",
      kind: "acknowledgment",
      description: "Employee confirms they read and understand the policy.",
    },
  ];
}
