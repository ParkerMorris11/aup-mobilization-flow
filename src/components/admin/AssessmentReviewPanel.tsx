"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2 } from "lucide-react";
import { EMPLOYEE_SECTION_LABELS } from "@/lib/types/parsed-sections";
import type { AssessmentQuestion } from "@/lib/types/policy-schema";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useMobilization } from "@/context/MobilizationContext";

function blankQuestion(index: number): AssessmentQuestion {
  return {
    id: `assessment-custom-${index}`,
    prompt: "",
    options: ["", "", ""],
    correctAnswer: "",
    rationale: "",
  };
}

export function AssessmentReviewPanel({
  questions,
}: {
  questions: AssessmentQuestion[];
}) {
  const {
    updateAssessmentQuestions,
    regenerateAssessment,
    assessmentStatus,
    assessmentError,
  } = useMobilization();
  const [draft, setDraft] = useState<AssessmentQuestion[]>(questions);

  useEffect(() => {
    setDraft(questions);
  }, [questions]);

  const isGenerating = assessmentStatus === "generating";

  const updateQuestion = (index: number, patch: Partial<AssessmentQuestion>) => {
    setDraft((current) =>
      current.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setDraft((current) =>
      current.map((q, i) => {
        if (i !== qIndex) return q;
        const options = q.options.map((opt, j) => (j === oIndex ? value : opt));
        const correctAnswer =
          q.correctAnswer === q.options[oIndex] ? value : q.correctAnswer;
        return { ...q, options, correctAnswer };
      })
    );
  };

  const addOption = (qIndex: number) => {
    setDraft((current) =>
      current.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q))
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setDraft((current) =>
      current.map((q, i) => {
        if (i !== qIndex) return q;
        const removed = q.options[oIndex];
        return {
          ...q,
          options: q.options.filter((_, j) => j !== oIndex),
          correctAnswer: q.correctAnswer === removed ? "" : q.correctAnswer,
        };
      })
    );
  };

  const addQuestion = () => {
    setDraft((current) => [...current, blankQuestion(current.length + 1)]);
  };

  const removeQuestion = (index: number) => {
    setDraft((current) => current.filter((_, i) => i !== index));
  };

  const saveChanges = () => {
    updateAssessmentQuestions(draft);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <SectionTitle className="text-xl">Assessment questions</SectionTitle>
            <p className="mt-1 text-sm text-alpine/60">
              AI-generated knowledge-check questions grounded in the parsed
              policy sections. Review, edit, or regenerate before these are
              used in the employee flow and Flow Builder export.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => void regenerateAssessment()}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate all"
              )}
            </Button>
            <Button onClick={saveChanges} disabled={isGenerating}>
              Save edits
            </Button>
          </div>
        </div>
      </Card>

      {assessmentStatus === "error" && assessmentError && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{assessmentError}</p>
          </div>
        </Card>
      )}

      {isGenerating && draft.length === 0 && (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-alpine" />
          <p className="text-sm text-alpine/60">Generating assessment questions…</p>
        </Card>
      )}

      {draft.map((question, qIndex) => (
        <Card key={question.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium uppercase tracking-wide text-alpine/50">
                Question {qIndex + 1}
                {question.sourceSection && (
                  <span className="ml-2 normal-case text-alpine/40">
                    · grounded in {EMPLOYEE_SECTION_LABELS[question.sourceSection]}
                  </span>
                )}
              </label>
              <textarea
                value={question.prompt}
                onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                rows={2}
                placeholder="Question prompt…"
                className="mt-1.5 w-full rounded-card border border-alpine/15 bg-white px-4 py-2.5 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
              />
            </div>
            <button
              type="button"
              onClick={() => removeQuestion(qIndex)}
              title="Remove question"
              className="mt-6 shrink-0 rounded-full p-1.5 text-alpine/40 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {question.sourceQuote && (
            <p className="mt-2 truncate text-xs italic text-alpine/40">
              Source: &ldquo;{question.sourceQuote}&rdquo;
            </p>
          )}

          <div className="mt-4 space-y-2">
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={option !== "" && option === question.correctAnswer}
                  onChange={() => updateQuestion(qIndex, { correctAnswer: option })}
                  className="h-4 w-4 shrink-0 accent-alpine"
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                  placeholder={`Option ${oIndex + 1}`}
                  className="w-full rounded-card border border-alpine/15 bg-white px-3 py-1.5 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
                />
                {question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(qIndex, oIndex)}
                    title="Remove option"
                    className="shrink-0 rounded-full p-1 text-alpine/30 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qIndex)}
              className="flex items-center gap-1 text-xs font-medium text-alpine/60 hover:text-alpine"
            >
              <Plus className="h-3.5 w-3.5" />
              Add option
            </button>
          </div>

          <textarea
            value={question.rationale}
            onChange={(e) => updateQuestion(qIndex, { rationale: e.target.value })}
            rows={2}
            placeholder="Rationale shown after the employee answers…"
            className="mt-4 w-full rounded-card border border-alpine/15 bg-white px-4 py-2.5 text-sm text-alpine placeholder:text-alpine/40 focus:border-alpine/40 focus:outline-none focus:ring-2 focus:ring-alpine/10"
          />
        </Card>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-alpine/20 py-4 text-sm font-medium text-alpine/60 hover:border-alpine/40 hover:text-alpine"
      >
        <Plus className="h-4 w-4" />
        Add question
      </button>
    </div>
  );
}
