"use client";

import {
  CATEGORY_LABELS,
  DECISION_LABELS,
  DECISION_VARIANTS,
  type StructuredPolicyRule,
} from "@/lib/types/policy-schema";
import { Badge, Card } from "@/components/ui";

export function RulesTable({ rules }: { rules: StructuredPolicyRule[] }) {
  if (rules.length === 0) {
    return (
      <Card>
        <p className="text-sm text-alpine/50">No structured rules yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <Card key={rule.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-alpine/50">{rule.id}</p>
              <h4 className="font-display text-base font-medium text-alpine">
                {rule.section_title}
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={DECISION_VARIANTS[rule.decision_type]}>
                {DECISION_LABELS[rule.decision_type]}
              </Badge>
              <Badge variant="default">
                {CATEGORY_LABELS[rule.category]}
              </Badge>
            </div>
          </div>
          <p className="mt-3 text-sm text-alpine/80">{rule.policy_rule}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-alpine/50">
                Rationale
              </dt>
              <dd className="mt-1 text-alpine/70">{rule.rationale}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-alpine/50">
                Safer alternative
              </dt>
              <dd className="mt-1 text-alpine/70">{rule.safer_alternative}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-alpine/50">
                Escalation
              </dt>
              <dd className="mt-1 text-alpine/70">{rule.escalation_path}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-alpine/50">
                Example
              </dt>
              <dd className="mt-1 italic text-alpine/70">
                {rule.employee_example}
              </dd>
            </div>
          </dl>
        </Card>
      ))}
    </div>
  );
}
