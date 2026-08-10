"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Loader2, Sparkles } from "lucide-react";
import { WizardShell, type WizardStepMeta } from "@/components/wizard/WizardShell";
import { StepHeading } from "@/components/wizard/StepHeading";
import { AupUploadForm } from "@/components/upload/AupUploadForm";
import { ParsedSectionsPanel } from "@/components/admin/ParsedSectionsPanel";
import { AssessmentReviewPanel } from "@/components/admin/AssessmentReviewPanel";
import { BrandingPanel } from "@/components/admin/BrandingPanel";
import { EmployeePdfPanel } from "@/components/admin/EmployeePdfPanel";
import { FlowBuilderExportPanel } from "@/components/admin/FlowBuilderExportPanel";
import { DownloadsPanel } from "@/components/admin/DownloadsPanel";
import { Card } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";

const STEPS: WizardStepMeta[] = [
  { id: 1, title: "Upload AUP", description: "Upload company policy document" },
  { id: 2, title: "Parse with AI", description: "Extract 6 key sections automatically" },
  { id: 3, title: "Edit sections", description: "Review and refine parsed content" },
  { id: 4, title: "Review assessment", description: "See and edit AI-generated quiz questions" },
  { id: 5, title: "Generate employee AUP", description: "Formatted PDF with left/right layout" },
  { id: 6, title: "Download & export", description: "AUP files + Excel spreadsheet" },
  { id: 7, title: "Flow builder assets", description: "6-asset sequence for the platform" },
];

export default function Home() {
  const {
    processingStatus,
    sections,
    flow,
    uploadedAup,
    errorMessage,
    reset,
    exportState,
    importState,
    unresolvedCitations,
  } = useMobilization();
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const autoAdvanced = useRef(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFile = async (file: File) => {
    setImportError(null);
    try {
      await importState(file);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import session file."
      );
    }
  };

  const isUploading = processingStatus === "uploading";
  const isProcessing =
    processingStatus === "parsing" || processingStatus === "generating";
  const isReady = processingStatus === "ready" && !!sections && !!flow;

  useEffect(() => {
    if (isProcessing && step === 1) {
      goTo(2);
    }
  }, [isProcessing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isReady && step === 2 && !autoAdvanced.current) {
      autoAdvanced.current = true;
      goTo(3);
    }
  }, [isReady, step]);

  function goTo(next: number) {
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  }

  const maxReachable = isReady ? 7 : isProcessing ? 2 : 1;
  const effectiveFurthest = Math.max(furthest, maxReachable);

  const canGoNext =
    step < 7 &&
    (step === 1
      ? isProcessing || isReady
      : step === 2
        ? isReady
        : step === 3
          ? unresolvedCitations.length === 0
          : true);

  return (
    <WizardShell
      steps={STEPS}
      currentStep={step}
      furthestStep={effectiveFurthest}
      onStepSelect={goTo}
      onBack={() => goTo(Math.max(1, step - 1))}
      onNext={() => canGoNext && goTo(Math.min(7, step + 1))}
      backDisabled={step === 1}
      nextDisabled={!canGoNext}
    >
      {step === 1 && (
        <>
          <div className="mb-8 flex items-start justify-between gap-4">
            <StepHeading
              step={1}
              title="Upload your company AUP"
              description="Upload the original company Acceptable Use Policy. This document is preserved as-is and will also be available for employees to download at the end of the flow."
            />
            <div className="mt-1 flex shrink-0 flex-wrap items-center gap-2">
              {isReady && uploadedAup && (
                <>
                  <button
                    type="button"
                    onClick={exportState}
                    title="Download a backup of this session — parsed sections, checklist state, and branding — so you can restore it later even after the tab or storage clears."
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-pill border border-alpine/20 px-4 py-2 text-xs font-medium text-alpine/70 transition-colors hover:border-alpine/40 hover:bg-salt-dark"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export session
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="whitespace-nowrap rounded-pill border border-alpine/20 px-4 py-2 text-xs font-medium text-alpine/70 transition-colors hover:border-alpine/40 hover:bg-salt-dark"
                  >
                    Start a new AUP
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                title="Restore a session from a previously exported backup file."
                className="flex items-center gap-1.5 whitespace-nowrap rounded-pill border border-alpine/20 px-4 py-2 text-xs font-medium text-alpine/70 transition-colors hover:border-alpine/40 hover:bg-salt-dark"
              >
                <Upload className="h-3.5 w-3.5" />
                Import session
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleImportFile(file);
                }}
              />
            </div>
          </div>

          {importError && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <p className="text-sm font-medium text-red-700">{importError}</p>
            </Card>
          )}

          {isUploading && (
            <Card className="mb-6 flex items-center gap-4 py-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-alpine/10">
                <Loader2 className="h-5 w-5 animate-spin text-alpine" />
              </div>
              <div>
                <p className="font-medium text-alpine">
                  Reading and extracting your document…
                </p>
                <p className="mt-0.5 text-sm text-alpine/60">
                  This runs before parsing starts — larger PDFs can take a few
                  seconds.
                </p>
              </div>
            </Card>
          )}

          {processingStatus === "error" && errorMessage && (
            <Card className="mb-6 border-red-200 bg-red-50 py-4">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </Card>
          )}

          <AupUploadForm />
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading
            step={2}
            title="Parsing with AI"
            description="We're extracting the 6 key employee-facing sections from your policy: top rules, permitted use, approved tools, data to protect, accountability, and when to ask for help."
          />
          <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-alpine/10">
              <Loader2 className="h-7 w-7 animate-spin text-alpine" />
            </div>
            <div>
              <p className="font-medium text-alpine">
                {processingStatus === "parsing"
                  ? "Reading your policy…"
                  : "Generating employee sections…"}
              </p>
              <p className="mt-1 text-sm text-alpine/60">
                This usually takes a few seconds.
              </p>
            </div>
          </Card>
        </>
      )}

      {step === 3 && sections && (
        <>
          <StepHeading
            step={3}
            title="Edit parsed sections"
            description="Review and refine the AI-parsed content before it's used to generate the employee PDF and flow builder assets."
          />
          <ParsedSectionsPanel sections={sections} />
        </>
      )}

      {step === 4 && flow && (
        <>
          <StepHeading
            step={4}
            title="Review assessment"
            description="See the AI-generated knowledge-check questions, edit them, or regenerate before they're used in the employee flow and Flow Builder export."
          />
          <AssessmentReviewPanel questions={flow.assessmentQuestions} />
        </>
      )}

      {step === 5 && sections && flow && (
        <>
          <StepHeading
            step={5}
            title="Generate employee AUP"
            description="Set branding and preview the formatted employee PDF with a left/right slide layout."
          />
          <div className="space-y-8">
            <BrandingPanel />
            <EmployeePdfPanel sections={sections} flow={flow} />
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <StepHeading
            step={6}
            title="Download & export"
            description="Download the original AUP, the employee PDF, and the Flow Builder Excel spreadsheet for upload to BSI."
          />
          <DownloadsPanel />
        </>
      )}

      {step === 7 && flow && (
        <>
          <StepHeading
            step={7}
            title="Flow builder assets"
            description="Preview the 6-asset sequence generated for the BSI platform's flow builder."
          />
          <FlowBuilderExportPanel flow={flow} />
        </>
      )}

      {step >= 3 && (!sections || !flow) && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <Sparkles className="h-6 w-6 text-alpine/40" />
          <p className="text-alpine/60">
            Upload and parse a policy first to unlock this step.
          </p>
        </Card>
      )}
    </WizardShell>
  );
}
