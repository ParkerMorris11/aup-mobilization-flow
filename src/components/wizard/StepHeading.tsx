import type { ReactNode } from "react";

export function StepHeading({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[3px] text-alpine/50">
        Step {step}
      </p>
      <h1 className="mt-1 font-display text-3xl font-medium text-alpine">
        {title}
      </h1>
      <div className="mt-3 h-1 w-10 rounded-full bg-gold" />
      <p className="mt-4 max-w-2xl text-alpine/70">{description}</p>
    </div>
  );
}
