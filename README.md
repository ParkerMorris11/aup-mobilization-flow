# AUP Mobilization Flow v2

Turn a company AI Acceptable Use Policy into parsed employee sections, a branded PDF deck, and a Flow Builder Excel export for BSI platform upload.

Next.js 15 / React 19 / TypeScript app. No backend database — all session
state lives in the browser (`sessionStorage`, key `aup-mobilization-state-v4`)
plus IndexedDB for large uploaded files. There is nothing to deploy besides
the Next.js app itself.

## Quick start

```bash
cd aup-mobilization-flow
npm install
cp .env.example .env.local
```

Then open `.env.local` and set your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key from the [Anthropic Console](https://console.anthropic.com/).
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

## The 7-step workflow

Everything happens on a single page (`/`) as a 7-step wizard
(`src/app/page.tsx`). There's no click-through between separate route
pages for the main flow:

1. **Upload AUP** — paste text, upload a PDF/TXT/DOCX file, or click
   "Load sample AUP" to use the built-in sample (`src/lib/mock/sample-aup.ts`)
   for a quick smoke test. Enter a company name. The original file is
   preserved for later download.
2. **Parse with AI** — auto-advances while `/api/parse-aup` extracts 6
   employee-facing sections using `ANTHROPIC_API_KEY` (falls back to a
   less-accurate heuristic parser only if no key is set).
3. **Edit sections** — review/edit the 6 parsed sections before they flow
   into the PDF and Excel export.
4. **Review assessment** — AI-generated knowledge-check questions; edit or
   regenerate.
5. **Generate employee AUP** — set branding (company name, colors, cover
   copy) and preview the formatted employee PDF slide deck.
6. **Download & export** — download the original AUP, the employee PDF
   (opens `/pdf-preview` in a new tab — use the browser's Print → Save as
   PDF, this is not an automatic file download by design), and the Flow
   Builder Excel workbook.
7. **Flow builder assets** — preview the 6-asset sequence for the BSI
   Flow Builder platform, then use "Open Flow Builder to upload" to hand
   the assets off.

A session can be exported/imported as a JSON backup (buttons on step 1)
so work isn't lost if browser storage is cleared.

## The 3 assets you upload to BSI

Step 6, "Download & export," produces the three files that get manually
uploaded into the BSI Flow Builder platform:

| # | Asset | Where it comes from | File |
|---|-------|----------------------|------|
| 1 | **Official Company AUP** | The original file/text uploaded in step 1, preserved as-is | Same name/format as the source upload (e.g. `.pdf`, `.txt`, `.docx`) |
| 2 | **Employee AUP PDF** ("Your AI Policy at a Glance") | The branded slide deck built from the parsed sections in step 5 | Generated via `/pdf-preview` → browser Print → Save as PDF (not an automatic download — see Known quirks) |
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

| Asset | Platform source |
|-------|-----------------|
| Why AI Safe Use Matters (video) | Existing |
| AUP Welcome Survey | Existing |
| Your AI Policy at a Glance (employee PDF) | New — download from app |
| Official Company AUP | New — download from app |
| AUP Assessment | Custom Questions |
| Acknowledgment of Policy | Exisiting |
| AUP Exit Survey | Existing |

## How it works

This section explains the actual mechanics behind each step — what code
runs, what it does when the AI path is unavailable, and how data flows
between pieces. Everything below is state that lives entirely in the
browser; there is no database and no server-side session.

### State & persistence

All wizard state (`MobilizationContext.tsx`) lives in one big object:
the uploaded document, parsed sections, citations, branding, the
mobilization flow, assessment questions, and various override maps. Two
different browser storages back it, on purpose:

- **`sessionStorage`**, key `aup-mobilization-state-v4` — the whole state
  object, written on every change. Survives a page refresh mid-session,
  but clears when the tab/browser closes, so the app always opens on a
  clean upload screen rather than resurrecting whatever client's policy
  was last tested.
- **`localStorage`**, key `aup-checklist:<slugified-org-name>`
  (`checklist-storage.ts`) — just the "clarifying checklist" overrides
  (dismissed flags, custom questions, answer notes) for sparse sections,
  keyed per organization name. This one *does* persist across sessions,
  so revisiting the same client's AUP days later restores where you left
  off on that checklist, independent of the main session state.
- **IndexedDB** (`file-storage.ts`, database `aup-mobilization-files`) —
  original uploaded files larger than 1.5MB (`INLINE_FILE_LIMIT_BYTES`)
  are stored here instead of inline as base64 in `sessionStorage`, to
  avoid blowing that storage's size limit. Smaller files are embedded
  directly in the session state as a base64 string.
- A full session can be exported as a JSON file and re-imported
  (buttons on step 1) — a manual backup mechanism independent of both
  storages above, so work survives even if browser storage is cleared.

### Step 1 → 2: Upload and parse

Uploading (`MobilizationContext.uploadFile`/`uploadPastedText`) extracts
raw text — `pdfjs-dist` for PDFs, `mammoth` for DOCX, `file.text()` for
plain text — then calls `parseAup()` (`lib/services/parse-aup.ts`),
which POSTs to `/api/parse-aup`.

**With `ANTHROPIC_API_KEY` set**, that route uses the Vercel AI SDK's
`generateObject` with Claude (`claude-sonnet-4-5`) and a Zod schema
(`parse-aup-schema.ts`) to extract the 6 employee sections. The prompt
requires each bullet to come with a **verbatim quote** from the source
text; the route re-verifies that quote actually appears in the document
(`verifyQuoteInSource`) before trusting it — an LLM claiming a quote
that isn't real gets that citation silently dropped, not surfaced as fact.
It also detects section headings (`extract-structure-outline.ts`) and
feeds them back into the prompt as anchors, and truncates documents over
120,000 characters with a `truncationWarning` surfaced to the UI.

**Without a key, or if the AI call fails**, the same route (and the
client, if the request never reaches the server) falls back to a fully
deterministic **heuristic parser** with two layers:

1. **Semantic search** (`semantic-section-search.ts`) — the primary
   method. Every line is tagged with one or more content *themes*
   (`data_restrictions`, `approved_tools`, `escalation`, etc.) based on
   regex/keyword rules, then each of the 6 employee sections pulls its
   top-scoring lines from the themes relevant to it. This is why it
   handles prose documents (not just documents with matching headings) —
   a data-protection sentence buried inside a "Security Overview"
   section still gets tagged `data_restrictions` and picked up by the
   `dataToProtect` section regardless of which heading it sat under.
2. **Regex fallback** (`extract-parsed-sections-from-text.ts`) — only
   used if semantic search finds literally nothing. A simpler
   single-pass keyword/regex scan over the same 6 categories.

Both heuristic layers report **honest gaps**: a section with no real
match is left as an empty array, never backfilled with generic
boilerplate — the UI is expected to prompt staff to write that section
themselves rather than silently shipping invented content. Documents
under 10 usable lines are flagged `documentTooShort` outright.

Every bullet also gets a **confidence score** (`compute-parse-confidence.ts`),
recomputed client-side from the *final* sections (never trusted as-is
from the network) as a weighted blend of: how many of the 6 sections got
real content (`sectionCoverage`), how much of the extracted wording
actually reuses vocabulary from the source document (`textGrounding`,
weighted heaviest), and how many section headings were detectable at all
(`structureSignal`).

### Step 3: Edit sections & citations

Each bullet in `ParsedSectionsPanel` carries a citation
(`section-citations.ts`) — the quote it's grounded in, and whether that
grounding was verified. Sparse sections (few or no bullets) get
AI-generated "clarifying prompts" (`generate-clarifying-prompts.ts`,
server-side, so this list is empty in the heuristic-fallback path) —
suggested questions staff can answer to fill the gap manually. Answers,
dismissals, and custom questions here are what get saved to the
per-organization `localStorage` checklist described above.

### Step 4: Assessment questions

`generate-assessment-questions.ts` calls `/api/generate-assessment`.
**With a key**, Claude writes 1–2 grounded multiple-choice questions
*per non-empty section* (so up to ~12, not a fixed 3) — each with a
verbatim `sourceQuote` re-verified the same way as the section citations,
and 2–3 plausible (not silly/obviously-wrong) distractors. **Without a
key or on failure**, `buildAssessmentQuestions()` (`generate-flow.ts`)
returns a **fixed 3-question template** — the prompts, wrong answers, and
rationale text are hardcoded and identical for every company; only the
*correct answer* is filled in dynamically from that company's actual
`topRulesToRemember[0]` / `permittedUse[0]` / `whenUnsure[0]`. If you see
exactly "Which of these best reflects a top rule to remember?" as
question 1, you're looking at the fallback template, not an AI-generated
quiz — that's a quick way to tell whether the API key is actually live.

### Step 5: Branding & employee PDF

`resolveOrgBranding()` (in `MobilizationContext.tsx`) infers the company
name and policy title when you don't type them explicitly: it tries the
explicit form input first, then pattern-matches the document text itself
(`extractCompanyNameFromText`/`extractPolicyTitleFromText` in
`org-branding.ts`), then falls back to guessing from the uploaded
filename. A filename-derived guess sets `orgNameNeedsReview = true`,
which shows a warning banner on the PDF preview — a heading actually
found in the document is trusted; a filename guess is flagged for a
human to confirm before it goes out on a client-facing PDF.

`buildEmployeePdfDocument()` (`build-pdf-document.ts`) turns the 6
sections into a cover slide + one slide per section (fixed left-column
copy per section from `section-left-copy.ts`, right column = that
section's actual bullets), themed with the branding colors
(`build-theme.ts`). `PdfPreviewContent.tsx` renders this at a fixed
1600×900px off-screen node and exports it via `html2pdf.js`
(html2canvas + jsPDF under the hood) sized to match exactly — this is
why "Download PDF" triggers a same-tab file save via `html2pdf.js`,
while the flow on step 6 instead opens `/pdf-preview` in a new tab for
a manual Print → Save as PDF (kept as a reliability fallback since
`html2pdf.js`'s canvas rendering can be finicky with complex CSS).

### Step 6: Downloads

`DownloadsPanel.tsx` exposes the 3 assets described above. Before
allowing the Excel download it also runs `validateFlowBuilderWorkbook()`
and `getFlowBuilderFlags()` — surfaced as inline warnings/errors in the
panel — so a broken or incomplete export can't silently go out.

### Step 7: Flow Builder Excel export

`generateMobilizationFlow()` (`generate-flow.ts`) assembles a **fixed
7-step flow** (welcome video → baseline survey → employee PDF → official
AUP → assessment → exit survey → acknowledgment) — the step
titles/descriptions are templated with the org name, but the flow
*shape* itself never changes company to company. `buildFlowBuilderWorkbook()`
(`build-flow-builder-excel.ts`) turns that into a 3-sheet `.xlsx`
(via `exceljs`): a **Flow** sheet (title/description), an **Items**
sheet (one row per flow step, marked `New` or `Existing`), and a
**Questions** sheet (every survey/assessment/acknowledgment question
flattened into rows with lettered options).

One detail worth knowing: the employee PDF and official AUP items start
as `New` on first export, but once you've uploaded them to the BSI
platform once, that asset gets a real platform ID — re-running the
export without recording that ID (`pdfAssetOverrides` in
`FlowBuilderExportPanel`) will tell the platform to create a duplicate
asset instead of reusing the one already uploaded.

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
│   └── wizard/      # Step shell/nav used by the home-page wizard
├── context/
│   └── MobilizationContext.tsx   # All session state (localStorage + IndexedDB for large files)
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
    ├── types/    # Zod schemas / shared types for sections, flow, branding
    └── mock/     # Built-in sample AUP used by "Load sample AUP"
```

## Testing

```bash
npm run test    # Vitest — currently 3 test files, covering PDF text
                 # extraction and semantic section search only.
npm run lint
npm run build   # Also the closest thing to a full type-check
```

Test coverage is thin — the parse/PDF/Excel export pipeline itself is not
covered by automated tests. Before relying on a change, walk the golden
path manually: Upload (or "Load sample AUP") → Parse → Edit sections →
Review assessment → Branding/PDF → Download & export → Flow builder assets.

## Known quirks

- On first paint there's a brief window where React hasn't finished
  hydrating the upload form yet; clicking a button in that instant (rare
  for a human, easy to hit with an automated script) does nothing. Not a
  functional bug — no action needed for normal use.
- "Download PDF" opens `/pdf-preview` in a new tab rather than triggering
  a browser download — the user finishes it with Print → Save as PDF.
  This is intentional (see `openEmployeePdfDownloadPreview` in
  `src/lib/services/download-assets.ts`), not a missing feature.
- `/admin` duplicates most of the home-page wizard as a tabbed view over
  the same shared state. Worth deciding whether to keep both entry points
  or consolidate before long-term maintenance.
