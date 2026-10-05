# Design

## Context

See proposal.md for motivation. Baseline is `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`. The current source-side selector has one SQL predicate for count and page, normalizes `criteria.query`, hashes canonical criteria into opaque cursors, and hydrates only selected page IDs. Workflow list/traversal use closed portable DTOs. Bridge list/readiness have independent wire shapes and legacy collection-ref inputs; the existing search handler builds a bounded list request. Snapshot and Synthesis reverse-host list pages have different, unfiltered contracts.

## Goals / Non-Goals

**Goals:** perform one coherent contract rename at the existing owner boundaries, preserve deterministic literal enumeration and complete consumers, and make each dynamic consumer auditable.

**Non-Goals:** implement lexical relevance search, evidence search, Topic search, vector retrieval, new members, new query DSLs, release identities or prebuilt binaries. Those first three searches are separately planned changes. No public alias accepting both names is introduced.

## Decisions

### One predicate, one criterion name

Rename the source selector input and normalized criterion to `filter`, then carry it through count/page predicate, canonical cursor criteria, Broker list/traversal/readiness requests and output, Workflow DTOs and Bridge contracts. Keeping an internal `query` alias would create a second concept and hide stale callers. Normalize omitted/empty/whitespace values exactly as today; preserve literal `%`, `_` and backslash escaping, NOCASE matching, field-independent OR matching and native item-ID order. A cursor minted against the former canonical criterion encoding fails the existing criteria-bound validation; there is no restart fallback or durable cursor migration.

### Explicit retained search boundary

`library.search_items` still takes `query` and returns `{items,truncated}` in C1. Its handler alone translates `query` into a Broker list `filter`; MCP aliases reuse that handler. C3 will replace this path with Broker-owned lexical item search. `--query` remains the CLI JSON payload container; payload keys follow their capability contracts. Snapshot capture remains unfiltered and neither its fixed-set basis nor Synthesis reverse-host requests gain a text criterion.

### Fan-out and file changes

| File or group | Action |
| --- | --- |
| `src/workflows/types.ts` | Rename list request, list criteria and traversal request field. |
| `src/modules/zoteroHost/zoteroLibraryPageQuery.ts` | Rename input/normalized criterion, diagnostic field and predicate/hash consumption. |
| `src/modules/zoteroHostCapabilityBroker.ts` | Rename list/readiness args and outputs, native selector inputs, traversal forwarding and criteria evidence. |
| `src/modules/hostBridgeCapabilityRegistry.ts` | Rename list/readiness mapping, preserve explicit search adapter. |
| `contracts/host-bridge/capabilities.v2.json` | Rename list/readiness input and any declared output criterion fields, preserving search schema. |
| `src/workflows/{hostApi,workflowHostOwners,workflowHostContract}.ts` | Check explicit projection and type propagation; only change a copied field if present. |
| `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts` | Check independently declared alias/tool schemas and direct adapters; rename list only where present. |
| `rust/zotero-bridge/src/{args,commands}.rs`, `contracts/host-bridge/cli-commands.v2.json` | Check generic JSON payload validation and descriptor generation; keep `--query` and existing search payload. |
| `workflows_builtin/literature-workbench-package/{collection-collector/hooks/applyResult.mjs,lib/literatureBundle.mjs,tag-auditor/hooks/applyResult.mjs}` | Inspect locally assembled list/traversal inputs and returned criteria; fix collector to send portable `collectionRef` and auditor to read `criteria.libraryId`. Retain the already-canonical literatureBundle requests. |
| `skills_src/zotero-bridge-cli`, `skills_src/zotero-library-agent`, `profiles_src/hermes/zotero-librarian` | Check field facts, templates and inherited semantics; change existing enumeration payload facts in place only if present. |
| `docs/components/zotero-host-capability-broker-ssot.md`, workflow/Bridge component docs, generated `docs/host-bridge-cli.md` | Describe current filter contract and retain distinct bounded search guidance. |
| Existing tests `102`, `185`, `107`, `108`, `101`, `187`, workflow bundle `47`/collector `49`, Zotero lite `185`, relevant adapter/mocks | Update actual criterion fixtures and extend stable behavior checks at existing seams. |
| `addon/content/host-bridge-skills/**`, `profiles/hermes/zotero-librarian/**` and machine agent-surface descriptor | Render through existing governed renderer after source parity review. Never hand edit generated guidance. |

### Test seams and execution order

The user-authorized issue identifies source page query, Broker, Workflow projection and Bridge/MCP as behavior seams. Use vertical TDD: first migrate a representative filtered source-query test and observe failure, then change selector; next filtered Broker list/traversal/readiness tests, then Broker/DTOs; next Bridge list/readiness plus retained search/MCP tests, then adapter/schema. Existing coverage for cancellation, stable identity pagination, full traversal evidence and snapshot stays valid. Extend only uncovered stable edges (blank filter, invalid type, changed filter cursor). Do not add prose snapshots or skill-text tests. Built-in workflow tests verify complete pagination with dynamically constructed input.

The authorized built-in repair uses existing collector `49` and auditor `66` tests. Collector's membership-deduplication test creates native fixtures inside and outside a target collection, uses actual Workflow Host/Broker list and detail reads with the existing mock native page-query adapters, and observes the proposed membership mutation. Its opaque-pagination test also preserves collection scope on every request. Auditor's helper uses the actual list projection instead of returning a root-level library ID; its empty-library test also uses actual traversal with a non-default resolved user library. Synthesis publication and membership mutation remain bounded test doubles at those separate interfaces. No compatibility fields or new Host members are added.

### Governed surface preservation

Before semantic edits record materialized `SKILL.md` and direct reference instruction/prose metrics against the fixed baseline in `surface-review.md`; explicit semantic deletion inventory is empty. The only allowed field-fact substitution is enumeration payload `query` to `filter`. Preserve every surrounding instruction, order, branch, evidence, failure and recovery rule. Run semantic review, render current content, and run package checks with `--baseline-ref` plus content/consumer checks. Report unmapped, downgraded, unauthorized dropped and intra-package duplicate counts, all zero. Accept existing advisory depth warnings explicitly with reasons. A field rename may change generated schema cards; it cannot authorize semantic compression or release publication.

## Risks / Trade-offs

- Dynamic inputs can evade simple string searches → trace each built-in request builder and inspect returned-criteria consumers; keep a concrete fan-out audit.
- An old input may silently lose filtering on an open in-process call → closed TypeScript DTOs and migrated source callers provide the trusted Workflow contract; closed Bridge schemas reject removed fields. No new general-purpose DTO validator is added for this rename.
- Cursor criteria encoding changes → preserve the existing structured failure and document reacquiring a first page with the current contract; never reuse old continuation as an offset.
- Rendered guidance includes CLI binary descriptor metadata → verify current-source descriptor/content without changing release/prebuild identity; report any pre-existing freshness limitation separately.

## Migration Plan

Complete all four change planning artifacts, validate them and confirm apply state first. Implement only C1 with tests before each behavior slice, update its task checks as completed, and stop after relevant validation and a final fan-out/parity report. Leave main specs, the other three implementations and archive/release operations for their separately authorized steps.
