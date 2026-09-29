# C13 verification — 2026-09-29

The 14 reviewed read definitions map to the canonical Broker methods. The factory requires the injected Broker and C08 owner workspace. C07 owns schema admission, effect authorization, result bounds, and evidence. No note-payload definition is published.

## Evidence

- The catalog table test failed against the prior single-tool factory, then passed after the C13 cut. A later unavailable-attachment test exposed an unnecessary copy call; it failed before the guard and passed after the guard.
- `npm run test:node -- --shard runtime-provider-execution` — 10 files passed on the final source, including 12 catalog shared cases and C08 managed-file cases.
- `npm run test:zotero:core` — 89 passed in real Linux Zotero, including 12 shared catalog cases and 2 live Broker/owner workspace cases. The live file case commits an annotation export; the library case pages real items.
- `npx tsc --noEmit`, `npm run lint:check`, `npm run build`, `openspec validate add-pi-zotero-read-tools --strict`, `openspec validate pi-zotero-tool-catalog --type spec --strict`, and `git diff --check` passed.

## Boundary review

- Attachment pages replace source paths only after C08 batch materialization succeeds; pages with no available files return directly. If cancellation arrives after a committed batch, its receipt records the completed workspace effect. Attachment item detail removes the source path and leaves metadata intact.
- Managed note detail rejects an oversized semantic payload with safe size and kind facts. Gateway still enforces the final 50 KiB result bound on every definition.
- Annotation export and traversal commit owner-managed artifacts. Traversal marks coverage complete only for a completed Broker outcome; resource-limited results retain the resume cursor. Cancel/error discards staged output or reports cleanup uncertainty.
- Identifier translation declares external egress; file-result tools declare workspace mutation. No new authorization or receipt owner was added.

Full Node and Windows/macOS host suites were not run for this change. Conversation and Skill Run composition remain C16/C17 work; this catalog does not itself publish an end-user Agent session.
