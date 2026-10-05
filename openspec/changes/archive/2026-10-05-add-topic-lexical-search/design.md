# Design

## Context

See [proposal.md](proposal.md) for the motivation and capability set. Topic listing is currently backed by the indexed application registry; canonical Topic content is read through the existing canonical store and Topic application. `topics.getContext` already owns structured context projection. The canonical Topic artifact schema declares optional `comparison_matrix`, while the TypeScript and Rust structured-artifact complete-section inventories currently omit it. The canonical store has no global content generation suitable for cursor validation; `updated_at` belongs to an individual Topic and cannot establish data-root membership or a complete search basis.

## Goals / Non-Goals

**Goals:**

- Deliver one complete Topic search path from canonical content through Synthesis client, Workflow Host, Host Bridge, MCP, and CLI.
- Keep canonical Topic schema as the only source of searchable section identities and keep `getContext` as the existing context owner.
- Make the bounded result set and cursor basis auditable using canonical identities and content hashes.

**Non-Goals:**

- Add a persistent search index, embedding/vector method, Topic freshness calculation, or Topic-specific remote reader.
- Change Topic list, source-reference association, resolver, report, graph, or context behavior.
- Change Library item/evidence search or add Host Bridge agent task policy for choosing when to search.

## Decisions

### Owner and request path

Add the search operation to the production Rust Topic application and dispatch it through the existing Topic runtime and production-client route. Use the existing canonical-store owner to enumerate current canonical Topic identities, read and validate each bounded current snapshot, and return the canonical content basis needed by search. The Topic application owns candidate selection, lexical ordering, bounded search-round state, and typed cursor failures. The UI/Workflow Host, Host Bridge, MCP, and CLI are projections of the same Synthesis operation; none searches `topics.list` results locally.

The search port reads current canonical snapshots directly. Registry rows may supply indexed enumeration only if the canonical owner also proves complete current-root membership; stale or missing registry rows must not cause a canonical Topic to be skipped. If the present canonical-store port cannot enumerate all current Topic identities and provide a current membership basis, extend that private port rather than deriving global membership from SQLite projections or timestamps.

### Canonical section inventory

The protocol's `TopicArtifact` section properties are the authority for section names. Search derives or validates its allowlist against that schema and traverses only those present top-level sections. It recursively extracts user-facing strings while excluding identity, hash, path, status, and code fields according to one field-classification rule owned by the Topic search kernel. It reports named top-level sections, not invented block identities. Add `comparison_matrix` to the TypeScript and Rust engine complete-section/patchable inventories because the canonical schema already defines that optional property; retain the current required-section set so absence remains valid.

### Lexical matching and ordering

Consume the shared Rust Retrieval application/kernel introduced by C2; C4 adds no matcher, tokenizer, ranking implementation, or parallel kernel. Normalize text with Unicode canonical normalization and case folding. Tokenization uses Unicode word boundaries for spaced scripts and overlapping Unicode letter/number n-grams for scripts without reliable spaces. Use the C2 ordering consistently: query-term coverage first, exact normalized phrase match second, canonical field importance third, and canonical Topic identity as the deterministic tie-breaker. Repetition does not add rank. The shared kernel returns internal ordering keys; public Topic results contain identity, matched sections, and concise match reasons only. C4 supplies canonical Topic field facts/importance to the shared kernel through its private Rust application seam.

This is preferable to whitespace splitting, which misses CJK and similar scripts, and to term-frequency/BM25 scoring, which was explicitly excluded and would create a second ranking model before vector enhancement. No public score or language whitelist is introduced.

### Bounds and result envelope

Rebuild and validate the request before any canonical reads: trim-check a non-empty query, reject unknown sections, default `limit` to 25 and `maxResults` to 100, and reject values above 100 and 500 respectively. Consume the shared C2 neutral DTO definition for Synthesis, Rust wire, Workflow Host, Bridge schema, and MCP projection; C4 adds no Topic-specific count fields, coverage variant, or issue shape. The result uses the common `results`, `status`, `method`, `coverage`, `issues`, `nextCursor`, `hasMore`, and `total` envelope; Topic search reports `method: lexical` and `coverage: { kind: "topic", sections: [{ section, status }] }`. Issues use C2's closed `SynthesisSearchIssue` codes/shape and `sourceKind: null` for Topic-owned failures. A single bounded pass reads canonical Topics. Invalid/missing sources are reported as issues and make `total` unknown; budget exhaustion or reaching the result cap reports `limited`. `hasMore` only describes remaining pages within the frozen `maxResults` round.

