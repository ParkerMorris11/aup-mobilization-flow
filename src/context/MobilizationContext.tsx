"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  AssessmentQuestion,
  MobilizationFlow,
  MobilizationState,
  PdfAssetKey,
  PdfAssetOverride,
  StructuredPolicyRule,
  UploadedAup,
} from "@/lib/types/policy-schema";
import { DEFAULT_ORG_BRANDING, EMPTY_PDF_ASSET_OVERRIDES } from "@/lib/types/policy-schema";
import type { OrgBranding } from "@/lib/types/org-branding";
import { inferOrgNameFromFileName, extractPolicyTitleFromText, extractCompanyNameFromText } from "@/lib/types/org-branding";
import type { ParsedAupSections } from "@/lib/types/parsed-sections";
import {
  citationFlagKey,
  flattenCitations,
  type SectionCitation,
} from "@/lib/types/section-citations";
import {
  buildClarifyingChecklist,
  type ClarifyingChecklistItem,
} from "@/lib/types/clarifying-checklist";
import { loadChecklistState, saveChecklistState } from "@/lib/services/checklist-storage";
import { parseAup } from "@/lib/services/parse-aup";
import { isDocumentTooShortToParse } from "@/lib/services/extract-parsed-sections-from-text";
import { generateMobilizationFlow } from "@/lib/services/generate-flow";
import { generateAssessmentQuestions } from "@/lib/services/generate-assessment-questions";
import type { FlowBuilderItem, FlowBuilderQuestion } from "@/lib/types/flow-builder-excel-schema";
import { extractPdfText } from "@/lib/services/extract-pdf-text";
import { extractDocxText } from "@/lib/services/extract-docx-text";
import {
  fileToBase64,
  originalFileStorageKey,
  storeOriginalFile,
} from "@/lib/services/file-storage";

const STORAGE_KEY = "aup-mobilization-state-v4";
const INLINE_FILE_LIMIT_BYTES = 1_500_000;
const MAX_UPLOAD_FILE_BYTES = 25_000_000;

export interface UnresolvedCitation {
  sectionKey: keyof ParsedAupSections;
  index: number;
  citation: SectionCitation;
  flagKey: string;
}

interface MobilizationContextValue extends MobilizationState {
  loadSampleAup: (text: string, fileName: string, organizationName?: string) => void;
  uploadPastedText: (text: string, organizationName?: string) => Promise<void>;
  uploadFile: (file: File, organizationName?: string) => Promise<void>;
  updateParsedSections: (sections: ParsedAupSections) => void;
  updateOrgBranding: (branding: OrgBranding) => void;
  reparseAup: () => Promise<void>;
  resetParsedSections: () => void;
  reset: () => void;
  exportState: () => void;
  importState: (file: File) => Promise<void>;
  markCitationReviewed: (flagKey: string) => void;
  unresolvedCitations: UnresolvedCitation[];
  regenerateAssessment: () => Promise<void>;
  updateAssessmentQuestions: (questions: AssessmentQuestion[]) => void;
  updateFlowBuilderOverrides: (items: FlowBuilderItem[], questions: FlowBuilderQuestion[]) => void;
  resetFlowBuilderOverrides: () => void;
  /** True when the uploaded document has too little usable text to parse reliably */
  documentTooShort: boolean;
  updatePdfAssetOverride: (key: PdfAssetKey, patch: PdfAssetOverride) => void;
  addCustomClarifyingQuestion: (sectionKey: keyof ParsedAupSections, question: string) => void;
  toggleClarifyingIncluded: (flagKey: string) => void;
  setClarifyingAnswerNote: (flagKey: string, note: string) => void;
  clarifyingChecklist: ClarifyingChecklistItem[];
  rules: StructuredPolicyRule[];
  sections: ParsedAupSections | null;
  flow: MobilizationFlow | null;
}

const initialState: MobilizationState = {
  uploadedAup: null,
  structuredRules: [],
  parsedSections: null,
  originalParsedSections: null,
  mobilizationFlow: null,
  orgBranding: DEFAULT_ORG_BRANDING,
  orgNameNeedsReview: false,
  parseMeta: null,
  sectionCitations: null,
  originalSectionLabels: {},
  reviewedCitationFlags: {},
  clarifyingPrompts: {},
  customClarifyingQuestions: {},
  dismissedClarifyingFlags: {},
  clarifyingAnswerNotes: {},
  pdfAssetOverrides: EMPTY_PDF_ASSET_OVERRIDES,
  processingStatus: "idle",
  errorMessage: null,
  assessmentStatus: "idle",
  assessmentError: null,
  flowBuilderOverrides: null,
};

