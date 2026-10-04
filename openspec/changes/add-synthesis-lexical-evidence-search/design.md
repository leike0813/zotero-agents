# Design

## Context

See [proposal.md](proposal.md) for motivation and [specs/](specs/) for behavior. The repository has one native Rust Synthesis application graph, a closed production client catalog, a typed grouped client, a Zotero Host Broker, reverse-Host adapters, and existing source-owner hash reads for canonical analysis artifacts. There is no evidence-search application or complete source-version read contract for metadata, Markdown full text, and analysis together. The current reverse-Host artifact read does not cover original Markdown full text; its existing hash is valid only for the artifact it owns.

## Goals / Non-Goals

**Goals:**

- Implement one Rust lexical kernel and one Rust retrieval application in the existing sidecar runtime.
- Let C3 call that same application and kernel through a private injected native port; Broker must not depend on the public `SynthesisClient`.
- Publish one closed shared DTO/schema shape for C2, C3, and C4.
- Return only source passages whose owner-provided version, scope, and UTF-16 range were checked during the same request.
- Add the approved remote capability, MCP mirror, Rust CLI command, and governed agent-surface instructions.

**Non-Goals:**

- C1 changes only `filter` naming for list/traversal and matching readiness contracts; it adds no search behavior.
- C2 does not implement C3 `Broker.library.searchItems` / Workflow `host.library.searchItems` projection or C4 `topics.search` / remote `topics.search` / CLI `synthesis topic search`.
- No TypeScript lexical kernel, second lexical implementation, package/workspace/dependency change, embedding/vector execution, persistent lexical index, BM25, frequency ranking, OCR, public `readEvidence`, or separate process.

## Decisions

### Shared DTO and one schema source

Add the search DTO to the existing environment-neutral `packages/synthesis-contracts` package and add the canonical JSON Schema and parity corpus to its existing `synthesis-sidecar-protocol-v1` tree. Do not add another registry or schema tree. The TypeScript DTO/rebuilders and Rust strict DTOs must match that schema and corpus.

Use these shared types and field names for C2/C3/C4:

```ts
type SynthesisSearchSourceKind = "metadata" | "fulltext" | "analysis";
type SynthesisSearchStatus = "completed" | "limited" | "unavailable";
type SynthesisSearchMethod = "lexical" | "vector" | "hybrid";
type SynthesisSearchWorkStatus =
  | "complete"
  | "not_requested"
  | "limited"
  | "unavailable";

type SynthesisSearchRequest = {
  query: string;
  limit?: number;       // default 25, maximum 100
  maxResults?: number;  // default 100, maximum 500
  cursor?: string;      // opaque
};
type SynthesisLibrarySearchScope = {
  libraryIds?: number[];
  itemRefs?: PortableItemRef[]; // complete { libraryId, key }
  collectionRef?: PortableCollectionRef;
  tag?: string;
  itemType?: string;
};
type SynthesisEvidenceSearchRequest = SynthesisSearchRequest &
  SynthesisLibrarySearchScope & { sourceKinds?: SynthesisSearchSourceKind[] };
type SynthesisTopicSearchRequest = SynthesisSearchRequest & { sections?: string[] };

type SynthesisSearchCoverage =
  | {
      kind: "library";
      sources: Record<SynthesisSearchSourceKind, {
        status: SynthesisSearchWorkStatus;
        sourcesScanned: number;
      }>;
    }
  | {
      kind: "topic";
      sections: Array<{ section: string; status: SynthesisSearchWorkStatus }>;
    };
type SynthesisSearchIssue = {
  code:
    | "source_unavailable"
    | "source_changed"
    | "source_read_failed"
    | "invalid_source"
    | "scan_budget_exhausted"
    | "passage_budget_exhausted"
    | "result_budget_exhausted"
    | "vector_unavailable";
  sourceKind: SynthesisSearchSourceKind | null;
  affectedCount: number;
};
type SynthesisSearchResult<T> = {
  results: T[];
  status: SynthesisSearchStatus;
  method: SynthesisSearchMethod;
  coverage: SynthesisSearchCoverage;
  issues: SynthesisSearchIssue[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number | null;
};
type SynthesisTextRange = { start: number; end: number }; // UTF-16, half-open
type SynthesisEvidenceSource =
  | { kind: "metadata"; field: string }
  | { kind: "fulltext"; attachmentRef: PortableItemRef }
  | {
      kind: "analysis";
      artifactType: "digest" | "references" | "citation-analysis" | "literature-score";
      noteRef: PortableItemRef;
    };
type SynthesisEvidenceLocation = {
  unit: "field" | "paragraph" | "list_item" | "table_row" | "analysis_field";
  field: string | null;
  range: SynthesisTextRange;
};
type SynthesisEvidenceContext = {
  content: string;
  format: "text" | "markdown";
  source: SynthesisEvidenceSource;
  sourceVersion: string;
  location: SynthesisEvidenceLocation;
};
type SynthesisEvidencePassage = {
  itemRef: PortableItemRef;
  content: string;
  format: "text" | "markdown";
  source: SynthesisEvidenceSource;
  sourceVersion: string;
  location: SynthesisEvidenceLocation;
  context: SynthesisEvidenceContext[];
};
```

