## Context

This change is planned against PR #40 merge baseline `52624e6133e053cf307536248682ba3187801c7d`. PR #40 provides the typed Preact Dashboard and Synthesis page-region foundation, but it does not implement canonical managed artifacts or their migration.

Managed notes currently have multiple semantic writers and storage-shaped readers. Literature analysis, bundle import/export, Workbench workflows, and Synthesis therefore cannot rely on one closed Source Reference/Citation contract. The implementation guide in `artifact/issue-39-canonical-host-capabilities-implementation-guide.md` freezes the scope, deletion inventory DEL-12/13/15, the explicit library migration rules, and the D1/D2 identity decisions.

The artifact schema is owned by the existing versioned contract-set system. This change consumes that owner and aligns TS/Rust consumers; it does not introduce a second schema authority or make the external Skill-Runner tree a runtime dependency. The Broker remains the semantic owner of managed note reads/writes and the Synthesis Application remains the semantic owner of Synthesis projections.

## Goals / Non-Goals

**Goals:**

- Provide one Broker-owned semantic reader/writer for custom, conversation-note, digest, references, citation-analysis, and literature-score notes.
- Freeze the closed Source Reference/Citation behavior: opaque source IDs, canonical References basis, derived Citation staleness, Citation evidence, and D1/D2 authoring rules.
- Route literature analysis, bundle import/export, offline import, and Synthesis through the same artifact contract and parent-set writer.
- Provide an explicit Dashboard-local library migration with deterministic classification, review, same-transaction paired writes, durable per-set receipts, bounded history, stop/continue, and restart fresh-scan behavior.
- Add the permanent PR40-based Preact Migrations region as a typed observation/command projection.
- Remove only DEL-12, DEL-13, and DEL-15 consumers and package-local orchestration owned by this change, after all callers have moved.
- Preserve the existing 1 MiB Broker domain budget and expose serialized byte facts; enforce the separate 50 KiB limit only at the downstream ToolResult adapter.

**Non-Goals:**

- Navigation, selection, mutation-union projection, Pi descriptors, or a new public migration command in Workflow Host, Bridge, MCP, CLI, or Pi.
- A second artifact schema, a fuzzy or model-based legacy matcher, a mapping editor, automatic background migration, watcher, purge, rollback coordinator, or hidden backup note/attachment.
- Release publication or dispatch, new public migration APIs, navigation or projection redesign beyond the approved Migrations region, generated help-doc authoring, and unrelated main-spec changes are outside this change.
- The required `literature-analysis` upstream pin and native Synthesis sidecar build evidence remain implementation gates tracked by the checked tasks; this change does not publish those release inputs.

## Decisions

### 1. One semantic owner, with projections kept explicit

The Broker owns managed-note classification, canonical normalization, singleton resolution, payload/image handling, parent-set effects, compensation, verification, and the public receipt. Workflow Host, bundle, Dashboard, and transport layers receive explicit DTO projections. They do not expose storage wrappers or compose list/create/upsert/cleanup calls.

The six public semantic operations are fixed in the specs. Custom and conversation notes use `{ title, markdown }`; digest, references, citation-analysis, and score use their declared artifact content. A singleton with zero, one, or more than one candidate has deterministic create, update, or `ambiguous_state` behavior. Ordinary notes are protected in both directions: managed operations reject ordinary notes and `notes.updateContent` rejects managed notes.

### 2. Contract-set ownership and conservative D1/D2 semantics

The existing versioned contract-set owner is the only schema authority. The contract keeps Source Reference extraction as `{ raw, confidence } | null`, bibliographic `title`, `authors`, and integer-or-null `year`, renderer metadata, and one matching field for DOI/URL/ISBN/ISSN/citekey. Citation evidence preserves mentions; function is a closed category and `role_in_context` is separate text. Labels, report markdown, and snapshots are derived projections.

`sourceReferenceId` is opaque and explicit. An intentional rewrite/import carries the ID of the retained row; a new extraction or valid snapshot recovery receives a new ID. No position, `ref-N`, DOI, title, content hash, or Synthesis ID is an identity source. Runtime computes `referencesBasis` from the complete canonical References set and derives Citation staleness by comparison. Callers cannot submit basis or stale flags as authority.

The contract-set API details are resolved by the artifact exploration output during implementation. These specs define observable behavior and ownership without inventing aliases or a parallel DTO shape.

### 3. Parent-set effects use one transaction, identity, and receipt

Trusted workflow, paired import, and migration paths enter a private parent-set seam. It validates the parent, note revisions, permissions, artifact fields, retained/new IDs, and computed basis before writing. A References/Citation pair is committed in the same Zotero transaction under one operation identity and one durable set receipt. There is no public two-call composition and no per-note receipt that can make a half-pair appear complete.

The Broker domain result honors the existing 1 MiB budget. It returns complete semantic content and exact serialized byte facts within that budget. A downstream ToolResult adapter may reject a result above 50 KiB, but that presentation gate does not change Broker correctness or create a second read contract.

