# Design

## Report Source of Truth

`result/sections/synthesis_report.json` remains a JSON section because topic
sections are persisted as structured data. Its `body` field is Markdown and is
the only user-facing report source.

The Host no longer renders a separate persisted export. Copy and Export in the
Report tab operate directly on `synthesis_report.body`.

## Runtime Report Renderer

Stage 70 assembles the complete section set and renders the report from those
sections. The renderer uses a Chinese fixed template with these chapters:

- topic title, definition, and scope boundary;
- taxonomy routes;
- timeline events;
- claims;
- improvement dimensions;
- debates;
- future directions;
- review outline writing strategies;
- coverage, external context, caveats, and collection directions;
- summary and key takeaways;
- numbered source paper bibliography.

Paper references are rendered by mapping `source_paper_refs` to stable numbers
from `source_papers[]`. In report body paragraphs and lists, each reference is a
Markdown anchor link such as `[\[1\]](#ref-1)`. Bibliography entries define the
target anchor and use plain square brackets, for example
`- <a id="ref-1"></a>[1] *Title* (2024) {paper_ref} :red_circle:`.
`taxonomy.nodes[].representative_papers` is used for route representative papers
when present; otherwise the route's `source_paper_refs` are used.

## Storage

Host apply persists structured current files only: manifest, artifact,
metadata, and section JSON files. The active current storage contract does not
include `current/export.md`, markdown hashes, or export hashes.

## Topic Details UI

The toolbar keeps navigation, update, and summary copy actions. It no longer
exposes file-system or old markdown-reader actions.

The Report tab renders the Markdown body. It also provides:

- Copy: writes the exact report Markdown body to the clipboard.
- Export: prompts for a save path in the Zotero host environment and writes the
  same body as a `.md` file.

## Non-Goals

- No migration for already persisted topics.
- No workflow registration change.
- No new report schema family.
- No language-template switching beyond the Chinese template.
