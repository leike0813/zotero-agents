## Context

Host Bridge currently exposes a generated CLI wrapper for command correctness and a Hermes Zotero Librarian profile for continuous operation in a fixed workspace. The new surface must serve any third-party agent that needs Zotero access during a task, remain usable without a platform-specific scheduler, reuse GitHub-built CLI prebuilds, and preserve protocol facts as a single source of truth. ResearchSpec is a future consumer, but it keeps its own file-contract workflow authority and is not modified here.

## Goals / Non-Goals

**Goals:**

- Publish a self-contained, agent-neutral bundle with complete on-demand Zotero and Zotero Agents operating guidance.
- Keep command, terminology, handle, approval, workflow, and writeback facts synchronized across all agent-facing surfaces.
- Provide a portable evidence contract and deterministic, stateless validation helpers.
- Integrate rendering, versioning, checks, and publication into the existing fingerprint-gated Host Bridge release pipeline.

**Non-Goals:**

- Reproduce the Zotero Librarian profile's resident index, cron, inbox, run registry, or maintenance posture.
- Add Host Bridge endpoints or Rust CLI commands.
- Modify ResearchSpec, own its artifact registry, or add a second workflow state authority.
- Publish, push, or create external repositories during local implementation.

## Decisions

### Three independent semantic surfaces

Keep `zotero-bridge-cli`, `zotero-library-agent`, and `zotero-librarian-profile` as separate semantic sources. Share only a compact `control-invariants.md` reference plus generated command/catalog material. This avoids forcing the general agent through resident-maintenance exclusions and avoids copying protocol facts. The rejected alternative was making the general Skill the Profile's base layer; their task lifecycles differ too much for that composition to remain clear.

### Bundle composition

Render the main Skill to `skills_builtin/zotero-library-agent`. Assemble the external repository from that rendered Skill, the existing rendered `zotero-bridge-cli` Skill, the profile template, existing cross-platform binaries/installers, schemas, and helper script. Do not copy Hermes assets. A manifest identifies both Skill entrypoints and every binary checksum.

### Progressive disclosure

Keep `SKILL.md` focused on discovery, bounded operation, safety, and reference routing. Place task routing, workflow execution, evidence handoff, shared invariants, and generated command references in one-level `references/` files. Include `agents/openai.yaml` as UI metadata without making Codex a runtime dependency.

### Stateless helper boundary

Use one Python standard-library script with explicit subcommands. Evidence build/validate computes hashes and validates the checked-in schema. Workflow inspect/validate-result reads the request bundle's manifest/schema and validates deterministic file requirements. The helper never calls `zotero-bridge`, persists state, or interprets research semantics. This keeps it portable while leaving agent judgment in Skill instructions.

### Evidence contract

Define `zotero-library-agent.evidence-bundle.v1` as a generic JSON document with producer, operation, subjects, provenance, artifacts, optional workflow handle union, and writeback status. Commands are sanitized before recording, artifacts are hash-bound, and validation rejects known credential fields. ResearchSpec can later translate this document without the bundle importing ResearchSpec schemas.

### Version and release authority

Store a bundle-owned patch keyed to CLI major/minor. Resolve `<cli-major>.<cli-minor>.<bundle-patch>` and record the exact CLI version separately. GitHub Actions remains the binary and external publication authority. Both CLI-build and surface-only workflows publish all three surfaces; surface-only publication restores prebuilds instead of rebuilding them.

### Testing approach

Extend the existing Host Bridge packaging test for rendered structure, versioning, checksums, workflow wiring, and surface separation. Add focused helper tests only for stable schema/hash/security behavior. Avoid tests that pin full prose or generated table formatting.

## Risks / Trade-offs

- [Protocol guidance can drift across surfaces] → Copy shared invariants deterministically and include every source/target in semantic and doc-sync checks.
- [A generic agent may treat the bundle as a daemon] → State explicit on-demand boundaries and fail governance checks on Hermes, cron, SQLite, or implicit state assumptions.
- [Python availability varies] → Keep helpers optional and standard-library-only; all Host Bridge operations remain possible through the bundled CLI.
- [A release can partially publish external repositories] → Run all render, manifest, checksum, and version checks before the first publish step and report each surface result.
- [Evidence paths are not portable across machines] → Bind artifacts by digest and role; treat paths as local locators rather than durable identity.

## Migration Plan

1. Add shared and new semantic sources, schemas, helpers, and tests.
2. Render the new Skill and shared references; bump Profile once because its public reference layout changes.
3. Add bundle version `0.2.0`, checks, publisher, and workflow integration.
4. Validate locally without pushing or publishing.
5. On a later authorized merge to `main`, allow the existing GitHub release workflows to create the first standalone repository snapshot.

Rollback removes the new publisher/workflow steps and generated bundle while leaving the CLI wrapper and Zotero Librarian profile unchanged. Existing Host Bridge protocol and CLI behavior require no migration.

## Open Questions

None.
