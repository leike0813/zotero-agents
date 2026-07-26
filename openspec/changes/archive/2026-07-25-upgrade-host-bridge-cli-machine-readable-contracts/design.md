## Context

The Rust parser is the authoritative argv tree, while the TypeScript Agent Surface generator currently reconstructs only part of Clap metadata and adds payload/result semantics separately. The v4 descriptor is closed with `additionalProperties: false`, so extending it in place would silently invalidate existing consumers. The Minimum Skill renderer currently emits eight aggregate command references from the descriptor, which creates coarse loading boundaries and makes one-command verification difficult.

The change is constrained by the unpublished CLI Cargo version `0.4.0`, the fixed semantic baseline commit `71da2eb325e946291b901d778b20ceb3c5db368f`, source-to-target rendering, and the Host Bridge rule that no existing instruction may be compressed, reordered, merged, or removed except the approved aggregate files as structural containers.

## Goals / Non-Goals

**Goals:**

- Establish one versioned payload/result contract registry keyed by canonical command and argument id.
- Make raw structured-input schemas available offline through global `--schema` without satisfying normal execution requirements.
- Preserve complete Clap argument metadata through inventory, Agent Surface v5, help, and Markdown rendering.
- Generate one complete Markdown card for each canonical leaf command and one catalog link per card.
- Enforce strict schema, coverage, reachability, identity, semantic-depth, and materialization parity gates.

**Non-Goals:**

- Changing command names, normal execution semantics, Host Bridge routes, or Cargo SemVer.
- Adding backend-specific schema branches or making pagination caches/contracts a new runtime source of truth.
- Publishing, dispatching prebuilds, creating commits, or synchronizing Gitee.
- Rewriting unrelated Generic or Hermes policy.

## Decisions

### 1. Split argv and payload/result facts across two explicit sources

Clap remains the argv source of truth. `schemas/host-bridge-cli-command-contracts.v1.json`, validated by a closed JSON Schema, becomes the payload/result source of truth. The registry is keyed by canonical leaf command and argument id and contains raw JSON Schema 2020-12 objects, conditional requirements, examples with `shape-only` or `executable` status, prerequisites, and a strict command-level result schema.

This is preferred over embedding schemas in Rust attributes because the same registry must be consumed by TypeScript rendering and release validation. It is preferred over renderer-local maps because those would duplicate semantic facts and allow CLI/Markdown drift.

### 2. Implement `--schema` as an offline parser side path

The root parser exposes global boolean `--schema`, but normal typed parsing remains unchanged. Before normal execution/config construction, the process performs a permissive Clap command-tree parse that identifies the canonical leaf even when ordinary required values are absent. A successful leaf lookup returns the matching schema package in the existing `ok/data/meta` envelope. Groups, unresolved paths, and commands without structured JSON inputs return stable structured errors.

This avoids weakening required arguments across roughly 125 commands and guarantees the schema path cannot load profiles or contact Zotero. `--schema` is metadata, not a payload input.

### 3. Publish new closed descriptor identities

The generated identities become `zotero-bridge.cli.v4`, `host-bridge.agent-surface.v5`, and `host-bridge.surface-identity.v5`. The v5 command descriptor retains all v4 fields and adds complete global/local argument metadata, input schemas/examples, and strict result schemas. Release-set validation is versioned rather than widening an existing closed schema.

### 4. Generate examples once

Every schema-bearing argument has at least one minimal registry example. `executable` is reserved for context-free examples; values requiring live Zotero, workflow, provider, run, or file handles are `shape-only` and carry explicit prerequisites. The same normalized example objects feed long help, `surface describe`, and command cards.

### 5. Render one command card per canonical leaf

Canonical command tokens map to `references/commands/<tokens>.md`; roots that are themselves leaves use `<root>/index.md`. Each card independently renders usage, inherited globals, local options/positionals, requirement/conflict/value/env metadata, invocation schema, per-input raw schemas, composed payload schema, result schema, examples, pagination/category/danger/effects/approval, handles, recovery, targets, aliases, and intent visibility. JSON schemas are pretty-printed fenced JSON, never stringified on one line.

The catalog groups by command root but owns only selection summaries and relative links. `SKILL.md` links the catalog; the catalog directly links every generated card. Non-generated references retain the existing direct-link governance rule.

### 6. Treat aggregate removal as a governed migration

The eight aggregate references are the only approved deletions. Validation compares the rendered command-card set with the fixed baseline and reports `unmapped`, `downgraded`, `unauthorized dropped`, and `intra-package duplicate`. Command coverage must be `125/125`; aggregate-to-card substantive instruction lines must not fall below 2092 and normalized prose characters must remain at least 95% of 241086.

## Risks / Trade-offs

- **Registry authoring volume** → Generate deterministic strict defaults from existing capability/input contracts, then require explicit overrides where a command cannot be represented precisely; fail on generic empty result shells.
- **Permissive schema parsing diverges from Clap** → Walk a cloned Clap `Command` tree and cross-check all canonical paths/argument ids against the normal inventory in tests.
- **125 files enlarge diffs and review mirrors** → Use deterministic paths/templates, catalog links, exact materialization checks, and ownership review tooling.
- **Help becomes too verbose** → Show concise key input notes and minimal examples only; raw schemas remain in `--schema` and cards.
- **Closed-schema version cascade** → Introduce v5/v4 identities explicitly and update every release/identity validator in one change.

## Migration Plan

1. Add failing registry, parser, descriptor, renderer, and governance tests.
2. Add the registry/schema and inventory metadata projection.
3. Implement the offline `--schema` path and help examples.
4. Generate Agent Surface v5 and update release identity/schema validation.
5. Render 125 command cards and catalog links; remove only the approved aggregate files through the renderer.
6. Materialize source, builtin, Hermes, and review mirror outputs and run semantic parity/depth gates.
7. Validate OpenSpec and all focused Rust/Node/content/release checks without publishing.

Rollback before publication is a source revert of this change; no persisted runtime data or remote release state is migrated.

## Open Questions

None. The fixed baseline, approved deletion list, schema dialect, version identities, and non-release boundary are part of the accepted plan.
