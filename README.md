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
cp .env.example .env.local   # optional, see below
npm run dev
```

Open [http://localhost:3004](http://localhost:3004).

### Optional AI parsing

Without `ANTHROPIC_API_KEY` set, the app falls back to heuristic
(non-AI) text parsing automatically — it still works end to end, just
with less accurate section extraction. To enable AI-assisted parsing,
put a real key in `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Get a key from the [Anthropic Console](https://console.anthropic.com/).
Never commit a real key — `.env*` is gitignored except `.env.example`.

## The 7-step workflow

Everything happens on a single page (`/`) as a 7-step wizard
(`src/app/page.tsx`). There's no click-through between separate route
pages for the main flow:

1. **Upload AUP** — paste text, upload a PDF/TXT/DOCX file, or click
   "Load sample AUP" to use the built-in sample (`src/lib/mock/sample-aup.ts`)
   for a quick smoke test. Enter a company name. The original file is
   preserved for later download.
2. **Parse with AI** — auto-advances while `/api/parse-aup` extracts 6
   employee-facing sections (falls back to heuristic parsing if no API key).
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

## Routes

| Route | Purpose |
|-------|---------|
| `/` | The 7-step wizard described above — this is the app |
| `/admin` | Alternate/legacy tabbed view over the same state (source doc, sections, branding, PDF, downloads, Flow Builder export) |
| `/admin?tab=downloads` | Consolidated download hub within `/admin` |
| `/pdf-preview` | Employee AUP PDF preview and Print/Save |
| `/flow` | Mobilization flow preview |

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
