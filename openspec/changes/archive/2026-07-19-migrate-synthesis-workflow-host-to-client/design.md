## Context

The client foundation and lifecycle migrations reduced direct legacy Synthesis consumers to seven. `WorkflowHostApi.synthesis` remains typed as and implemented by spreading `SynthesisService`, even though current built-in workflows use a bounded set of apply, Topic report, paper artifact, Tag Vocabulary, staging, and audit methods. Topic apply additionally passes functions through `resultContext` or `bundleReader`, and digest apply passes a live Zotero item, so neither call is transport-safe yet.

## Goals / Non-Goals

**Goals:**

- Replace the full workflow service exposure with a twelve-method `WorkflowSynthesisApi`.
- Add grouped environment-neutral client capabilities and package-owned DTOs.
- Resolve live Zotero items and run-workspace files on the plugin side before the client call.
- Preserve built-in workflow results, Topic conflict behavior, and existing Workbench invalidation timing.
- Remove `src/workflows/hostApi.ts` and `src/workflows/types.ts` from the legacy consumer inventory.

**Non-Goals:**

- Migrate Workbench, Host Bridge, MCP, or the read-only harness.
- Add HTTP/SSE, a Node process, or remote storage ownership.
- Preserve unrecorded access by custom workflows to the other legacy service methods.
- Change Topic, tag, digest, or paper-artifact business rules.

## Decisions

### 1. The public workflow facade is narrow; the internal client remains grouped

`WorkflowHostApi.synthesis` uses a plugin-facing `WorkflowSynthesisApi` containing the twelve current workflow methods. It is composed from `SynthesisClient.workflowApply`, `topics`, `artifacts`, and `tags`; the full client and full legacy service are not exposed to workflow code.

Alternative: expose `SynthesisClient` directly. Rejected because workflows would gain lifecycle and future unrelated capabilities.

### 2. Host API construction remains synchronous through lazy method routing

`createWorkflowSynthesisHostApi` returns an object synchronously. Each method awaits `getDefaultSynthesisClient()` only when called. Tests can inject a resolver into this focused factory without changing the broad host factory signature.

Alternative: make `createWorkflowHostApi` asynchronous. Rejected because it would widen an unrelated runtime migration.

### 3. Live Zotero items become explicit workflow item snapshots

The plugin extracts library/item identity, title/date/year, creators, tags, collections, identifiers, URL, citekey, and date-added fields. The digest client request contains only this snapshot plus JSON-safe artifact payloads. Existing item extraction becomes one shared host helper rather than duplicated workflow/service logic.

### 4. Topic run-workspace assets are materialized before the client boundary

The plugin reads explicit path fields and flat artifact-manifest entries through the existing `resultContext`/`bundleReader`. It rewrites them to deterministic `asset/NNNN` identifiers and returns a JSON-safe bundle plus asset texts. The contract permits at most 256 assets, 5 MiB per asset, and 50 MiB aggregate. Missing, invalid, or oversized inputs fail as `invalid_request` before a mutation begins.

The in-process adapter reconstructs a read-only bundle reader over the asset map and calls the current service. Absolute paths and functions never enter contracts.

### 5. DTO ownership moves to contracts without implementation records

Workflow-facing Topic apply results, Topic reports, paper artifact summaries, tag snapshots, staged suggestions, and audit requests/results are defined in `synthesis-contracts`. Implementation modules import or re-export these definitions. Repository rows, canonical filesystem paths, Zotero objects, and `Parameters<SynthesisService[...]>` are forbidden.

### 6. Existing invalidation semantics are preserved

Digest apply and tag-audit/clear commands publish the same Workbench invalidations only after successful client completion. Other methods do not gain new invalidation side effects in this change. Non-idempotent commands are not automatically retried.

## Risks / Trade-offs

- **Custom workflows may use removed service methods** → Document the twelve supported methods and fail at type/runtime capability checks instead of maintaining a god-object shim.
- **Topic asset rewriting may miss an indirect locator** → Cover every path field declared by `SynthesisResultBundle`, flat manifest entries, relative bundle reads, and ACP absolute resolver reads with parity tests.
- **Inline asset materialization increases memory use** → Enforce the selected count/per-asset/aggregate bounds before client invocation; later remote transport may replace inline text with streams.
- **Moving DTO definitions can expose hidden non-JSON fields** → Contract typecheck and runtime JSON-safety tests fail on functions, `undefined`, host objects, and absolute locators.

## Migration Plan

1. Add red contract, routing, materialization, parity, and direct-consumer tests.
2. Add grouped contract DTOs and the narrow workflow facade type.
3. Implement item snapshot and Topic asset materialization.
4. Extend the in-process/default client adapter and migrate workflow host/types.
5. Update migration inventory and active workflow API docs.
6. Run focused workflow suites, boundary/invariant checks, typechecks, documentation checks, and production build.

Rollback restores the workflow host facade; no production data migration or ownership switch occurs.

## Open Questions

None.
