# Design

## Context

See [proposal.md](proposal.md) for the problem and scope. The current Broker owns canonical library reads and exposes `listItems`, while Host Bridge `library.search_items` currently calls that list path and projects `{items, truncated}`. The public `SynthesisClient` is grouped and closed. The preceding `separate-library-list-filters` and `add-synthesis-lexical-evidence-search` changes provide the list/filter boundary and shared Rust lexical application/private source-facts contract that this change consumes.

## Goals / Non-Goals

**Goals:**

- Keep Library search policy, scope resolution, result aggregation, continuation ownership, and public errors in `ZoteroHostCapabilityBroker`.
- Explicitly expose the approved Broker operation as `host.library.searchItems` in the existing Workflow Host v12 surface, with its closed DTOs and call control.
- Inject the shared Rust lexical execution into the Broker through one private native composition seam, while the Broker supplies current Library source facts through its private source-facts port.
- Preserve the existing `library.search_items` Bridge, MCP, and CLI command identity while replacing its legacy list-shaped result.
- Keep Broker, Workflow Host, Bridge, MCP, and CLI projections explicit and independently declared.

**Non-Goals:**

- Adding any public `SynthesisClient.searchItems` or `host.synthesis.searchItems` member.
- Implementing the Rust lexical kernel, `searchEvidence`, Topic search, list/filter migration, embedding/vector search, persistent lexical indexes, or OCR in this change.
- Changing snapshot capture, list/traversal completeness, or the `library.search_items` capability name and CLI `--query` JSON container.

## Decisions

1. **Broker owns the search semantics; Workflow Host gets an explicit approved projection.** Add `library.searchItems` to the Broker and add exactly `host.library.searchItems` to Workflow Host v12. Define its input, result, and control signature in the Workflow Host types; implement the member through `hostApi.ts` and the named Broker owner in `workflowHostOwners.ts`; add the exact member to `workflowHostContract.ts`'s code-native manifest. Host Bridge validates its public request, calls the same Broker member, and returns the full result. MCP remains generated from the Host Bridge contract. The CLI forwards the existing JSON payload. Each public projection remains separately declared, so Broker growth cannot implicitly widen any surface.

2. **The native lexical port is private and injected.** Extend Broker construction with a private search port. Its source-facts input and result stay internal to the Zotero Host integration; native composition explicitly supplies an adapter to the shared Rust Retrieval application introduced by the prerequisite change. The port is not exported from `SynthesisClientPort`, the grouped `SynthesisClient`, Workflow Host, or remote Topic APIs. This keeps the direction of dependency Broker → injected mechanism and avoids copying the lexical kernel.

3. **Read current source facts per request, without a durable lexical index.** The Broker resolves the current library scope and bounded candidate set, then obtains metadata/abstract, existing Markdown full-text, and canonical analysis-source facts from their current owners. `sourceKinds` defaults to all three kinds, multiple kinds form a union, and an empty array yields no source reads. Ordinary notes, annotations, conversation records, canonical Topics, and OCR-only content are excluded. The search kernel operates only on those bounded facts; it does not create a persistent lexical index.

4. **Use deterministic lexical ordering and an owner-held cursor basis.** Apply Unicode normalization and case folding with language/script-aware lexical tokenization, then order by lexical coverage, phrase match, and field priority, with complete item identity as the final tie-breaker. Do not stack term frequency as relevance and do not claim BM25. Keep scores internal. A bounded expiring continuation record freezes the resolved query/scope, method, ranking, result limit, source versions, and next position. Before returning a later page, the Broker revalidates the stored source-version basis; expiration or mismatch returns a structured cursor/basis error and never starts a replacement search. `total` is numeric only when the owner has counted all matching results accurately; otherwise it is `null`.

5. **Keep the shared result envelope exact across transports.** Broker results contain `results`, `status` (`completed`, `limited`, or `unavailable`), actual `method` (`lexical` for this capability), `coverage`, structured `issues`, `nextCursor`, `hasMore`, and `total`. Normal empty completion remains distinct from incomplete coverage and unavailable execution. Transport adapters preserve these fields and errors. The Bridge contract schema and CLI payload/result adapters change together; MCP continues to derive input validation from the Bridge contract.

