"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, FileText, Printer } from "lucide-react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import {
  buildBsiUploadChecklist,
  downloadOriginalAup,
  openEmployeePdfDownloadPreview,
  getAssetReadiness,
} from "@/lib/services/download-assets";

export function DownloadsPanel() {
  const { uploadedAup, sections, flow } = useMobilization();
  const [downloading, setDownloading] = useState<string | null>(null);
  const readiness = getAssetReadiness(uploadedAup, sections, flow);
  const checklist = buildBsiUploadChecklist();

  async function handleDownload(
    key: string,
    action: () => void | Promise<void>
  ) {
    setDownloading(key);
    try {
      await action();
    } finally {
      setDownloading(null);
    }
  }

  if (!uploadedAup || !sections || !flow) {
    return (
      <Card className="p-12 text-center">
        <p className="text-alpine/70">
          Process a policy first to unlock downloadable assets.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle className="text-xl">Download assets</SectionTitle>
        <p className="mt-2 text-sm text-alpine/60">
          Download the two assets you&apos;ll upload to the BSI platform: the
          original company AUP and the employee PDF deck.
        </p>
        {readiness.originalAup && readiness.employeePdf && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            Both assets ready
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <div className="flex items-center gap-2 text-alpine">
            <FileText className="h-5 w-5 text-alpine/50" />
            <h4 className="font-medium">Official Company AUP</h4>
          </div>
          <p className="mt-2 flex-1 text-sm text-alpine/60">
            The original uploaded policy file preserved for BSI upload.
          </p>
          <p className="mt-2 text-xs text-alpine/50">{uploadedAup.fileName}</p>
          <Button
            className="mt-4 w-full justify-center"
            onClick={() =>
              handleDownload("original", () => downloadOriginalAup(uploadedAup))
            }
            disabled={downloading === "original"}
          >
            <Download className="h-4 w-4" />
            {downloading === "original" ? "Preparing..." : "Download original"}
          </Button>
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-2 text-alpine">
            <Printer className="h-5 w-5 text-alpine/50" />
            <h4 className="font-medium">Employee AUP PDF</h4>
          </div>
          <p className="mt-2 flex-1 text-sm text-alpine/60">
            Branded slide deck built from parsed sections.
          </p>
          <p className="mt-2 text-xs text-alpine/50">&nbsp;</p>
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1 justify-center"
              onClick={() => openEmployeePdfDownloadPreview()}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Link href="/pdf-preview">
              <Button variant="secondary" className="justify-center">
                <ExternalLink className="h-4 w-4" />
                Full preview
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Card className="bg-alpine/5">
        <h4 className="text-sm font-semibold text-alpine">BSI upload checklist</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-alpine/80">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
