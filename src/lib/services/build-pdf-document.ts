import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import { EMPLOYEE_SECTION_LABELS } from "@/lib/types/parsed-sections";
import type {
  EmployeePdfDocument,
  EmployeePdfSlide,
} from "@/lib/types/employee-pdf-schema";
import type { OrgBranding } from "@/lib/types/org-branding";
import { buildPdfTheme } from "@/lib/pdf/build-theme";
import {
  SECTION_LEFT_COPY,
  SECTION_SLIDE_META,
} from "@/lib/pdf/section-left-copy";
/**
 * Build employee-facing PDF from parsed AUP sections.
 * One slide per section — content capped to fit 1600×900 canvas.
 */
export function buildEmployeePdfDocument(
  sections: ParsedAupSections,
  options: {
    organizationName: string;
    policyTitle?: string;
    policyVersion?: string;
    effectiveDate?: string;
    coverTagline?: string;
    generatedAt?: string;
    branding?: Partial<OrgBranding>;
  }
): EmployeePdfDocument {
  const policyTitle =
    options.policyTitle ??
    options.branding?.policyTitle ??
    "AI Acceptable Use Policy Summary";
  const policyVersion =
    options.policyVersion ?? options.branding?.policyVersion ?? "1.0";
  const effectiveDate =
    options.effectiveDate ??
    options.branding?.effectiveDate ??
    "January 1, 2026";
  const showEffectiveDate =
    (options.branding?.showEffectiveDate ?? true) && effectiveDate.trim().length > 0;
  const coverTaglineTemplate =
    options.coverTagline ??
    options.branding?.coverTagline ??
    "Use AI safely, responsibly, and confidently in your daily work.";
  const coverTagline = coverTaglineTemplate.replace(
    /\{organizationName\}/g,
    options.organizationName
  );
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const theme = buildPdfTheme(options.branding);
  const slides: EmployeePdfSlide[] = [];
  let page = 1;

  const push = (slide: Omit<EmployeePdfSlide, "pageNumber">) => {
    slides.push({ ...slide, pageNumber: page++ });
  };

  push({
    id: "cover",
    type: "cover",
    title: policyTitle,
    eyebrow: "Employee quick reference",
    body: coverTagline,
    bullets: [
      EMPLOYEE_SECTION_LABELS.topRulesToRemember,
      EMPLOYEE_SECTION_LABELS.permittedUse,
      EMPLOYEE_SECTION_LABELS.approvedTools,
      EMPLOYEE_SECTION_LABELS.dataToProtect,
      EMPLOYEE_SECTION_LABELS.accountability,
      EMPLOYEE_SECTION_LABELS.whenUnsure,
    ],
    footer: showEffectiveDate
      ? `Policy v${policyVersion} · ${effectiveDate}`
      : `Policy v${policyVersion}`,
  });

  const sectionSlides: Omit<EmployeePdfSlide, "pageNumber">[] =
    SECTION_SLIDE_META.map((meta) => ({
      id: meta.id,
      type: "section" as const,
      eyebrow: meta.eyebrow,
      title: meta.title,
      body: SECTION_LEFT_COPY[meta.id],
      bullets:
        meta.id === "top-rules"
          ? sections.topRulesToRemember
          : meta.id === "permitted-use"
            ? sections.permittedUse
            : meta.id === "approved-tools"
              ? sections.approvedTools
              : meta.id === "data-protect"
                ? sections.dataToProtect
                : meta.id === "accountability"
                  ? sections.accountability
                  : sections.whenUnsure,
      numbered: meta.numbered || undefined,
      decision: meta.decision,
    }));

  for (const slide of sectionSlides) {
    push(slide);
  }

  return {
    organizationName: options.organizationName,
    policyTitle,
    effectiveDate,
    generatedAt,
    totalPages: slides.length,
    slides,
    theme,
  };
}
