# Design

## Context

At baseline `e2006593d5809cbde790d8f3cbf3d822fa7fef2f`, Pi projects sixteen Broker reads and two Synthesis searches through one catalog. The #10 map decision chain requested Synthesis disposition in #13, allowed independent Gateway registration in #20, and limited #26 C12–C15 to Broker tools. This is a planning omission. Q49 prohibits consuming Host Bridge registry policy or routing Pi through MCP.

Decision evidence: [#13 MVP disposition](https://github.com/leike0813/zotero-agents/issues/13#issuecomment-5405268284), [#20 separate Gateway registration](https://github.com/leike0813/zotero-agents/issues/20#issuecomment-5507754387), [#26 C12](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5538049039) and [#26 C13](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5540846322).

## Goals / Non-Goals

Expose all 29 public Synthesis Client operations to both Pi owners, with canonical schemas, bounded results, durable maintenance admission and owner-managed exports. Preserve the existing two search names. Exclude private UI/debug functions, standalone bundle application, polling, replay and new dependencies.

## Decisions

- `piSynthesisToolCatalog.ts` owns an explicit local mapping of canonical IDs and literal Pi names to Client members. Both owners compose it independently of Broker tools. Resolving the Client is lazy; freezing tools cannot start the sidecar.
- Canonical protocol payload definitions supply closed input schemas. Transport wrappers, run roots and delivery handles are trusted adapter data, not model inputs. Ordinary reads retain canonical DTOs and the existing 50 KiB Gateway limit. Oversized reads fail without truncation or automatic file fallback.
- Topic context accepts an explicit file-delivery option; planning context always publishes managed JSON. Filtered artifacts use the existing remote export adapter internally, resolve its trusted download source and extract through the existing archive API. Pi receives a directory path, relative entries and original manifest rather than a ZIP or Host Bridge handle.
- C08 adds `materializeGeneratedArchive` and `outputResourceKey`. Generated directories stage privately and publish by atomic rename under the owner workspace. Existing 256 MiB per-file, 512 MiB per-call and 2 GiB owner limits apply alongside bounded archive paths, depth and entry count. Existing scanning accounts for committed directories; the managed-file manifest format remains unchanged.
- The three explicit maintenance tools claim `external-mutation`, use exact Gateway approval, submit once, durably append the canonical operation view correlated with call and source turn, and return acceptance. `synthesis.operation.get` is the explicit status query. Submission is not background completion; missing acknowledgement or evidence is unknown and never automatically replayed.
- Gateway execution passes the trusted original `sourceTurnId`, including approval continuations. Owners append operation facts through the existing canonical writer and exclude those internal facts from model context; no second identity or persistence format is introduced.
- Native file-producing tools claim the same trusted workspace resource used by Shell. Gateway resource validation remains strict.

## Files and validation

Add the Synthesis catalog and its focused behavior suite. Update native catalog, managed workspace, bounded archive extraction, Gateway trusted execution context, Conversation/Skill Run composition, transcript context classification, existing runtime and Zotero tests, shard registration and domain documentation. Existing suites cover Gateway authorization, shared owner behavior and workspace quotas; extend them instead of introducing parallel runners. Follow TDD for stable observable behavior. Validate Node tests, types, lint and browser build, then the existing real-Zotero runner on available Linux and Windows targets.

## Risks / Trade-offs

- Maintenance may outlive a call. Durable operation evidence and explicit queries preserve domain ownership; Pi must not reuse Broker mutation observers for these operations.
- Export extraction must reject unsafe paths and clean private staging on cancellation/failure. Cleanup uncertainty remains visible rather than publishing success.
- Real-host evidence depends on available machines and current-source sidecar binaries. Missing platform evidence remains an incomplete task, not inferred from Node tests.

## Migration Plan

No persistence migration, sidecar wire change or runtime configuration change is needed. Existing search-adaptation and release-verification changes remain independent.
