/** Client org branding for PDF cover and flow metadata */

export interface OrgBranding {
  organizationName: string;
  primaryColor: string;
  accentColor: string;
  policyTitle: string;
  policyVersion: string;
  /** Whether to show the policy version on the cover slide */
  showPolicyVersion: boolean;
  effectiveDate: string;
  /** Whether the cover slide shows "Effective {date}" next to the version — off when the date isn't finalized yet */
  showEffectiveDate: boolean;
  coverTagline: string;
}

export const DEFAULT_ORG_BRANDING: OrgBranding = {
  organizationName: "Your Organization",
  primaryColor: "#1e3630",
  accentColor: "#e3d24a",
  policyTitle: "AI Acceptable Use Policy Summary",
  policyVersion: "1.0",
  showPolicyVersion: true,
  effectiveDate: "January 1, 2026",
  showEffectiveDate: true,
  // "{organizationName}" is substituted with the real org name when the PDF is built
  coverTagline:
    "A curated summary of the key points from {organizationName}'s AI Acceptable Use Policy.",
};

/** Infer a company name from an uploaded filename when possible */
export function inferOrgNameFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  if (
    !base ||
    /^(sample|pasted|policy|aup|upload)/i.test(base) ||
    /\b(pol|policy|policies|aup|draft|v\d+|version|rev|revision|employee|acceptable use|guidelines?|standard|terms)\b/i.test(
      base
    )
  ) {
    return null;
  }
  return base
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Extract company name from document text */
export function extractCompanyNameFromText(text: string): string | null {
  if (!text || text.length < 20) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2);

  if (lines.length === 0) return null;

  for (const line of lines.slice(0, 20)) {
    const capitalized = line.replace(/[*#\-_«»]+/g, " ").trim();

    if (capitalized.length < 8 || capitalized.length > 100) continue;

    if (/policy|acceptable use|aup|guidelines|standard|code of conduct|terms|this document/i.test(capitalized)) {
      continue;
    }

    const words = capitalized.split(/\s+/);
    if (words.length === 1 && words[0].length > 2) {
      const first = words[0];
      if (/^[A-Z][a-z]+$/.test(first)) {
        return first;
      }
    }

    if (words.length >= 2 && words.length <= 5) {
      const connectors = /^(of|the|and|for|at|in)$/i;
      const firstCapitalized = /^[A-Z]/.test(words[0]);
      const restValid = words
        .slice(1)
        .every((w) => /^[A-Z]/.test(w) || connectors.test(w));
      const hasValidCompanySuffix = /\b(Inc|LLC|Corp|Company|Ltd|LLP|PLLC|PC|LP|Group|Town|City|County|Village)\b/i.test(
        capitalized
      );

      if ((firstCapitalized && restValid) || hasValidCompanySuffix) {
        return capitalized;
      }
    }
  }

  return null;
}

/** Extract policy title from document text */
export function extractPolicyTitleFromText(text: string): string | null {
  if (!text || text.length < 10) return null;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 5 && line.length < 200);

  if (lines.length === 0) return null;

  for (const line of lines.slice(0, 5)) {
    if (
      /policy|acceptable use|aup|guidelines|standard|code of conduct|terms/i.test(
        line
      )
    ) {
      return line.replace(/[*#]+/g, "").trim();
    }
  }

  return null;
}
