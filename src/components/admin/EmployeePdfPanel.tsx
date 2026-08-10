"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Download, ExternalLink, FileImage } from "lucide-react";
import { EmployeeAupDocument } from "@/components/pdf/EmployeeAupDocument";
import { Button, Card, SectionTitle } from "@/components/ui";
import { buildEmployeePdfFromState } from "@/lib/services/build-employee-pdf-from-state";
import { openEmployeePdfDownloadPreview } from "@/lib/services/download-assets";
import { useMobilization } from "@/context/MobilizationContext";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import type { MobilizationFlow } from "@/lib/types/policy-schema";

export function EmployeePdfPanel({
  sections,
  flow,
}: {
  sections: ParsedAupSections;
  flow: MobilizationFlow;
}) {
  const { orgBranding } = useMobilization();

  const doc = useMemo(
    () => buildEmployeePdfFromState(sections, orgBranding, flow),
    [sections, orgBranding, flow]
  );

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-xl">Employee AUP PDF</SectionTitle>
            <p className="mt-2 text-sm text-alpine/60">
              {doc.totalPages} slides · 1600×900 px each ·{" "}
              {orgBranding.organizationName}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => openEmployeePdfDownloadPreview()}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Link href="/pdf-preview">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" />
                Full preview
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-alpine/10 bg-salt px-6 py-3">
          <FileImage className="h-4 w-4 text-alpine/50" />
          <span className="text-sm font-medium text-alpine">Slide preview</span>
        </div>
        <div className="overflow-x-auto bg-white p-6">
          <div className="origin-top-left scale-[0.28]">
            <EmployeeAupDocument doc={doc} />
          </div>
        </div>
      </Card>
    </div>
  );
}