const MobilizationContext = createContext<MobilizationContextValue | null>(null);

function resolveOrgBranding(
  fileName: string,
  rawText: string,
  organizationName?: string,
  current?: OrgBranding
): { branding: OrgBranding; needsReview: boolean } {
  const explicit = organizationName?.trim();
  const fromText = extractCompanyNameFromText(rawText);
  const fromFileName = inferOrgNameFromFileName(fileName);

  const inferred =
    explicit ||
    fromText ||
    fromFileName ||
    current?.organizationName ||
    DEFAULT_ORG_BRANDING.organizationName;

  // Filename-derived names are a guess, not a fact from the document — flag
  // for staff review before the name goes out on a client-facing PDF.
  const needsReview = !explicit && !fromText && !!fromFileName;

  const policyTitle =
    extractPolicyTitleFromText(rawText) ||
    current?.policyTitle ||
    DEFAULT_ORG_BRANDING.policyTitle;

  return {
    branding: {
      ...(current ?? DEFAULT_ORG_BRANDING),
      organizationName: inferred,
      policyTitle,
    },
    needsReview,
  };
}

async function attachOriginalFile(
  aup: UploadedAup,
  file?: File
): Promise<UploadedAup> {
  if (!file) {
    return {
      ...aup,
      mimeType: "text/plain",
    };
  }

  const mimeType = file.type || "application/octet-stream";

  if (file.size <= INLINE_FILE_LIMIT_BYTES) {
    return {
      ...aup,
      mimeType,
      originalFileBase64: await fileToBase64(file),
    };
  }

  const storageKey = originalFileStorageKey(aup.fileName, aup.uploadedAt);
  await storeOriginalFile(storageKey, file, mimeType);

  return {
    ...aup,
    mimeType,
    storageKey,
  };
}

