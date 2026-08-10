import type { StructuredPolicyRule } from "@/lib/types/policy-schema";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

const MAX_BULLETS = 5;

/**
 * Classify structured policy rules into employee-facing sections.
 * V2: deterministic mapping by category + decision type.
 * FUTURE: LLM refinement for plain-language rewriting per section.
 */
export function classifyAupSections(
  rules: StructuredPolicyRule[]
): ParsedAupSections {
  const byCategory = (cats: StructuredPolicyRule["category"][]) =>
    rules.filter((r) => cats.includes(r.category));

  const approvedTools = byCategory(["approved_tools"]).map((r) => r.policy_rule);

  const dataToProtect = [
    ...byCategory(["data_protection", "hr_sensitive", "intellectual_property"]),
  ].map((r) => r.policy_rule);

  const accountability = [
    ...byCategory(["output_review", "disclosure"]),
  ].map((r) => r.policy_rule);

  if (accountability.length === 0) {
    accountability.push(
      "You are responsible for reviewing all AI-generated content before external use."
    );
  }

  const whenUnsure = byCategory(["general"])
    .filter((r) => r.decision_type === "escalate")
    .map((r) => `${r.policy_rule} → ${r.escalation_path}`);

  if (whenUnsure.length === 0) {
    whenUnsure.push(
      "Contact IT Security or your manager before proceeding."
    );
  }

  const permittedUse = rules
    .filter(
      (r) =>
        r.decision_type === "allowed" ||
        r.category === "approved_tools" ||
        Boolean(r.safer_alternative)
    )
    .map((r) => r.safer_alternative || r.policy_rule)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, MAX_BULLETS);

  if (permittedUse.length === 0) {
    permittedUse.push(
      "Use approved AI tools with work credentials for drafting and brainstorming.",
      "Ask AI for structure and tone — add sensitive details manually afterward.",
      "Use GitHub Copilot only in the approved enterprise development environment."
    );
  }

  const topRulesToRemember = pickTopRules(rules, 3);

  return {
    topRulesToRemember: topRulesToRemember.slice(0, 3),
    permittedUse: permittedUse.slice(0, MAX_BULLETS),
    approvedTools: approvedTools.length
      ? approvedTools.slice(0, MAX_BULLETS)
      : [
          "Microsoft Copilot (enterprise)",
          "ChatGPT Enterprise (provisioned accounts)",
          "GitHub Copilot (engineering teams only)",
        ],
    dataToProtect: dataToProtect.slice(0, MAX_BULLETS),
    accountability: accountability.slice(0, MAX_BULLETS),
    whenUnsure: whenUnsure.slice(0, MAX_BULLETS),
  };
}

/** Prioritize prohibited → caution → escalate for "top rules" */
function pickTopRules(rules: StructuredPolicyRule[], count: number): string[] {
  const priority = { prohibited: 0, caution: 1, escalate: 2, allowed: 3 };
  const sorted = [...rules].sort(
    (a, b) => priority[a.decision_type] - priority[b.decision_type]
  );

  const seen = new Set<string>();
  const result: string[] = [];

  for (const rule of sorted) {
    const text = rule.policy_rule;
    if (!seen.has(text)) {
      seen.add(text);
      result.push(text);
    }
    if (result.length >= count) break;
  }

  return result.slice(0, count);
}
