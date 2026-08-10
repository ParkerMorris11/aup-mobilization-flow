"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";

const FLOW_BUILDER_APP_URL = "https://lx-flowbuilder-app.azurewebsites.net/";
import {
  buildFlowBuilderWorkbook,
  flowBuilderFileName,
  getFlowBuilderFlags,
} from "@/lib/services/build-flow-builder-excel";
import { validateFlowBuilderWorkbook } from "@/lib/services/validate-flow-builder-workbook";
import {
  generateFlowBuilderItemRow,
  generateFlowBuilderQuestionRow,
} from "@/lib/services/generate-flow-builder-row";
import type { FlowBuilderItem, FlowBuilderQuestion } from "@/lib/types/flow-builder-excel-schema";
import type { MobilizationFlow, PdfAssetKey } from "@/lib/types/policy-schema";

const PDF_ASSET_FIELDS: { key: PdfAssetKey; label: string }[] = [
  { key: "policyAtAGlance", label: "AI Policy at a Glance (PDF)" },
  { key: "officialAup", label: "Official AUP (PDF)" },
];

function blankItem(): FlowBuilderItem {
  return { title: "", type: "Survey", source: "New", description: "", labels: "" };
}

function blankQuestion(assetTitle: string, questionNumber: number): FlowBuilderQuestion {
  return {
    assetTitle,
    questionNumber,
    questionText: "",
    type: "single-select",
    options: ["", ""],
    required: "No",
    branching: "No",
  };
}

function renumberGroup(questions: FlowBuilderQuestion[], assetTitle: string): FlowBuilderQuestion[] {
  let n = 0;
  return questions.map((q) =>
    q.assetTitle === assetTitle ? { ...q, questionNumber: ++n } : q
  );
}

