## Context

See `proposal.md` for motivation. Host Bridge has three governed agent-facing surfaces composed by `host-bridge/surfaces.json`. The minimum-core Skill and six Generic Skills are currently generated beneath `skills_builtin/`, so the Content Package owns bytes whose correctness depends on the plugin-bundled CLI. Runtime discovery then treats those Skills like ordinary official/user-overridable content.

The move is structurally broad but semantically narrow. `skills_src/` remains the instruction source, surface inheritance remains the seven-ID source of truth, Hermes output is unchanged, and the fixed clean baseline is `f6bdb17c89ef06478865d89c85725239dbeeb75d`. The Host Bridge semantic-surface contract forbids thinning, reordering, or silently dropping instructions during relocation.

## Goals / Non-Goals

**Goals:**

- Make the XPI and its CLI the atomic owner of the exact seven Host Bridge Skills.
- Preserve one composition source of truth and one in-memory rendering path.
- Verify package inventory, path safety, byte integrity, CLI identity, and baseline semantic parity at build and release boundaries.
- Expose the bundled Skills through the existing registry/catalog/injection architecture, with an exclusive source rule only for the reserved surface closure.
- Make startup and recovery failures explicit without preventing the rest of the plugin from loading.

**Non-Goals:**

- Changing Host Bridge guidance, command behavior, CLI source, build fingerprint inputs, surface patch versions, Hermes content, runner contracts, or externally published surface bytes.
- Introducing a second list of seven IDs, a Content Package exclusion list, or an XPI-specific ACP injection path.
- Supporting fallback to older or externally supplied copies of a reserved Skill.
- Publishing releases, tags, feeds, prebuilds, or dispatching Host Bridge workflows in this change.

## Decisions

### One manifest-resolved addon bundle

Minimum's generated root becomes `addon/content/host-bridge-skills/zotero-bridge-cli`; Generic's root becomes `addon/content/host-bridge-skills`. The surface model must prove the former is inside the latter and resolve inheritance to the exact seven-Skill closure. The unified renderer renders all seven packages in memory once, atomically writes the bundle root, prunes everything not declared, and reuses the same rendered results for the hosted profile.

This keeps `host-bridge/surfaces.json` as the only composition list. A hand-maintained packaging list or a Content Package exclusion list would eventually drift.

### Integrity manifest binds Skills to the CLI

The bundle root contains `manifest.json` with schema `host-bridge.plugin-skill-bundle.v1`. It records CLI version, build fingerprint, command-catalog checksum, minimum/Generic surface identity, each Skill's ID/mount/runner version, each file's relative POSIX path/byte length/SHA-256, and an aggregate digest over a canonical projection of the manifest entries.

Paths must be non-empty, normalized relative paths with no `.`/`..`, absolute prefix, backslash, NUL, or duplicate normalized target. The aggregate excludes its own value and is computed deterministically. This supports local development and packed-XPI reads without treating directory enumeration as trustworthy.

### Dedicated transactional runtime materialization

Startup reads the manifest and assets through the existing packaged-resource abstraction, validates the expected surface closure and release identity, stages all verified bytes under the runtime content area, then atomically swaps `<runtimeRoot>/content/xpi/host-bridge-skills`. A small materialization receipt records the aggregate digest; matching bytes can be reused on later starts.

The root is separate from official Content Package state. If validation or replacement fails, prior bytes may remain for diagnosis, but the materializer returns no valid current root, startup records a structured diagnostic, and the first registry scan excludes all reserved IDs. This avoids a half-written tree and avoids silently running stale guidance.

### Registry owns exclusive source policy

`pluginSkillRegistry` adds source kind `xpi-bundled`. Reserved IDs are derived from the surface closure passed with the materialized bundle, not repeated in registry code. For those IDs, only the current validated XPI root is eligible; official, development-local, and user candidates produce structured `reserved-source` diagnostics and are discarded. Other Skills retain `official < dev-local < user` precedence.