The schema closes every object, bounds strings, arrays, issue counts and source counts, and forbids a public score or free-form issue message. `SynthesisSearchRequest` is the exact common query/paging base; Library scope and Topic sections are owner-specific extensions. C1's filter operation is outside these search types. C3's item request and C4's Topic request use the names above without aliases. `coverage.kind` is `library` for C2/C3 and `topic` for C4. C2 returns `method: "lexical"`; vector/hybrid values exist only so later implementation can truthfully use the same result shape. `invalid_source` identifies a source descriptor rejected by the canonical Broker owner; `result_budget_exhausted` identifies a result-round bound and yields limited status with `total: null` when exact total is no longer known.

`total` is exact only when every result in the bounded declared scope is known; otherwise it is null. A cursor freezes query, filters, scope, method and algorithm version, ordering, source-owner basis, and the current bounded result round. A stale, expired, or basis-mismatched cursor fails with the established cursor error and is never silently rerun. An empty query is invalid. Omitted `sourceKinds` means all three; an empty array means none. Duplicate `itemRefs` are deduplicated; an empty array means an empty scope.

### Single Rust kernel and shared native port

Create only `rust/synthesis-sidecar/crates/synthesis-application/src/lexical_search.rs` for lexical matching and ordering. It performs deterministic Unicode normalization and case normalization, script-aware lexical segmentation including scripts without whitespace boundaries, phrase matching, and original-text offset mapping. Ordering is matched query-unit coverage, phrase match, declared field priority, then stable result identity. It does not use BM25 or term frequency and does not emit a score. The kernel is stateless and called only with bounded current source facts.

Create `evidence_search.rs` as the deep Retrieval Application module in the existing `synthesis-application` crate. Inject a narrow private source-facts/read port. Compose the same Retrieval Application in the existing `ProductionApplications` owner and in the private native composition seam used by C3. C3 calls this seam for `Broker.library.searchItems`; the Broker does not acquire or resolve the public `SynthesisClient`. C4 adds Topic matching through the same `lexical_search.rs` from `TopicApplication`. There is no TypeScript kernel or second Rust copy.

### Source ownership and verification seam

Extend the private Host read seam beside the existing `SynthesisHostReadPort` in `packages/synthesis-contracts/src/hostRead.ts`, the reverse-Host wire contract, and `createZoteroSynthesisHostReadPort` in `src/modules/synthesis/libraryAdapter.ts`. This is a new seam: current `artifacts.read(locator, expectedHash)` verifies canonical artifact payload hashes only; it does not provide one complete source contract for metadata, Markdown attachments, and all analysis passages. The Zotero Host Capability Broker remains the sole owner of source identity, eligibility, scope, and facts. `libraryAdapter.ts` only transports typed requests to Broker-owned operations and projects their results; it must not define a parallel source catalog or independently scan Zotero sources.

