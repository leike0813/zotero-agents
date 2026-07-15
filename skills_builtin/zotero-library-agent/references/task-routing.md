# On-Demand Task Routing

Choose the narrowest Host Bridge command family that owns the requested behavior.

## Context And Identity

- Use `context current` or `context selection get` when the request refers to the current Zotero selection, collection, tab, item, note, or attachment.
- Normalize child items, notes, and attachments to parent item refs before workflows that operate on literature items.
- Use resolver commands when the user supplies titles, citekeys, DOIs, or mixed identifiers. Preserve returned stable refs instead of repeating fuzzy lookup.

## Library Reads

- Use `library item get|notes|attachments`, `library items list`, `library item search`, and `library note ...` for current bibliographic facts.
- Use `library snapshot` only for bounded metadata transfer that explicitly needs paging; do not build an implicit long-lived mirror.
- Use `library readiness` to find missing PDFs, Markdown, or analysis artifacts. Readiness reports plan work; they do not perform remediation.
- Use `library annotation list|export` for highlights and comments. These commands are read-only.

## Synthesis And Products

- Use `synthesis topic`, `synthesis graph`, `synthesis index`, `synthesis resolver`, and `synthesis insight` for their named Synthesis concepts.
- Request bounded graph slices, metrics, layouts, or cursor pages instead of assuming a complete graph fits one response.
- Use `product list|download` for completed Dashboard Products. Treat product removal as an approval-gated record mutation.

## Files And Writes

- Download Host-provided files with `file download`.
- Upload a local artifact before using a mutation command that attaches it to a Zotero item.
- Use semantic `mutation` commands for concrete writes. Use workflows when semantic inference or multi-step business logic is required.
- Do not fall back to raw `call` for a write that has a semantic mutation command.

## Workflows And Runs

- Read `workflow-execution.md` before choosing Host-owned submit or agent-owned handoff.
- Monitor or interact only with handles returned for the current task.
- Use `run get`, `run active`, notifications, or skill-run events for bounded current-task checks; do not create an external run registry implicitly.

## Diagnostics

- Use `bridge status|manifest`, profile inspection, backend diagnostics, recent run history, and cache/index status before debug-only raw calls.
- Use maintenance commands only when the request is diagnosis or repair and the command's approval boundary is understood.
