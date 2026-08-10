"use client";

import { useState } from "react";
import { ChevronRight, Info, Plus } from "lucide-react";
import { useMobilization } from "@/context/MobilizationContext";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";

export function SparseSectionIndicator({
  sectionKey,
  sectionName,
  ruleCount,
}: {
  sectionKey: keyof ParsedAupSections;
  sectionName: string;
  ruleCount: number;
}) {
  const {
    clarifyingChecklist,
    toggleClarifyingIncluded,
    setClarifyingAnswerNote,
    addCustomClarifyingQuestion,
  } = useMobilization();
  const [expanded, setExpanded] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");

  const items = clarifyingChecklist.filter((item) => item.sectionKey === sectionKey);
  const pendingCount = items.filter((item) => item.included && !item.note.trim()).length;

  return (
    <div className="mt-3 rounded-lg border border-wasatch/25 bg-wasatch/5 px-3 py-2.5">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 text-left text-xs font-medium text-alpine/70"
      >
        <Info className="h-3.5 w-3.5 shrink-0 text-wasatch" />
        <span className="flex-1">
          {ruleCount === 0 ? "No rules found" : `Only ${ruleCount} rule found`}{" "}
          for {sectionName}
          {pendingCount > 0 ? ` — ${pendingCount} thing${pendingCount === 1 ? "" : "s"} to clarify` : ""}
        </span>
        <ChevronRight
          className={`h-3.5 w-3.5 shrink-0 text-alpine/40 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-2 border-t border-wasatch/15 pt-2 pl-5">
          {items.length === 0 && (
            <p className="text-xs text-alpine/50">
              No AI-suggested questions for this section yet — add your own below.
            </p>
          )}

          {items.map((item) => {
            const answered = item.note.trim().length > 0;
            return (
              <div key={item.flagKey} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={item.included}
                  onChange={() => toggleClarifyingIncluded(item.flagKey)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-wasatch"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs leading-relaxed ${
                      item.included ? "text-alpine/80" : "text-alpine/40 line-through"
                    }`}
                  >
                    {item.question}
                    {item.source === "staff" && (
                      <span className="ml-1.5 rounded-full bg-alpine/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-alpine/50">
                        Added by you
                      </span>
                    )}
                  </p>
                  <input
                    type="text"
                    value={item.note}
                    onChange={(e) => setClarifyingAnswerNote(item.flagKey, e.target.value)}
                    placeholder="Client's answer (once received)…"
                    className={`mt-1 w-full rounded border px-2 py-1 text-xs outline-none ${
                      answered
                        ? "border-decision-allowed/30 bg-emerald-50/60 text-alpine"
                        : "border-alpine/10 bg-white text-alpine placeholder:text-alpine/30"
                    }`}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-1">
            <Plus className="h-3.5 w-3.5 shrink-0 text-alpine/40" />
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newQuestion.trim()) {
                  addCustomClarifyingQuestion(sectionKey, newQuestion);
                  setNewQuestion("");
                }
              }}
              placeholder="Add your own question and press Enter…"
              className="w-full rounded border border-alpine/10 bg-white px-2 py-1 text-xs text-alpine outline-none placeholder:text-alpine/30 focus:border-wasatch/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}
