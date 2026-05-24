## Design

The new CLI command is a semantic wrapper over the existing Host Bridge mutation
flow. The CLI accepts the business payload (`papers` plus optional
`collection`), wraps it as `{ operation: "literature.ingest", ... }`, and calls
`mutation.execute`. The Host Bridge server continues to handle approval before
executing the write.

The broker treats `literature.ingest` as canonical. `paper.ingest` remains a
legacy accepted input spelling so older MCP adapters or diagnostic callers do
not break, but preview and execute responses return `operation:
"literature.ingest"`.

No duplicate read commands are added under `literature`; agents continue to use
`item`, `note`, and `synthesis` for read/context operations.

## Edge Cases

- Missing or invalid `papers` payload is rejected by the existing mutation
  validation path.
- If approval is denied, unavailable, or times out, the CLI returns the existing
  Host Bridge permission error envelope.
- Best-effort PDF attachment behavior is unchanged.
- Legacy `paper.ingest` is not documented as the recommended path outside
  compatibility notes and tests.
