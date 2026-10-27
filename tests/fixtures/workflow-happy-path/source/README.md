# Synthetic WF-01 source fixture

Wholly synthetic input for the offline `WF-01` workflow happy-path family.
Nothing here reproduces a real paper, author, identifier, path, hash, or
research result.

## Contents

- `source.json` — a `PrivateWorkflowSource` manifest
  (`schemaVersion: "workflow-e2e-private-source.v1"`, as defined in
  `scripts/system-e2e/workflowSource.ts`).
- `pdfs/` — 20 one-page English PDFs, one stored PDF child per parent item.

## Shape

- 20 `journalArticle` parents, source keys `SYN00001`…`SYN00020`, each with
  exactly one stored PDF child (`SYNPDF01`…`SYNPDF20`).
- 4 collections: `SYNCOL01` (retrieval), `SYNCOL02` (graph),
  `SYNCOL03` (child of `SYNCOL01`), `SYNCOL04` (cross-topic).
- `facts` matches the item, PDF, and collection counts exactly;
  `missingPdfs` is empty.
- PDF paths are relative to this directory (`pdfs/…`).

## Roles

Roles are recorded as `ai_task:synthetic-<role>` tags so an offline driver can
pick papers without a second registry:

| Role | Papers |
| --- | --- |
| `mineru` | all 20 |
| `analysis` | `SYN00001`…`SYN00005` |
| `deep-reading` | `SYN00001` |
| `explainer` | `SYN00002` |
| `translator` | `SYN00003` |
| `deferred-analysis` | `SYN00006`, `SYN00007` |

This tree supplies inputs only. Workflow expectations require reviewed
successful live evidence and separate production-path assertions.
