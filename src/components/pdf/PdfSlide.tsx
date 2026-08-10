import clsx from "clsx";
import type { ReactNode } from "react";
import type { PdfTheme } from "@/lib/pdf/build-theme";
import { PDF_THEME } from "@/lib/pdf/tokens";
import {
  PDF_SLIDE_HEIGHT,
  PDF_SLIDE_WIDTH,
} from "@/lib/types/employee-pdf-schema";

export function PdfSlide({
  children,
  className,
  theme = PDF_THEME,
}: {
  children: ReactNode;
  className?: string;
  theme?: PdfTheme;
}) {
  return (
    <section
      className={clsx("pdf-slide relative flex flex-col overflow-hidden", className)}
      style={{
        width: PDF_SLIDE_WIDTH,
        height: PDF_SLIDE_HEIGHT,
        backgroundColor: theme.background,
      }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{ height: PDF_SLIDE_HEIGHT }}
      >
        {children}
      </div>
    </section>
  );
}

export function SlideEyebrow({
  children,
  theme = PDF_THEME,
}: {
  children: ReactNode;
  theme?: PdfTheme;
}) {
  return (
    <p
      className="shrink-0 text-[18px] font-semibold uppercase tracking-[4px]"
      style={{ color: theme.accent }}
    >
      {children}
    </p>
  );
}

export function SlideTitle({
  children,
  light = true,
  theme = PDF_THEME,
}: {
  children: ReactNode;
  light?: boolean;
  theme?: PdfTheme;
}) {
  return (
    <div className="shrink-0">
      <h2
        className="mt-4 font-display text-[56px] font-medium leading-[1.05]"
        style={{
          color: light ? "#ffffff" : theme.primary,
          fontFamily: "var(--font-fraunces)",
        }}
      >
        {children}
      </h2>
    </div>
  );
}

export function SlideBody({
  children,
  light = true,
  theme = PDF_THEME,
}: {
  children: ReactNode;
  light?: boolean;
  theme?: PdfTheme;
}) {
  return (
    <p
      className="mt-4 text-[26px] leading-[1.45]"
      style={{ color: light ? "rgba(255,255,255,0.72)" : theme.textMuted }}
    >
      {children}
    </p>
  );
}

/** Renders `**text**` segments in bold with the theme highlight color */
function renderEmphasis(text: string, theme: PdfTheme) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (!match) return <span key={i}>{part}</span>;
    return (
      <strong key={i} style={{ color: theme.highlight, fontWeight: 600 }}>
        {match[1]}
      </strong>
    );
  });
}

export function SlideBullets({
  items,
  numbered = false,
  theme = PDF_THEME,
}: {
  items: string[];
  numbered?: boolean;
  theme?: PdfTheme;
}) {
  return (
    <ul className="flex h-full w-full flex-col space-y-0 overflow-hidden">
      {items.map((item, i) => (
        <li
          key={`${i}-${item.slice(0, 32)}`}
          className="flex items-center gap-5 px-10 text-[22px] leading-[1.3]"
          style={{
            color: theme.text,
            borderBottom: `1px solid ${theme.border}`,
            flex: "1 1 0%",
            maxHeight: 170,
          }}
        >
          {numbered ? (
            <span
              className="shrink-0 rounded-full"
              style={{
                backgroundColor: theme.primary,
                width: 40,
                height: 40,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  color: theme.accent,
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {i + 1}
              </span>
            </span>
          ) : (
            <span
              className="shrink-0 text-[26px] leading-none"
              style={{ color: theme.accent }}
            >
              →
            </span>
          )}
          <span className="min-w-0 flex-1">{renderEmphasis(item, theme)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DecisionPill({
  decision,
  theme = PDF_THEME,
}: {
  decision: "allowed" | "caution" | "prohibited" | "escalate";
  theme?: PdfTheme;
}) {
  const labels = {
    allowed: "Allowed",
    caution: "Caution",
    prohibited: "Protected",
    escalate: "Escalate",
  };
  const bg = theme.decision[decision];

  return (
    <span
      className="inline-flex shrink-0 rounded-full px-5 py-2 text-[18px] font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {labels[decision]}
    </span>
  );
}
