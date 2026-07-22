## Context

Workflow control currently projects provider-specific backend options through workflow-shaped describe and validate calls. The same mixed shape feeds plugin settings, Host Bridge requests, and CLI submission, which makes a provider profile appear workflow-owned even though its schema and dynamic values are backend-owned. ACP runtime selections also travel through a session-specific path that can silently skip values missing from the current runtime catalog. Separately, the published CLI surface omits global arguments and workflow purpose text, package helper commands are only partly described, and reference-sidecar/citation-graph maintenance lacks a public Agent control path.

The implementation spans Zotero-compatible TypeScript, the Rust CLI, generated Agent Surface content, workflow manifests, package semantic sources, and Synthesis operations. No Node-only runtime API may be introduced into plugin code. Provider default environment resolution therefore belongs to the CLI process.

## Goals / Non-Goals

**Goals:**

- Make workflow input and provider profile independent contracts with independent discovery and validation.
- Combine the contracts only inside workflow submission preflight.
- Validate backend-specific dynamic provider values and prove whether they were applied.
- Add a CLI-owned, non-persistent default provider profile.
- Make every published command, option, workflow, and helper self-describing.
- Add bounded, independently approved sidecar and graph maintenance operations.
- Publish one accurate, ordered research journey in the Library Agent and Librarian profile.

**Non-Goals:**

- Persisting named provider profiles in Host Bridge or mutating the user's shell environment.
- Applying provider profiles to agent-owned workflow handoffs.
- Combining sidecar refresh and graph update into one workflow, approval, operation, or transaction.
- Dispatching a Host Bridge release or advancing release pointers.

## Decisions

### Workflow and provider contracts remain independent

Workflow descriptors own selection, workflow option schema, execution modes, result evidence, and a provider requirement expressed as request kind, accepted provider types, and capability identifiers. They do not return backend instances or provider option schemas.

Provider descriptors are keyed only by `backendId`. Providers own their option schema, dynamic catalog, normalization, and validation. They do not accept or return a workflow identifier. This keeps ACP and SkillRunner rules in their provider implementations rather than in workflow settings or Host Bridge handlers.

`workflow submit` is the sole join point. It validates workflow input, validates the provider profile, checks the workflow requirement against backend capabilities, and only then creates approval or execution state. Compatibility failures are distinct from invalid workflow input and invalid provider profile errors.

Alternative rejected: filtering provider schemas by workflow during describe/validate. That recreates the coupling this change removes and prevents profile reuse.

### Provider commands stay under the workflow CLI namespace without semantic coupling

The public commands are `workflow profile list`, `workflow profile describe --backend`, and `workflow profile validate`. The namespace keeps command discovery near workflow submission, while command payloads remain backend-only.

Workflow describe, requirements, and validate no longer accept provider profile input. Workflow validate no longer promises submit-shaped input; submit performs the composed preflight internally.

### The default provider profile is resolved by the CLI

`ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE` accepts inline JSON or an `@`-prefixed absolute file. An explicit `--provider-profile`, including `{}`, takes precedence. The CLI injects the resolved profile only into profile validation and workflow submission. Direct REST callers receive no implicit default, and plugin TypeScript never reads process environment variables.

The environment value is never logged or copied into evidence. CLI output may report only whether the source was explicit or environment-provided.

### Provider validation and application fail closed

ACP and SkillRunner providers refresh or read the selected backend's dynamic catalog before dispatch. Explicit values absent from that catalog are rejected rather than normalized away. ACP mode/model/reasoning application completes before the first prompt; any application RPC failure terminates the run. Both providers record only option keys, source, state, and reason code in application audit facts.

### Agent surfaces are package-local but share a descriptor core

The Rust CLI publishes `host-bridge.agent-surface.v3`, including global options and workflow catalog entries. Library Agent and Librarian helpers publish separate `agent-helper-surface.v1` artifacts because they are not guaranteed to be installed together. Parser inventories own argv syntax; semantic overlays own effects, result/error contracts, and recovery. Exact inventory-to-overlay coverage is a build invariant.

Workflow manifests gain required purpose descriptions and explicit execution-mode facts. Runtime lists, surface search, and generated profile catalogs consume those fields rather than reconstructing intent from labels or parameters.

### Sidecar and graph maintenance use independent asynchronous operations

`synthesis cache refresh-reference-sidecar` maps to `reference_sidecar.refresh`; `synthesis graph update` maps to `citation_graph.update`. Each capability requires its own Zotero UI approval and returns a `synt_operation` handle. The existing status surface is extended to read a specific operation.

Both commands accept either a normalized same-library paper-ref scope or an explicit library scope. Sidecar batches commit per paper and may complete with a partial outcome. Graph updates are atomic for the requested graph closure; full updates preserve the last-good graph. A sidecar receipt exposes a reference basis hash that graph update can compare before writing.

### Semantic guidance is source-owned and current-state only

The Library Agent owns the bounded on-demand research journey. The Librarian profile describes how a resident agent plans, monitors, and recovers the same sequence without assuming unattended write authority. Generated package targets are produced only by the existing renderers.

## Risks / Trade-offs

- [Breaking CLI shape for workflow validation] -> Surface identity moves to v3, generated guidance is updated in the same change, and tests reject stale command cards.
- [Backend catalog changes between validation and ACP session creation] -> Recheck before application and fail before the first prompt if the selected value is no longer available.
- [Default environment profile is valid but incompatible with a workflow] -> Return a dedicated compatibility error; never silently select another backend.
- [Full graph maintenance exceeds HTTP timeouts] -> Start an asynchronous operation and return a typed handle instead of waiting inside the call request.
- [Sidecar partial success leaves graph stale] -> Receipt lists successful and failed paper refs; graph update is a separate explicit step based only on the committed basis.
- [Large surface metadata becomes another fact source] -> Generate it from parser inventories, capability contracts, workflow manifests, and narrowly scoped semantic overlays with exact coverage checks.

## Migration Plan

1. Add delta specs and failing contract tests.
2. Split workflow and provider DTOs while retaining only submission as the composed adapter.
3. Add independent profile commands and CLI environment resolution.
4. Make ACP/SkillRunner validation and application fail closed.
5. Add Synthesis maintenance capabilities and operation receipts.
6. Add workflow descriptions, v3/helper surfaces, and semantic guidance.
7. Run content-only renderers and checks; do not run release dispatch.

Rollback is code-level: the change does not migrate persistent Host Bridge data or rewrite transcript/workflow stores. Existing generated content can be regenerated from the restored semantic sources.

## Open Questions

None. The workflow/provider boundary, environment ownership, maintenance transaction boundary, and published CLI scope are fixed by the approved plan.