6. **Preserve the complete C1 list contract and snapshot ownership.** The final list requirement uses `filter` for literal matching, preserves its empty-value behavior, resolved criteria, all C1 scenarios, stable identity order, and full traversal/readiness coverage; content relevance exists only on `searchItems`. Snapshot capture remains unchanged. The C3 MODIFIED list block carries the full C1 requirement text and scenarios, then adds only the separation from search. Implementation tasks apply after C1 and C2 so the contracts compose cleanly.

## File Inventory

The implementation applies only after `separate-library-list-filters` (C1) and `add-synthesis-lexical-evidence-search` (C2) are applied. The C2-created `packages/synthesis-contracts/src/search.ts` is the shared request/result DTO source. C3 uses `SynthesisSearchRequest` and `SynthesisSearchResult<LibraryItemSearchHit>` with C2's exact common field names and status/method enums; C3 must not recreate or rename that envelope.

| File | Status at C3 implementation | C3 change |
| --- | --- | --- |
| `packages/synthesis-contracts/src/search.ts` | Created by C2 | Read and use `SynthesisSearchRequest`, `SynthesisLibrarySearchScope`, `SynthesisSearchCoverage`, `SynthesisSearchIssue`, `SynthesisEvidenceSource`, `SynthesisEvidenceLocation`, and `SynthesisSearchResult<T>`; add no alternate shared envelope. |
| `src/workflows/types.ts` | Existing | Define `LibraryItemSearchHit` exactly as `{item: RegularItemSummaryDto, matches: Array<{source: SynthesisEvidenceSource, sourceVersion: string, location: SynthesisEvidenceLocation, matchedTerms: string[], phraseMatch: boolean}>}` and the explicit `WorkflowHostApiV12.library.searchItems` request/result/control signature, composing the C2 request and result types. |
| `src/modules/zoteroHostCapabilityBroker.ts` | Existing | Add canonical `library.searchItems` owner, request validation, captured scope, bounded current source facts, aggregation, status/coverage/issues, and continuation basis. |
| `src/workflows/workflowHostOwners.ts` | Existing | Explicitly adapt and bind the Broker search owner for the Workflow Host library projection. |
| `src/workflows/hostApi.ts` | Existing | Expose `host.library.searchItems` through the explicit v12 projection and preserve call control/error mapping. |
| `src/workflows/workflowHostContract.ts` | Existing | Add `library.searchItems` to `WORKFLOW_HOST_API_MANIFEST`; keep type/manifest equality closed. |
| `src/modules/synthesisClient/nativeComposition.ts` | Existing, after C2 | Inject the private native lexical search port into Broker composition; do not add a public `SynthesisClient` operation. |
| `src/modules/hostBridgeCapabilityRegistry.ts` | Existing | Route `library.search_items` directly through `Broker.library.searchItems`; remove the list-page adapter and legacy `{items, truncated}` wrapper. |
| `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts` | Existing | Preserve the shared structured search result and update only the search-specific text summary if needed. |
| `contracts/host-bridge/capabilities.v2.json` | Existing | Replace the search capability's input/output schemas with the C2-aligned request and item-search envelope, preserving capability identity and approval/effect metadata. |
| `contracts/host-bridge/cli-commands.v2.json` | Existing | Update the existing `library item search` payload/result schema and keep its JSON-container `--query` binding. |
| `rust/zotero-bridge/src/args.rs` | Existing | Keep the existing search command and `--query` JSON container; align payload validation/help with the search request contract. |
| `rust/zotero-bridge/src/commands.rs` | Existing | Pass through the complete result and structured search errors without list-result reconstruction. |
| `docs/components/zotero-host-capability-broker-ssot.md` | Existing | Document Broker ownership and the explicit Workflow Host projection. |
| `docs/components/workflows.md` | Existing | Document the explicit `host.library.searchItems` v12 projection and its closed shared DTO contract. |
| `skills_src/zotero-bridge-cli/references/command-catalog.md` | Existing | Update the generated-source command facts for `library item search` if contract rendering identifies changed fields. |
| `skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md` | Existing | Add current search-versus-list task guidance at existing instruction depth if semantic review finds it necessary. |
| `skills_src/zotero-library-agent/skills/zotero-library-query/references/playbook.md` | Existing | Update only the directly owned detailed search procedure if needed by the public behavior change. |
| `tests/zotero-host/102-zotero-host-broker-capability-api.test.ts` | Existing | Add Broker search scope, empty scope, lexical ordering, limits, coverage, cursor expiry/basis, and Workflow projection behavior tests. |
| `tests/workflows/187-workflow-host-contract-governance.test.ts` | Existing | Assert the new public type/runtime/manifest member is exact for both variants and no undeclared Broker member leaks. |
| `tests/host-bridge/107-host-bridge-capabilities.test.ts` | Existing | Assert the Bridge calls Broker search and returns the full envelope with fail-closed errors. |
| `tests/host-bridge/108-mcp-host-bridge-mirror.test.ts` | Existing | Assert MCP mirrors the same search schema, result, and error semantics. |
| `tests/host-bridge/101-zotero-mcp-server.test.ts` | Existing | Verify tool schema and structured/text projection for search results. |
| `tests/synthesis/220-synthesis-native-client-composition.test.ts` | Existing | Verify explicit private-port injection without adding a public client member. |
| `tests/zotero/core/lite/102-acp-zotero-mcp-server.integration.test.ts` | Existing | Reuse the real Host Bridge/MCP server and Broker integration seam to exercise `library.search_items` through the production capability route and assert the shared result envelope and structured failures. |
| `openspec/changes/add-library-lexical-item-search/surface-review.md` | New implementation evidence | Record baseline, affected materialized paths/metrics, empty deletion inventory, parity counts, depth warnings, and render/check results. |

