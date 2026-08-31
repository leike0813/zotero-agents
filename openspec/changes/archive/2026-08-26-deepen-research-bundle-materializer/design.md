## Context

See `proposal.md` for motivation. `researchBundleService.ts` already owns portable paper DTOs, source/image materialization, artifact formatting, warnings, and direct-bundle publication. Workflow Host currently repeats paper-ref parsing, deduplication, Zotero resolution, the full artifact list, and warning composition before calling the resolved-paper materializer. The cached Workflow Host API v11 projection must preserve its public shape and resolve runtime-sensitive dependencies at invocation time.

## Goals / Non-Goals

**Goals:**

- Put Workflow paper orchestration behind one deep Research Bundle materializer interface.
- Make the standard four-artifact set a single source of truth.
- Keep raw Zotero access and Workflow-only warning compatibility in a thin adapter.
- Test stable outcomes through the materializer and Workflow Host v11 interfaces.

**Non-Goals:**

- Changing Workflow Host API v11, workflow package inputs/results, Product schemas, or paths.
- Changing direct-export selector, Topic digest-only, warning, delivery, or publication semantics.
- Adding a parallel module, a configurable projection/profile, or a filesystem adapter.
- Replacing Synthesis-wide paper-ref parsing outside Research Bundle paths.

## Decisions

### The existing module gains one pre-bound Workflow materializer

`createResearchBundleMaterializer(dependencies)` returns one callable that accepts the existing v11-shaped `{ papers, sourcePaperRefs }` request and returns `{ entries, warnings, papers }`. The factory owns trim, canonical parsing, first-order deduplication, fail-soft resolution, standard artifact selection, and warning aggregation. It delegates resolved paper DTO materialization to the existing `materializeResearchBundlePapers` implementation so source, image, artifact, and manifest-record logic stays local and is not copied.

Alternative projection/profile interfaces were rejected because they expose artifact and source policy to callers and would mix the Workflow and direct Topic contracts.

### Workflow resolution uses a separate narrow seam

The materializer receives a per-paper resolver accepting portable `{ paperRef, libraryId, itemKey }` and returning a portable `DirectResearchBundlePaper` or no result. A missing result becomes `paper_missing`; a dependency rejection remains a request-level infrastructure failure. Empty refs retain current skip behavior, non-empty malformed refs produce `paper_missing`, and successful papers retain first-selection order.

`DirectResearchBundleHost` remains unchanged because its unknown-selector and strict exact-set semantics belong to direct export. Reusing it would require mode branches and would leak incompatible error behavior.

### Artifact selection is module-owned and reader transport is explicit

`RESEARCH_BUNDLE_ARTIFACT_TYPES` is the canonical full set. The artifact-reader seam receives `{ paperRefs, artifactTypes }`, allowing the materializer to choose the set while the Synthesis adapter only transports the request. Direct paper export reuses the full constant; direct Topic export retains its intentional `digest` subset.

The reader result stays `unknown` at the seam because the resolved-paper implementation already validates the external artifact rows before consumption.

### Cached composition captures functions, not runtime state

`createWorkflowHostApi()` may create the materializer once. Its resolver invokes `resolveHostZotero()` and broker methods for each call, and its artifact reader invokes `getDefaultSynthesisService()` for each call. The factory must not retain a raw Zotero item, runtime global, filesystem adapter, picker window, or Synthesis instance.

The shared materializer emits canonical `source_missing`. The Workflow Host projection alone maps it to `core_source_missing`; direct export continues to expose `source_missing`.

### Tests use two confirmed interfaces

Core tests exercise the new materializer with local in-memory resolver and artifact-reader adapters. Workflow Host characterization tests exercise the public v11 interface and warning projection. Tests assert results and stable warning codes, not collaborator call order or internal helper structure. Existing direct-export tests remain regression gates.

## Risks / Trade-offs

- [A cached factory captures stale runtime state] → Capture only callbacks and resolve Zotero/Synthesis/runtime state inside each callback invocation.
- [Workflow fail-soft behavior leaks into strict direct export] → Keep `DirectResearchBundleHost` and direct-export orchestration unchanged; share only the resolved-paper implementation.
- [The full artifact set drifts across callers] → Export one readonly constant and pass selected types through the reader seam.
- [A facade duplicates materialization logic] → Make the facade resolve papers, then call the existing resolved-paper materializer.
- [Tests freeze implementation details] → Assert interface outputs and stable codes; do not assert resolver order, call counts, or full warning prose.

## Migration Plan

1. Add characterization coverage for Workflow Host v11 compatibility.
2. Add the materializer interface test-first and delegate to the resolved-paper implementation.
3. Replace Workflow Host inline orchestration with late-bound adapters.
4. Update Synthesis artifact-reader wiring and the full artifact-set constant without changing direct-export behavior.
5. Update domain/SSOT documentation and run targeted tests, type checks, lint, and strict OpenSpec validation.

Rollback is a source-level revert: the public v11 and direct-export contracts do not change and require no data migration.