The new private seam asks the Broker to enumerate bounded current source descriptors and then read the selected source owner with its expected opaque version and requested range. It returns complete content, format, Broker-issued source identity, owner version, and verified location, or a typed invalid/stale/missing/unavailable outcome. It never returns local paths or Zotero objects. Metadata uses Broker-owned current field facts; analysis reuses its existing canonical owner/hash read and canonical note identity; Markdown full text uses the actual Markdown reader and runtime adapter selected through `src/modules/runtimePersistence.ts`, under Broker-provided source identity and scope. Analysis `artifactType` is closed to `digest`, `references`, `citation-analysis`, and `literature-score`; its identity is the canonical `noteRef: PortableItemRef`, not an invented artifact ID. It must not treat attachment item revision as text-content version.

For omitted `libraryIds`, the source owner captures the current library at request admission. Empty library scope is rejected; ambiguous current-library selection requires explicit scope. Collection, tag, item type, and item refs are intersected. Source kinds are searched as a union. Exclude ordinary notes, annotations, conversations, Topic synthesis content, and OCR.

Split candidate text at paragraphs, list items, table rows, or analysis fields. Long passages are split on Unicode character boundaries, and offsets map to original text as zero-based UTF-16 half-open ranges. Passage content is returned only after a second source-owner read verifies version, scope, and exact range. Context from another range includes its own content, source, sourceVersion, and location.

No source facts or lexical index are persisted. Per-request scan/read bounds use the current reverse-Host and production-operation budgets. Coverage reports each of metadata/fulltext/analysis as complete, not requested, limited, or unavailable, with bounded source counts. Issues use the closed code/sourceKind/affectedCount structure. Read failure or budget exhaustion is limited; zero verified matches after complete work is completed; no runnable method/source is unavailable.

### Client, remote capability, MCP, and CLI projection

Add root `SynthesisClient.searchEvidence` to the typed grouped client, neutral port adapter, native operation catalog, and Rust production dispatch. Add `host.synthesis.searchEvidence` as an explicit Workflow Host projection. The C3 change separately adds the explicit `host.library.searchItems` projection and uses the private injected native port. C4 separately adds `topics.search`, the remote `topics.search` capability, and CLI `synthesis topic search`.

C2 adds remote `synthesis.search_evidence` to the canonical Host Bridge capability file `contracts/host-bridge/capabilities.v2.json`, with its closed request/result schemas and handler in `src/modules/hostBridgeCapabilityRegistry.ts`. MCP mirrors that same capability definition/handler through `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts` and `zoteroMcpServer.ts`; it must not implement another search path. Add Rust CLI `synthesis evidence search` through `rust/zotero-bridge/src/args.rs` and `commands.rs`, registering it in `contracts/host-bridge/cli-commands.v2.json`. Preserve existing JSON-container parsing of `--query`; the contained value is the plain search string.

### Host Bridge agent-facing surfaces

If guidance is updated to expose the new capability, freeze baseline commit `84b3028dba8f5f3b8437f3aa237bf0fec2e68820`, record materialized file metrics for `zotero-bridge-cli`, `zotero-library-agent`, and `zotero-librarian`, and set the approved deletion list to empty before editing. Update the relevant CLI and research-synthesis source instructions at adjacent detail, then render all three surfaces. Compare each materialized `SKILL.md` and directly referenced reference for absolute depth, substantive instruction lines not below baseline, and normalized prose characters at least 95% of baseline. Report unmapped, downgraded, unauthorized-dropped, and intra-package-duplicate counts for every affected package; perform semantic parity review separately from thickness checks.

## File Inventory

Existing paths verified with `rg --files` and intended for C2 edits:

