## Context

The Workbench UI owns a rich local `SynthesisUiState`, while the sidecar protocol owns a smaller request DTO used to derive Chrome and surface projections. The previous adapter treated any JSON-safe object as a valid Workbench read state, so the complete local model reached the native capability validator. The strict protocol schema rejected that model before RPC dispatch. See `proposal.md` for the user-visible impact and the delta specs for the required boundary behavior.

The first repair made the request path strict and usable, then real-device testing exposed the second fault: capability result validation still treated all surfaces as one generic object. Index happened to match the partial aggregate schema, while the other pages carry different roots and nested projections. A further real-data sweep showed that structurally correct per-surface schemas were still insufficient when producers decoded historical Topic payloads or returned persistence JSON directly. The solution must preserve the existing Shell/Chrome/Surface read architecture, use recursive DTO contracts as the cross-language source of truth, and keep Graph pagination compatible with the Citation Graph application contract.

## Goals / Non-Goals

**Goals:**

- Give the Workbench read request one concrete TypeScript type, JSON Schema definition, and shared runtime builder.
- Make UI-to-protocol projection explicit and reusable by production and read-only consumers.
- Fail malformed or unprojected state before either the legacy in-process port or native RPC is invoked.
- Give every surface and Review tab a concrete result type and schema selected from the originating request.
- Exercise representative empty and non-empty results through contract, grouped client, native composition, UI projection, and real Rust-route boundaries.
- Keep historical storage formats behind application/runtime projection seams so Workbench correctness does not depend on migrating or fully decoding them.

**Non-Goals:**

- Change the local UI model, user-visible filters, sidecar-produced result semantics, or region refresh ownership.
- Add compatibility fields for the former broad payload or teach the sidecar to understand plugin presentation state.
- Change persistence schemas or stored rows, sidecar lifecycle, maintenance operations, Citation Graph application ownership, or protocol capability names.

## Decisions

### 1. The contract package owns the narrow Workbench read state

`SynthesisWorkbenchReadState` is a concrete DTO with four required sections: registry, reviews, reader, and graph. `rebuildSynthesisWorkbenchReadState` validates that DTO through the versioned Workbench schema and is reused by every request builder.

This keeps type, runtime validation, corpus, native preflight, and Rust decoding aligned. Keeping `SynthesisJsonObject` as the public request type was rejected because JSON safety alone does not establish domain shape and allows local UI fields to drift into the protocol.

### 2. The UI adapter performs a lossy projection

The shared Workbench adapter maps only server-relevant state:

- registry scope and expanded source references;
- review tab, filters, search, and bounded page input;
- the selected reader Topic identifier;
- Citation Graph filters, layout algorithm, and optional continuation basis.

Presentation-only state is intentionally discarded. The existing `all` registry UI preset maps to the protocol's library scope, while referenced-only remains explicit. Rebuilding the complete UI state in native or Rust code was rejected because it would couple protocol handling to plugin presentation details.

### 3. Graph state reuses the canonical Graph query contract

The Workbench schema references the existing Citation Graph query definition rather than declaring another partial graph shape. Continuation uses `windowCursor`; optimistic basis checking uses `basis.expectedGraphHash`; both are omitted when absent.

A Workbench-specific graph object was rejected because its older `search/layout/limit` shape had already diverged from the application query and would create a second mapping source.

### 4. Validation occurs at both public construction and grouped dispatch

The UI adapter validates the object it constructs, giving production callers an immediately typed DTO. The grouped in-process client validates again before invoking its port, so alternate callers cannot bypass the contract by supplying a cast or hand-built broad object. Native composition retains its protocol capability preflight as the final cross-process guard.

Relying only on native validation was rejected because in-process and test compositions would accept inputs that production rejects. Relying only on the UI adapter was rejected because the grouped client is a public seam with callers other than the production UI.

### 5. Surface results form a request-selected closed union

The Workbench schema owns one closed definition for Home, Topics, Index, Graph, Tags, Concepts, and Reader, plus separate Reference, Concept, and Topic Graph Review definitions. `rebuildSynthesisWorkbenchSurfaceResult` chooses exactly one definition from `request.surface` and, for Review, `request.state.reviews.activeTab`. The public `readSurface` generic maps the requested surface to the matching TypeScript projection.

A single aggregate object with optional `registry`, `topicGraph`, `graph`, `tags`, `concepts`, and `reader` fields was rejected. It permits impossible combinations, cannot distinguish Review tabs, and repeats the original failure mode by validating whichever subset happened to be modeled first. Selecting only by inspecting returned keys was also rejected because a valid Index result returned for Home must fail instead of silently rendering the wrong page.