ACP Chat, ACP Skills, workflow dependencies, Host Bridge agent runs, and SkillRunner `local-package` continue consuming selected registry entries. ACP Chat's whitelist must be checked against the surface closure but does not gain a direct XPI reader. SkillRunner `installed` remains backend-owned.

### Catalog and recoverable state carry bundle identity

Shared catalog metadata records the aggregate digest and CLI identity while catalog IDs still incorporate selected Skill checksums. Recoverable ACP Chat and ACP Skills state records the same bundle identity. Recovery compares the stored identity with the current validated identity before starting or reconnecting a process; mismatch returns `host_bridge_plugin_skill_bundle_identity_changed` and requires a new run.

Exact identity comparison is intentionally strict. Trying to prove cross-version compatibility would recreate the split ownership this change removes.

### Receipt ownership follows the artifact owner

Content Package preparation and feed publication drop the Host Bridge complete-receipt prerequisite. Plugin release gains that prerequisite and validates the built XPI's Skill manifest together with all seven CLI binaries, sidecars, and the CLI release manifest. Release coordination treats the new addon path as Host Bridge/plugin-owned; remaining `skills_builtin/` paths continue to classify as Content Package changes.

The plugin build explicitly includes `addon/content/host-bridge-skills/**/*` so extensionless assets remain packageable. The Content Package builder remains generic and naturally stops seeing the moved directories.

### Baseline path mapping preserves depth gates

The package validator accepts repeatable `--baseline-root-map <current>=<baseline>` arguments. For this change it maps `addon/content/host-bridge-skills` to the baseline commit's `skills_builtin`. All 159 previously materialized files remain individually comparable. Reference reachability and relative substantive-line/prose checks use the mapped path; the mapping does not authorize semantic changes.

The approved deletion inventory contains only the seven former generated directories. It contains no instruction, reference, asset, or runner-contract semantic deletion. The semantic handoff must report zero unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate units, and explicitly dispose every baseline advisory warning as unchanged relocation or expansion.

## Risks / Trade-offs

- [Packed-resource APIs differ from development file reads] → Keep one manifest-driven reader with tests for packed URI/XHR and local-path branches; validate the same bytes after materialization.
- [Atomic directory replacement differs by platform] → Stage beside the target, validate completely before swap, use the project's bounded filesystem abstraction, and never register a partially replaced root.
- [A damaged XPI makes reserved Skills unavailable] → Continue plugin startup, publish a structured diagnostic, preserve prior bytes only for forensics, and forbid fallback that could mismatch the CLI.
- [The seven-ID closure could drift between rendering and runtime] → Resolve it from the surface manifest in build tooling, emit it in the signed-by-digest bundle manifest, and verify runtime/catalog whitelists against that projection.
- [Release gating could be accidentally duplicated] → Remove the Content Package receipt checks and add focused classification/workflow tests proving exactly the plugin path owns the gate.
- [Large generated relocation obscures semantic loss] → Pin the baseline commit, map paths explicitly, compare all 159 files, retain the 28 advisory dispositions, and run semantic parity independently from mechanical thickness checks.

## Migration Plan

1. Record the clean baseline, deletion inventory, file metrics, and warning inventory before changing generated paths.
2. Add failing focused tests for surface resolution, rendering/pruning, baseline mapping, XPI validation, runtime materialization, registry exclusivity, catalog identity, recovery rejection, archive inventory, and release classification.
3. Move the manifest-resolved generated roots and render the unified plugin bundle without editing semantic sources.
4. Add build/release verification and move receipt ownership.
5. Materialize the bundle before registry scan, add `xpi-bundled` selection, and propagate identity through catalogs and recoverable state.
6. Remove the seven obsolete generated directories, update current-state documentation, bump plugin/content versions, and run the complete focused validation set.

Rollback requires reverting the complete change as one unit before publication. A partial rollback would reintroduce ambiguous ownership and is not supported as a runtime compatibility mode.
