"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";

export interface WizardStepMeta {
  id: number;
  title: string;
  description: string;
}

export function WizardShell({
  steps,
  currentStep,
  furthestStep,
  onStepSelect,
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  nextLabel,
  children,
}: {
  steps: WizardStepMeta[];
  currentStep: number;
  furthestStep: number;
  onStepSelect: (step: number) => void;
  onBack: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  children: ReactNode;
}) {
  const active = steps.find((s) => s.id === currentStep);
  const pct = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="flex min-h-screen bg-salt">
      <aside className="flex w-64 shrink-0 flex-col justify-between bg-alpine px-5 py-6">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/BrainStorm_Horizontal_White.svg"
              alt="BrainStorm"
              width={140}
              height={15}
              priority
            />
          </Link>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[2px] text-white/45">
            AUP Workflow
          </p>

          <p className="mt-6 text-[10px] font-medium uppercase tracking-[3px] text-white/35">
            Steps
          </p>
          <nav className="mt-2 flex flex-col gap-1">
            {steps.map((step) => {
              const isActive = step.id === currentStep;
              const isDone = step.id < currentStep;
              const isReachable = step.id <= furthestStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!isReachable}
                  onClick={() => isReachable && onStepSelect(step.id)}
                  className={clsx(
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-white/[.12]"
                      : isReachable
                        ? "text-white/80 hover:bg-white/[.06]"
                        : "cursor-not-allowed text-white/25"
                  )}
                >
                  <span
                    className={clsx(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isActive
                        ? "bg-gold text-alpine"
                        : isDone
                          ? "bg-uinta text-salt"
                          : "bg-white/[.12] text-white/45"
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
                  </span>
                  <span>
                    <span
                      className={clsx(
                        "block text-sm font-medium",
                        isActive ? "text-gold" : "text-salt"
                      )}
                    >
                      {step.title}
                    </span>
                    <span className="block text-xs text-white/45">
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[.12]">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/45">
            Step {currentStep} of {steps.length}
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-alpine/10 bg-white px-8 py-4">
          <p className="text-sm text-alpine/50">
            AUP Workflow{" "}
            <span className="mx-1.5 text-alpine/25">〉</span>
            <span className="font-medium text-alpine">{active?.title}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={backDisabled}
              className="inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-medium text-alpine/70 transition-colors hover:bg-salt-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className="inline-flex items-center gap-2 rounded-pill bg-alpine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-alpine-light disabled:cursor-not-allowed disabled:opacity-40"
            >
              {nextLabel ?? "Next step"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-8 py-10">{children}</main>
      </div>
    </div>
  );
}
