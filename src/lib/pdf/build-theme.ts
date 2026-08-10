import type { OrgBranding } from "@/lib/types/org-branding";
import { PDF_THEME } from "@/lib/pdf/tokens";

export interface PdfTheme {
  background: string;
  backgroundMuted: string;
  surface: string;
  primary: string;
  primaryLight: string;
  accent: string;
  highlight: string;
  text: string;
  textMuted: string;
  border: string;
  decision: {
    allowed: string;
    caution: string;
    prohibited: string;
    escalate: string;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function lighten(hex: string, amount: number) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

export function buildPdfTheme(branding?: Partial<OrgBranding>): PdfTheme {
  const primary = branding?.primaryColor || PDF_THEME.primary;
  const accent = branding?.accentColor || PDF_THEME.accent;

  return {
    ...PDF_THEME,
    primary,
    primaryLight: lighten(primary, 0.14),
    accent,
  };
}