### 4. Migration is a Dashboard-local durable owner

The migration owner keeps the runtime plan in memory for the current process and persists only bounded run/set history and receipts. The durable records contain run envelope, library, static migration ID, definition version, candidate refs, basis/hash, classification, outcome, timestamps, counts, and bounded diagnostics. They do not store full payload copies, hidden backups, or a permanent library-migrated flag.

The owner has one process-local active scan/apply gate and publishes a shared snapshot to all Dashboard windows. A second start returns `busy`. Stop stops claiming later sets but lets the current transaction finish. Crash remnants become `failed: interrupted` when observed; no replay occurs. Continue creates a new apply operation and re-reads/reclassifies candidates. Restart requires a fresh scan, and definition-version mismatch is terminal for old actionable plans.

The SQLite layout is private to the migration owner and follows the project's durable state conventions. UI, Workflow Host, Bridge, MCP, CLI, and Pi see typed views/receipts only; none receives operation records, basis storage, or diagnostics format.

### 5. One pure converter serves library migration and offline import

Legacy parsing, classification, and conversion live only in the migration-only module. The pure classifier/converter is reused by the Dashboard library migration and the existing note/file import UI. It accepts only the deterministic evidence order and normalization rules in the guide, preserves the original input, and reports unresolved/recovered/dropped facts explicitly. Any actual dropped data blocks apply. Citation-only offline input requires canonical References at the target parent and deterministic or explicitly accepted set-level unresolved linkage.

Normal Broker readers and canonical bundle/Synthesis import do not fall back to legacy parsing; they return the typed migration-required result. This keeps DEL-13 closed without hiding a compatibility reader in a normal path.

### 6. PR40 Preact region is a projection, not an owner

The Migrations region is added to the existing Dashboard navigation and region composition supplied by PR40. It renders metadata, scope, availability, bounded preview/progress/attention/history, and typed commands. It never interprets artifact payloads, creates plans, or writes SQLite. Region signatures and managed mounting follow the existing PR40 region-equality and page-entry contracts so migration snapshots do not rebuild unrelated Dashboard regions.

### 7. Deletion is caller-driven and sequenced

DEL-12 removes package-local note orchestration only after each producer uses the Broker owner. DEL-13 removes public reference aliases, duplicate DTOs, loose readers, and reverse-export shapes only after canonical artifact and Synthesis consumers use the contract-set owner. DEL-15 removes the debug migration workflow and entry only after Dashboard migration has an executable replacement. Navigation/projection deletions remain outside this change.

## Risks / Trade-offs

- **[Legacy payload ambiguity]** → Classify as review-required or blocked; never guess identity or silently drop data. Preserve original files and show bounded diagnostics.
- **[Concurrent Zotero edits or Sync]** → Revalidate revision, permission, artifact facts, and basis immediately before each set; report `changed_since_scan` without writing and continue independent sets.
- **[Cleanup after canonical commit fails]** → Keep canonical data, mark the set `repair_required`, and finish the run with attention; permanently delete only operation-local uncommitted staging residue.
- **[Crash during a run]** → Persist each set receipt before claiming completion; classify nonterminal remnants as interrupted on observation and require fresh scan instead of replay.
- **[Schema drift between TS/Rust/upstream renderer]** → Keep the contract-set owner as the only schema authority; block completion until affected consumers and the upstream pin/build evidence align.
- **[Dashboard snapshot churn]** → Use the existing PR40 region-level signatures and one shared active snapshot; keep payload conversion and durable writes outside UI rendering.
- **[Large managed detail]** → Preserve the 1 MiB Broker budget and byte facts; enforce the 50 KiB ToolResult gate only in the downstream adapter.

## Migration Plan

1. Freeze and review the contract-set schema and D1/D2 examples against the affected literature-analysis renderer, TS contract, and Rust contract. Record any missing upstream pin or sidecar evidence as an unfinished task.
2. Implement the Broker managed-note reader/writer and private parent-set seam, then migrate direct producers and consumers before deleting DEL-12/13 paths.
3. Align bundle, Workbench, offline import, and Synthesis application projections with the canonical artifact. Verify ID retention, fresh-ID allocation, basis derivation, Citation staleness, and one-receipt paired writes.
4. Implement the migration-only classifier/converter, private SQLite run/set receipts, process single-flight, stop/continue, restart reconciliation, and fresh-scan rule. Reuse the converter in the explicit file/bundle import path.
5. Add the permanent Dashboard Migrations region and localization/read-only harness projections. Verify that navigation/observation cannot scan or write and that region updates remain bounded.
6. Run the affected contract, Broker, Workbench, bundle, migration, Dashboard, TS/Rust Synthesis, and native compatibility checks. Run the project's official verify-change workflow, then sync/archive only after implementation evidence exists; this artifact work itself does not archive the change.

## Open Questions

None that change the approved behavior or task boundaries. Exact contract-set field types and existing SQLite naming conventions are implementation inputs to resolve from the repository's current owners before coding.
