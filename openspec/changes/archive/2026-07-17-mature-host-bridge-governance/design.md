## Context

Host Bridge publishes a Rust CLI wrapper, an on-demand Zotero Library Agent bundle, and a resident Zotero Librarian profile. They have separate public versions and repositories but consume one CLI binary set and one command/workflow protocol. SemVer equality cannot prove compatible commands or bytes, separate publication paths can leave mutable surfaces at different logical releases, and prose-only agent guidance cannot reliably express command risk, typed handles, workflow ownership, or recovery state.

The design must preserve the three repositories and independent component versions, keep GitHub Actions as external publication authority, avoid CI version self-commits, and keep generated timestamps outside content identity.

## Goals / Non-Goals

**Goals:**

- Give every prepared Host Bridge publication one deterministic identity and recoverable state machine.
- Let agents discover exact CLI compatibility, commands, approvals, handles, execution modes, and safe recovery without connecting to Zotero or parsing prose.
- Give maintainers one read-only plan, one prepare command, and one automatic release workflow.
- Preserve clear policy ownership among the CLI wrapper, bounded Library Agent, and resident Librarian Profile.
- Detect semantic changes relative to the merge base even from a clean feature checkout.

**Non-Goals:**

- Merge the three public repositories or force their component versions to match.
- Replace the Host Bridge HTTP protocol or workflow runtime.
- Give agent-owned execution options that the underlying workflow cannot accept.
- Publish or mutate external repositories during local preparation.
- Treat generated output or project Skill prose as the source of command truth.

## Decisions

### One release set is the logical publication unit

Materialize `host-bridge.release-set.v1` from source commit, workflow run, protocol/schema versions, exact CLI identity, seven-platform binary set, and each surface's version, digest, repository, and immutable target. Derive `releaseSetId` deterministically from identity-bearing fields. Every surface manifest embeds the same envelope.

Exact compatibility uses CLI version, build fingerprint, and command catalog checksum. The binary aggregate additionally proves packaged bytes. This is preferred over SemVer matching because independently built binaries can expose different commands under the same version.

### Planning, preparation, and publication are separate states

`release:host-bridge:plan` is read-only and compares merge-base changes plus the last materialized release identity. It classifies CLI binary inputs, installers, each public surface, and generated-only drift. `prepare:host-bridge-release` applies required component bumps once, renders all surfaces, materializes the release set, and runs unified checks.

Preparation never counts as publication completion. The repository-level release coordinator accepts Host Bridge completion evidence only from a `host-bridge.release-receipt.v1` for the same `releaseSetId` with `status: complete`.

### One workflow publishes immutable targets before mutable pointers

`release-host-bridge.yml` owns build-or-restore selection, manifest materialization, three-surface publication, remote verification, and receipt generation under global release concurrency. It creates or reuses immutable targets first. Mutable `main` or `latest` pointers advance only after all remote manifests verify.

Recovery resumes the same `releaseSetId`, skips verified immutable targets, and never rebuilds different bytes under an existing component version. This is preferred over compensating rollback because immutable partial progress is safe and auditable.

### Agent Control Contract is generated from canonical command data

`host-bridge.agent-surface.v1` describes command argv/input/output schemas, intent category, endpoint/capability mapping, approval and danger, pagination/file output, consumed and returned handles, retryability, state change, and recovery actions. The Rust CLI embeds the descriptor and exposes `surface identity`, `surface describe`, and `surface search` without profile loading or network access.

Generated Skill/Profile references consume the same descriptor and exact CLI identity. Human semantic sources explain decision policy; they do not recreate the command catalog.

### Workflow ownership and apply-back state are explicit

Workflow describe/requirements returns structured Host-owned and agent-owned `executionModes`, including supported options, required parameters, monitoring, and apply-back. Semantic routing must honor this structure.

Agent apply-back validates every result bundle before approval or handle consumption. Once application starts, it records per-request receipts containing successes, failures, state change, handle consumption, and recoverability. This makes partial writes auditable and prevents invalid bundles from consuming the run handle.

### Semantic sources have one owner per policy layer

The CLI wrapper owns installation, connection, identity, output/error contracts, and invariant controls. The Library Agent owns bounded Zotero task routing and evidence handoff. The Librarian Profile owns resident index, scheduling, monitoring, and maintenance policy. Shared sources contain only terminology and protocol-level control invariants.

The semantic collector reads owned source groups, compares against the merge base plus staged/unstaged/untracked changes, and classifies Agent Control/Release Set contracts, OpenSpec files, semantic sources, release metadata, and generated targets. Generated-only drift requires rendering but not semantic review or a version bump.

### Component versions remain independent

The Rust CLI, wrapper `runner.json`, Library Agent bundle, and Librarian Profile retain independent versions. Public digest changes require the owning patch bump; generated-only drift and another component's patch-only release do not. Breaking protocol/schema changes require explicit minor/major release intent.

## Risks / Trade-offs

- [A release set can remain partially published] → Keep immutable targets, block mutable pointers, and resume by `releaseSetId`.
- [Descriptor and Rust parsing can drift] → Generate/check the catalog against the packaged binary identity and fail mismatched manifests.
- [Semantic review can over-classify broad changes] → Keep deterministic path/source ownership and report classified groups instead of inferring prose intent in scripts.
- [Independent versions are harder to read manually] → Put all component versions and exact CLI identity in the release-set envelope and receipt.
- [Apply-back can partially mutate Zotero] → Preflight all bundles and persist itemized receipts once consumption begins.
- [Long generated references can hide routing policy] → Keep first-level Skills short and load generated command/output/error references progressively.

## Migration Plan

1. Add Release Set, release receipt, and Agent Control Contract schemas and deterministic generators.
2. Add offline CLI surface commands, structured errors, workflow execution modes, and apply receipts.
3. Refactor the three semantic sources and bring all generated files under renderer ownership.
4. Add merge-base-aware planning and semantic review, independent version decisions, and unified preparation.
5. Replace Host Bridge publication workflows with `release-host-bridge.yml`; prepare the change in the source branch without CI self-commits.
6. Validate descriptors, seven-platform checksums, all three manifests, failure recovery, semantic ownership, and representative agent journeys.
7. Publish only through the authorized workflow after merge. Rollback disables the unified workflow and leaves immutable targets intact for audit.

## Open Questions

None.
