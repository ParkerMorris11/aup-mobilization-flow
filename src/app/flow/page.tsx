"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { FlowPreviewPanel } from "@/components/admin/FlowPreviewPanel";
import { Button, Card } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";

export default function FlowPreviewPage() {
  const { flow, processingStatus } = useMobilization();

  if (processingStatus !== "ready" || !flow) {
    return (
      <AppShell
        title="Mobilization flow"
        subtitle="Generated employee-facing outputs from your structured policy rules."
      >
        <Card className="p-12 text-center">
          <p className="text-alpine/70">Generate a flow by uploading a policy first.</p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Upload policy</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Generated mobilization flow"
      subtitle={`Auto-generated from ${flow.organizationName} AUP · ${new Date(flow.generatedAt).toLocaleString()}`}
    >
      <div className="mb-6 flex justify-end">
        <Link href="/pdf-preview">
          <Button>View employee PDF</Button>
        </Link>
      </div>
      <FlowPreviewPanel flow={flow} />
    </AppShell>
  );
}
