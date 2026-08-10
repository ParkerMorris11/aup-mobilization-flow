"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import {
  buildBsiUploadChecklist,
  downloadFlowBuilderSpreadsheet,
  downloadOriginalAup,
  openEmployeePdfDownloadPreview,
  getAssetReadiness,
} from "@/lib/services/download-assets";
import {
  buildFlowBuilderWorkbook,
  flowBuilderFileName,
  getFlowBuilderFlags,
} from "@/lib/services/build-flow-builder-excel";
import { validateFlowBuilderWorkbook } from "@/lib/services/validate-flow-builder-workbook";

const FLOW_BUILDER_APP_URL = "https://lx-flowbuilder-app.azurewebsites.net/";

export function DownloadsPanel() {
  const { uploadedAup, sections, flow, orgBranding, pdfAssetOverrides, flowBuilderOverrides } =
    useMobilization();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const readiness = getAssetReadiness(uploadedAup, sections, flow);
  const checklist = buildBsiUploadChecklist();

  useEffect(() => {
    if (!flow) return;
    void buildFlowBuilderWorkbook(flow, pdfAssetOverrides, flowBuilderOverrides ?? undefined).then(
      ({ items, questions }) => {
        setFlags(getFlowBuilderFlags(items));
        setValidationErrors(validateFlowBuilderWorkbook(items, questions).errors);
      }
    );
  }, [flow, pdfAssetOverrides, flowBuilderOverrides]);

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

  const excelFileName = flowBuilderFileName(orgBranding.organizationName);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle className="text-xl">Download assets (v2)</SectionTitle>
        <p className="mt-2 text-sm text-alpine/60">
          Download everything you need for the BSI platform: the original company
          AUP, the employee PDF deck, and the Flow Builder Excel workbook.
        </p>
        {readiness.allReady && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            All assets ready
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
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
            className="mt-4"
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
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() => openEmployeePdfDownloadPreview()}
            >
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
        </Card>

        <Card className="flex flex-col">
          <div className="flex items-center gap-2 text-alpine">
            <FileSpreadsheet className="h-5 w-5 text-alpine/50" />
            <h4 className="font-medium">Flow Builder Excel</h4>
          </div>
          <p className="mt-2 flex-1 text-sm text-alpine/60">
            3-sheet workbook for the Flow Builder tool with all 7 mobilization
            assets.
          </p>
          <p className="mt-2 font-mono text-xs text-alpine/50">{excelFileName}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              onClick={() =>
                handleDownload("excel", () =>
                  downloadFlowBuilderSpreadsheet(
                    flow,
                    pdfAssetOverrides,
                    flowBuilderOverrides ?? undefined
                  )
                )
              }
              disabled={downloading === "excel" || validationErrors.length > 0}
            >
              <Download className="h-4 w-4" />
              {downloading === "excel" ? "Generating..." : "Download Excel"}
            </Button>
            <a
              href={FLOW_BUILDER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" disabled={validationErrors.length > 0}>
                <ExternalLink className="h-4 w-4" />
                Open Flow Builder to upload
              </Button>
            </a>
          </div>
          {validationErrors.length > 0 && (
            <p className="mt-2 text-xs text-red-600">
              Fix the issues below in the Flow Builder export tab before downloading.
            </p>
          )}
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

      {validationErrors.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <h4 className="text-sm font-semibold text-alpine">
            Fix before downloading the Excel workbook
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-alpine/80">
            {validationErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      {flags.length > 0 && (
        <Card className="bg-amber-50/60">
          <h4 className="text-sm font-semibold text-alpine">Review before upload</h4>
          <ul className="mt-3 space-y-2 text-sm text-alpine/80">
            {flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
