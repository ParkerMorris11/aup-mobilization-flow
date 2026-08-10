# AUP Mobilization Flow v2

Turn a company AI Acceptable Use Policy into parsed employee sections, a branded PDF deck, and a Flow Builder Excel export for BSI platform upload.

Next.js 15 / React 19 / TypeScript app. No backend database — all session
state lives in the browser (`localStorage`, key `aup-mobilization-state-v4`)
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