### Opaque cursor and basis verification

On the first request, the Topic application performs one bounded full candidate pass, ranks results, freezes at most `maxResults` result DTOs plus the request/method/order identity and basis observations, and returns an opaque random cursor for continuation. Keep cursor state in a bounded, expiring in-process map owned by the Topic application; the cursor is a random lookup token and contains no serialized paths or public basis fields. If the round is larger than one page, retain it until its fixed expiry or bounded-cache eviction; eviction yields a typed expired-cursor error. Record canonical membership and per-Topic content basis for every candidate successfully scanned in that round, including non-matches, because a changed non-match can enter or leave the ranking.

Before serving any continuation, re-enumerate canonical current Topic identities through the canonical-store owner and compare the sorted membership with the frozen membership basis. Re-read every candidate scanned in the frozen round, including non-matches, and compare its canonical manifest/artifact/content basis with the captured basis. Any added, removed, invalidated, or changed Topic fails with a typed stale-cursor error. No timestamp or repository projection is accepted as a substitute. Membership and candidate reads must represent a coherent current-root view, using an owner-issued snapshot/basis when available or failing stale if a coherent view cannot be established. Continuation never reruns lexical matching. Cache eviction and process restart invalidate the token as expired.

An incomplete initial scan cannot claim exact `total`. The application returns verified ranked matches as limited with `total: null`. A continuation cursor is available only when the complete candidate membership and every candidate's content basis were scanned within the bounded round and can be retained and revalidated on continuation. If the canonical owner cannot establish or revalidate the complete membership and candidate basis within the configured read bound, return a typed limited/unavailable outcome with no cursor rather than treating the registry or result window as complete.

### Explicit projections

Add `topics.search` to the grouped `SynthesisClient`, native and in-process ports, and production capability declaration/route. Add `host.synthesis.topics.search` as a single explicit Workflow Host member. Add `host.synthesis.topics.getContext` as an explicit member that forwards the existing `SynthesisClient.topics.getContext` request, delivery context, DTO, and error behavior unchanged; do not modify or relocate its owner.

Add the Host Bridge read capability named `topics.search`, with closed request/result JSON Schemas based on the shared DTO. Bind the existing Bridge registry to `client.topics.search`; MCP continues to derive its tool and handler from that registry. Add the `synthesis topic search` Rust CLI leaf using the existing `BridgeQueryArgs` / `--query` JSON object and direct capability forwarding. Update the canonical capability and CLI command contracts, Rust command tree/dispatch, schema registry and protocol capability lists, generated docs, CLI source Skill/catalog command partition, and Synthesis/Bridge/MCP component docs. Do not add a second MCP dispatcher or change the existing `topics.get_context` capability.

### File-level change map