export function MobilizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MobilizationState>(initialState);

  // sessionStorage (not localStorage): survives a refresh mid-session, but
  // clears when the tab/browser closes — so the app always opens on a clean
  // upload screen instead of resurrecting whatever org/policy was last
  // tested, potentially days or weeks ago.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MobilizationState;
        setState({
          ...initialState,
          ...parsed,
          orgBranding: parsed.orgBranding ?? DEFAULT_ORG_BRANDING,
        });
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (state.processingStatus === "idle" && !state.uploadedAup) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Clarifying-checklist overrides persist in localStorage keyed by org name,
  // independent of the session state above — so revisiting the same client's
  // AUP after the session storage has cleared still restores dismissed/answered
  // questions and any custom ones LX staff added.
  useEffect(() => {
    if (
      !state.orgBranding.organizationName ||
      state.orgBranding.organizationName === DEFAULT_ORG_BRANDING.organizationName ||
      !state.uploadedAup
    )
      return;
    saveChecklistState(state.orgBranding.organizationName, {
      customClarifyingQuestions: state.customClarifyingQuestions,
      dismissedClarifyingFlags: state.dismissedClarifyingFlags,
      clarifyingAnswerNotes: state.clarifyingAnswerNotes,
    });
  }, [
    state.orgBranding.organizationName,
    state.customClarifyingQuestions,
    state.dismissedClarifyingFlags,
    state.clarifyingAnswerNotes,
    state.uploadedAup,
  ]);

  const finalizeFlow = useCallback(
    (
      sections: ParsedAupSections,
      orgBranding: OrgBranding
    ): MobilizationFlow => {
      return generateMobilizationFlow(sections, orgBranding.organizationName);
    },
    []
  );

  const regenerateAssessment = useCallback(
    async (sectionsOverride?: ParsedAupSections) => {
      const sections = sectionsOverride ?? state.parsedSections;
      if (!sections) return;

      setState((s) => ({ ...s, assessmentStatus: "generating", assessmentError: null }));

      try {
        const questions = await generateAssessmentQuestions(
          sections,
          state.orgBranding.organizationName
        );
        setState((s) => ({
          ...s,
          mobilizationFlow: s.mobilizationFlow
            ? { ...s.mobilizationFlow, assessmentQuestions: questions }
            : s.mobilizationFlow,
          assessmentStatus: "ready",
          flowBuilderOverrides: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          assessmentStatus: "error",
          assessmentError:
            err instanceof Error ? err.message : "Failed to generate assessment questions.",
        }));
      }
    },
    [state.parsedSections, state.orgBranding]
  );

  const updateAssessmentQuestions = useCallback((questions: AssessmentQuestion[]) => {
    setState((s) => ({
      ...s,
      mobilizationFlow: s.mobilizationFlow
        ? { ...s.mobilizationFlow, assessmentQuestions: questions }
        : s.mobilizationFlow,
      assessmentStatus: "ready",
      flowBuilderOverrides: null,
    }));
  }, []);

  const updateFlowBuilderOverrides = useCallback(
    (items: FlowBuilderItem[], questions: FlowBuilderQuestion[]) => {
      setState((s) => ({ ...s, flowBuilderOverrides: { items, questions } }));
    },
    []
  );

  const resetFlowBuilderOverrides = useCallback(() => {
    setState((s) => ({ ...s, flowBuilderOverrides: null }));
  }, []);

  const processAup = useCallback(
    async (aup: UploadedAup, organizationName?: string) => {
      const { branding: orgBranding, needsReview: orgNameNeedsReview } =
        resolveOrgBranding(aup.fileName, aup.rawText, organizationName, state.orgBranding);

      setState((s) => ({
        ...s,
        uploadedAup: aup,
        orgBranding,
        orgNameNeedsReview,
        processingStatus: "parsing",
        errorMessage: null,
      }));

      try {
        const {
          rules,
          sections,
          parseMethod,
          confidence,
          confidenceBreakdown,
          citations,
          sparseRuleCounts,
          clarifyingPrompts,
          originalSectionLabels,
          fallbackReason,
          truncationWarning,
        } = await parseAup(aup.rawText, orgBranding.organizationName);

        const storedChecklist = loadChecklistState(orgBranding.organizationName);

        setState((s) => ({
          ...s,
          structuredRules: rules,
          parsedSections: sections,
          originalParsedSections: sections,
          parseMeta: { method: parseMethod, confidence, confidenceBreakdown, sparseRuleCounts, fallbackReason, truncationWarning },
          sectionCitations: citations,
          originalSectionLabels,
          reviewedCitationFlags: {},
          clarifyingPrompts,
          customClarifyingQuestions: storedChecklist?.customClarifyingQuestions ?? {},
          dismissedClarifyingFlags: storedChecklist?.dismissedClarifyingFlags ?? {},
          clarifyingAnswerNotes: storedChecklist?.clarifyingAnswerNotes ?? {},
          processingStatus: "generating",
        }));

        await new Promise((r) => setTimeout(r, 400));

        const flow = finalizeFlow(sections, orgBranding);

        setState((s) => ({
          ...s,
          mobilizationFlow: flow,
          processingStatus: "ready",
        }));

        void regenerateAssessment(sections);
      } catch (err) {
        setState((s) => ({
          ...s,
          processingStatus: "error",
          errorMessage:
            err instanceof Error ? err.message : "Failed to process policy.",
        }));
      }
    },
    [finalizeFlow, state.orgBranding, regenerateAssessment]
  );

  const loadSampleAup = useCallback(
    (text: string, fileName: string, organizationName?: string) => {
      const aup: UploadedAup = {
        fileName,
        sourceType: "sample",
        rawText: text,
        uploadedAt: new Date().toISOString(),
        mimeType: "text/plain",
      };
      void processAup(aup, organizationName);
    },
    [processAup]
  );

  const uploadPastedText = useCallback(
    async (text: string, organizationName?: string) => {
      const aup: UploadedAup = {
        fileName: "pasted-policy.txt",
        sourceType: "paste",
        rawText: text,
        uploadedAt: new Date().toISOString(),
        mimeType: "text/plain",
      };
      await processAup(aup, organizationName);
    },
    [processAup]
  );

  const uploadFile = useCallback(
    async (file: File, organizationName?: string) => {
      setState((s) => ({
        ...s,
        processingStatus: "uploading",
        errorMessage: null,
      }));

      try {
        if (file.size > MAX_UPLOAD_FILE_BYTES) {
          throw new Error(
            `File is too large (${(file.size / 1_000_000).toFixed(1)} MB). Please upload a file under ${MAX_UPLOAD_FILE_BYTES / 1_000_000} MB.`
          );
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        let text = "";

        if (ext === "pdf" || file.type === "application/pdf") {
          text = await extractPdfText(file);
        } else if (
          ext === "docx" ||
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          text = await extractDocxText(file);
        } else if (ext === "doc") {
          throw new Error(
            "Legacy .doc files aren't supported — please save as .docx or PDF and re-upload."
          );
        } else {
          text = await file.text();
        }

        if (!text.trim()) {
          throw new Error("Could not extract readable text from uploaded file.");
        }

        const baseAup: UploadedAup = {
          fileName: file.name,
          sourceType: "file",
          rawText: text,
          uploadedAt: new Date().toISOString(),
        };

        const aup = await attachOriginalFile(baseAup, file);
        await processAup(aup, organizationName);
      } catch (err) {
        setState((s) => ({
          ...s,
          processingStatus: "error",
          errorMessage:
            err instanceof Error ? err.message : "Failed to read uploaded file.",
        }));
      }
    },
    [processAup]
  );

  const reset = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setState(initialState);
  }, []);

  // Manual backup/restore for sessionStorage state — a safety net so a cleared
  // tab/browser doesn't lose an in-progress pilot; staff can download a snapshot
  // and re-load it later, independent of the browser's own storage lifetime.
  const exportState = useCallback(() => {
    const orgSlug = (state.orgBranding.organizationName || "aup")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aup-mobilization-${orgSlug || "session"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importState = useCallback(async (file: File) => {
    const text = await file.text();
    let parsed: Partial<MobilizationState>;
    try {
      parsed = JSON.parse(text) as Partial<MobilizationState>;
    } catch {
      throw new Error("That file isn't valid JSON — is it an exported AUP session?");
    }
    if (!parsed || typeof parsed !== "object" || !("uploadedAup" in parsed)) {
      throw new Error("That file doesn't look like an exported AUP session.");
    }
    setState({
      ...initialState,
      ...parsed,
      orgBranding: parsed.orgBranding ?? DEFAULT_ORG_BRANDING,
    });
  }, []);

  const updateParsedSections = useCallback(
    (sections: ParsedAupSections) => {
      setState((s) => ({
        ...s,
        parsedSections: sections,
        mobilizationFlow: finalizeFlow(sections, s.orgBranding),
        flowBuilderOverrides: null,
      }));
    },
    [finalizeFlow]
  );

  const updateOrgBranding = useCallback(
    (branding: OrgBranding) => {
      setState((s) => ({
        ...s,
        orgBranding: branding,
        orgNameNeedsReview: false,
        mobilizationFlow: s.parsedSections
          ? finalizeFlow(s.parsedSections, branding)
          : s.mobilizationFlow,
        flowBuilderOverrides: null,
      }));
    },
    [finalizeFlow]
  );

  const reparseAup = useCallback(async () => {
    if (!state.uploadedAup?.rawText) return;

    setState((s) => ({
      ...s,
      processingStatus: "parsing",
      errorMessage: null,
    }));

    try {
      const {
        rules,
        sections,
        parseMethod,
        confidence,
        confidenceBreakdown,
        citations,
        sparseRuleCounts,
        clarifyingPrompts,
        originalSectionLabels,
        fallbackReason,
        truncationWarning,
      } = await parseAup(
        state.uploadedAup.rawText,
        state.orgBranding.organizationName
      );

      const storedChecklist = loadChecklistState(state.orgBranding.organizationName);

      setState((s) => ({
        ...s,
        structuredRules: rules,
        parsedSections: sections,
        originalParsedSections: sections,
        parseMeta: { method: parseMethod, confidence, confidenceBreakdown, sparseRuleCounts, fallbackReason, truncationWarning },
        sectionCitations: citations,
        originalSectionLabels,
        reviewedCitationFlags: {},
        clarifyingPrompts,
        customClarifyingQuestions: storedChecklist?.customClarifyingQuestions ?? {},
        dismissedClarifyingFlags: storedChecklist?.dismissedClarifyingFlags ?? {},
        clarifyingAnswerNotes: storedChecklist?.clarifyingAnswerNotes ?? {},
        mobilizationFlow: finalizeFlow(sections, s.orgBranding),
        processingStatus: "ready",
        flowBuilderOverrides: null,
      }));

      void regenerateAssessment(sections);
    } catch (err) {
      setState((s) => ({
        ...s,
        processingStatus: "error",
        errorMessage:
          err instanceof Error ? err.message : "Failed to re-parse policy.",
      }));
    }
  }, [finalizeFlow, state.uploadedAup?.rawText, state.orgBranding, regenerateAssessment]);

  const markCitationReviewed = useCallback((flagKey: string) => {
    setState((s) => ({
      ...s,
      reviewedCitationFlags: { ...s.reviewedCitationFlags, [flagKey]: true },
    }));
  }, []);

  const updatePdfAssetOverride = useCallback(
    (key: PdfAssetKey, patch: PdfAssetOverride) => {
      setState((s) => ({
        ...s,
        pdfAssetOverrides: {
          ...s.pdfAssetOverrides,
          [key]: { ...s.pdfAssetOverrides[key], ...patch },
        },
      }));
    },
    []
  );

  const addCustomClarifyingQuestion = useCallback(
    (sectionKey: keyof ParsedAupSections, question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      setState((s) => ({
        ...s,
        customClarifyingQuestions: {
          ...s.customClarifyingQuestions,
          [sectionKey]: [...(s.customClarifyingQuestions[sectionKey] ?? []), trimmed],
        },
      }));
    },
    []
  );

  const toggleClarifyingIncluded = useCallback((flagKey: string) => {
    setState((s) => {
      const dismissed = { ...s.dismissedClarifyingFlags };
      if (dismissed[flagKey]) {
        delete dismissed[flagKey];
      } else {
        dismissed[flagKey] = true;
      }
      return { ...s, dismissedClarifyingFlags: dismissed };
    });
  }, []);

  const setClarifyingAnswerNote = useCallback((flagKey: string, note: string) => {
    setState((s) => ({
      ...s,
      clarifyingAnswerNotes: { ...s.clarifyingAnswerNotes, [flagKey]: note },
    }));
  }, []);

  const resetParsedSections = useCallback(() => {
    setState((s) => {
      if (!s.originalParsedSections) return s;
      return {
        ...s,
        parsedSections: s.originalParsedSections,
        mobilizationFlow: finalizeFlow(
          s.originalParsedSections,
          s.orgBranding
        ),
        flowBuilderOverrides: null,
      };
    });
  }, [finalizeFlow]);

  const unresolvedCitations: UnresolvedCitation[] = state.sectionCitations
    ? flattenCitations(state.sectionCitations)
        .filter(({ citation }) => !citation.grounded)
        .map(({ sectionKey, index, citation }) => ({
          sectionKey,
          index,
          citation,
          flagKey: citationFlagKey(sectionKey, index),
        }))
        .filter(({ flagKey }) => !state.reviewedCitationFlags[flagKey])
    : [];

  const documentTooShort = state.uploadedAup
    ? isDocumentTooShortToParse(state.uploadedAup.rawText)
    : false;

  const clarifyingChecklist = buildClarifyingChecklist({
    clarifyingPrompts: state.clarifyingPrompts,
    customQuestions: state.customClarifyingQuestions,
    dismissedFlags: state.dismissedClarifyingFlags,
    notes: state.clarifyingAnswerNotes,
  });

  const value: MobilizationContextValue = {
    ...state,
    loadSampleAup,
    uploadPastedText,
    uploadFile,
    updateParsedSections,
    updateOrgBranding,
    reparseAup,
    resetParsedSections,
    reset,
    exportState,
    importState,
    markCitationReviewed,
    unresolvedCitations,
    regenerateAssessment,
    updateAssessmentQuestions,
    updateFlowBuilderOverrides,
    resetFlowBuilderOverrides,
    documentTooShort,
    updatePdfAssetOverride,
    addCustomClarifyingQuestion,
    toggleClarifyingIncluded,
    setClarifyingAnswerNote,
    clarifyingChecklist,
    rules: state.structuredRules,
    sections: state.parsedSections,
    flow: state.mobilizationFlow,
  };

  return (
    <MobilizationContext.Provider value={value}>
      {children}
    </MobilizationContext.Provider>
  );
}

export function useMobilization() {
  const ctx = useContext(MobilizationContext);
  if (!ctx) {
    throw new Error("useMobilization must be used within MobilizationProvider");
  }
  return ctx;
}
