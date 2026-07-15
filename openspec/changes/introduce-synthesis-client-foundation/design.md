## Context

The legacy Synthesis service is both the current composition root and a 126-method public object. The boundary change records ten direct consumers. The lowest-risk real consumer, workflow Topic option resolution, already needs one query and supports injected dependencies, so it can prove the client seam without moving storage or runtime ownership.

## Goals / Non-Goals

**Goals:**

- Establish a separately typechecked, environment-neutral contracts package.
- Make client capabilities grouped rather than reproducing the flat service surface.
- Provide stable client errors and JSON-safe DTO types.
- Prove the seam with one production consumer and preserve observable workflow option behavior.
- Reduce the direct legacy consumer allowlist without allowing consumer growth.

**Non-Goals:**

- Migrate Workbench, workflow apply, Host Bridge, MCP, hooks, observer, or harness consumers in this change.
- Add HTTP, SSE, a Node runtime, Host Capability ports, or remote process lifecycle.
- Move DB, canonical file, mirror, or Zotero ownership.
- Define empty placeholder methods for future capability groups.

## Decisions

### 1. Add an npm workspace package with source-first TypeScript contracts

`packages/synthesis-contracts` is an npm workspace with its own strict, no-emit TypeScript project and no Node, DOM, Zotero, or plugin dependency. The plugin temporarily imports its source by a relative path so builds do not depend on an install-generated workspace symlink. Later service packages may consume the same workspace through normal package resolution.

Alternative: place contracts under `src/modules`. Rejected because the service would eventually need to import plugin-owned source and reverse the target dependency direction.

### 2. Introduce only a real capability slice

The initial `SynthesisClient` contains a `topics` capability with `listWorkflowOptions`. Shared common types define JSON values, request scope, bounded page metadata, diagnostic errors, and `SynthesisClientError`. Later changes add capability interfaces when they have real migrated consumers; empty or flat compatibility surfaces are forbidden.

### 3. Keep legacy composition behind a narrow port

`createInProcessSynthesisClient` accepts a `LegacySynthesisTopicPort`, not `SynthesisService`. `defaultClient.ts` is the sole composition adapter added to the direct-consumer inventory and dynamically resolves the current default service. This makes the adapter replaceable without leaking the god object type.

### 4. Map failures once at the client boundary

The in-process adapter preserves an existing `SynthesisClientError`; other exceptions become `internal` client errors with diagnostic cause data. Callers use the stable code for control flow and may surface the message only as a diagnostic.

### 5. Split WS1 into independently verified changes

This foundation migrates the lowest-risk consumer. Workbench and integration proxies are separate follow-up changes because their query/command surface and regression suites are materially larger. The parent Stage 1 exit gate still requires every production consumer to use the client.

## Risks / Trade-offs

- **Relative source import can look like package leakage** → Only plugin composition imports the package source; static guards protect package dependencies, and a later build change can switch to workspace resolution once service artifacts exist.
- **The first client is intentionally small** → The API grows only from concrete use cases, preventing a remote copy of the legacy service.
- **Error normalization can hide useful causes** → Preserve a bounded JSON-safe cause description in diagnostic details while keeping stable codes authoritative.
- **Two DTO export paths exist temporarily** → The legacy service re-exports the package-owned types; the package remains the single definition.

## Migration Plan

1. Add red contract, error, adapter, consumer-routing, and boundary tests.
2. Add the workspace contract package and root typecheck gate.
3. Add the narrow in-process adapter and default composition module.
4. Migrate workflow Topic option resolution and update the migration inventory.
5. Run contract/root typechecks, targeted tests, invariant checks, and build.

Rollback removes the new consumer seam and workspace package; production data is unaffected because ownership never changes.

## Open Questions

None.
