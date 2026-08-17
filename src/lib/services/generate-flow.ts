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
    baselineSurvey: buildBaselineSurvey(organizationName),
    assessmentQuestions: buildAssessmentQuestions(sections),
    exitSurvey: buildOutcomesSurvey(organizationName),
    flowSteps: buildFlowSteps(organizationName),
    // Matches the real platform's "Policy Review & Acknowledgment" question
    // exactly (verified against a live "Town of Brookhaven" flow) — only the
    // organization name changes between clients.
    acknowledgmentStatement: `By selecting "I Acknowledge," you confirm that you have reviewed and agree to comply with the ${organizationName} Artificial Intelligence Use Policy.`,
    managerRolloutNote:
      "Managers: share this flow in your next team standup (5 min). Emphasize that escalation is encouraged, not penalized. Track completion in your department dashboard. Direct repeated questions to IT Security.",
  };
}

/**
 * Matches the real platform's "AI Baseline Survey" exactly (verified against
 * a live "Town of Brookhaven" flow) — same 2 questions every time, only the
 * organization name inside the question text changes between clients.
 */
function buildBaselineSurvey(organizationName: string): SurveyQuestion[] {
  return [
    {
      id: "baseline-1",
      prompt: `How confident are you in your ability to use AI effectively and responsibly in your role at ${organizationName}?`,
      type: "single_select",
      options: ["Very Confident", "Confident", "Neutral", "Not Confident", "Very Not Confident"],
      required: true,
    },
    {
      id: "baseline-2",
      prompt: "How many of your typical work tasks currently involve AI assistance?",
      type: "single_select",
      options: [
        "All or almost all of my tasks",
        "Most of my tasks",
        "About half of my tasks",
        "A few of my tasks",
        "None of my tasks",
      ],
      required: true,
    },
  ];
}

/**
 * Deterministic fallback question set — used when LLM assessment generation
 * is unavailable (no API key, network failure, malformed response) so the
 * flow always has usable assessment content.
 *
 * The correct answer's position is deliberately varied per question
 * (B, C, A, B, C below) rather than always listed first — an assessment
 * where every correct answer is "A" looks unprofessional and lets
 * employees game the quiz instead of actually reading it.
 */
export function buildAssessmentQuestions(
  sections: ParsedAupSections
): AssessmentQuestion[] {
  const topRule = sections.topRulesToRemember[0] ?? "Use only approved AI tools for work.";
  const permitted = sections.permittedUse[0] ?? "Use approved AI tools to draft and structure work.";
  const approvedTool = sections.approvedTools[0] ?? "Use only organization-approved AI tools for business purposes.";
  const dataToProtect = sections.dataToProtect[0] ?? "Customer personal or financial information.";
  const whenUnsure = sections.whenUnsure[0] ?? "Contact IT Security or your manager before proceeding.";

  return [
    {
      id: "assessment-1",
      prompt: "Which of these best reflects a top rule to remember?",
      options: [
        "Use any AI tool if it helps you move faster.",
        topRule,
        "Skip policy review when the content is internal only.",
        "Share AI-generated output without checking it first.",
      ],
      correctAnswer: topRule,
      rationale: "The top rules slide highlights the highest priority employee behaviors.",
    },
    {
      id: "assessment-2",
      prompt: "Which action is closest to permitted use?",
      options: [
        "Paste sensitive customer data into a personal AI account.",
        "Send AI output externally without review.",
        permitted,
        "Bypass IT approval for a new AI tool because it's free.",
      ],
      correctAnswer: permitted,
      rationale: "Permitted use focuses on approved tools and safe drafting workflows.",
    },
    {
      id: "assessment-3",
      prompt: "Which of these is an approved way to use AI tools at work?",
      options: [
        approvedTool,
        "Use any free consumer AI account if it gets the job done.",
        "Ask a coworker to share their personal AI login.",
        "Install an AI browser extension without IT review.",
      ],
      correctAnswer: approvedTool,
      rationale: "Only tools the organization has approved and licensed are safe to use for company work.",
    },
    {
      id: "assessment-4",
      prompt: "Which of these must never be entered into an AI tool?",
      options: [
        "A generic product description.",
        dataToProtect,
        "A publicly available FAQ answer.",
        "A general marketing tagline.",
      ],
      correctAnswer: dataToProtect,
      rationale: "Sensitive data must stay out of AI tools to prevent exposure or misuse.",
    },
    {
      id: "assessment-5",
      prompt: "What should an employee do if they are unsure?",
      options: [
        "Proceed if the task feels low risk.",
        "Use a personal AI account as a workaround.",
        whenUnsure,
        "Wait until the next team meeting to bring it up.",
      ],
      correctAnswer: whenUnsure,
      rationale: "Escalation is the safe fallback for edge cases and uncertainty.",
    },
  ];
}

/**
 * Matches the real platform's "{Company} AI Outcomes Survey" exactly
 * (verified against a live "Town of Brookhaven" flow) — same 2 questions
 * every time, only the organization name inside the question text changes.
 */
function buildOutcomesSurvey(organizationName: string): SurveyQuestion[] {
  return [
    {
      id: "outcomes-1",
      prompt: `After completing this experience, how confident are you in your ability to use AI effectively and responsibly in your role at ${organizationName}?`,
      type: "single_select",
      options: ["Very Confident", "Confident", "Neutral", "Not Confident", "Very Not Confident"],
      required: true,
    },
    {
      id: "outcomes-2",
      prompt: `What questions do you still have about using AI at ${organizationName}, and what additional guidance would help you use AI more confidently?`,
      type: "free_text",
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
      description: "Baseline check on AI confidence and current task usage before training.",
      detail: "2 questions",
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
      detail: "5 questions",
    },
    {
      id: "aup-exit-survey",
      group: "complete",
      title: `${organizationName} AI Outcomes Survey`,
      kind: "survey",
      description: "Post-training check on confidence using AI and any remaining questions.",
      detail: "2 questions",
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
