# On-Demand Task Routing

Choose the narrowest Host Bridge command family that owns the requested behavior.

## Intent Recipes

| Intent | Canonical path | Evidence |
| --- | --- | --- |
| Read the current selection | `context selection get` | returned item refs and summaries |
| Diagnose bridge access | `surface identity`, `bridge status`, then profile/backend diagnostics | exact identity, health, and the first failing diagnostic layer |
| Find literature | `library item search`, then `library item get` | stable item refs and current metadata |
| Inspect a bounded collection | `library items list` with cursor | page metadata and returned refs |
| Read one structured note payload | `library note payloads`, then `library note payload` | note ref, payload id, and current payload body |
| Download an attachment or result file | inspect the owner, obtain `fileId`, then `file download` | owner ref, file descriptor, checksum, and verified local path |
| Run a Host-owned workflow | `workflow describe`, `workflow validate`, `workflow submit` | `executionModes.hostOwned`, `workflowRunId` |
| Accept an agent handoff | `workflow describe`, `workflow agent-run` | `executionModes.agentOwned`, `agentRunId`, request contracts |
| Apply agent results | `workflow agent-apply`, then `workflow agent-apply-status` | apply receipt and per-request status |
| Attach a generated file | `file upload`, then `mutation item attach-file` | checksum, `fileId`, target item ref |
| Inspect a completed Product | `product list`, `product get`, then `product download` | `productId`, completion metadata, and downloaded asset |
| Preview a concrete write | `mutation preview`, then the matching semantic mutation command | preview, approval outcome, applied result, and refreshed target |
| Recover a failure | follow error `safeNextActions` or `nextCommand` | error envelope and current-state query |

## Context And Identity

- Use `context current` or `context selection get` when the request refers to the current Zotero selection, collection, tab, item, note, or attachment.
- Normalize child items, notes, and attachments to parent item refs before workflows that operate on literature items.
- Use resolver commands when the user supplies titles, citekeys, DOIs, or mixed identifiers. Preserve returned stable refs instead of repeating fuzzy lookup.

## Library Reads

- Use `library item get|notes|attachments`, `library items list`, `library item search`, and `library note ...` for current bibliographic facts.
- Use `library snapshot` only for bounded metadata transfer that explicitly needs paging; do not build an implicit long-lived mirror.
- Use `library readiness` to find missing PDFs, Markdown, or analysis artifacts. Readiness reports plan work; they do not perform remediation.
- Use `library annotation list|export` for highlights and comments. These commands are read-only.
- Distinguish an item attachment record from a registered Host Bridge `fileId` and a local downloaded path. Inspect the attachment owner first, then transfer only through `file` commands.
- Use `library note get` for the note object, `library note payloads` to enumerate payload ids, and `library note payload` for one selected payload.

## Synthesis And Products

- Use `synthesis topic` for topic context and reports, `synthesis graph` for citation relationships and metrics, `synthesis index` for paged derived indexes, `synthesis resolver` for tag/collection/paper-ref sets, `synthesis artifact` for paper-owned analysis files, `synthesis concept` and `synthesis schema` for typed models, and `synthesis insight attention-queue` for ranked review work.
- Request bounded graph slices, metrics, layouts, or cursor pages instead of assuming a complete graph fits one response.
- Use `product list|get|download` for completed Dashboard Products. Product handles are not workflow-run or file handles. Treat product removal as an approval-gated record mutation.

## Files And Writes

- Download Host-provided files with `file download`.
- Upload a local artifact before using a mutation command that attaches it to a Zotero item.
- Use semantic `mutation` commands for concrete writes. Use workflows when semantic inference or multi-step business logic is required.
- Do not fall back to raw `call` for a write that has a semantic mutation command.

## Workflows And Runs

- Read `workflow-execution.md` before choosing Host-owned submit or agent-owned handoff.
- Monitor or interact only with handles returned for the current task.
- Use `run get`, `run active`, notifications, or skill-run events for bounded current-task checks; do not create an external run registry implicitly.
- Use `workflowRunId` for workflow status/cancel, `skillRunId` for reply/connect/events, `permissionRequestId` for permission inspection, and notification `eventId` for acknowledgement. Never infer one from another.

## Diagnostics

- Use `bridge status|manifest`, profile inspection, backend diagnostics, recent run history, and cache/index status before debug-only raw calls.
- Use maintenance commands only when the request is diagnosis or repair and the command's approval boundary is understood.
- Read-only debug snapshots do not authorize repair. `synthesis cache invalidate`, graph metric refresh, reapply, and clean-install reset cross explicit state-change boundaries.
- If command identity is uncertain, use offline `surface identity`, `surface describe`, or `surface search` before connecting.

## CLI Surface Uncertainty

- Compare the active `zotero-bridge --version` with the expected version rendered into the bundled Host Bridge reference when the skill path, command help, or an error suggests a different command surface.
- A version difference is advisory, not a hard stop. Use a help-first check with `zotero-bridge <command> --help` before executing the command, then use offline `surface search` or `surface describe` when the canonical command, argv, approval, handles, effects, or recovery remain uncertain.
- Stop only when the required command is absent or its control and safety contract cannot be confirmed. Preserve the complete `surface identity` comparison as supporting evidence.

## Progressive References

Choose one matching file under `references/journeys/` for the bounded task. For exact argv, decoded payload, result fields, effects, handles, and recovery, follow that journey into the bundled `zotero-bridge-cli` command manual. Read the wrapper's `output-and-recovery.md` after a failure.
