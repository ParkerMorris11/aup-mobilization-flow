import { Suspense } from "react";
import { PdfPreviewContent } from "@/components/pdf/PdfPreviewContent";

export default function PdfPreviewPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-alpine/60">Loading PDF preview…</div>}>
      <PdfPreviewContent />
    </Suspense>
  );
}
