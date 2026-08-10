---
name: flow-builder-template
description: >
  Transforms a designer's flow notes (PDF, Loop doc, plain text, or any other format)
  into a populated BrainStorm Flow Builder Excel template. Use whenever someone shares
  flow design notes, a storyboard, a Loop document, a content outline, or any written
  description of a BrainStorm learning flow and wants it converted into the Excel template
  format that the Flow Builder app can ingest. Triggers on "convert this to the template",
  "fill out the flow template", "turn this into an Excel for the flow builder",
  "make this into the flow builder format", "take these flow notes and build the template",
  or any time a designer hands over flow content and wants it ready for the Flow Builder app.
---

# BrainStorm Flow Builder Template Generator

Reads a designer's flow notes in any format and outputs a populated `.xlsx` file matching the BrainStorm Flow Builder template.

---

## Input formats accepted

- PDF (storyboard, design doc, exported Loop doc)
- Loop doc (pasted text or screenshot)
- Plain text or markdown outline
- Slide deck or Word doc
- Verbal description in chat

If the input is a file, read it first (use the `file-reading` skill's dispatch table). If it's a PDF, check for a text layer before extracting.

---

## Requirements — what a designer must provide for a fully built flow

Before extracting anything, check the notes against this list. Anything missing either has a safe default (noted below) or needs to be flagged back to the designer — never fabricated.

**Flow-level (always needed):**
- Flow Title — **required**, no default
- Flow Description — optional, blank if not given
- Software Application — optional, one or more values for the whole flow (comma-separated if multiple), blank if not mentioned
- Pack — optional, but NOT part of the spreadsheet; if the designer mentions a pack by name, flag it in your summary so they remember to enter the Pack ID in the app's Setup screen at run time

**Per item (every row in the flow):**
- Title, Type (Video/Pdf/Survey/Assessment/Scorm/Link/Email), Source (Existing/New) — all **required**
- Section Header — optional, only needed on the first item of each section

**Per item, if `Source = Existing`:**
- Either an Asset ID (preferred — exact, no ambiguity) or a Title that matches the platform asset's real title closely enough for search to find it. At least one of these must be reliable, or the run will skip that item.

**Per item, if `Source = New` and `Type = Survey` or `Assessment`:**
- Description — optional (defaults to a placeholder string if blank)
- Labels — optional
- At least one question on the Questions sheet, with `Asset Title` exactly matching this item's Title

**Per item, if `Source = New` and `Type = Assessment` specifically:**
- Show Correct Answers, Percentage Required, Percentage Value — all optional (defaults: No / Yes / 80)
- At least one question with a marked `Correct` answer, or the assessment has no way to be scored

**Per question (Questions sheet, New Survey/Assessment items only):**
- Question Text and Type — **required**
- Option columns — required for choice-type questions (as many as the question needs, not capped at 4), not needed for `text`/`rating`/`likert`
- Correct — required for assessment questions, not applicable to surveys
- Required — optional (defaults: Yes for assessments, No for surveys)
- Branching — survey questions only, optional (default No), and subject to two hard constraints:
  - At most **one** branching question per survey
  - A branching question **must** also be marked Required
- Require All Correct — **assessment `multiple-choice` questions only**, optional (default No). Whether the learner must select every correct answer to get credit, vs. any correct answer(s) counting. Not applicable to `single-choice` assessment questions or to any survey question — the app rejects it there.

If any of the "required" items above are missing from the notes, ask the designer rather than guessing — a missing Flow Title or item Type/Source can't be inferred safely.

---

## Template structure

The output is a 3-sheet Excel file. Every rule below is enforced by the app at upload time — a violation gets the whole file rejected with a specific error message, not a partial import.

### Sheet 1: Flow

| Field | Value |
|---|---|
| Flow Title | Required — taken from input |
| Flow Description | Optional — taken from input or left blank |
| Software Application | Optional — the software application(s) this flow is about, if the notes name any (e.g. "Teams", "Excel, AI") |

Only these three fields. No other rows. Both in column A (label) and column B (value).

**Software Application applies to the whole flow** — one or more values, not per-item. If the notes name more than one application, write them as a **comma-separated list in the single cell** (e.g. `Microsoft 365, Claude`) — do NOT write natural-language joins like `Microsoft 365 and Claude`; the app splits strictly on commas, so an "and" gets treated as part of one application's name. It only affects newly-created surveys/assessments/flow (existing assets keep whatever tags they already have on the platform). Leave blank if the notes don't specify one — don't guess.

**Pack is NOT a template field.** The app takes a Pack ID directly from the user on its Setup screen at run time, not from the spreadsheet — don't add a Pack row even if the designer's notes mention a pack name.

### Sheet 2: Items

Columns (in order): `#`, `Title`, `Type`, `Source`, `Section Header`, `Description`, `Labels`, `Asset ID`, `Show Correct Answers`, `Percentage Required`, `Percentage Value`

The app reads Items columns **by position**, not by header name — keep them in this exact order. The last three (columns **I, J, K**) are assessment scoring settings; they must come immediately after `Asset ID`.

**Rules:**
- `#` — sequential integer starting at 1
- `Title` — the asset or item name, exactly as written (this must match `Asset Title` in the Questions sheet for any New surveys/assessments)
- `Type` — must be one of: `Video`, `Pdf`, `Survey`, `Assessment`, `Scorm`, `Link`, `Email`
  - When the designer says "video", "clip", "recording" — `Video`
  - When the designer says "survey", "check-in", "pulse", "feedback form" — `Survey`
  - When the designer says "quiz", "knowledge check", "assessment", "test" — `Assessment`
  - When the designer says "PDF", "document", "handout", "resource" — `Pdf`
  - When the designer says "SCORM", "module", "e-learning" — `Scorm`
  - When the designer says "link", "URL", "website" — `Link`
  - When the designer says "email" — `Email`
- `Source` — `Existing` if the asset already exists on the platform; `New` if it needs to be created
  - Default to `Existing` for Videos, Pdfs, Scorms, Links, Emails unless the designer says otherwise
  - Default to `New` for Surveys and Assessments unless a specific existing ID or title match is mentioned
- `Section Header` — use the designer's section/module names. Apply a section header only to the first item in each section. Leave blank for all subsequent items in the same section.
- `Description` — **New items only.** The item's description as written or reasonably summarized from the notes. Leave blank for `Existing` items (they keep their own description on the platform) and blank if the notes don't give one for a New item — don't fabricate a description.
- `Labels` — **New items only.** Comma-separated list of labels/tags for this specific item, if the notes call any out (e.g. "tag as onboarding, compliance"). Leave blank for `Existing` items and when the notes don't mention labels — don't invent labels that aren't stated.
- `Asset ID` — **Existing items only.** A numeric platform asset ID, only if the designer's notes explicitly give one (e.g. "use existing survey #10337" or a pasted platform link containing an ID). Leave blank otherwise — the app falls back to title search when this is blank. Never guess or fabricate an ID.
- `Show Correct Answers` — **New Assessment items only.** `Yes` or `No` — whether learners see which answers were correct after they submit. Leave blank on every other row. Blank means the app's default (`No`) applies.
- `Percentage Required` — **New Assessment items only.** `Yes` or `No` — whether a passing score is required to complete the assessment. Leave blank on every other row. Blank means the app's default (`Yes`) applies.
- `Percentage Value` — **New Assessment items only.** A whole number `0`–`100` — the passing score, used when `Percentage Required` is `Yes`. Leave blank on every other row. Blank means the app's default (`80`) applies. A value outside 0–100, or a non-number, is rejected by the app at upload.

> **These three columns apply only to rows where `Source = New` AND `Type = Assessment`.** On surveys and on Existing items they're simply ignored by the app (not rejected) if filled in by mistake — but leave them blank there anyway for clarity. Because the app reads by position, blank is always safe and means "use the default" — never put a placeholder like `N/A` in these cells.

### Sheet 3: Questions

Columns (in order): `Asset Title`, `Question #`, `Question Text`, `Type`, then as many `Option` columns as the questions in this file need (`Option A`, `Option B`, `Option C`, ...), then `Correct`, `Required`, `Branching`, `Require All Correct`.

The app locates the `Option` columns by finding `Correct` in the header row and treating everything between `Type` and `Correct` as options — so the number of Option columns is not fixed at 4. Add as many as the widest question in the sheet needs (surveys/assessments support up to ~10 options in practice). Every question row uses the same header row, so pad shorter questions with blank cells in the extra Option columns — don't add narrower rows with fewer columns.

Only populate this sheet for items where `Source = New` AND `Type = Survey` or `Assessment`.

**Column rules:**
- `Asset Title` — must exactly match the `Title` in the Items sheet (case-sensitive)
- `Question #` — sequential integer per asset, starting at 1
- `Question Text` — the question as written
- `Type` — map to these values. For **surveys**, `single-select` and `multi-select` are the two real question types (one answer vs. more than one) — a natural pair, same pattern as the assessment pair below. For **assessments**, `single-choice` and `multiple-choice` are the natural pair instead (matching `-choice` suffix) — use those there, not `single-select`/`multi-select`, even though the app also happens to accept `multi-select` as an alias on assessments (no need to use it there; `multiple-choice` already reads clearly):
  - Survey question types: `single-select`, `multi-select`, `text`, `rating` — prefer these exact spellings when generating a template (`multiple-choice` also works as an alias for `multi-select` on surveys if a human edits the file by hand, but don't write it yourself). `likert`/`likert scale` is also accepted as an alias for `rating` — use it when the designer explicitly asks for a Likert item (Strongly Disagree → Strongly Agree); the app applies those labels automatically instead of the generic Poor/Excellent rating default.
  - Assessment question types: `single-choice`, `multiple-choice` — never put `single-select`, `text`, or `rating` on an assessment; the app fails to build the assessment if you do
  - When the designer says "rate", "scale", "1-5", "how do you feel" — `rating` (surveys only)
  - When the designer says "likert", "likert scale", "strongly agree/disagree", "agreement scale" — `rating` (surveys only), with `min_label`/`max_label` set to "Strongly Disagree" / "Strongly Agree" instead of the generic Poor/Excellent rating defaults — don't add Option columns for these, same as any other `rating` question
  - When the designer says "text", "open-ended", "comment", "describe" — `text` (surveys only)
  - When the designer says "select one", "choose one", "which of these" — `single-select` (survey) or `single-choice` (assessment)
  - When the designer says "select all", "check all that apply", "multiple answers" — `multi-select` on a survey, `multiple-choice` on an assessment
- `Option A`, `Option B`, ... — fill answer choices left to right, using as many Option columns as the widest choice-type question in the sheet needs. Leave blank for `text`, `rating`, and `likert` types.
- `Correct` — for assessments only: letter(s) matching the correct option column(s), e.g. `B` or `A,C`. Leave blank for surveys and for `text`/`rating` questions.
- `Required` — `Yes` or `No`. Default `Yes` for assessment questions. Default `No` for survey questions unless the designer specifies — **except** any survey question with `Branching = Yes`, which must be set `Required = Yes` (see the Branching constraints below).
- `Branching` — **survey questions only** (ignored on assessments — the platform doesn't apply it there). `Yes` or `No`, default `No`. This is a flag only — it marks the question as a branch point on the platform. It does NOT set where the branch goes; branch destinations are configured manually in the platform's Flow UI after the survey is created, not through this app. Set `Yes` only when the designer's notes explicitly call for branching logic on that question (e.g. "if they answer X, skip ahead" or "this should branch"). Don't infer branching just because a question has multiple answer options — most single-select/multi-select questions are not branching questions.

  **Two hard constraints the app enforces at upload — violating either makes the app reject the entire file:**
  1. **At most one** `Branching = Yes` question per survey. If the notes call for more than one branch point in a single survey, keep only one, and flag the rest in your summary instead of emitting a second branching row.
  2. A `Branching = Yes` question **must also be** `Required = Yes`. Any time you set Branching to Yes, set that same question's Required to Yes as well — even though survey questions otherwise default to `No`. (A branching question that isn't Required makes the survey publish but show as "deleted" once placed in a flow, so the app blocks it up front.)
- `Require All Correct` — **assessment `multiple-choice`/`multi-select` questions only.** `Yes` or `No`, default `No`. Confirmed via live API payload (2026-07-02): the platform's `multipleChoiceTextQuestions` carries a `requireAllCorrectAnswers` flag per question — `Yes` means the learner must select every marked-correct answer to get credit; `No`/blank means selecting any correct answer(s) is enough. Leave blank on every other row — the app rejects it on `single-choice` assessment questions (only one correct answer exists, so "all" is meaningless), on `text`/`rating` questions, and on any survey question (surveys have no correct-answer concept at all, even for `multi-select`).

---

## Inference rules

Apply these when the designer's notes are ambiguous:

1. **Section headers** — if the notes use headers, bold labels, numbered phases, or named modules, treat each as a section header on the first item underneath it.
2. **New vs. Existing** — if the designer provides a specific asset title that sounds like an established resource ("Company Handbook", "Welcome Video"), default to `Existing`. For anything described as being created fresh, use `New`.
3. **Question type inference** — when type is unclear, prefer `text` for open-ended survey prompts and `single-choice` for assessment items with one clear answer.
4. **Missing correct answers** — if the designer lists answers for an assessment but doesn't mark which is correct, flag this explicitly in your response. Do not guess. Leave `Correct` blank and note it in the output summary.
5. **Answer option count** — the template supports as many `Option` columns as needed; don't truncate. If the designer lists 8 answer choices, add `Option A` through `Option H`. Keep the column count consistent across the whole Questions sheet (pad shorter questions' unused Option cells blank) since the app reads columns by position relative to the header row.
6. **Duplicate titles** — if two items share the same title, append ` (1)`, ` (2)` etc. to disambiguate. Matching must still work across Items and Questions sheets.
7. **Software Application** — only populate the Flow sheet if the notes name one or more explicitly (e.g. "this is a Teams flow", "covers Microsoft 365 and Claude"). If not mentioned, leave it blank rather than inferring one from context (a flow about "using AI tools" does not automatically mean Software Application = "AI" unless the notes actually say so). If multiple applications are named, write them **comma-separated in the single cell** (e.g. `Microsoft 365, Claude`) — never as a natural-language phrase like "Microsoft 365 and Claude", since the app splits strictly on commas and would treat the whole phrase as one application name. Never add a Pack field to the Flow sheet, even if the notes mention a pack name — that's a run-time input in the app, not a template value.
8. **Item Description / Labels** — only for New items, only when the notes state them directly. A one-line summary the designer wrote for a survey/assessment counts as a description; general flow narration around the item does not — don't repurpose surrounding prose as the item's description.
9. **Asset ID** — only populate when the notes give an explicit numeric ID or a platform URL containing one (e.g. `.../assets/surveys/10337`). If the notes only give a title for an Existing item, leave `Asset ID` blank — title search is the correct fallback, not a guessed ID.
10. **Branching constraints** — the app allows at most one branching question per survey, and any branching question must also be Required. If the notes imply multiple branch points in one survey, keep one, mark it Required, and flag the others in your summary rather than emitting a file the app will reject.
11. **Assessment scoring settings** — only populate `Show Correct Answers`, `Percentage Required`, and `Percentage Value` when the notes state them for a New Assessment (e.g. "learners must score 80% to pass", "show them the answer key afterward"). If the notes don't say, leave all three blank — the app applies its defaults (`Show Correct Answers = No`, `Percentage Required = Yes`, `Percentage Value = 80`). Don't invent a passing score the designer didn't specify.
12. **multi-select vs. multiple-choice** — on surveys, always write `multi-select` yourself when generating a template (it's the correct pairing with `single-select`; `multiple-choice` is an accepted alias there but don't write it yourself). On assessments, write `multiple-choice` as usual — that's already the correct paired term with `single-choice`, and there's no reason to substitute `multi-select`. If you're editing a template a human already partially filled out and see the "wrong" one of the pair, leave it as-is — the app treats both spellings identically on either sheet, no need to "fix" it.
13. **Require All Correct** — only populate on assessment `multiple-choice` questions, and only when the notes are explicit about the scoring rule (e.g. "they must pick both correct answers to get credit" — `Yes`; "picking any correct answer counts" or nothing stated — leave blank, the app default `No` applies). Never populate it on `single-choice` questions, `text`/`rating` questions, or any survey question — leave the cell blank there. Don't infer `Yes` just because a question has multiple correct answers marked in `Correct` — that only means multiple answers are correct, not that all of them are mandatory for credit.

---

## Output steps

1. **Parse** the input and extract: flow title, flow description, ordered item list, section headers, and question details for any New surveys/assessments.
2. **Summarize** what you extracted before building — show the user a plain-text outline:
   - Flow title + description
   - Software Application (or note if not mentioned)
   - Numbered item list with Type, Source, and Section Header annotations, plus Description/Labels for New items, Asset ID for Existing items where given, and the scoring settings (Show Correct Answers / Percentage Required / Percentage Value) for any New Assessment
   - Any flags (ambiguous type, missing correct answers, truncated options)
   - Note that Pack ID (if the designer mentioned one) needs to be entered in the app's Setup screen, not the spreadsheet — flag it in the summary so it isn't lost
   - Ask the user to confirm or correct before generating the file
3. **Build the Excel file** using `openpyxl` per the xlsx skill. Apply consistent formatting (DM Sans or Arial, column widths sized to content, frozen header row on each sheet, light gray header background `#F2F2F2`).
4. **Save to** `/mnt/user-data/outputs/flow-builder-template.xlsx`
5. **Present the file** and note any items that need manual attention (e.g., missing correct answers, truncated options, assets flagged as Existing that the user should verify exist on the platform).

---

## Formatting spec (openpyxl)

```python
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

HEADER_FILL = PatternFill("solid", start_color="F2F2F2", fgColor="F2F2F2")
HEADER_FONT = Font(name="Arial", bold=True, size=10)
BODY_FONT = Font(name="Arial", size=10)
```

- Row 1 on each sheet: headers with `HEADER_FILL` + `HEADER_FONT`
- All data rows: `BODY_FONT`
- Column widths: set manually based on content (Title ~40, Type ~14, Source ~12, and the three assessment columns ~18 each, etc.)
- Freeze row 1 on Items and Questions sheets: `sheet.freeze_panes = "A2"`
- No formulas needed — all values are static strings/integers

---

## What NOT to include

- Do not add dropdown validation — the app reads values as strings
- Do not add a legend row at the bottom (the template has one, but it's informational only and not needed for the app to parse)
- Do not add a FlowEnd row in the Items sheet — the app adds it automatically
- Do not generate IDs — the app handles all UUID and asset ID resolution
- Do not fabricate Software Application, Description, Labels, or Asset ID values — leave them blank when the notes don't state them explicitly. The app treats blank as "not specified," not "figure it out"; a wrong guess here creates a wrong tag on the live platform. When multiple applications are named, write them comma-separated (`Microsoft 365, Claude`), never joined with "and" — the app splits on commas only.
- Do not add a Pack row to the Flow sheet, even if the notes mention a pack by name. Pack is entered by the user directly in the app at run time — surface it in your summary output instead so they remember to enter it there.

---

## Example summary output (Step 2)

```
Flow Title: New Employee Onboarding
Flow Description: A structured first-week experience for new hires
Software Application: (not specified)

Items:
  Section: Getting Started
  1. Welcome to the Team — Video — Existing
  2. Company Handbook — Pdf — Existing
  Section: Day 1
  3. Day 1 Check-in — Survey — New (3 questions, 1 branching)
     Description: "Quick pulse on first-day experience"
     Labels: onboarding, day-1
  Section: Knowledge Check
  4. Policy Knowledge Check — Assessment — New (2 questions)
     Show Correct Answers: No · Percentage Required: Yes · Percentage Value: 80

Flags:
  ⚠️ "Policy Knowledge Check" Q1: Correct answer marked as B — verify this is intentional
  ⚠️ "Welcome to the Team" — set to Existing; confirm this title matches the platform exactly (no Asset ID given, so this will resolve by title search)
  ⚠️ Your notes mention adding these to the "Onboarding Essentials" pack — this isn't a spreadsheet field, so enter Pack ID for "Onboarding Essentials" in the app's Setup screen when you run this.
  ⚠️ "Day 1 Check-in" Q2 marked as Branching — remember to configure the actual branch destination in the platform's Flow UI after the survey is created; the template only sets the flag.

Does this look right? I'll generate the Excel once you confirm.
```
