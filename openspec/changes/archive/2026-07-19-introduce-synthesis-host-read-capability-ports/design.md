## Context

Stage 1 consumer migration is complete: `legacyComposition.ts` is the only production consumer of the complete in-process service. The remaining read-side Host seam is `SynthesisLibraryAdapter`, whose methods include full-library arrays, derived domain inputs, decoded note payloads, and optional inconsistent paging. `service.ts` also resolves Zotero item titles and workflow fields directly. Moving this shape across a process boundary would expose host implementation details and create unbounded payloads.

## Goals / Non-Goals

**Goals:**

- Establish JSON-safe reverse Host contracts for library metadata and artifacts.
- Make every normal library/artifact read bounded at the Host boundary.
- Separate artifact discovery/hash comparison from payload transfer.
- Remove direct Zotero object reads from Synthesis query/application input paths.
- Preserve current in-process behavior, results, persistence, progress, and ownership.

**Non-Goals:**

- Add the Node service, HTTP/SSE transport, workers, or production cutover.
- Migrate Topic mirror, related-items, staged-tag effects, or other Host writes.
- Change `SynthesisClient`, public service methods, database schema, or canonical files.

## Decisions

### 1. Use one grouped reverse read port

`SynthesisHostReadPort` contains `library` and `artifacts` groups. Library item summaries carry only stable refs and bibliographic metadata. Artifact descriptors carry status, payload type, opaque locator, hash, estimated size, and bounded diagnostics. No contract contains Zotero objects, functions, note HTML, attachment paths, or absolute filesystem paths.

### 2. Make pages bounded and cursors opaque

Library and artifact scans default to 50 entries and reject limits above 100. The Zotero adapter orders by item key and encodes the continuation position as an opaque cursor. Point lookup accepts at most 100 stable paper refs. Page results do not require an expensive total count.

### 3. Read one artifact by locator

Artifact scan never returns payload content. `artifacts.read()` accepts one scan-issued locator and its expected hash. It returns typed JSON or text content. A hash mismatch produces a stable `stale` result and the current hash; callers do not silently consume content from a different revision. Invalid requests fail before Zotero access.

### 4. Preserve application behavior with internal projection helpers

The service collects pages only for use cases that genuinely require a complete current library view, uses stable-ref lookup for point reads, and derives registry rows, tag counts, library index rows, metadata fingerprints, resolver candidates, and graph metadata internally. Existing JSON fixture inputs remain available for deterministic direct-service tests but are not part of default production composition.

### 5. Make reference refresh hash-first

Reference refresh scans descriptor pages, commits descriptor status/hash changes, and identifies changed reference artifacts before reading content. It reads only changed available `references` payloads and the matching available `citation_analysis` payload. Missing or decode-error descriptors stale prior raw references without a payload read. If scan and read hashes differ, the operation fails conservatively, preserves the previous usable cache/raw-reference state, and publishes a stale diagnostic; it does not retry implicitly.

### 6. Keep effects for later changes

Topic mirror, related-items, and staged-tag Host effects remain in-process. Static guards distinguish these allowlisted effect blocks from migrated read/query paths. The next WS2 change can give those effects plan/receipt contracts without coupling that work to read pagination.

### 7. Own the default service in the composition root

`service.ts` exports service construction only. `legacyComposition.ts` owns the default instance, Zotero Host read adapter injection, caching, and invalidation. The direct-consumer count remains one because this composition root still imports the complete service during the migration period.

## Risks / Trade-offs

- **Library mutation during paging** can change later pages: key cursors prevent duplicates from earlier keys; the result remains a current best-effort view, matching current Zotero read semantics.
- **Extra page calls** can increase overhead: pages are bounded, metadata-only, and tested against the existing performance budget.
- **Descriptor/payload races** can mix revisions: expected-hash reads fail stale and preserve prior committed facts.
- **Partial boundary cleanup** can hide direct reads: static tests forbid concrete Host adapter imports and direct Zotero reads in migrated query/workflow-input regions while explicitly leaving Host effects for later changes.

## Migration Plan

1. Add failing contract, paging, hash-first refresh, workflow snapshot, and static boundary tests.
2. Add shared Host read DTOs and port interfaces.
3. Implement Zotero and readonly adapters; split Host-specific reads from pure projections.
4. Migrate service reads and default composition, then delete `SynthesisLibraryAdapter`.
5. Update active docs and run focused, invariant, contract, build, and strict OpenSpec validation.

No data migration or rollback is required. Rollback restores the prior in-process adapter interface and direct default composition.

## Open Questions

None.