### 6. The wire schema follows the real Rust projection without a generic escape

Nested Topic Graph, Concept, Tag, Citation Graph, Reference registry, and Reader Topic detail shapes are recursively concrete. Their existing wire naming is preserved: persistence-oriented structures retain snake-case fields, while UI-oriented graph projections retain their established camel-case fields. Reader uses the actual Topic artifact sections and the Workbench metadata envelope produced by Rust.

Allowing open objects or an opaque JSON fallback was rejected because it would make the cross-language check pass without protecting any page. The recursive contract gate therefore continues to report zero unauthorized generic escapes.

### 7. Boundary evidence covers every route and non-empty high-risk projections

The native composition test calls all eight surfaces and all three Review tabs. Production Rust-route tests pass those results through the native client and UI snapshot adapter. A non-empty Topic lifecycle covers Home, Topics, Concept, Topic Graph, and Reader projections; a refreshed Reference dataset covers Index, Reference Review, and a non-empty Citation Graph. Contract corpus cases lock representative snake-case and camel-case fields and reject a structurally valid result returned for the wrong surface.

### 8. Workbench Topic reads use a lightweight application projection

Home and Topics use a dedicated `TopicWorkbenchRow` projection built from stable topic application state, bounded Reference artifact facts, and the existing readiness calculation. This path does not deserialize the complete historical Topic definition, resolver, resolved-paper set, or projection bundle. Full `listTopics` and Topic detail retain their typed current-record contract.

Weakening the full Topic record decoder or adding historical fields to the current DTO was rejected because either choice would spread persistence compatibility into the public model. Migrating every historical bundle during a page read was rejected because a UI read must remain bounded and side-effect free.

### 9. Stored Concept proposals have one strict decoder

The Concept application owns decoding of stored review proposals. It maps the known persisted snake-case field names to the current typed proposal, discards storage-only merge hints, normalizes nested relation identifiers, and then deserializes with unknown-field rejection. Review actions and Workbench projection call the same decoder.

Duplicating key lookup in the runtime projection was rejected because it had already produced null public fields while review actions failed on the same row. Passing the raw proposal through the public DTO was rejected because persistence shape is not a UI contract.

### 10. Review evidence is projected into closed public DTOs

Concept Review exposes only its stable top-level fields. Reference match proposals use a discriminated evidence union: canonical merges expose source/target parties and bounded comparison facts, while Zotero bindings expose author overlap, year delta, and title similarity. Storage-only representative selection, raw samples, candidate sets, records, and diagnostic messages do not cross the Workbench boundary.

An open evidence object was rejected because it makes real-data validation dependent on internal matcher evolution. Dropping evidence entirely was rejected because the Review UI needs stable decision context.

### 11. Empty persisted manifest identity is represented as absence

Concept and Topic Graph projections convert an empty stored manifest hash to JSON `null`, matching the existing nullable public contract. A non-empty value must still satisfy the canonical hash pattern. This keeps partially initialized review queues readable without relaxing hash validation.

### 12. Seven-platform verification uses current production seams

The durable native candidate smoke rebuilds its launch input through the shared launch-config v3 builder, starts an authenticated loopback reverse Host fixture, and uses explicit production repository and canonical roots. Its health, Workbench, shutdown, persistence, and reopen assertions follow the current Rust runtime contract. This keeps the executable smoke at the real process boundary while leaving launch-field ownership in the contract package.

Platform-sensitive Rust tests use lifecycle ownership instead of wall-clock assumptions. The background drain case synchronizes task start and release through channels. Topic application tests own their temporary root through a test-only RAII guard declared before repository, canonical, graph, and application owners, so Windows removes SQLite files only after every later owner has dropped.

Reference refresh concurrency evidence uses an explicit two-read rendezvous and completion gate: both Host reads must enter concurrently, the second completion is published, and only then may the first completion proceed. Repository migration tests explicitly drop every read-only source and backup connection after their assertions and before removing the temporary root. Completion ordering is therefore independent of runner scheduling, while Windows cleanup continues to fail loudly if an owner is accidentally retained.

The process-lifecycle reverse Host fixture keeps its listener nonblocking so shutdown can be observed without an extra wake-up connection, but every accepted stream is explicitly restored to blocking mode before the bounded request read. This avoids relying on platform-specific accepted-socket flag inheritance. A background fixture failure remains visible when teardown is otherwise successful; teardown already running during another panic does not create a second panic that would abort the test process and hide the original failure.

