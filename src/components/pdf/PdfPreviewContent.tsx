"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmployeeAupDocument } from "@/components/pdf/EmployeeAupDocument";
import { Button, Card } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import { buildEmployeePdfFromState } from "@/lib/services/build-employee-pdf-from-state";
import { PDF_SLIDE_HEIGHT, PDF_SLIDE_WIDTH } from "@/lib/types/employee-pdf-schema";

export function PdfPreviewContent() {
  const { sections, flow, orgBranding, orgNameNeedsReview, processingStatus } =
    useMobilization();
  const containerRef = useRef<HTMLDivElement>(null);
  // The visible preview is CSS-scaled per breakpoint for on-screen sizing —
  // html2canvas needs a fixed, unscaled 1600px-wide node to capture
  // consistently regardless of viewport, so export renders a second,
  // off-screen copy at true size rather than reusing the scaled preview.
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const doc = useMemo(() => {
    if (!sections || !flow) return null;
    return buildEmployeePdfFromState(sections, orgBranding, flow);
  }, [sections, flow, orgBranding]);

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setIsDownloading(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const fileName = `${orgBranding.organizationName.replace(/[^a-z0-9]/gi, "-")}-Employee-AUP.pdf`;

      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: "jpeg", quality: 0.85 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
          windowWidth: PDF_SLIDE_WIDTH,
        },
        // Page size matches the slide canvas exactly (1600x900 px, 16:9) so each
        // slide maps to exactly one page — an A4 page has a different aspect
        // ratio than the 16:9 slides, which was cropping content and throwing
        // off automatic page-break math into producing trailing blank pages.
        jsPDF: {
          unit: "px",
          format: [PDF_SLIDE_WIDTH, PDF_SLIDE_HEIGHT],
          orientation: "landscape",
          compress: true,
        },
        // "avoid-all" forces a page break before every element it treats as
        // unsplittable — since each .pdf-slide already lands exactly on a
        // page boundary (zero gap between slides, height === page height),
        // that avoidance logic just inserts a redundant blank page in front
        // of every slide. Plain height-based slicing needs no avoid mode.
        pagebreak: { mode: [] },
      };

      // html2pdf.js's type defs only declare jsPDF.format as a preset string
      // name (e.g. "a4"), but the library itself also accepts a [width,
      // height] pixel pair at runtime — cast past the overly-narrow typing.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await html2pdf().set(opt as any).from(exportRef.current).save();
    } catch (error) {
      console.error("PDF download error:", error);
      alert(
        "Could not generate PDF. You can still:\n1. Press Ctrl+P (or Cmd+P) to print\n2. Choose 'Save as PDF' in the print dialog"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (processingStatus !== "ready" || !doc) {
    return (
      <AppShell
        title="Employee AUP PDF"
        subtitle="Employee slide deck at 1600×900 per page."
      >
        <Card className="p-12 text-center">
          <p className="text-alpine/70">
            Upload and process a policy first to generate the employee PDF.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Go to upload</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Employee AUP PDF"
      subtitle={`${doc.totalPages} slides · 1600×900 · ${doc.organizationName}`}
    >
      {orgNameNeedsReview && (
        <div className="no-print mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Company name looks guessed, not confirmed.</span>{" "}
          It couldn&apos;t be found in the uploaded document, so it was inferred from the
          file name. Fix it on the{" "}
          <Link href="/admin?tab=branding" className="underline">
            branding tab
          </Link>{" "}
          before sending this PDF to the client.
        </div>
      )}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-alpine/60">
          Seven slides: cover + 6 parsed policy sections.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownload} disabled={isDownloading}>
            <Download className="h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
          <Link href="/admin?tab=downloads">
            <Button variant="secondary">
              <ExternalLink className="h-4 w-4" />
              Back to admin
            </Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-card border border-alpine/10 bg-white p-8">
        <div
          ref={containerRef}
          className="mx-auto origin-top scale-[0.45] sm:scale-[0.55] md:scale-[0.65] lg:scale-[0.75] xl:scale-[0.85]"
        >
          <EmployeeAupDocument doc={doc} />
        </div>
      </div>

      <div
        style={{ position: "fixed", left: -100000, top: 0, width: PDF_SLIDE_WIDTH }}
        aria-hidden
      >
        <div ref={exportRef} className="pdf-export">
          <EmployeeAupDocument doc={doc} />
        </div>
      </div>
    </AppShell>
  );
}
