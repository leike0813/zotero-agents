## Context

See `proposal.md` for motivation. The archived read and selection changes provide portable refs, Saved Search pages, and the shared short Host slice. The current Broker still exposes four legacy open helpers; Host Bridge exposes four `/context/*/open` routes; MCP mirrors the incomplete registry; CLI still owns `context ... open`; Workflow Host v12 still projects `navigation` in code even though the current spec requires it to be absent.

The fixed Zotero references show one stable family of native seams: `ZoteroPane.viewItems`, `Zotero.FileHandlers.open`, `Zotero.Reader.open`, `Zotero.Reader.getByTabID`, Reader `navigate`, and `Zotero_Tabs` selection. Zotero 7/9 expose mostly single-row collection-tree state while Zotero 10 also exposes multi-row state, so the Broker must feature-detect the public row/selection methods and verify public postconditions instead of depending on one row shape.

## Goals / Non-Goals

**Goals:**

- Make the Broker the only semantic owner of seven bounded navigation operations.
- Bind every remote or workflow call to one trusted target window and a strict pre-effect validation boundary.
- Project the same registry and schemas through Bridge, MCP, and CLI, including caller-scope admission.
- Remove Workflow navigation and all legacy context-open paths without compatibility aliases.
- Produce real native evidence for Zotero 7.0.32, 9.0.6, and 10.0.1.

**Non-Goals:**

- No generic navigation framework, second credential system, Pi tool, mutation projection, release identity, prebuild, or publication.
- No DOM inspection, pixel-level Reader verification, OS-focus guarantee, automatic retry, or fallback to another window.
- No changes to unrelated notification, workflow queue, mutation, or Generic task guidance.

## Decisions

### One Broker owner and one registry

Keep the existing Broker, strict DTO validators, `ZoteroHostCapabilityError`, and Host-slice admission. Add the seven operations as one private navigation implementation and expose them only through the existing Host Bridge registry. This avoids duplicating semantic validation in REST, MCP, CLI, or Workflow code. A new cross-domain navigation framework was rejected because it would add an abstraction with one implementation.

### Closed portable inputs and minimal results

Use direct portable refs for single targets, `{ items }` for bounded reveal, and a closed `ReaderLocation` union. Reject undeclared fields, wrong kinds, duplicates, cross-library refs, mixed active/deleted targets, invalid page indexes, and overlong CFI before any UI effect. Return operation-specific dispatch evidence rather than a generic receipt or a UI snapshot.

### Trusted target-window control

Extend the existing trusted `WorkflowCallControl` seam with `target.resolveAndValidate()`. Bridge, MCP, and CLI capture `Zotero.getMainWindow()` once at request admission; Workflow and future turn-origin callers supply their trusted resolver. No public window ID, persistent window reference, per-window Broker, or ambient fallback is introduced.

### Native feature detection with fail-closed Reader fidelity

Use the shared `ZoteroPane`/`Zotero_Tabs`/Reader/FileHandlers seams. For collection-tree selection, prefer the available public `selectByID`/`selectItems`/selection APIs and normalize either single-row or multi-row public row facts before verifying the requested target. For Reader, use only `Reader.open`, `getByTabID`, and instance `navigate` when the resulting tab belongs to the captured window. If an exact target/location cannot be proven before the effect, return the closed `location_unsupported` reason; do not use a location-free or different-window fallback.

### Scope is transport admission, not a Broker concern

Keep the Broker unaware of caller identity and approval. Parse `X-Zotero-Bridge-Scope` once per MCP request, reuse the Host Bridge mapping for registry list/call and CLI/raw call, hide denied tools from discovery, and reject denied calls before Broker invocation. Eligible operator and interactive navigation is direct host control and does not create a per-call approval prompt.

### Vertical TDD seams

Extend the existing Broker, Bridge, MCP, Workflow Host, and Rust CLI seams rather than mocking internal collaborators. Add one Zotero-runtime navigation test module to the full core and compatibility probe suites for three-version native evidence. Use the complete fail-closed Broker harness; missing capabilities must raise stable unavailable errors.

## Risks / Trade-offs

- [Zotero 7/9 and 10 expose different collection-tree row shapes] → Normalize only public row facts and verify one public postcondition; unsupported shapes fail closed.
- [Reader.open may reuse a global or different-window tab] → Check captured-window ownership before navigation and refuse paths that cannot prove exact targeting.
- [UI effects are not transactional] → Validate all targets before the first effect, define the dispatch boundary, and do not claim rollback or automatic retry.
- [Generated surfaces and CLI release identity can drift] → Edit executable contracts and source Skills only, render generated content, run semantic/content/mirror checks, and defer release-set/prebuild changes to the final release workflow.
- [Pre-existing help-doc manifest edit] → Snapshot and compare its existing diff around renderer/build checks; preserve the user-owned change exactly.

## Migration Plan

1. Record baseline commit, materialized surface metrics, the explicit DEL-09/10/11 inventory, and the three-version native audit.
2. Add failing Broker tests, implement the seven operations, then migrate registry/server and remove legacy REST paths.
3. Add MCP scope/list/call tests, migrate the CLI contract/parser/commands, and remove old context-open commands and generated cards.
4. Remove Workflow Host navigation and update conformance, docs, and source guidance.
5. Render governed content and the Chinese review mirror from source; run focused, full, Rust, and compatibility checks.
6. Run official OpenSpec verification, strict validation, sync, and archive. Do not commit, push, prepare a release, or dispatch publication.
