"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import {
  SAMPLE_AUP_FILENAME,
  SAMPLE_AUP_TEXT,
} from "@/lib/mock/sample-aup";
import { SourceDocumentPanel } from "./SourceDocumentPanel";

export function AupUploadForm() {
  const { uploadPastedText, uploadFile, loadSampleAup, processingStatus } =
    useMobilization();
  const [pasteText, setPasteText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const isProcessing =
    processingStatus === "uploading" ||
    processingStatus === "parsing" ||
    processingStatus === "generating";

  const orgName = companyName.trim() || undefined;

  const handleSubmit = async () => {
    if (!pasteText.trim()) return;
    await uploadPastedText(pasteText, orgName);
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "doc") {
      alert(
        "Legacy .doc files aren't supported — please save as .docx or PDF and re-upload."
      );
      return;
    }
    await uploadFile(file, orgName);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <h3 className="font-display text-lg font-medium text-alpine">
            Upload or paste your AUP
          </h3>
          <p className="mt-1 text-sm text-alpine/60">
            PDF, DOCX, or plain text is supported. The original file is
            preserved for download at the end.
          </p>

          <label className="mt-4 block text-sm">
            <span className="font-medium text-alpine">Company name</span>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Contoso Inc."
              className="mt-1 w-full rounded-card border border-alpine/15 bg-white px-4 py-2.5 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
            />
          </label>

          <div
            className={`mt-4 flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 transition-colors ${
              isProcessing
                ? "cursor-not-allowed border-alpine/10 bg-salt opacity-60"
                : dragOver
                  ? "border-alpine bg-alpine/5"
                  : "border-alpine/20 bg-salt"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (isProcessing) return;
              const file = e.dataTransfer.files[0];
              if (file) void handleFile(file);
            }}
          >
            <Upload className="h-8 w-8 text-alpine/40" />
            <p className="mt-3 text-sm font-medium text-alpine">
              Drag & drop a file here
            </p>
            <p className="text-xs text-alpine/50">PDF or TXT</p>
            <label className="mt-4">
              <input
                type="file"
                accept=".txt,.pdf,.docx"
                className="hidden"
                disabled={isProcessing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <span
                className={`text-sm font-medium underline underline-offset-2 ${
                  isProcessing
                    ? "cursor-not-allowed text-alpine/40"
                    : "cursor-pointer text-alpine"
                }`}
              >
                Browse files
              </span>
            </label>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-alpine">
              Or paste policy text
            </label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              placeholder="Paste your AI Acceptable Use Policy here..."
              className="mt-2 w-full resize-y rounded-card border border-alpine/15 bg-white px-4 py-3 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => void handleSubmit()}
              disabled={!pasteText.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                "Parse & generate flow"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                loadSampleAup(SAMPLE_AUP_TEXT, SAMPLE_AUP_FILENAME, orgName)
              }
              disabled={isProcessing}
            >
              <FileText className="h-4 w-4" />
              Load sample AUP
            </Button>
          </div>
        </Card>
      </div>

      <SourceDocumentPanel />
    </div>
  );
}
