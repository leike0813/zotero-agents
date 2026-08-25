## Context

See `proposal.md` for motivation. The current implementation already has a deep Zotero serialization and mutation module, but its returned object type is inferred downstream, workflow runtime objects attach whole capability families, and MCP retains both a Host Bridge mirror and an obsolete direct registry. `WorkflowHostApi` is public at version 11 and must remain compatible. Host Bridge v2 owns external permissions and remote file delivery.

The fixed semantic baseline for governed Host Bridge surfaces is commit `b5193e0c4674f02a6a294c2b47a53a1d0c1576df`. The authorized deletion inventory for agent-facing instructions is empty.

## Goals / Non-Goals

**Goals:**

- Give the broker interface, DTOs, factory, resolver, serializers, and error taxonomy one production owner.
- Preserve a shallow and stable v11 workflow interface without allowing broker growth to leak into it.
- Make JSON-safety correct by construction and keep remote locality and permissions in adapters.
- Make Host Bridge the only remote capability execution path and MCP its exact mirror.
- Remove dead compatibility code and test casts that conceal interface drift.

**Non-Goals:**

- Replacing workflow legacy raw handler domains or changing their behavior.
- Adding a broker runtime version, singleton identity, cache, reset hook, proxy, generic string dispatch bus, or runtime capability catalog.
- Moving permission decisions into the broker.
- Changing Host Bridge protocol major version, dispatching a release, or publishing generated content.
- Expanding navigation into the public Workflow Host API v11 surface.

## Decisions

### Canonical broker with derived explicit workflow projection

`zoteroHostCapabilityBroker.ts` owns `ZoteroHostCapabilityBroker`, its capability member types, strict DTO types, `createZoteroHostCapabilityBroker`, and `resolveZoteroHostCapabilityBroker`. `workflows/types.ts` imports broker types only. It derives members with member-level `Pick` where signatures are identical and defines narrow workflow adapters only where v11 raw-reference inputs must remain wider. `hostApi.ts` constructs fresh object literals and uses `satisfies` to reject both missing and accidental members.

This keeps one signature source while preserving two interfaces with different audiences. A single public interface would either expose workflow-local services to remote callers or force workflow code through a generic remote-shaped dispatch interface. Whole-family assignment was rejected because broker additions would silently expand workflow runtime objects. Proxy/catalog derivation was rejected because it hides the public method set and weakens navigation locality.

### Strict JSON by construction

Portable broker references exclude raw Zotero objects. Serializers explicitly normalize host fields and omit absent optional properties. Open payload slots use a recursive strict JSON validator that rejects lossy values; `JSON.stringify/parse` is not a sanitizer. Conformance tests recursively inspect representative public results. Production results are not recursively cloned after construction, avoiding a second traversal of bounded library pages and snapshots.

### Capability effects and adapter policy

`context` contains queries only. `navigation` contains selection/focus effects. `mutations` contains preview and execute. The broker performs validation and effects but does not decide whether a caller is allowed to expose or execute them. Host Bridge and workflow adapters own permission and interaction policy. Existing external approval behavior remains unchanged.

### Stable coded broker error

One `ZoteroHostCapabilityError` replaces item, note, collection, invalid-ref, and navigation subclasses. Its public fields are a closed code union, retryability, and strict JSON details. Host Bridge and MCP translate canonical codes to their existing external protocol codes. Raw refs and causes are not serialized or retained as public details.

### JSON-safe is not remote-safe

The in-process broker may retain a string local path where Workflow Host API v11 requires it. Host Bridge registry is the sole remote locality adapter. A shared attachment projector removes paths and registers opaque download descriptors for both library reads and mutation results. MCP forwards the projected Host Bridge result without a second sanitizer.

### MCP has one execution path

MCP tool definitions come only from the Host Bridge executable capability contract. Tool calls use the Host Bridge registry, including its validation, permissions, error mapping, and result projection. The old direct registry, `resolveHostApi`, manual partial projection, and exclusive helpers are deleted atomically; no compatibility aliases remain.

## Risks / Trade-offs

- **Large atomic type migration may reveal hidden consumers** → use TypeScript and symbol-impact checks after each vertical TDD slice; do not add compatibility casts.
- **Strict JSON validation may reject previously tolerated malformed host/mock values** → normalize well-defined scalar fields and reject only values that cannot satisfy the documented DTO contract.
- **Workflow raw-reference widening can duplicate signatures** → derive outputs and unchanged parameters from broker members and keep widening local to the workflow type adapter.
- **Remote attachment projection can fail to register a file** → always remove the path and return an explicit unavailable access state rather than leaking or throwing away the attachment metadata.
- **Deleting MCP code may remove a helper with an active non-registry caller** → trace callers before deletion and let type checking plus the complete MCP suite prove the active mirror path.
- **Host Bridge generated guidance can drift after contract edits** → pin the baseline, run semantic review and renderer checks, require zero unmapped, downgraded, unauthorized-dropped, and duplicate semantic units.

## Migration Plan

1. Add failing tests for the four agreed seams and introduce the fail-closed test broker harness.
2. Establish canonical broker types, portable references, strict serializers, navigation, and coded errors.
3. Materialize the explicit Workflow Host API v11 projection and normalize raw workflow references.
4. Migrate Host Bridge registry/server and project all remote attachment results.
5. Migrate MCP tests and runtime to the Host Bridge mirror, then remove dead registry code and compatibility aliases.
6. Update project constraints, domain vocabulary, SSOT documentation, and executable contracts.
7. Run targeted tests, type/lint checks, OpenSpec validation, Host Bridge semantic review, render checks, and change verification.

Rollback is file-level reversal of this uncommitted change. No persisted data, database schema, release identity, or external deployment is modified.