- Contracts and wire: `packages/synthesis-contracts/src/client.ts`, `index.ts`, `hostRead.ts`, `sidecarProduction.ts`, `protocolSchema.ts`; `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/registry.json`, `schemas/reverse-host.schema.json`, `corpus/reverse-host.json`; `packages/synthesis-contracts/contract-set/synthesis-production-client-v1/operations.json`, `capabilities.json`.
- TypeScript client and host projection: `src/modules/synthesisClient/clientPortAdapter.ts`, `nativeComposition.ts`, `workflowHostClient.ts`; `src/workflows/types.ts`, `hostApi.ts`, `workflowHostOwners.ts`, `workflowHostContract.ts`.
- Current Host source implementation to extend: `src/modules/synthesis/libraryAdapter.ts` only as transport to Broker-owned source facts; `src/modules/zoteroHostCapabilityBroker.ts` as sole source identity/scope/facts/read owner; `src/modules/runtimePersistence.ts` as runtime filesystem adapter selection source. Reverse-Host wiring: `src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts`, `synthesisReverseHostHandlers.ts`, `synthesisReverseHostEndpoint.ts`.
- Rust app and runtime: `rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs`; `rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs`, `runtime_production_ports.rs`, `runtime_production_client.rs`, `runtime_capabilities.rs`, `runtime_reverse_host.rs`.
- Host Bridge, MCP, and CLI: `contracts/host-bridge/capabilities.v2.json`, `cli-commands.v2.json`; `src/modules/hostBridgeCapabilityRegistry.ts`, `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts`, `zoteroMcpServer.ts`; `rust/zotero-bridge/src/args.rs`, `commands.rs`, `schema.rs`; `skills_src/zotero-bridge-cli/references/command-catalog.md`.
- Agent surface source, only if semantic guidance needs changes: `skills_src/zotero-bridge-cli/SKILL.md`, `skills_src/zotero-library-agent/skills/zotero-research-synthesis/SKILL.md`, and `skills_src/zotero-library-agent/skills/zotero-research-synthesis/references/playbook.md`. Command reference cards are produced by the existing renderer; do not create a parallel source card. Generated roots are `addon/content/host-bridge-skills/zotero-bridge-cli`, `addon/content/host-bridge-skills/zotero-library-agent`, and `profiles/hermes/zotero-librarian`.

New paths:

- `packages/synthesis-contracts/src/search.ts` — shared TypeScript DTOs and strict rebuilders.
- `packages/synthesis-contracts/contract-set/synthesis-sidecar-protocol-v1/schemas/search.schema.json` and `corpus/search.json` — search contract schema and TypeScript/Rust parity cases registered in the existing registry.
- `rust/synthesis-sidecar/crates/synthesis-application/src/lexical_search.rs` — the sole lexical kernel.
- `rust/synthesis-sidecar/crates/synthesis-application/src/evidence_search.rs` — deep Retrieval Application and private application port contract.
- Host source adapter tests/fixtures and vertical production-route tests, preferably added to the existing suites under `tests/synthesis/`, `tests/host-bridge/`, and `rust/synthesis-sidecar` rather than introducing a parallel runner.

## Risks / Trade-offs

- [Source-owner version support is incomplete for original Markdown] → Add the explicit private Broker-owned read seam and obtain version from the content-owning reader; never substitute the Zotero attachment item revision or let `libraryAdapter` define source facts.
- [Large libraries can exhaust a bounded scan] → Return limited coverage and null total unless exact; bind continuation to the same basis.
- [Normalization changes text offsets] → Map every normalized unit to original text and validate UTF-16 ranges against source content.
- [A passage changes after candidate enumeration] → Re-read and verify owner version, scope, and range immediately before projection.
- [Surface wording becomes thinner during edits] → Fix the supplied baseline, authorize no semantic deletion, render all three surfaces, and report semantic parity and thickness evidence separately.

## Migration Plan

1. Add the shared DTO/schema/corpus and strict TypeScript/Rust parity validation.
2. Test-first, implement the Rust kernel and injected Retrieval Application seam.
3. Add Broker-owned private source descriptor enumeration and owner-verified reads, reusing current metadata and analysis paths and the actual Markdown reader/runtime adapter through the explicitly new private seam.
4. Register the app in the current production runtime and route typed `SynthesisClient.searchEvidence` through native composition; add the explicit Workflow Host projection.
5. Add remote capability/handler schemas, MCP mirror, Rust CLI command, and any needed agent guidance while preserving JSON-container `--query` semantics.
6. Validate the full production path from Workflow/remote/CLI call through Rust retrieval, reverse-Host, Zotero source owner, same-call verification, and typed result. Check C3 and C4 compatibility against this DTO without implementing their search routes here.
7. Rollback removes/disables the additive operation and private port; no database or source-format migration is required.

## Open Questions

None that alter the agreed behavior or architecture. Choose private scan and passage byte ceilings from existing operation and reverse-Host policy during implementation; report limit exhaustion through the fixed result contract.