Migration fixtures scope each read-only source or backup connection to the assertion that consumes it. Directory cleanup therefore occurs after lexical destruction of every SQLite owner instead of depending on a manually maintained list of `drop` calls.

The WebDAV reopen fixture derives its unique temporary directory suffix from Unix epoch nanoseconds. Its former ISO-8601 suffix contained colons, which are valid on Unix filesystems but invalid inside a Windows path component; the first state save therefore failed before it could exercise reopen behavior. A path-safe numeric identity keeps the existing save-and-reopen seam intact without weakening production state-store errors or adding a platform-specific branch.

Copying the v3 field list into another unvalidated object was rejected because it would repeat the drift that caused native candidates to fail with `invalid_config`. Increasing sleeps or ignoring Windows cleanup errors was rejected because both approaches hide scheduling and ownership bugs rather than making the evidence deterministic.

## Risks / Trade-offs

- **A future local filter is not projected automatically** → Add it deliberately to the protocol DTO, schema, adapter, and corpus only when a sidecar read actually consumes it.
- **Review paging defaults currently originate in the adapter** → Keep them bounded and represented in the request; move ownership only through a separate paging-contract change.
- **Schema and TypeScript types could drift** → Run contract typecheck, recursive cross-language gates, corpus validation, and native/Rust route tests together.
- **A real sidecar projection gains a field** → Update its single surface definition, public DTO, corpus, and route evidence together; do not loosen unrelated surfaces.
- **A stored proposal gains another persistence-only field** → Normalize it only when required for typed application behavior; do not expose it through the Workbench DTO.
- **A historical Topic bundle cannot satisfy the current full record** → Keep list/detail failure semantics for the full API while the lightweight Workbench projection remains readable from stable state.
- **Double validation adds a small hot-path cost** → The state is bounded and shallow; preserving equal behavior at every client seam is worth the negligible rebuild cost.
- **The production launch contract changes again** → Keep native smoke construction behind the shared launch-config builder and validate the real process boundary in every native matrix member.
- **A platform test depends on scheduler timing or implicit SQLite destruction** → Synchronize the observable event directly and release the inspected connection before cleanup; do not increase sleeps or ignore sharing violations.
- **A listener's nonblocking flag propagates differently across operating systems** → Set the accepted stream mode explicitly and retain the existing bounded read timeout.
- **A background fixture fails while the foreground assertion is unwinding** → Preserve the foreground failure and forbid a second panic from fixture destruction.

## Migration Plan

1. Add failing adapter and native-boundary cases using the default Workbench UI state.
2. Replace the broad Workbench state alias with the concrete DTO and shared builder, then align the JSON Schema and corpus.
3. Project local UI state through the adapter and reuse the builder at grouped dispatch.
4. Add failing native-boundary cases for every surface and a grouped-client case that returns a valid projection for the wrong requested page.
5. Replace the aggregate result definition with the per-surface union, add the request-aware result builder, and align the public TypeScript projection map.
6. Update production-route fixtures and verify Chrome, all supported surfaces, all Review tabs, Graph continuation, UI snapshot projection, and real Rust process routes including a non-empty Graph.
7. Rebuild and install the plugin for the final real-device page sweep.
8. Add failing historical Topic and persisted non-empty Review cases, including storage-only fields.
9. Introduce the lightweight Topic Workbench DTO and shared stored Concept proposal decoder, then project closed Review evidence.
10. Validate results at native composition with the originating request and exercise all three persisted Review variants through the real Rust route.
11. Run the repository gates, commit and push the exact source identity, then dispatch and synchronize the governed seven-platform sidecar prebuild without starting a formal release.
12. If a platform gate fails, repair the shared smoke or deterministic test fixture, rerun local gates, and dispatch one new exact seven-platform attempt only after pushing the new source identity.
13. Treat every failed exact run as evidence: replace remaining completion-order sleeps and premature migration cleanup, then repeat the governed local and remote gates for a new source identity.
14. Make accepted reverse Host streams explicitly blocking, make fixture teardown unwind-safe, and scope every migration inspection connection before temporary-root cleanup.
15. Replace the WebDAV reopen fixture's ISO-8601 temporary-path suffix with a path-safe numeric identity, rerun the governed local gates, and dispatch a new exact attempt only after the new source identity is pushed and separately authorized.

Rollback can restore the previous adapter and contract files without data migration because the change does not alter persisted state. A rollback would also restore the known production failure, so it is only suitable for isolating an unrelated regression.
