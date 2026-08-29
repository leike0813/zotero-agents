## Context

See `proposal.md` for motivation. The current Workflow Host projection is explicitly composed in `hostApi.ts`, while version and availability knowledge is repeated by the loader, runtime diagnostics, input planning, debug probes, package compatibility guards, tests, and documentation. `resources` exists only on the Host Bridge non-interactive projection; picker and editor members remain present there but fail interaction attempts. Runtime-sensitive adapters must remain late-bound, and the built-in package must remain self-contained.

## Goals / Non-Goals

**Goals:**

- Concentrate current Workflow Host contract identity and variant conformance behind a small, side-effect-free interface.
- Preserve explicit member-level composition, runtime late binding, stable diagnostic fields, and the package's `[2, current]` compatibility policy.
- Make missing and accidental top-level capability exposure fail at test/build seams.
- Keep active contract documentation aligned without locking prose or formatting.

**Non-Goals:**

- Creating a complete runtime capability catalog or duplicating every `WorkflowHostApi` member.
- Merging Workflow Host identity with the Zotero Host Capability Broker or Host Bridge capability registry.
- Moving hook execution-mode labels into the identity owner.
- Adding eager production-wide conformance rejection, changing package compatibility, or changing public Workflow Host members.

## Decisions

### Side-effect-free contract owner

Add `workflowHostContract.ts` as the owner of the current version, internal top-level capability declarations, diagnostic probes, version resolution, and structured variant inspection. `hostApi.ts` remains the composition root and imports the current version. Callers use the owner's inspection result instead of maintaining boolean summaries.

Keeping the owner in `hostApi.ts` was rejected because composition imports runtime-sensitive adapters and already has a different responsibility. A full method registry was rejected because it would duplicate the TypeScript interface and violate the explicit-projection rule.

### Identity and availability are separate

The owner declares capability identities; inspection observes whether a selected projection supplies them. Interactive and non-interactive are contract variants. Precompiled, legacy text, and node-native remain hook execution modes owned by loader/runtime modules.

`resources` is allowed to be absent from the interactive variant and required by the non-interactive variant. All other declared top-level capabilities are required in both variants. The stable `saveFile` diagnostic probe remains a member-level observation, while newly covered `command` and `resources` fields are additive.

### Version resolution is explicit

Version resolution uses an explicit finite override first, then the selected projection's finite `version`, then the current version only when the caller knows it created the current projection. Unknown external projections resolve to `0`. This preserves legacy test adapters and stops input planning from reporting `0` for an internally created current projection or runtime code from falsely labeling an external projection as current.

### Compatibility remains consumer policy

The built-in package keeps its self-contained minimum and maximum version constants. It does not import TypeScript or receive a generated module. A governance test imports the current identity and verifies the package guard accepts the current version plus representative lower and out-of-range values.

### Conformance is strict at gates and observational in production

Inspection returns structured missing, unexpected, and version mismatch facts. Tests treat any fact as failure for the relevant variant. Production diagnostics consume the summary but do not reject the whole projection eagerly; existing accessors continue to fail when a requested capability is unavailable.

### Documentation uses a narrow semantic gate

The governance test scans only explicit `Workflow Host API vN` declarations in the current SSOT document and active broker spec, comparing numeric declarations with the owner. It ignores surrounding prose, formatting, and archived changes. Active v8 headings are rewritten as current v11 or unversioned requirements.

## Risks / Trade-offs

- **An internal capability declaration can drift from the TypeScript interface** → conformance compares actual top-level keys in both directions and replaces the existing duplicated key-list assertion.
- **Additive summary fields can affect exact consumers** → preserve all existing fields and verify diagnostics through semantic subsets; only `command` and `resources` are added.
- **An external adapter without version metadata can be ambiguous** → report `0` unless the caller explicitly identifies it, avoiding a false current-version claim.
- **Documentation checks can become brittle** → scan only explicit version declarations that are themselves contract text; do not snapshot prose.

## Migration Plan

1. Add failing contract inspection, version resolution, package range, and documentation declaration tests.
2. Add the contract owner and migrate composition, loader, runtime, input planning, and debug diagnostics.
3. Update domain vocabulary, current SSOT documentation, and active OpenSpec wording.
4. Run focused tests, TypeScript, formatting/lint, and strict OpenSpec validation.

Rollback is a source-level reversal. No persisted data, release identity, or external deployment changes.
