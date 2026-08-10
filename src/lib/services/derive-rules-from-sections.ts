import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import type { DecisionType, PolicyCategory, StructuredPolicyRule } from "@/lib/types/policy-schema";

/**
 * Derive structured policy rules directly from the parsed, company-specific
 * sections — no hardcoded/mock rules. Each bullet becomes one row, tagged
 * with the category/decision implied by the section it came from.
 */
export function deriveRulesFromSections(
  sections: ParsedAupSections,
  organizationName: string
): StructuredPolicyRule[] {
  const rows: Omit<StructuredPolicyRule, "id">[] = [];

  const addRows = (
    bullets: string[],
    sectionTitle: string,
    category: PolicyCategory,
    decisionType: DecisionType
  ) => {
    for (const bullet of bullets) {
      if (!bullet.trim()) continue;
      rows.push({
        section_title: sectionTitle,
        policy_rule: bullet,
        category,
        decision_type: decisionType,
        rationale: `From ${organizationName}'s AI Acceptable Use Policy — ${sectionTitle.toLowerCase()}.`,
        safer_alternative:
          decisionType === "prohibited"
            ? "Use an approved AI tool and remove any sensitive details before proceeding."
            : bullet,
        escalation_path: escalationPathFromBullet(bullet),
        employee_example: bullet,
      });
    }
  };

  addRows(sections.topRulesToRemember, "Top rules to remember", "general", "caution");
  addRows(sections.permittedUse, "What can I do?", "general", "allowed");
  addRows(sections.approvedTools, "What tools can I use?", "approved_tools", "allowed");
  addRows(sections.dataToProtect, "What data must I protect?", "data_protection", "prohibited");
  addRows(sections.accountability, "What am I responsible for?", "output_review", "caution");
  addRows(sections.whenUnsure, "What do I do if I'm unsure?", "general", "escalate");

  return rows.map((row, index) => ({
    id: `rule-${String(index + 1).padStart(2, "0")}`,
    ...row,
  }));
}

/** Pull a contact/escalation hint out of a bullet if it names one; else a generic default. */
function escalationPathFromBullet(bullet: string): string {
  const emailMatch = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-zA-Z]{2,24}\b/.exec(bullet);
  if (emailMatch) return emailMatch[0];
  if (/\bmanager\b/i.test(bullet)) return "Your manager";
  if (/\bIT\b/i.test(bullet)) return "IT";
  return "Your manager or IT";
}
