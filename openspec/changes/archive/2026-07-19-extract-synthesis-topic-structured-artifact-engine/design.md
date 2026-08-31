## Context

`src/modules/synthesis/topicStructuredArtifact.ts` currently combines pure
manifest validation, artifact validation, section assembly, section-patch
CAS/merge, persistence hashing, canonical file naming, and JSON serialization.
The service invokes those helpers inside canonical-write orchestration beside
workspace reads, digest availability checks, metadata/index writes, proposal
ingestion, discovery updates, and autosync.

This is the last Stage 1 WS3 engine extraction. The change must preserve the
current structured artifact and patch semantics while creating a process-ready
compute boundary for the later WS4 service runtime work.

## Goals / Non-Goals

**Goals:**

- Extract strict, bounded, environment-neutral manifest validation, artifact
  assembly/validation, and section-patch computation.
- Preserve current validation errors, ordering, artifact schema, and patch
  conflict behavior.
- Make requests and results safe to serialize across a worker boundary.
- Keep all persistence, Host access, and durable side effects application-owned.
- Prove failure safety, cancellation, and worker parity.

**Non-Goals:**

- Changing structured artifact content policy or improving validation rules.
- Moving workflow bundle compatibility, workspace asset reads, digest
  availability checks, canonical hashing, or persistence into the engine.
- Changing Python split-runtime scripts, public Client APIs, database schema,
  canonical files, WebDAV behavior, or production topology.
- Moving structured-artifact compute outside the canonical write lock; that
  two-phase recapture belongs to WS4.

## Decisions

### Expose one asynchronous engine with four methods

`SynthesisTopicStructuredArtifactEngine` exposes `validateManifest`,
`assembleArtifact`, `validateArtifact`, and `applySectionPatch`. Separate
methods preserve the current orchestration boundaries: manifests are validated
before path reads, arbitrary assembled artifacts can be validated independently,
and patch computation retains its explicit three-state result.

All methods return promises so the seam can later cross a worker boundary
without changing service orchestration.

### Use strict envelopes around open domain JSON

The contract envelope is canonical camelCase and carries a contract version plus
an operation-specific algorithm version. Rebuilders discard unknown envelope
fields and reject invalid versions, non-JSON-safe values, cycles, excessive
depth, oversized collections, properties, strings, or total content.

Manifest, section, and artifact values remain open JSON objects because their
nested current-state schema is intentionally validated by domain rules. Unknown
business fields inside those values are preserved.

### Preserve validation and patch semantics exactly

The engine migrates the existing rules and error ordering without rewriting
messages. Validation failures are domain results. Contract/bounds failures
throw `SynthesisTopicStructuredArtifactContractError` with code
`invalid_request`.

Patch computation preserves read-section CAS, replace-set subset checks,
unrelated artifact-hash drift tolerance, merged sections, and next section hash
projection.

### Strictly rebuild results against the request

Each result rebuilder validates the result shape and recomputes the canonical
result from the canonical request. A worker cannot fabricate validation,
assembly, patch, ordering, or basis output. The application adapter accepts only
rebuilt output.

### Use aggregate JSON bounds and traversal checkpoints

Requests allow depth 32, arrays up to 25,000 entries, objects up to 1,024
properties, up to 1,000,000 JSON nodes, 1 MiB per string, and 32 MiB aggregate
string content. Complete and patch section names remain fixed by the current
15/14 section policy. Traversal checkpoints occur every 256 nodes and at stable
phases.

The default engine checkpoint observes the service runtime abort signal.

### Keep promotion and compatibility application-owned

The application owns workspace locators, file reads, fallback sections, digest
artifact availability, final current-manifest paths, hashes, metadata, locks,
conflict candidates, current writes, state maps, topic index, downstream
sidecars, discovery, event logs, and autosync.

`topicArtifactPersistence.ts` contains only application persistence helpers.
The old mixed module is removed after all consumers migrate.

## Risks / Trade-offs

- Strict bounds can reject formerly unbounded inputs. → Limits exceed current
  stress-tier topic scale and fail before canonical persistence.
- Async calls add overhead inside the existing write lock. → The in-process
  implementation resolves immediately; lock restructuring is deferred to WS4
  to avoid combining parity and concurrency changes.
- Active specs contain historical contradictions. → Remove only requirements
  contradicted by current code/tests and add explicit current-state rules.
- Recomputing results in rebuilders duplicates pure compute. → Accept the cost
  for a strong worker trust boundary; all inputs are explicitly bounded.

## Migration Plan

1. Add red contract, parity, bounds, cancellation, malformed-result, and worker
   tests.
2. Add engine DTOs, rebuilders, migrated algorithms, and in-process engine.
3. Split persistence helpers and add the application adapter.
4. Inject and route service/compositions through the engine, then remove the
   mixed module.
5. Update specs/docs and run focused plus production validation.

Rollback is code-only because persisted and public contracts do not change.

## Open Questions

None.
