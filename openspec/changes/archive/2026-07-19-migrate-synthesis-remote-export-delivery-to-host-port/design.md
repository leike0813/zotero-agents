## Context

`service.ts` currently builds Host Bridge ZIPs directly for `topics.get_context` and `paper_artifacts.export_filtered`. It imports the Host file registry and ZIP implementation, allocates plugin-runtime temporary paths, writes remote artifact content, reads it back, and registers the final file. Local delivery is a separate application behavior and remains valid.

## Goals / Non-Goals

**Goals:**

- Make remote archive publication an explicit JSON-safe Host capability.
- Remove remote temporary-path, ZIP, registry, and byte-I/O ownership from the application service.
- Preserve exact remote response and archive-content behavior.
- Bound all transported text and validate values before Host I/O.

**Non-Goals:**

- Migrating local `outputPath` or ACP run-root file writes.
- Changing Host Bridge download endpoints, CLI commands, TTL policy, UI, database, or service methods.
- Sync credential cleanup, graph-engine extraction, worker/process activation, or final composition removal.

## Decisions

### Use a ZIP-specific Host port

Expose `publishArchive` rather than a generic file or filesystem port. The application supplies a capability, safe ZIP display name, and text entries; the Host owns materialization and returns a canonical `available | unavailable` receipt. Current exports are text-only, so binary/base64 variants are not added prematurely.

### Keep shared limits in the contract

The request permits at most 256 entries, 5 MiB per UTF-8 entry, and 50 MiB total. Diagnostics are capped at 20. Entry paths must be normalized relative archive paths with no absolute, backslash, dot-segment, or duplicate forms. Request/result canonical rebuilding rejects non-JSON values and drops unknown JSON-safe fields.

### Preserve public delivery projection

An available receipt carries the existing `bridge-download` object: an opaque `bridge-export` descriptor, deterministic download command, and unzip hint. The descriptor requires size, SHA-256, valid timestamps, and matching owner capability; local paths never cross the port.

### Materialize remote artifact content without service temporary files

Split filtered artifact content generation into a pure text projection. Local mode writes that text to the existing run root. Remote mode collects the same text plus the manifest into the Host request and never allocates or rereads an application-side remote export root.

### Fail remote delivery atomically

A missing port, Host throw, `unavailable` result, capability mismatch, or malformed result becomes a stable `SynthesisClientError("unavailable")`. The response does not fall back to a local path and no partial delivery envelope is returned. Raw Host/runtime errors are discarded.

## Risks / Trade-offs

- [Archive bytes may drift] -> Reuse the existing store ZIP implementation in the Host adapter and assert downloaded content plus SHA-256.
- [DTO bounds may reject unusually large exports] -> Use the repository's existing 256/5 MiB/50 MiB materialization limits and return a stable unavailable error rather than unbounded memory use.
- [Remote and local content may diverge] -> Use one pure content builder for both modes and retain focused parity tests.
- [Temporary files may remain after a failed registration] -> The adapter removes its incomplete export root on failure and never reports its path.

## Migration Plan

1. Add failing contract/adapter and service-boundary tests.
2. Implement/export the contract and Host adapter.
3. Refactor service remote delivery and inject the adapter in default composition.
4. Update current-state specs/docs and run focused plus production validation.
5. Rollback is code-only; no persistent format or user data changes.

## Open Questions

None.
