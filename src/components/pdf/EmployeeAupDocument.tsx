import type { EmployeePdfDocument } from "@/lib/types/employee-pdf-schema";
import {
  PdfSlide,
  SlideBody,
  SlideBullets,
  SlideEyebrow,
  SlideTitle,
} from "./PdfSlide";

export function EmployeeAupDocument({ doc }: { doc: EmployeePdfDocument }) {
  const { slides, theme } = doc;

  return (
    <div className="pdf-document">
      {slides.map((slide) => (
        <PdfSlide key={slide.id} theme={theme}>
          {slide.type === "cover" && (
            <div
              className="grid h-full grid-cols-[43%_57%] overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`,
              }}
            >
              <div
                className="flex flex-col justify-center overflow-hidden border-r border-white/15 px-20 py-16"
                style={{ height: "100%" }}
              >
                {slide.eyebrow && (
                  <SlideEyebrow theme={theme}>{slide.eyebrow}</SlideEyebrow>
                )}
                <h1
                  className="mt-5 max-w-[460px] font-display text-[60px] font-medium leading-[1.15]"
                  style={{
                    color: "#ffffff",
                    fontFamily: "var(--font-fraunces)",
                  }}
                >
                  {slide.title}
                </h1>
                {slide.body && (
                  <p
                    className="mt-8 max-w-[380px] text-[24px] leading-[1.45]"
                    style={{ color: "rgba(255,255,255,0.82)" }}
                  >
                    {slide.body}
                  </p>
                )}
                <span
                  className="mt-10 block h-1.5 w-14 rounded-sm"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
              <div
                className="flex flex-col justify-center overflow-hidden px-20 py-16"
                style={{ height: "100%" }}
              >
                <ol className="space-y-6">
                  {slide.bullets?.map((item, index) => {
                    const active = index === 0;
                    return (
                      <li key={index} className="flex items-start gap-5">
                        <div className="flex flex-col items-center pt-1">
                          <span
                            className="block h-5 w-5 rounded-full border"
                            style={{
                              backgroundColor: active ? theme.accent : "transparent",
                              borderColor: active
                                ? theme.accent
                                : "rgba(255,255,255,0.45)",
                            }}
                          />
                          {index < (slide.bullets?.length ?? 0) - 1 && (
                            <span className="mt-2 h-10 w-px bg-white/25" />
                          )}
                        </div>
                        <div>
                          <p
                            className="text-[28px] leading-[1.2]"
                            style={{
                              color: active ? "#ffffff" : "rgba(255,255,255,0.82)",
                              fontWeight: active ? 600 : 400,
                            }}
                          >
                            {item}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
                {slide.footer && (
                  <p
                    className="mt-16 text-[20px]"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {slide.footer}
                  </p>
                )}
              </div>
            </div>
          )}

          {slide.type === "section" && (
            <div
              className="flex h-full flex-col overflow-hidden px-16 py-10"
              style={{ backgroundColor: theme.surface }}
            >
              <span
                className="mb-4 block h-[6px] w-16 shrink-0 rounded-sm"
                style={{ backgroundColor: theme.accent }}
              />
              <div className="max-w-[900px] shrink-0">
                {slide.eyebrow && (
                  <SlideEyebrow theme={theme}>{slide.eyebrow}</SlideEyebrow>
                )}
                <SlideTitle light={false} theme={theme}>
                  {slide.title}
                </SlideTitle>
                {slide.body && (
                  <SlideBody light={false} theme={theme}>
                    {slide.body}
                  </SlideBody>
                )}
              </div>
              <div className="mt-6 min-h-0 flex-1 overflow-hidden">
                {slide.bullets && (
                  <SlideBullets
                    items={slide.bullets}
                    numbered={slide.numbered}
                    theme={theme}
                  />
                )}
                {!slide.bullets?.length && (
                  <div
                    className="px-0 py-8 text-[24px]"
                    style={{ color: theme.textMuted }}
                  >
                    This policy doesn&apos;t appear to address this topic —
                    add your organization&apos;s own guidance here before
                    publishing.
                  </div>
                )}
              </div>
            </div>
          )}
        </PdfSlide>
      ))}
    </div>
  );
}
