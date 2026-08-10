"use client";

/**
 * Extract raw text from an uploaded DOCX in the browser, using mammoth's
 * raw-text extraction (no HTML/styling — same plain-text shape the parser
 * expects from PDF/TXT uploads).
 */
export async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}
