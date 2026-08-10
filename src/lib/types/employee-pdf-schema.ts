import type { DecisionType } from "@/lib/types/policy-schema";
import type { PdfTheme } from "@/lib/pdf/build-theme";

export type EmployeePdfSlideType = "cover" | "section";

export interface EmployeePdfSlide {
  id: string;
  type: EmployeePdfSlideType;
  pageNumber: number;
  eyebrow?: string;
  title: string;
  body?: string;
  bullets?: string[];
  decision?: DecisionType;
  footer?: string;
  /** Number bullets 1–3 for top rules slide */
  numbered?: boolean;
}

export interface EmployeePdfDocument {
  organizationName: string;
  policyTitle: string;
  effectiveDate: string;
  generatedAt: string;
  totalPages: number;
  slides: EmployeePdfSlide[];
  theme: PdfTheme;
}

/** Slide canvas dimensions — 16:9 presentation format */
export const PDF_SLIDE_WIDTH = 1600;
export const PDF_SLIDE_HEIGHT = 900;