No new production source file is required: C3 composes the C2 kernel and ports through the existing Broker/native-composition boundaries. Do not edit C2's `SynthesisClient` contract or the other three change directories.

The implemented private port uses the read-only `library.lexical.execute` sidecar capability. Its registry entry and request/result definitions live in the existing protocol registry and search schema; the general runtime capability inventory and its parity fixtures include that capability, while the public production-client catalog remains unchanged. `EvidenceSearchApplication` shares its bounded source scan and lexical kernel between passage retrieval and this item projection. The Broker freezes the returned source facts, projects canonical item summaries, and owns continuation. The reverse-Host HTTP adapter preserves Broker conflicts and resource limits; native composition distinguishes internal protocol failures from an unavailable owner.

Continuation binds the query, resolved scope, source kinds and `maxResults`; `limit` controls each page and may change without opening a new round. Source coverage and `total` retain C2 semantics: a result budget issue makes the result limited and the total unknown. Built-in workflows were checked for consumers of the former search wrapper; none uses it, so their business hooks need no migration.

## Risks / Trade-offs

- [Bounded per-request source reads can limit coverage on large libraries] → Report `limited`, exact coverage, and structured issues; never present a partial candidate set as completed or persist a lexical index as a shortcut.
- [A cursor can outlive source content or process-local state] → Bind its opaque handle to an expiring result snapshot and source-version basis; fail explicitly on expiry, restart, or basis mismatch without rerunning.
- [Unicode tokenization quality varies across scripts] → Use the shared Rust kernel's normalization and script-aware lexical path, and validate English, Chinese, and mixed-script observable ordering without exposing implementation scores.
- [Legacy callers may expect `{items, truncated}`] → Keep the capability name and input container, update its declared output schema and CLI/MCP projections in the same change, and cover those consumers end to end.

## Migration Plan

1. Wait until all four issue #88 changes are apply-ready. Then complete and apply `separate-library-list-filters` and `add-synthesis-lexical-evidence-search` before C3; verify C1's final list contract and C2's shared DTO/kernel/ports are present in the worktree.
2. Implement vertically by owner: add and run the owner's failing observable test, implement that owner, then rerun its focused tests before moving to the next owner. Keep the shared type/manifest, transport schema, and projection conformance assertions with their owning implementation step.
3. Wire the private source-facts and native lexical ports through the Broker composition seam, then implement Broker, Workflow Host, Bridge/MCP, and CLI owners in the order specified by `tasks.md`. MCP continues to consume the Bridge contract.
4. Run focused Broker and Workflow Host tests, Rust contract tests, and local Bridge → MCP/CLI integration checks. Run the project Host Bridge surface review against baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820` before any agent-facing surface release.
5. Rollback consists of reverting this change's implementation and contracts together; the prior Broker list path and capability name remain available, and no persisted lexical index or data migration needs cleanup.

## Open Questions

None. Public behavior, ownership, dependencies, and transport compatibility are fixed by the approved decisions referenced in the proposal.
