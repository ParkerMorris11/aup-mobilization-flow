"use client";

import type { MobilizationFlow } from "@/lib/types/policy-schema";
import { Card, SectionTitle } from "@/components/ui";
import { ClipboardCheck, FileText, ListChecks, PlayCircle, ShieldCheck } from "lucide-react";

export function FlowPreviewPanel({ flow }: { flow: MobilizationFlow }) {
  const grouped = {
    start: flow.flowSteps.filter((step) => step.group === "start"),
    review: flow.flowSteps.filter((step) => step.group === "review"),
    apply: flow.flowSteps.filter((step) => step.group === "apply"),
    complete: flow.flowSteps.filter((step) => step.group === "complete"),
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle className="text-xl">Plain-language summary</SectionTitle>
        <p className="mt-3 text-sm leading-relaxed text-alpine/80">
          {flow.plainLanguageSummary}
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h4 className="text-sm font-semibold text-decision-allowed">
            What employees can do
          </h4>
          <ul className="mt-3 space-y-2">
            {flow.whatEmployeesCanDo.map((item, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-alpine/80 before:content-['✓'] before:text-decision-allowed"
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h4 className="text-sm font-semibold text-decision-prohibited">
            What to avoid
          </h4>
          <ul className="mt-3 space-y-2">
            {flow.whatEmployeesShouldAvoid.map((item, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-alpine/80 before:content-['✕'] before:text-decision-prohibited"
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-4">
        <SectionTitle className="text-xl">Flow outline</SectionTitle>
        <div className="grid gap-4 md:grid-cols-4">
          <FlowColumn title="Start Here" steps={grouped.start} />
          <FlowColumn title="Review the Policy" steps={grouped.review} />
          <FlowColumn title="Apply and Acknowledge" steps={grouped.apply} />
          <FlowColumn title="Finish" steps={grouped.complete} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle className="text-xl">AUP Welcome Survey</SectionTitle>
          <ul className="mt-4 space-y-4">
            {flow.baselineSurvey.map((question) => (
              <li key={question.id} className="rounded-lg border border-alpine/10 bg-salt p-4">
                <p className="text-sm font-medium text-alpine">{question.prompt}</p>
                {question.options && (
                  <p className="mt-2 text-xs text-alpine/60">
                    {question.options.join(" · ")}
                  </p>
                )}
                {question.helperText && (
                  <p className="mt-1 text-xs text-alpine/50">{question.helperText}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle className="text-xl">AUP Assessment</SectionTitle>
          <ul className="mt-4 space-y-4">
            {flow.assessmentQuestions.map((question, index) => (
              <li key={question.id} className="rounded-lg border border-alpine/10 bg-salt p-4">
                <p className="text-sm font-medium text-alpine">
                  {index + 1}. {question.prompt}
                </p>
                <ul className="mt-2 space-y-1">
                  {question.options.map((option) => (
                    <li key={option} className="text-xs text-alpine/70">
                      • {option}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-alpine/50">
                  Correct answer: {question.correctAnswer}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle className="text-xl">AUP Exit Survey</SectionTitle>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {flow.exitSurvey.map((question) => (
            <li key={question.id} className="rounded-lg border border-alpine/10 bg-salt p-4">
              <p className="text-sm font-medium text-alpine">{question.prompt}</p>
              {question.options && (
                <p className="mt-2 text-xs text-alpine/60">
                  {question.options.join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="bg-alpine/5">
        <h4 className="text-sm font-semibold text-alpine">Manager rollout note</h4>
        <p className="mt-2 text-sm text-alpine/80">{flow.managerRolloutNote}</p>
      </Card>
    </div>
  );
}

function FlowColumn({
  title,
  steps,
}: {
  title: string;
  steps: MobilizationFlow["flowSteps"];
}) {
  return (
    <Card className="p-4">
      <h4 className="text-sm font-semibold text-alpine">{title}</h4>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-alpine/10 bg-salt p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-alpine/50">{iconForKind(step.kind)}</div>
              <div>
                <p className="text-sm font-medium text-alpine">{step.title}</p>
                <p className="mt-1 text-xs text-alpine/70">{step.description}</p>
                {step.detail && (
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-alpine/45">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function iconForKind(kind: MobilizationFlow["flowSteps"][number]["kind"]) {
  switch (kind) {
    case "video":
      return <PlayCircle className="h-4 w-4" />;
    case "survey":
      return <ListChecks className="h-4 w-4" />;
    case "pdf":
      return <FileText className="h-4 w-4" />;
    case "assessment":
      return <ClipboardCheck className="h-4 w-4" />;
    case "acknowledgment":
      return <ShieldCheck className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}
