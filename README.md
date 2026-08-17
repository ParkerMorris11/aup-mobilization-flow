# AUP Toolkit

Turn any company AI Acceptable Use Policy into a structured employee learning experience, complete with seven assets, a branded PDF guide, and a Flow Builder Excel file ready for upload to the BSI platform.

## Quick start

```bash
git clone https://github.com/ParkerMorris11/aup-mobilization-flow.git
cd aup-mobilization-flow
npm install
cp .env.example .env.local 
```

Then open `.env.local` and set your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key from Adam Black or [Anthropic Console](https://console.anthropic.com/). 
Never commit a real key — `.env*` is gitignored except `.env.example`.

```bash
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

### Why the API key matters

`ANTHROPIC_API_KEY` drives the AI-assisted parsing that extracts the 6
employee sections and generates the assessment questions — this is the
core value of the app, so set it up before using this for real policies.
If it's missing, the app degrades to a heuristic (non-AI) text parser
instead of failing outright, which is useful for a quick offline smoke
test but noticeably less accurate — don't rely on it for real output.

## How It Works The Simple Version

The short version of running this for a real client, start to finish —
no technical detail, just what to click, what to download, and what to
upload where.

1. **Upload the client's AUP.** Paste the text or upload their file,
   type their company name, and click "Parse & generate flow."
2. **Check the parsed sections.** Skim the 6 sections it pulled out and
   fix anything wrong before moving on.
3. **Check the 5 Knowledge Check questions.** Edit any that look off.
4. **Set branding** (company name, colors, policy title) and preview
   the employee PDF.
5. **If you're reusing an already-uploaded asset** — the welcome video,
   or a PDF from a previous export of the same client — paste its
   platform Asset ID into the Flow Builder assets step now, before you
   download the Excel file.
6. **Download 3 files** from the "Download & export" step:
   - the original AUP
   - the employee PDF ("Download PDF" → your browser's Print dialog →
     Save as PDF)
   - the Flow Builder Excel workbook
7. **Open the BSI Flow Builder app** (the "Open Flow Builder to
   upload" button takes you there).
8. **Upload the 2 new PDFs first**, if this is a new client — Flow
   Builder needs them to exist before the spreadsheet can reference
   them. Note the Asset ID it gives each one, for next time.
9. **Upload the Excel workbook** into Flow Builder — this creates the
   actual flow.
10. **Spot-check the created flow** against the spreadsheet before
    telling the client it's ready.

## Automation Boundaries
### Fully Automated ✅
- Policy parsing
- Section extraction
- PDF generation
- Assessment generation
- Excel workbook generation
- Flow structure creation
### Human Review Recommended ⚠️
- Employee-facing content
- Assessment accuracy
- Branding
- Final deployment validation
### Manual Platform Steps 👤
- Upload PDF assets
- Maintain Asset IDs
- Upload workbook
- Publish flow


## The 3 assets you upload to BSI

Step 6, "Download & export," produces the three files that get manually
uploaded into the BSI Flow Builder platform:

| # | Asset | Where it comes from | File |
|---|-------|----------------------|------|
| 1 | **Official Company AUP** | The original file/text uploaded in step 1, preserved as-is | Same name/format as the source upload (e.g. `.pdf`, `.txt`, `.docx`) |
| 2 | **Employee AUP PDF** ("{Company} AI Employee Quick Reference") | The branded slide deck built from the parsed sections in step 5 | Generated via `/pdf-preview` → browser Print → Save as PDF (not an automatic download — see Known quirks) |
| 3 | **Flow Builder Excel workbook** | The 3-sheet workbook built from the mobilization flow + assessment | `<company>-flow-builder-template.xlsx`, built by `src/lib/services/build-flow-builder-excel.ts` |

The employee PDF and Official Company AUP map directly to the two
"New — download from app" rows in the Flow Builder assets table below;
the Excel workbook is the upload vehicle for the full flow definition
(all 7 assets) into BSI's Flow Builder. The remaining 4 assets in that
table (welcome survey, assessment, acknowledgment, exit survey) are
configured directly in the BSI platform, not produced by this app.

## Parsed employee sections

1. Top rules to remember (3)
2. What can I do?
3. What tools can I use?
4. What data must I protect?
5. What am I responsible for?
6. What do I do if I'm unsure?

## Flow Builder assets (7 items)

Asset titles below match the real BSI Flow Builder platform naming
convention exactly (verified against a live "Town of Brookhaven" flow) —
`{Company}` is the only part that changes between clients. See
`buildFlowSteps()` in `src/lib/services/generate-flow.ts` — the titles
there must stay in sync with this table.

| Asset | Platform source |
|-------|-----------------|
| Why an AI Acceptable Use Policy Matters (video) | Existing |
| AI Baseline Survey | Existing |
| {Company} AI Employee Quick Reference (employee PDF) | New — download from app |
| {Company} AI Acceptable Use Policy | New — download from app |
| {Company} AI Knowledge Check | Custom Questions |
| {Company} AI Outcomes Survey | Existing |
| Policy Review & Acknowledgment | Exisiting |

## How it works

The AUP Toolkit transforms a company's AI Acceptable Use Policy into a
deployable employee learning experience. The application is built with
Next.js, React, and TypeScript, with all processing and state managed
client-side. No database is required.

### State & persistence

The toolkit stores uploaded documents, parsed sections, branding,
assessment questions, and flow configuration locally in the browser:

- **`sessionStorage`** stores the active working session — cleared when
  the tab/browser closes, so the app always opens on a clean upload
  screen rather than resurrecting whatever client's policy was last
  tested.
- **`localStorage`** stores organization-specific review notes and
  overrides (dismissed flags, custom questions, answer notes), keyed per
  organization name — this persists across sessions, so revisiting the
  same client's AUP days later restores where you left off.
- **IndexedDB** stores larger uploaded files (over 1.5MB), so big source
  documents don't blow past the browser's storage limits.
- A full session can be exported and re-imported as JSON — a manual
  backup/handoff mechanism independent of the browser storages above.

### Step 1: Upload & parse policy

The toolkit accepts PDF, DOCX, and plain text policies.

When an `ANTHROPIC_API_KEY` is available, Claude extracts and structures
policy content into six employee-focused sections using a predefined
schema and source-grounded citations — each extracted bullet must come
with a verbatim quote from the source text, which the app re-verifies
actually appears in the document before trusting it.

If AI is unavailable (or the AI call fails), the toolkit falls back to a
deterministic parser that uses semantic matching and keyword analysis to
categorize content instead. The parser intentionally leaves gaps empty
rather than generating unsupported content — a section with nothing to
match is left blank so staff can fill it in by hand, instead of the tool
inventing plausible-looking boilerplate.

### Step 2: Generate employee sections

Policy content is organized into six standard sections:

1. Top Rules to Remember
2. What Can I Do?
3. What Tools Can I Use?
4. What Data Must I Protect?
5. What Am I Responsible For?
6. What Do I Do If I'm Unsure?

Each section includes source citations and a confidence score to
support review.

### Step 3: Review & refine

Generated content can be edited before export. Reviewers can:

- Validate extracted content
- Confirm citations
- Resolve flagged gaps
- Add organization-specific clarifications

### Step 4: Generate Knowledge Check

The toolkit creates a 5-question AI Knowledge Check aligned to the
policy, matching the real BSI platform's fixed format.

When AI is available, Claude picks the 5 most important, most testable
concepts from across all six sections (favoring content where a wrong
answer could cause real harm), each with a verified verbatim source
quote and exactly 4 answer options (1 correct, 3 plausible distractors).

If AI is unavailable, a predefined question template is used instead —
the prompts, wrong answers, and rationale text are identical for every
company, with only the correct answer filled in dynamically from that
company's actual parsed content. (If question 1 reads exactly "Which of
these best reflects a top rule to remember?", that's the fallback
template, not an AI-generated quiz.)

### Step 5: Generate employee PDF

The employee guide is generated from the six parsed sections and
organization branding — company name, policy title, and colors, either
typed in explicitly or inferred from the document/filename (a
filename-derived guess is flagged for human confirmation before it goes
out on a client-facing PDF).

The output is a branded PDF reference guide intended for employee
consumption and Flow Builder deployment. "Download PDF" opens a preview
in a new tab for a manual Print → Save as PDF, rather than an automatic
browser download — see Known quirks below.

### Step 6: Generate deployment assets

The toolkit produces three deployment assets:

| Asset | Purpose |
|-------|---------|
| Official AI Acceptable Use Policy | Original source document |
| Employee Quick Reference PDF | Employee learning asset |
| Flow Builder Excel Workbook | Platform import package |

Before allowing the Excel download, the toolkit validates the generated
workbook so a broken or incomplete export can't silently go out (see
Export validation below).

### Step 7: Build Flow Builder package

The toolkit automatically assembles a standardized 7-step learning
experience:

1. Why an AI Acceptable Use Policy Matters
2. AI Baseline Survey
3. Employee Quick Reference Guide
4. Official AI Acceptable Use Policy
5. AI Knowledge Check
6. AI Outcomes Survey
7. Policy Review & Acknowledgment

The flow structure remains consistent across customers — asset titles
match the real BSI platform's naming convention exactly, since the
platform resolves "Existing" assets by title text when no Asset ID is
given — while policy-specific content (the six sections and the
Knowledge Check) is dynamically generated per client.

One detail worth knowing: the employee PDF and official AUP items start
as "New" on first export, but once you've uploaded them to the BSI
platform once, that asset gets a real platform ID — re-running the
export without recording that ID (in the Flow Builder assets step) will
tell the platform to create a duplicate asset instead of reusing the one
already uploaded.

### Export validation

Before download, the toolkit validates the generated workbook against
the BSI Flow Builder format and surfaces issues that could cause import
failures — for example, mismatched Asset Titles between sheets, blank
answer options, or the wrong number of options for a question type
(exactly 4 for assessment questions, exactly 2 for acknowledgment).

The generated workbook contains three sheets:

- **Flow** — flow metadata (title/description)
- **Items** — asset definitions, one row per flow step
- **Questions** — survey and assessment content, flattened into rows
  with lettered options

### QA'ing the Excel export against the platform spec

The `.xlsx` this app generates has to satisfy the BSI Flow Builder
platform's exact ingestion rules — wrong column order, a stray value in
the wrong cell, or an unmet constraint (e.g. more than one branching
question per survey) gets the **whole file rejected** at upload, not
just one row. Those rules are captured in a Claude Code skill,
`.claude/skills/flow-builder-template/SKILL.md` — checked into this
repo specifically so whoever inherits this project keeps access to it.
That skill's primary job is generating a template from a designer's
raw notes, but its "Template structure" and "Inference rules" sections
are the authoritative spec for the format, so it doubles as a QA
checklist for output this app generates itself.

To QA a real export:

1. Generate the workbook the same way the app does, without needing a
   browser — the export functions are plain TypeScript with no DOM
   dependency, so they run directly under `tsx`:
   ```js
   import { extractParsedSectionsWithFallbackFlags } from "./src/lib/services/extract-parsed-sections-from-text.ts";
   import { generateMobilizationFlow } from "./src/lib/services/generate-flow.ts";
   import { buildFlowBuilderWorkbook } from "./src/lib/services/build-flow-builder-excel.ts";
   import { SAMPLE_AUP_TEXT } from "./src/lib/mock/sample-aup.ts";

   const { sections } = extractParsedSectionsWithFallbackFlags(SAMPLE_AUP_TEXT);
   const flow = generateMobilizationFlow(sections, "Acme Corp");
   const { workbook } = await buildFlowBuilderWorkbook(flow);
   // workbook.xlsx.writeBuffer() / .writeFile("out.xlsx") from here
   ```
   Run with `npx tsx <script>.mjs`. Swap in a real company's parsed
   `sections` (from `sessionStorage`, or by pasting their actual AUP
   text through `extractParsedSectionsWithFallbackFlags`) to check a
   specific client's export rather than the sample.
2. Read the written file back with `ExcelJS.Workbook().xlsx.readFile()`
   and dump each sheet's actual cells — this checks what's really on
   disk, not just the JS objects that produced it.
3. Check the dump against the skill's "Template structure" section,
   sheet by sheet:
   - **Flow**: exactly 3 rows (Title/Description/Software Application),
     no Pack row.
   - **Items**: the 11 columns in exact position order; `Source` and
     the three assessment-scoring columns (`Show Correct Answers`,
     `Percentage Required`, `Percentage Value`) populated only where
     the spec says to (New Assessment rows only; blank everywhere else).
   - **Questions**: `Asset Title` exactly matches the corresponding
     `Title` in Items (case-sensitive); option columns padded with
     blanks rather than narrower rows; `Correct`/`Required`/`Branching`/
     `Require All Correct` populated only where each type allows.
4. As a last resort, `getFlowBuilderFlags()`
   (`src/lib/services/build-flow-builder-excel.ts`) and
   `validateFlowBuilderWorkbook()`
   (`src/lib/services/validate-flow-builder-workbook.ts`) are the same
   checks `DownloadsPanel` runs before allowing a download — call them
   on the same `items`/`questions` to see what the UI would have
   flagged.

Doing this against the built-in sample AUP confirmed the export is
currently fully spec-compliant: correct column order and positions on
all 3 sheets, correct `New`/`Existing` defaults, exact `Asset Title` ↔
`Title` matches, section headers only on the first item per group, and
correct blank-vs-populated handling on every conditional column. The
only spec capabilities this app doesn't exercise are branching survey
questions, multi-answer (`multiple-choice`) assessment questions, and
custom assessment scoring thresholds — not defects, just flow features
this app's fixed 7-step template doesn't currently need.

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── parse-aup/                # LLM structured extraction (+ heuristic fallback)
│   │   ├── generate-assessment/      # AI-generated knowledge-check questions
│   │   └── generate-flow-builder-row/
│   ├── page.tsx                      # The 7-step wizard (the app)
│   ├── admin/                        # Alternate tabbed view over the same state
│   ├── pdf-preview/ , pdf-print/      # Employee PDF preview / print-to-PDF
│   └── flow/                         # Mobilization flow preview
├── components/
│   ├── admin/       # Parsed sections, branding, downloads, flow export panels
│   ├── pdf/         # Employee PDF slide deck (left titles / right content)
│   ├── upload/      # Step 1 upload form (AupUploadForm.tsx)
│   ├── layout/      # Shared page chrome
│   ├── ui/          # Low-level shared UI primitives
│   └── wizard/      # Step shell/nav used by the home-page wizard
├── context/
│   └── MobilizationContext.tsx   # All session state (localStorage + IndexedDB for large files)
├── types/    # App-wide shared types, separate from lib/types below
└── lib/
    ├── services/
    │   ├── parse-aup.ts                    # Client parse orchestrator
    │   ├── extract-parsed-sections-from-text.ts   # Heuristic (non-AI) fallback parser
    │   ├── generate-flow.ts                # Builds the 7-item mobilization flow
    │   ├── generate-assessment-questions.ts
    │   ├── build-pdf-document.ts
    │   ├── build-flow-builder-excel.ts     # 3-sheet Excel workbook
    │   ├── validate-flow-builder-workbook.ts
    │   ├── file-storage.ts                 # Original file preservation (IndexedDB)
    │   └── download-assets.ts              # BSI download helpers
    ├── types/       # Zod schemas / shared types for sections, branding, citations
    ├── schemas/     # AI response schemas (e.g. generate-assessment-schema.ts)
    ├── pdf/         # PDF theming (build-theme.ts)
    ├── constants/   # Shared constant values
    └── mock/        # Built-in sample AUP used by "Load sample AUP"
```

## Testing

```bash
npm run test    # Vitest — currently 3 test files, covering PDF text
                 # extraction, semantic section search, and sparse-section
                 # detection only.
npm run lint
npm run build   # Also the closest thing to a full type-check
```


## Known quirks


