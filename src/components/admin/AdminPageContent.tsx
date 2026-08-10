"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RulesTable } from "@/components/admin/RulesTable";
import { FlowPreviewPanel } from "@/components/admin/FlowPreviewPanel";
import { ParsedSectionsPanel } from "@/components/admin/ParsedSectionsPanel";
import { EmployeePdfPanel } from "@/components/admin/EmployeePdfPanel";
import { FlowBuilderExportPanel } from "@/components/admin/FlowBuilderExportPanel";
import { DownloadsPanel } from "@/components/admin/DownloadsPanel";
import { BrandingPanel } from "@/components/admin/BrandingPanel";
import { SourceDocumentPanel } from "@/components/upload/SourceDocumentPanel";
import { Button } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";

type Tab =
  | "source"
  | "sections"
  | "branding"
  | "rules"
  | "flow"
  | "pdf"
  | "downloads"
  | "flow-builder";

export function AdminPageContent() {
  const searchParams = useSearchParams();
  const { rules, sections, flow, processingStatus, reset } = useMobilization();
  const [tab, setTab] = useState<Tab>("sections");

  useEffect(() => {
    const requested = searchParams.get("tab");
    if (
      requested &&
      [
        "source",
        "sections",
        "branding",
        "rules",
        "flow",
        "pdf",
        "downloads",
        "flow-builder",
      ].includes(requested)
    ) {
      setTab(requested as Tab);
    }
  }, [searchParams]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "source", label: "Source" },
    { id: "rules", label: "Parsed rules" },
    { id: "sections", label: "Parsed sections" },
    { id: "pdf", label: "Employee PDF" },
    { id: "branding", label: "Branding" },
    { id: "downloads", label: "Downloads" },
    { id: "flow", label: "Flow preview" },
    { id: "flow-builder", label: "Flow Builder" },
  ];

  if (processingStatus !== "ready" || !flow || !sections) {
    return (
      <AppShell
        title="Admin review"
        subtitle="Upload a policy first to review parsed sections and generated outputs."
      >
        <div className="rounded-card border border-alpine/10 bg-white p-12 text-center">
          <p className="text-alpine/70">No policy processed yet.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Go to upload</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin review"
      subtitle="Review the source document, parsed employee sections, flow, and PDF output."
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex shrink-0 flex-col gap-1 rounded-card bg-alpine p-3 lg:w-56">
          <p className="px-3 pb-2 pt-1 text-[10px] font-medium uppercase tracking-[3px] text-white/35">
            Admin review
          </p>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium tracking-tight transition-colors ${
                tab === t.id
                  ? "bg-white/10 text-gold"
                  : "text-salt/80 hover:bg-white/[.06]"
              }`}
            >
              {t.label}
            </button>
          ))}
          <Button
            variant="ghost"
            onClick={reset}
            className="mt-4 justify-start text-xs text-salt/60 hover:bg-white/[.06] hover:text-salt"
          >
            Reset demo
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          {tab === "source" && <SourceDocumentPanel />}
          {tab === "sections" && <ParsedSectionsPanel sections={sections} />}
          {tab === "branding" && <BrandingPanel />}
          {tab === "rules" && <RulesTable rules={rules} />}
          {tab === "flow" && <FlowPreviewPanel flow={flow} />}
          {tab === "pdf" && <EmployeePdfPanel sections={sections} flow={flow} />}
          {tab === "downloads" && <DownloadsPanel />}
          {tab === "flow-builder" && <FlowBuilderExportPanel flow={flow} />}
        </div>
      </div>
    </AppShell>
  );
}
