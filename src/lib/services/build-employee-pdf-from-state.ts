import { buildEmployeePdfDocument } from "@/lib/services/build-pdf-document";
import type { MobilizationFlow } from "@/lib/types/policy-schema";
import type { OrgBranding } from "@/lib/types/org-branding";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

export function buildEmployeePdfFromState(
  sections: ParsedAupSections,
  orgBranding: OrgBranding,
  flow: MobilizationFlow
) {
  return buildEmployeePdfDocument(sections, {
    organizationName: orgBranding.organizationName,
    policyTitle: orgBranding.policyTitle,
    policyVersion: orgBranding.policyVersion,
    effectiveDate: orgBranding.effectiveDate,
    coverTagline: orgBranding.coverTagline,
    generatedAt: flow.generatedAt,
    branding: orgBranding,
  });
}
