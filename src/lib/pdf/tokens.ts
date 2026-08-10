/** Default boilerplate palette for employee PDF slides (BrainStorm look) — override per org via branding */

export const PDF_THEME = {
  background: "#ffffff",
  backgroundMuted: "#f1f5f9",
  surface: "#ffffff",
  primary: "#7c2222",
  primaryLight: "#963030",
  accent: "#d4a828",
  highlight: "#7c2222",
  text: "#2a2a26",
  textMuted: "#64748b",
  border: "rgba(124, 34, 34, 0.14)",
  decision: {
    allowed: "#2d6a4f",
    caution: "#b8860b",
    prohibited: "#9b2c2c",
    escalate: "#2c5282",
  },
} as const;

export const PDF_FONTS = {
  display: "var(--font-fraunces), Georgia, serif",
  body: "var(--font-dm-sans), system-ui, sans-serif",
} as const;
