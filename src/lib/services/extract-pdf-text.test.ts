import { describe, expect, it } from "vitest";
import { isDocumentTooShortToParse } from "@/lib/services/extract-parsed-sections-from-text";

// Mirrors how extract-pdf-text.ts used to flatten a page's text items:
// join everything with a single space, losing all line breaks.
function oldStyleJoin(lines: string[]) {
  return lines.join(" ");
}

// Mirrors the fixed behavior: text items are joined honoring pdf.js's
// hasEOL flag, so each original line in the source PDF becomes its own line.
function newStyleJoin(lines: string[]) {
  return lines.join("\n");
}

// A representative sample of real lines from the Brookhaven AI Use Policy PDF (page 1).
const SAMPLE_PAGE_LINES = [
  "Town of Brookhaven | Department of Information Technology",
  "POL-0004",
  "Artificial Intelligence Use Policy",
  "Town of Brookhaven",
  "Department of Information Technology",
  "1. Purpose",
  "The purpose of this policy is to establish a secure, responsible, and consistent framework for the use of Artificial",
  "Intelligence (AI) tools and AI-enabled features for Town Business.",
  "2. Scope",
  "This policy applies to all Town departments, offices, boards, employees, elected officials, contractors, consultants,",
  "3. Definitions",
  "Artificial Intelligence or AI",
];

describe("PDF text extraction line structure", () => {
  it("old single-space-joined flattening incorrectly marks a substantial policy document as too short", () => {
    // Simulates 3 pages, each collapsed to one giant line (the pre-fix behavior).
    const rawText = [
      oldStyleJoin(SAMPLE_PAGE_LINES),
      oldStyleJoin(SAMPLE_PAGE_LINES),
      oldStyleJoin(SAMPLE_PAGE_LINES),
    ].join("\n\n");

    expect(isDocumentTooShortToParse(rawText)).toBe(true);
  });

  it("fixed line-preserving join correctly recognizes the same content as sufficiently long", () => {
    const rawText = [
      newStyleJoin(SAMPLE_PAGE_LINES),
      newStyleJoin(SAMPLE_PAGE_LINES),
      newStyleJoin(SAMPLE_PAGE_LINES),
    ].join("\n\n");

    expect(isDocumentTooShortToParse(rawText)).toBe(false);
  });
});
