# Design

## Report Source of Truth

`result/sections/synthesis_report.json` remains a JSON section because sections
are persisted as structured data. Its `body` field is the canonical Markdown
report prose. UI and exports should render the body, not expose the section
envelope.

## Runtime

Stage 60 continues to accept and store coverage / collection suggestion payloads
for later finalize assembly, but it no longer materializes
`runtime/views/synthesis-report.md`. That file was only a short coverage view and
was easy to confuse with the final report.

Stage 70 materializes all sections. The `synthesis_report.body` is assembled
from:

- Stage 70 summary fields.
- Stage 40 core taxonomy, claims, timeline, debates, and gaps.
- Stage 60 coverage and external context.
- The resolved paper evidence boundary.

The report generator must not mention runtime implementation details such as
artifact contracts, Host apply, sidecars, or fallback templates.

## Host Export

`current/export.md` remains a compatibility Markdown export. It should be
readable by humans and derive from structured sections. Complex objects are
summarized into headings and bullet lists instead of dumped as fenced JSON.

## Topic Details UI

The Report tab reads `detail.synthesis_report.body` and renders it with the
existing Markdown renderer. It does not show `source_section_chapters` or the
JSON section envelope as ordinary user content.

## Non-Goals

- No workflow registration changes.
- No persistence directory changes.
- No new report schema family.
- No debug/provenance panel reintroduction.
