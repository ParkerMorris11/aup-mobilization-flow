import { EmployeeAupDocument } from "@/components/pdf/EmployeeAupDocument";
import { SAMPLE_AUP_TEXT } from "@/lib/mock/sample-aup";
import { extractParsedSectionsFromText } from "@/lib/services/extract-parsed-sections-from-text";
import { buildEmployeePdfDocument } from "@/lib/services/build-pdf-document";
import { generateMobilizationFlow } from "@/lib/services/generate-flow";
import { DEFAULT_ORG_BRANDING } from "@/lib/types/org-branding";

/**
 * Static print route for headless PDF export (npm run pdf:employee).
 * Renders the sample AUP through the real parsing pipeline — layout preview only.
 */
export default function PdfPrintPage() {
  const sections = extractParsedSectionsFromText(SAMPLE_AUP_TEXT);
  const flow = generateMobilizationFlow(sections);
  const doc = buildEmployeePdfDocument(sections, {
    organizationName: flow.organizationName,
    generatedAt: flow.generatedAt,
    branding: DEFAULT_ORG_BRANDING,
  });

  return (
    <div className="bg-white">
      <EmployeeAupDocument doc={doc} />
    </div>
  );
}