| Area | Existing files to change | New files |
|---|---|---|
| Change-owned OpenSpec | `openspec/changes/add-topic-lexical-search/{proposal.md,design.md,tasks.md,specs/**/spec.md}` | None beyond these artifacts |
| Shared contract and client | `packages/synthesis-contracts/src/topics.ts`; `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/topic-domain.schema.json`; `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/client-topic-workbench.schema.json`; `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json`; `packages/synthesis-contracts/src/sidecarSystem.ts`; existing Synthesis client adapter/native composition/port files under `src/modules/synthesisClient/` | Shared public search DTO/schema additions only; no duplicate retrieval kernel (C2 owns it) |
| Topic owner and canonical basis | `rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs`; its existing DTO/port modules; `rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs`; `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs`; `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs` | Private canonical membership/basis support only if current canonical-store APIs cannot provide it; no new public search owner |
| Structured artifact parity | `packages/synthesis-engine/src/topicStructuredArtifact.ts`; `rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs` | None; preserve separate required-section sets |
| Workflow Host | `src/workflows/hostApi.ts`; `src/workflows/workflowHostContract.ts`; existing Workflow Host owner/composition files | None; `getContext` is an explicit projection of its existing owner |
| Host Bridge, MCP, CLI contracts | `src/modules/hostBridgeCapabilityRegistry.ts`; `contracts/host-bridge/capabilities.v2.json`; `contracts/host-bridge/cli-commands.v2.json`; related Host Bridge JSON schemas/registry descriptors; `rust/zotero-bridge/src/args.rs`; `rust/zotero-bridge/src/commands.rs` | None; MCP continues to derive from the capability registry |
| Agent guidance and docs | Authored minimum-core files under `skills_src/zotero-bridge-cli/`; `docs/synthesis-layer/topics-and-discovery.md`; `docs/components/zotero-mcp-service-design.md`; generated Host Bridge CLI/capability docs only through their existing renderer | Generated surface outputs are renderer-owned; do not hand-edit them |
| Verification | Existing focused suites under `tests/synthesis/`, `tests/host-bridge/`, Rust crate tests, cross-language contract checks, and Host Bridge surface review/render gates | Extend existing suites for Topic ranking, cursor basis, API projection, CLI/MCP route, and end-to-end capability behavior; no parallel test runner |

The paths above are the implementation inventory. Any private canonical-store support is limited to the existing store owner and is required only where its current API cannot return a coherent complete membership/content basis. Do not create a second section-name list: derive it from the canonical `TopicArtifact` schema, including optional `comparison_matrix`.

### Host Bridge surface governance

The governed baseline is `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`; explicit semantic deletion inventory is empty. Add command guidance at the minimum-core source owner, then regenerate the CLI, Generic, and Hermes surfaces through their established generation chain. Review all old instructions for parity and report unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts. Run the absolute depth gate and baseline-relative substantive instruction line/prose gates; do not compress, reorder, merge, or remove existing instructions to accommodate the new command.

## Risks / Trade-offs

- [A canonical root scan or per-topic basis verification exceeds the operation budget] → Bound topic identities and bytes per pass, return `limited` with unknown total, and never infer complete coverage from registry row counts.
- [A Topic changes while a search round is being created or continued] → Capture and revalidate canonical membership plus every scanned candidate's canonical basis through the canonical owner; reject a raced or stale round without rerunning it.
- [In-process cursors disappear on restart or cache eviction] → Treat them as explicitly expiring opaque cursors and return the typed expired-cursor error; callers may start a fresh search.
- [Unicode tokenization trades linguistic sophistication for deterministic offline behavior] → Use normalization, phrase matching, script-sensitive token coverage, and deterministic field/identity order; report lexical method honestly and leave semantic/vector quality out of this release.
- [Adding `comparison_matrix` to complete-section recognition could accidentally make it required] → Keep required-section validation separate from recognized/patchable names and add parity cases for absent and present optional matrix data in both engines.
- [Generated Host Bridge surfaces drift or lose existing guidance] → Treat source Skills and contracts as inputs, use the fixed baseline and empty deletion inventory, run semantic parity and thickness gates, then run the surface renderer/checks.

## Migration Plan

1. Add and verify the canonical Topic search contract and shared DTO/schema.
2. Implement the Rust application operation, canonical membership/basis reads, retrieval kernel, and native route; keep old Topic operations unchanged.
3. Add Synthesis client and Workflow Host projections, including explicit passthrough of the existing `getContext` DTO.
4. Add Host Bridge capability and MCP registry mirror, then the Rust CLI leaf and canonical CLI descriptors.
5. Update source documentation and the minimum-core CLI guidance; render and check the three agent-facing surfaces against the fixed baseline.
6. Run focused Rust/client/Workflow Host/Bridge/MCP/CLI contract checks, cross-language schema checks, Topic behavior tests, and required Host Bridge surface gates. No data migration is required. Rollback removes the new read capability and leaves canonical Topic data untouched.
