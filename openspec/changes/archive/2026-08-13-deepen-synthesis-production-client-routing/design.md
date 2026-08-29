## Context

See `proposal.md` for motivation. The Rust sidecar currently parses two embedded production manifests in a public library module, copies the full capability inventory into a separate ready roster, and keeps six structurally identical handler registries behind a central sequential dispatcher. Transfer, public-maintenance, artifact-delivery, and canonical-autosync behavior is then selected by additional capability-specific branches.

The current wire inventory and operation policies are fixed inputs. Transfer staging, background-task ownership, application behavior, and shutdown semantics are established modules and must remain behaviorally stable.

## Goals / Non-Goals

**Goals:**

- Make one deep Rust module own production manifest validation, route completeness, readiness, membership, and execution.
- Keep handler ownership local to each typed surface while eliminating repeated registry mechanics.
- Make startup diagnostics complete and deterministic.
- Test callers and routing through stable module interfaces rather than Rust source layout.

**Non-Goals:**

- Changing capability IDs, manifest schemas, wire DTOs, operation policy, discovery order, or public errors.
- Redesigning application, repository, canonical-store, maintenance, transfer, or process-lifecycle modules.
- Supporting plugins, runtime registration, arbitrary execution callbacks, or a generated route enum.
- Preserving the unused `synthesis_sidecar::production_capabilities` library path.

## Decisions

### Deepen `runtime_production_client`

The existing module becomes the only production routing module. It absorbs manifest parsing and policy validation, builds the validated catalog, and directly executes requests. Creating a sibling registry/router would expose catalog-plan pairing to callers and leave the original module shallow.

Its external binary-crate interface has two responsibilities:

- execute a request from request ID, capability, and payload;
- validate capability membership through a narrow immutable view used by transfer admission.

Metadata, handlers, route entries, and execution plans remain private implementation details.

### Build and freeze one catalog during composition

Each typed surface exports a static slice of minimal route entries. An entry contains only route ID, typed handler, one closed special step, and one closed canonical effect. The catalog explicitly aggregates the six slices; no link-time inventory, source scanning, macro registry, code generation, or runtime extension is used.

Catalog construction parses both manifests, recomputes the fingerprint, validates operation policy, identifies missing/duplicate/undeclared entries and invalid plans, and returns all issues together. Manifest order is preserved in the public inventory while a map provides lookup. Undeclared issues are sorted by route ID after manifest-ordered issues.

### Keep execution concerns orthogonal but closed

The catalog derives lifecycle, request/result data plane, deadline, receipt, access, and semantic-success rules exclusively from the operation manifest. Rust entries supply only facts the manifest cannot express:

- special step: none, artifact-export delivery, or maintenance-control resume;
- canonical effect: none, persisted, deleted, committed, mutated, non-empty promotion, or reference promotion.

Inline versus public-maintenance lifecycle and control/transfer/locator/delivery planes remain orthogonal. The catalog validates legal combinations at startup. This avoids both a combinatorial enum and an unconstrained Boolean/closure plan.

The runtime preserves the current execution ordering: lookup and bounds, request-plane preparation, lifecycle selection, typed dispatch, special post-dispatch work, canonical observation, result-plane publication, and stable error mapping.

### Move capability knowledge out of autosync

Canonical autosync continues to own debounce, maintenance epochs, and shutdown. It receives a validated canonical effect instead of matching capability strings. The shared pipeline still requires an observed SQL write before an inline effect becomes dirty. Reference maintenance routes use the plan to request a maintenance epoch and classify `promoted` separately from `unchanged`.

### Share transfer ownership without sharing `ServeState`

The production runtime is constructed from `Arc<ProductionApplications>`, `Arc<Mutex<NativeTransferOwner>>`, and `Arc<BackgroundTaskOwner>`. `ServeState` retains the same lifecycle and shutdown authority but stores the production runtime instead of a raw operation metadata map. Transfer handlers elsewhere use the same shared owner.

The transfer module receives a narrow membership view for external production-result manifests. It retains byte, hash, page, session, and filesystem validation. Membership is checked before session creation and disk writes.

Shutdown first stops admission and drains background/HTTP work as today, then releases production-runtime clones before unwrapping and closing storage owners.

### Recompute the manifest fingerprint in Rust

The sidecar crate declares the already locked `sha2.workspace = true` dependency. Catalog construction sorts capability IDs, joins them with `\n`, appends the final `\n`, and hashes those UTF-8 bytes. The declared fingerprint is compared with the computed lowercase hexadecimal digest. The Rust digest constant and fixed route-count assertion are removed.

### Separate language-neutral and Rust evidence

The TypeScript production-capability checker continues to validate the manifest fingerprint, grouped TypeScript inventory, operation metadata, and durable surface corpora. It no longer scans Rust constants, macros, or dispatcher text. Rust tests own catalog completeness and behavioral dispatch evidence.

Existing handler-count and cross-table equality tests are replaced, not duplicated. Domain handler behavior tests remain.

## Risks / Trade-offs

- **[Shared transfer owner changes shutdown ownership]** → Keep the existing stop/drain order and add a focused test proving production-runtime clones are released before storage close.
- **[A closed plan could omit an existing special path]** → Classify all current routes during catalog construction and retain representative tests for inline, input transfer, locator output, delivery, maintenance start/resume, and canonical effects.
- **[Moving autosync classification changes dirty timing]** → Preserve result predicates and the dynamic SQL write-count gate exactly; retain existing coordinator behavior tests through the new effect input.
- **[Removing source scanning reduces one cross-language check]** → Replace it with independent manifest checks plus Rust catalog construction tests that fail at the executable readiness seam.
- **[The production module becomes a large file]** → Prefer private sections or private subfiles only when navigation requires them; do not expose another module interface.

## Migration Plan

1. Add catalog-interface tests and verify they fail against the current split implementation.
2. Add fingerprint recomputation and manifest/policy validation to the deepened module.
3. Convert one surface to static route entries as a tracer slice, then migrate the remaining surfaces.
4. Move the complete execution pipeline and canonical effects behind the catalog.
5. Inject the runtime and membership view into composition and transfer; preserve shutdown ordering.
6. Remove the old public library module and duplicate source-shape evidence.
7. Run strict OpenSpec validation and focused/full Rust and Node gates.

The change is an atomic source migration. No parallel registry, fallback, compatibility facade, runtime rollout flag, release, or archive is part of implementation.