export function FlowBuilderExportPanel({ flow }: { flow: MobilizationFlow }) {
  const {
    pdfAssetOverrides,
    updatePdfAssetOverride,
    flowBuilderOverrides,
    updateFlowBuilderOverrides,
    resetFlowBuilderOverrides,
    sections,
  } = useMobilization();
  const [generated, setGenerated] = useState<{
    items: FlowBuilderItem[];
    questions: FlowBuilderQuestion[];
  } | null>(null);
  const [draftItems, setDraftItems] = useState<FlowBuilderItem[]>([]);
  const [draftQuestions, setDraftQuestions] = useState<FlowBuilderQuestion[]>([]);
  const [generatingItem, setGeneratingItem] = useState(false);
  const [generatingGroup, setGeneratingGroup] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void buildFlowBuilderWorkbook(flow, pdfAssetOverrides).then(({ items, questions }) => {
      if (active) {
        setGenerated({ items, questions });
      }
    });
    return () => {
      active = false;
    };
  }, [flow, pdfAssetOverrides]);

  const seededRef = useRef(false);
  const prevOverridesRef = useRef(flowBuilderOverrides);
  const prevFlowRef = useRef(flow);

  useEffect(() => {
    if (!generated) return;

    const overridesChanged = prevOverridesRef.current !== flowBuilderOverrides;
    const flowChanged = prevFlowRef.current !== flow;
    prevOverridesRef.current = flowBuilderOverrides;
    prevFlowRef.current = flow;

    if (flowBuilderOverrides) {
      setDraftItems(flowBuilderOverrides.items);
      setDraftQuestions(flowBuilderOverrides.questions);
      seededRef.current = true;
      return;
    }

    // Only re-seed drafts from freshly generated content on first load, an
    // explicit reset (overrides -> null), or a new flow. A passive
    // regeneration triggered by an unrelated pdfAssetOverrides edit must not
    // clobber in-progress, unsaved draft edits.
    if (!seededRef.current || overridesChanged || flowChanged) {
      setDraftItems(generated.items);
      setDraftQuestions(generated.questions);
      seededRef.current = true;
    }
  }, [generated, flowBuilderOverrides, flow]);

  const flags = generated ? getFlowBuilderFlags(draftItems) : [];
  const validation = generated
    ? validateFlowBuilderWorkbook(draftItems, draftQuestions)
    : { errors: [], warnings: [] };
  const fileName = flowBuilderFileName(flow.organizationName);
  const hasOverrides = flowBuilderOverrides !== null;

  const updateItem = (index: number, patch: Partial<FlowBuilderItem>) => {
    setDraftItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const removeItem = (index: number) => {
    setDraftItems((current) => current.filter((_, i) => i !== index));
  };

  const addBlankItem = () => {
    setDraftItems((current) => [...current, blankItem()]);
  };

  const addItemWithAi = async () => {
    setGeneratingItem(true);
    try {
      const item = await generateFlowBuilderItemRow(
        flow.organizationName,
        flow.plainLanguageSummary,
        draftItems.map((i) => i.title)
      );
      setDraftItems((current) => [...current, item]);
    } finally {
      setGeneratingItem(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<FlowBuilderQuestion>) => {
    setDraftQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question))
    );
  };

  const removeQuestion = (index: number) => {
    setDraftQuestions((current) => {
      const removed = current[index];
      const next = current.filter((_, i) => i !== index);
      return removed ? renumberGroup(next, removed.assetTitle) : next;
    });
  };

  const addBlankQuestion = (assetTitle: string) => {
    setDraftQuestions((current) => {
      const countInGroup = current.filter((q) => q.assetTitle === assetTitle).length;
      const lastIndex = current.map((q) => q.assetTitle).lastIndexOf(assetTitle);
      const insertAt = lastIndex === -1 ? current.length : lastIndex + 1;
      const next = [...current];
      next.splice(insertAt, 0, blankQuestion(assetTitle, countInGroup + 1));
      return next;
    });
  };

  const addQuestionWithAi = async (assetTitle: string) => {
    setGeneratingGroup(assetTitle);
    try {
      const existing = draftQuestions
        .filter((q) => q.assetTitle === assetTitle)
        .map((q) => q.questionText);
      const question = await generateFlowBuilderQuestionRow(
        flow.organizationName,
        assetTitle,
        existing.length + 1,
        existing,
        sections
      );
      setDraftQuestions((current) => {
        const lastIndex = current.map((q) => q.assetTitle).lastIndexOf(assetTitle);
        const insertAt = lastIndex === -1 ? current.length : lastIndex + 1;
        const next = [...current];
        next.splice(insertAt, 0, question);
        return next;
      });
    } finally {
      setGeneratingGroup(null);
    }
  };

  const saveChanges = () => {
    updateFlowBuilderOverrides(draftItems, draftQuestions);
  };

  const questionGroups = draftQuestions.reduce<{ assetTitle: string; rows: { question: FlowBuilderQuestion; index: number }[] }[]>(
    (groups, question, index) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.assetTitle === question.assetTitle) {
        lastGroup.rows.push({ question, index });
      } else {
        groups.push({ assetTitle: question.assetTitle, rows: [{ question, index }] });
      }
      return groups;
    },
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <h4 className="text-sm font-semibold text-alpine">PDF assets</h4>
        <p className="mt-2 text-xs text-alpine/50">
          Hand-upload both PDFs to Flow Builder first, then enter their platform Asset IDs below. This ensures the excel sheet references the correct assets.
        </p>
        <div className="mt-4 space-y-4">
          {PDF_ASSET_FIELDS.map(({ key, label }) => (
            <div key={key} className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-alpine/60">
                {label} — Title
                <input
                  type="text"
                  value={pdfAssetOverrides[key].title ?? ""}
                  onChange={(e) =>
                    updatePdfAssetOverride(key, { title: e.target.value })
                  }
                  placeholder="Platform asset title (optional)"
                  className="mt-1 w-full rounded-card border border-alpine/15 bg-white px-3 py-2 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                />
              </label>
              <label className="text-xs text-alpine/60">
                {label} — Asset ID
                <input
                  type="text"
                  value={pdfAssetOverrides[key].assetId ?? ""}
                  onChange={(e) =>
                    updatePdfAssetOverride(key, { assetId: e.target.value })
                  }
                  placeholder="Leave blank to upload as new"
                  className="mt-1 w-full rounded-card border border-alpine/15 bg-white px-3 py-2 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                />
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-xl">Flow Builder export</SectionTitle>
            <p className="mt-2 text-sm text-alpine/60">
              Preview and edit exactly what will land in the Items and Questions
              sheets before downloading. Edits here don&apos;t touch the parsed
              policy or assessment content elsewhere in the flow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={FLOW_BUILDER_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" />
                Open Flow Builder
              </Button>
            </a>
            <Link href="/admin?tab=downloads">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" />
                Go to downloads
              </Button>
            </Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-alpine/50">
          File: <span className="font-mono">{fileName}</span>
        </p>
      </Card>

      {generated && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h4 className="text-sm font-semibold text-alpine">Items preview</h4>
            <div className="flex flex-wrap gap-2">
              {hasOverrides && (
                <Button variant="secondary" onClick={resetFlowBuilderOverrides}>
                  Reset to generated
                </Button>
              )}
              <Button onClick={saveChanges}>Save changes</Button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-alpine/10 text-xs uppercase tracking-wide text-alpine/50">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Section header</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Labels</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((item, index) => (
                  <tr key={index} className="border-b border-alpine/5 align-top">
                    <td className="px-3 py-3 text-alpine/70">{index + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(index, { title: e.target.value })}
                        className="w-full min-w-[160px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.type}
                        onChange={(e) =>
                          updateItem(index, { type: e.target.value as FlowBuilderItem["type"] })
                        }
                        className="rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      >
                        {(["Video", "Pdf", "Survey", "Assessment", "Scorm", "Link", "Email"] as const).map(
                          (t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          )
                        )}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.source}
                        onChange={(e) =>
                          updateItem(index, { source: e.target.value as FlowBuilderItem["source"] })
                        }
                        className="rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      >
                        {(["Existing", "New"] as const).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.sectionHeader ?? ""}
                        onChange={(e) =>
                          updateItem(index, { sectionHeader: e.target.value || undefined })
                        }
                        className="w-full min-w-[120px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <textarea
                        value={item.description ?? ""}
                        onChange={(e) =>
                          updateItem(index, { description: e.target.value || undefined })
                        }
                        rows={2}
                        className="w-full min-w-[220px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.labels ?? ""}
                        onChange={(e) =>
                          updateItem(index, { labels: e.target.value || undefined })
                        }
                        className="w-full min-w-[120px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        title="Remove row"
                        className="shrink-0 rounded-full p-1.5 text-alpine/40 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={addBlankItem}>
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
            <Button variant="secondary" onClick={() => void addItemWithAi()} disabled={generatingItem}>
              {generatingItem ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Add with AI
            </Button>
          </div>
        </Card>
      )}

      {generated && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h4 className="text-sm font-semibold text-alpine">Questions preview</h4>
            <div className="flex flex-wrap gap-2">
              {hasOverrides && (
                <Button variant="secondary" onClick={resetFlowBuilderOverrides}>
                  Reset to generated
                </Button>
              )}
              <Button onClick={saveChanges}>Save changes</Button>
            </div>
          </div>
          <div className="mt-4 space-y-6">
            {questionGroups.map((group) => (
              <div key={group.assetTitle}>
                <p className="text-xs font-medium uppercase tracking-wide text-alpine/50">
                  {group.assetTitle}
                </p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-alpine/10 text-xs uppercase tracking-wide text-alpine/50">
                      <tr>
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Question text</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Options</th>
                        <th className="px-3 py-2 font-medium">Correct</th>
                        <th className="px-3 py-2 font-medium">Required</th>
                        <th className="px-3 py-2 font-medium">Branching</th>
                        <th className="px-3 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map(({ question, index }) => (
                        <tr key={index} className="border-b border-alpine/5 align-top">
                          <td className="px-3 py-3 text-alpine/70">
                            {question.questionNumber}
                          </td>
                          <td className="px-3 py-2">
                            <textarea
                              value={question.questionText}
                              onChange={(e) =>
                                updateQuestion(index, { questionText: e.target.value })
                              }
                              rows={2}
                              className="w-full min-w-[220px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                            />
                          </td>
                          <td className="px-3 py-3 text-alpine/70">{question.type}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={question.options.join(", ")}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  options: e.target.value
                                    .split(",")
                                    .map((opt) => opt.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder="Comma-separated options"
                              className="w-full min-w-[200px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={question.correct ?? ""}
                              onChange={(e) =>
                                updateQuestion(index, { correct: e.target.value || undefined })
                              }
                              className="w-full min-w-[80px] rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={question.required ?? "No"}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  required: e.target.value as "Yes" | "No",
                                })
                              }
                              className="rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={question.branching ?? "No"}
                              onChange={(e) =>
                                updateQuestion(index, {
                                  branching: e.target.value as "Yes" | "No",
                                })
                              }
                              className="rounded-lg border border-alpine/15 bg-white px-2 py-1.5 text-sm text-alpine focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                            >
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              title="Remove question"
                              className="shrink-0 rounded-full p-1.5 text-alpine/40 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => addBlankQuestion(group.assetTitle)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add question
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void addQuestionWithAi(group.assetTitle)}
                    disabled={generatingGroup === group.assetTitle}
                  >
                    {generatingGroup === group.assetTitle ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Add with AI
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {validation.errors.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-semibold text-alpine">
              Fix before downloading
            </h4>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-alpine/80">
            {validation.errors.map((error, index) => (
              <li key={index} className="flex gap-2">
                <span className="shrink-0">🛑</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-red-700">
            Flow Builder will reject the file with these left unresolved —
            the download button on the Downloads tab is disabled until they&apos;re fixed.
          </p>
        </Card>
      )}

      {validation.warnings.length > 0 && (
        <Card className="bg-amber-50/60">
          <h4 className="text-sm font-semibold text-alpine">Worth double-checking</h4>
          <ul className="mt-3 space-y-2 text-sm text-alpine/80">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {flags.length > 0 && (
        <Card className="bg-amber-50/60">
          <h4 className="text-sm font-semibold text-alpine">Review before upload</h4>
          <ul className="mt-3 space-y-2 text-sm text-alpine/80">
            {flags.map((flag) => (
              <li key={flag} className="flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="bg-alpine/5">
        <h4 className="text-sm font-semibold text-alpine">Upload instructions</h4>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-alpine/80">
          <li>Download the workbook and verify Flow, Items, and Questions sheets.</li>
          <li>Upload the file to BrainStorm Flow Builder.</li>
          <li>
            Confirm Existing video/PDF titles match platform assets, or switch
            those rows to New and upload assets first.
          </li>
          <li>Enter Pack ID in the app Setup screen if your flow belongs to a pack.</li>
        </ol>
      </Card>
    </div>
  );
}
