## Context

R6 already delivers registered files through bounded file-backed asynchronous
copy. R11 remains on the JSON/text path, where capability normalization and the
HTTP boundary duplicate serialization and encoding. R12 remains in several
independent recursive directory walkers.

## Goals / Non-Goals

**Goals:**

- Serialize and encode each JSON response body once.
- Keep socket delivery asynchronous without changing wire bytes.
- Generate deterministic runtime tree metadata once per business operation.
- Exclude known non-business directories and observe unusually large trees.
- Replace whole-file JavaScript directory copies with native asynchronous copy.

**Non-Goals:**

- Rejecting, truncating, or automatically offloading large JSON responses.
- Hard-failing runtime trees because an observation budget is exceeded.
- Changing file-download, JSON-RPC, SSE, capability, or CLI contracts.

## Decisions

1. **Use a prepared memory response DTO.** JSON and text bodies become one
   `Uint8Array` plus small headers and measured lengths. The file response DTO
   continues carrying `RuntimeFileTransferSource` and never enters this branch.
2. **Share response preparation across Host Bridge and MCP.** Runtime logs and
   profiler counters consume the prepared metadata instead of serializing or
   encoding again.
3. **Use an injected runtime-tree walker.** A pure iterative walker owns ordering,
   exclusions, metadata, warnings, and issues; runtime persistence supplies
   Zotero/Node list/stat/copy adapters.
4. **Use observation budgets, not limits.** Exceeding depth, entry, or byte
   budgets records one structured warning and completes the scan.
5. **Exclude exact directory segments globally.** `.git`, `node_modules`,
   `.venv`, and existing Python caches are never business resources. Result
   fallback additionally prunes `.acp` and `result`.
6. **Keep manifests operation-scoped.** Concurrent identical registry/catalog
   builds may share one in-flight promise, but completed manifests are not a
   correctness cache. Each fallback repair round scans again.
7. **Copy atomically with a separate tree worker.** Tree copy uses native copy
   primitives into staging and atomically replaces the target. It does not use
   the R6 transfer queue or whole-file JavaScript buffers.

## Risks / Trade-offs

- One synchronous `JSON.stringify` remains for large JSON results; metrics make
  this residual explicit.
- Observation-only tree budgets do not cap worst-case scan time.
- Global dependency/VCS exclusions intentionally change skill checksums and
  omit those directories from bundles and copies.
- Native copy behavior requires Zotero 7/9 mechanism verification; unavailable
  hosts are recorded without adding a whole-file fallback.
