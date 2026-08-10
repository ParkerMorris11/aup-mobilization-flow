"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, PenLine, ShieldCheck } from "lucide-react";
import {
  EMPLOYEE_SECTION_LABELS,
  SECTION_KEYS,
  type ParsedAupSections,
} from "@/lib/types/parsed-sections";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import { citationFlagKey } from "@/lib/types/section-citations";
import { SparseSectionIndicator } from "./SparseSectionIndicator";
import { SPARSE_THRESHOLD, SECTION_SPARSE_THRESHOLDS } from "@/lib/services/sparse-sections";

export function ParsedSectionsPanel({
  sections,
}: {
  sections: ParsedAupSections;
}) {
  const {
    updateParsedSections,
    resetParsedSections,
    reparseAup,
    parseMeta,
    processingStatus,
    sectionCitations,
    unresolvedCitations,
    markCitationReviewed,
    documentTooShort,
    originalSectionLabels,
  } = useMobilization();
  const [draft, setDraft] = useState<Record<keyof ParsedAupSections, string>>({
    topRulesToRemember: "",
    permittedUse: "",
    approvedTools: "",
    dataToProtect: "",
    accountability: "",
    whenUnsure: "",
  });
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDraft({
      topRulesToRemember: sections.topRulesToRemember.join("\n"),
      permittedUse: sections.permittedUse.join("\n"),
      approvedTools: sections.approvedTools.join("\n"),
      dataToProtect: sections.dataToProtect.join("\n"),
      accountability: sections.accountability.join("\n"),
      whenUnsure: sections.whenUnsure.join("\n"),
    });
  }, [sections]);

  const gapKeys = SECTION_KEYS.filter((key) => sections[key].length === 0);

  const saveChanges = () => {
    updateParsedSections({
      topRulesToRemember: toItems(draft.topRulesToRemember, 3),
      permittedUse: toItems(draft.permittedUse),
      approvedTools: toItems(draft.approvedTools),
      dataToProtect: toItems(draft.dataToProtect),
      accountability: toItems(draft.accountability),
      whenUnsure: toItems(draft.whenUnsure),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-xl">Parsed employee sections</SectionTitle>
            <p className="mt-1 text-sm text-alpine/60">
              AUP scanned and classified into the employee PDF structure. Edit
              these sections before downloading assets.
            </p>
            {parseMeta && (
              <div className="mt-2">
                <p className="text-xs text-alpine/50">
                  Parsed via {parseMeta.method === "llm" ? "AI" : "heuristic scan"} ·{" "}
                  {Math.round(parseMeta.confidence * 100)}% confidence
                </p>
                {parseMeta.fallbackReason && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {parseMeta.fallbackReason}
                  </p>
                )}
                {parseMeta.truncationWarning && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {parseMeta.truncationWarning}
                  </p>
                )}
                {parseMeta.confidenceBreakdown && (
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-alpine/40">
                    <span
                      title="Fraction of the 6 employee sections that had real content extracted, rather than falling back to generic defaults"
                    >
                      Section coverage{" "}
                      {Math.round(parseMeta.confidenceBreakdown.sectionCoverage * 100)}%
                    </span>
                    <span
                      title="Fraction of words in the extracted bullets that actually appear in your source document — low grounding can mean paraphrased or invented content"
                    >
                      Text grounding{" "}
                      {Math.round(parseMeta.confidenceBreakdown.textGrounding * 100)}%
                    </span>
                    <span title="How many section-heading-like structures were detected in the source document">
                      Structure signal{" "}
                      {Math.round(parseMeta.confidenceBreakdown.structureSignal * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => void reparseAup()}
              disabled={processingStatus === "parsing"}
            >
              {processingStatus === "parsing" ? "Re-parsing..." : "Re-parse with AI"}
            </Button>
            <Button variant="secondary" onClick={resetParsedSections}>
              Reset to scan
            </Button>
            <Button onClick={saveChanges}>Save edits</Button>
          </div>
        </div>
      </Card>

      {documentTooShort && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-alpine">
                This document looks too short or incomplete to parse reliably
              </p>
              <p className="mt-1 text-sm text-alpine/70">
                We found very little usable policy text. Confirm you uploaded
                the complete document — if it&apos;s already complete,
                you&apos;ll likely need to write these section
                {gapKeys.length === 1 ? "" : "s"} below yourself rather than
                rely on extraction:{" "}
                <span className="font-medium text-alpine">
                  {gapKeys.length > 0
                    ? gapKeys.map((k) => EMPLOYEE_SECTION_LABELS[k]).join(", ")
                    : "all 6 sections"}
                </span>
                .
              </p>
            </div>
          </div>
        </Card>
      )}

      {!documentTooShort && gapKeys.length > 0 && (
        <Card className="border-alpine/15 bg-salt">
          <div className="flex items-start gap-3">
            <PenLine className="mt-0.5 h-5 w-5 shrink-0 text-alpine/60" />
            <div>
              <p className="font-medium text-alpine">
                {gapKeys.length} section{gapKeys.length === 1 ? "" : "s"}{" "}
                {gapKeys.length === 1 ? "isn't" : "aren't"} addressed in this
                policy
              </p>
              <p className="mt-1 text-sm text-alpine/70">
                Rather than filling these with generic boilerplate, we left
                them empty:{" "}
                <span className="font-medium text-alpine">
                  {gapKeys.map((k) => EMPLOYEE_SECTION_LABELS[k]).join(", ")}
                </span>
                . Add your company&apos;s own guidance below, or leave blank
                if genuinely not applicable.
              </p>
            </div>
          </div>
        </Card>
      )}

      {unresolvedCitations.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-alpine">
                {unresolvedCitations.length} bullet
                {unresolvedCitations.length === 1 ? "" : "s"} need review before
                you continue
              </p>
              <p className="mt-1 text-sm text-alpine/70">
                We couldn&apos;t find an exact matching line in your source
                document for these — double-check they weren&apos;t invented,
                edit them, or confirm they&apos;re fine as-is.
              </p>
              <ul className="mt-3 space-y-2">
                {unresolvedCitations.map(({ sectionKey, flagKey, citation }) => (
                  <li
                    key={flagKey}
                    className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                        {EMPLOYEE_SECTION_LABELS[sectionKey]}
                      </p>
                      <p className="mt-0.5 text-sm text-alpine">{citation.text}</p>
                    </div>
                    <Button
                      variant="secondary"
                      className="shrink-0 py-1.5 text-xs"
                      onClick={() => markCitationReviewed(flagKey)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark reviewed
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : (
        sectionCitations && (
          <Card className="border-decision-allowed/30 bg-emerald-50/60 py-3">
            <div className="flex items-center gap-2 text-sm text-alpine/80">
              <ShieldCheck className="h-4 w-4 shrink-0 text-decision-allowed" />
              Every extracted bullet is either verified against your source
              document or has been manually reviewed.
            </div>
          </Card>
        )
      )}

      {SECTION_KEYS.map((key) => {
        const citations = sectionCitations?.[key];
        const sourcesOpen = expandedSources[key] ?? false;
        const isGap = gapKeys.includes(key);

        return (
          <Card key={key} className={isGap ? "border-alpine/20 border-dashed p-5" : "p-5"}>
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 font-display text-base font-medium text-alpine">
                {EMPLOYEE_SECTION_LABELS[key]}
                {isGap && (
                  <span className="rounded-full bg-alpine/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-alpine/60">
                    Not addressed
                  </span>
                )}
              </h4>
              {citations && citations.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSources((s) => ({ ...s, [key]: !sourcesOpen }))
                  }
                  className="flex items-center gap-1 text-xs font-medium text-alpine/60 hover:text-alpine"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${sourcesOpen ? "rotate-180" : ""}`}
                  />
                  {sourcesOpen ? "Hide sources" : "View sources"}
                </button>
              )}
            </div>
            {originalSectionLabels?.[key] && (
              <p className="mt-0.5 text-xs italic text-alpine/45">
                As written in their policy: &ldquo;{originalSectionLabels[key]}&rdquo;
              </p>
            )}
            <p className="mt-1 text-xs text-alpine/50">
              {isGap
                ? "Your policy doesn't cover this — write your own content, or leave blank."
                : "One line per bullet."}
            </p>
            <textarea
              value={draft[key]}
              onChange={(e) =>
                setDraft((current) => ({ ...current, [key]: e.target.value }))
              }
              rows={key === "topRulesToRemember" ? 4 : 6}
              placeholder={
                isGap
                  ? "Not covered by the uploaded policy — add your own guidance here…"
                  : undefined
              }
              className="mt-3 w-full rounded-card border border-alpine/15 bg-white px-4 py-3 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
            />

            {sourcesOpen && citations && (
              <ul className="mt-3 space-y-2 border-t border-alpine/10 pt-3">
                {citations.map((citation, index) => {
                  const flagKey = citationFlagKey(key, index);
                  return (
                    <li key={flagKey} className="flex items-start gap-2 text-xs">
                      {citation.grounded ? (
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-decision-allowed" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      )}
                      <div className="min-w-0">
                        <p className="text-alpine/80">{citation.text}</p>
                        {citation.grounded ? (
                          <p className="mt-0.5 truncate text-alpine/40">
                            Source: &ldquo;{citation.quote}&rdquo;
                          </p>
                        ) : (
                          <p className="mt-0.5 text-amber-700">
                            No matching line found in source document
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {sections[key].length < (SECTION_SPARSE_THRESHOLDS[key] ?? SPARSE_THRESHOLD) && (
              <SparseSectionIndicator
                sectionKey={key}
                sectionName={EMPLOYEE_SECTION_LABELS[key]}
                ruleCount={sections[key].length}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}

function toItems(value: string, max = 5) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}
