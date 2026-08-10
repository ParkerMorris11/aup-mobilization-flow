import type {
  MobilizationFlow,
  PdfAssetOverrides,
  UploadedAup,
} from "@/lib/types/policy-schema";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import type { OrgBranding } from "@/lib/types/org-branding";
import {
  base64ToBlob,
  getOriginalFile,
  triggerBlobDownload,
} from "@/lib/services/file-storage";
import { downloadFlowBuilderExcel } from "@/lib/services/build-flow-builder-excel";
import type { FlowBuilderItem, FlowBuilderQuestion } from "@/lib/types/flow-builder-excel-schema";

export async function downloadOriginalAup(aup: UploadedAup): Promise<void> {
  if (aup.storageKey) {
    const stored = await getOriginalFile(aup.storageKey);
    if (stored) {
      triggerBlobDownload(stored.blob, aup.fileName);
      return;
    }
  }

  if (aup.originalFileBase64 && aup.mimeType) {
    triggerBlobDownload(
      base64ToBlob(aup.originalFileBase64, aup.mimeType),
      aup.fileName
    );
    return;
  }

  const blob = new Blob([aup.rawText], { type: "text/plain;charset=utf-8" });
  const fallbackName = aup.fileName.endsWith(".txt")
    ? aup.fileName
    : aup.fileName.replace(/\.[^.]+$/, "") + ".txt";
  triggerBlobDownload(blob, fallbackName);
}

export async function downloadFlowBuilderSpreadsheet(
  flow: MobilizationFlow,
  pdfAssetOverrides?: PdfAssetOverrides,
  overrides?: { items: FlowBuilderItem[]; questions: FlowBuilderQuestion[] }
) {
  await downloadFlowBuilderExcel(flow, pdfAssetOverrides, overrides);
}

export function buildBsiUploadChecklist() {
  return [
    "Download and upload the Official Company AUP PDF to the BSI platform.",
    "Download the Employee AUP PDF and upload it to the BSI platform.",
    "Download the Flow Builder Excel workbook and upload it to Flow Builder.",
    "Confirm the Existing intro video title matches your platform asset.",
    "Enter the Pack ID in Flow Builder Setup if this flow belongs to a pack.",
  ];
}

export function getAssetReadiness(
  aup: UploadedAup | null,
  sections: ParsedAupSections | null,
  flow: MobilizationFlow | null
) {
  return {
    originalAup: Boolean(aup?.rawText),
    employeePdf: Boolean(sections && flow),
    flowBuilderExcel: Boolean(flow),
    allReady: Boolean(aup?.rawText && sections && flow),
  };
}

export type AssetReadiness = ReturnType<typeof getAssetReadiness>;

export function buildBrandingSummary(branding: OrgBranding) {
  return `${branding.organizationName} · ${branding.policyTitle}`;
}

export function openEmployeePdfDownloadPreview(): void {
  window.open("/pdf-preview", "_blank");
}
