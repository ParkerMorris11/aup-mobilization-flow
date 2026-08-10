"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";
import { useMemo } from "react";
import { extractStructureOutline } from "@/lib/services/extract-structure-outline";

export function SourceDocumentPanel() {
  const {
    uploadedAup,
    processingStatus,
    errorMessage,
    parseMeta,
  } = useMobilization();
  const isProcessing =
    processingStatus === "parsing" || processingStatus === "generating";

  const outline = useMemo(() => {
    if (!uploadedAup?.rawText) return [];
    return extractStructureOutline(uploadedAup.rawText);
  }, [uploadedAup?.rawText]);

  if (!uploadedAup && processingStatus === "idle") {
    return (
      <Card className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-alpine/50">
          Source document preview
        </p>
        <p className="mt-2 max-w-xs text-xs text-alpine/40">
          Upload or load the sample policy to see the source document and
          processing status.
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-alpine/50">
            Source document
          </p>
          <h3 className="mt-1 font-display text-lg font-medium text-alpine">
            {uploadedAup?.fileName}
          </h3>
          {uploadedAup && (
            <p className="mt-1 text-xs text-alpine/50">
              {uploadedAup.sourceType} ·{" "}
              {new Date(uploadedAup.uploadedAt).toLocaleString()}
            </p>
          )}
          {parseMeta && processingStatus === "ready" && (
            <p
              className="mt-2 text-xs text-alpine/50"
              title={
                parseMeta.confidenceBreakdown
                  ? `Section coverage: ${Math.round(parseMeta.confidenceBreakdown.sectionCoverage * 100)}% · Text grounding: ${Math.round(parseMeta.confidenceBreakdown.textGrounding * 100)}% · Document structure: ${Math.round(parseMeta.confidenceBreakdown.structureSignal * 100)}%`
                  : undefined
              }
            >
              Parsed via {parseMeta.method === "llm" ? "AI" : "heuristic"} ·{" "}
              {Math.round(parseMeta.confidence * 100)}% confidence
            </p>
          )}
        </div>
        {processingStatus === "ready" && (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Ready
          </Badge>
        )}
        {isProcessing && (
          <Badge variant="info">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            {processingStatus === "parsing" ? "Parsing…" : "Generating…"}
          </Badge>
        )}
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {processingStatus === "ready" && outline.length > 0 && (
        <div className="mt-4 rounded-lg border border-alpine/10 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-alpine/50">
            Detected structure (headings)
          </p>
          <ul className="mt-3 space-y-2">
            {outline.map((h) => (
              <li
                key={h}
                className="truncate text-sm text-alpine/80"
                title={h}
              >
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-alpine/10 bg-salt">
        <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed text-alpine/80 whitespace-pre-wrap">
          {uploadedAup?.rawText}
        </pre>
      </div>

      {processingStatus === "ready" && uploadedAup && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-alpine/10 pt-6">
          <Link href="/admin?tab=downloads">
            <Button>
              Go to downloads
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="secondary">Admin review</Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
