"use client";

import { useEffect, useMemo, useState } from "react";
import { EmployeeAupDocument } from "@/components/pdf/EmployeeAupDocument";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import { buildEmployeePdfFromState } from "@/lib/services/build-employee-pdf-from-state";
import type { OrgBranding } from "@/lib/types/org-branding";
import { DEFAULT_ORG_BRANDING } from "@/lib/types/org-branding";

function getTodayFormatted(): string {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BrandingPanel() {
  const { orgBranding, orgNameNeedsReview, updateOrgBranding, sections, flow } =
    useMobilization();
  const [draft, setDraft] = useState<OrgBranding>(orgBranding);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);

  useEffect(() => {
    const updated = {
      ...orgBranding,
      effectiveDate: orgBranding.effectiveDate === DEFAULT_ORG_BRANDING.effectiveDate
        ? getTodayFormatted()
        : orgBranding.effectiveDate,
    };
    setDraft(updated);

    if (!hasAutoSaved && orgBranding.organizationName !== DEFAULT_ORG_BRANDING.organizationName) {
      updateOrgBranding(updated);
      setHasAutoSaved(true);
    }
  }, [orgBranding, hasAutoSaved, updateOrgBranding]);

  const previewDoc = useMemo(() => {
    if (!sections || !flow) return null;
    return buildEmployeePdfFromState(sections, draft, flow);
  }, [sections, draft, flow]);

  const save = () => {
    updateOrgBranding(draft);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-xl">Company branding</SectionTitle>
            <p className="mt-1 text-sm text-alpine/60">
              Set the company name and policy title. Other details have sensible defaults.
            </p>
          </div>
          <Button onClick={save}>Save branding</Button>
        </div>

        {orgNameNeedsReview && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-medium">Couldn&apos;t find a company name in the uploaded document.</span>{" "}
            The name below was guessed from the file name — confirm or correct it before exporting the client PDF.
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-alpine">Company name</span>
              <input
                className="mt-1 w-full rounded-lg border border-alpine/15 px-3 py-2"
                value={draft.organizationName}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, organizationName: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-alpine">Policy title</span>
              <input
                className="mt-1 w-full rounded-lg border border-alpine/15 px-3 py-2"
                value={draft.policyTitle}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, policyTitle: e.target.value }))
                }
              />
            </label>
          </div>

          <div className="border-t border-alpine/10 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-alpine/50 mb-4">Optional customization</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-alpine">Policy version</span>
                <input
                  className="mt-1 w-full rounded-lg border border-alpine/15 px-3 py-2"
                  placeholder="e.g. 1.0, 2.3, March 2026 Rev B"
                  value={draft.policyVersion}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, policyVersion: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-alpine">Effective date</span>
                <input
                  className="mt-1 w-full rounded-lg border border-alpine/15 px-3 py-2 disabled:opacity-50"
                  value={draft.effectiveDate}
                  disabled={!draft.showEffectiveDate}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, effectiveDate: e.target.value }))
                  }
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-alpine/60">
                  <input
                    type="checkbox"
                    checked={draft.showEffectiveDate}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, showEffectiveDate: e.target.checked }))
                    }
                  />
                  Show effective date on cover slide
                </label>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-alpine">Primary color</span>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-alpine/15"
                    value={draft.primaryColor}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, primaryColor: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-alpine/15 px-3 py-2 font-mono text-sm"
                    value={draft.primaryColor}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, primaryColor: e.target.value }))
                    }
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-alpine">Accent color</span>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded border border-alpine/15"
                    value={draft.accentColor}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, accentColor: e.target.value }))
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-alpine/15 px-3 py-2 font-mono text-sm"
                    value={draft.accentColor}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, accentColor: e.target.value }))
                    }
                  />
                </div>
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="font-medium text-alpine">Cover tagline</span>
                <input
                  className="mt-1 w-full rounded-lg border border-alpine/15 px-3 py-2"
                  value={draft.coverTagline}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, coverTagline: e.target.value }))
                  }
                />
                <span className="mt-1 block text-xs text-alpine/50">
                  Use <code className="rounded bg-salt px-1">{"{organizationName}"}</code> to insert the company name.
                </span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {previewDoc && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-alpine/10 bg-salt px-6 py-3 text-sm font-medium text-alpine">
            Cover slide preview
          </div>
          <div className="overflow-x-auto bg-white p-6">
            <div className="origin-top-left scale-[0.28]">
              <EmployeeAupDocument
                doc={{
                  ...previewDoc,
                  slides: previewDoc.slides.filter((slide) => slide.type === "cover"),
                  totalPages: 1,
                }}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
