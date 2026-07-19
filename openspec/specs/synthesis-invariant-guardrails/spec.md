# synthesis-invariant-guardrails Specification

## Purpose
TBD - created by archiving change add-synthesis-invariant-guard-tests. Update Purpose after archive.

## Requirements

### Requirement: Synthesis invariants declare executable evidence

Every Synthesis invariant SHALL declare machine-readable test references that point to runnable tests.

#### Scenario: Invariant declares test references

- **WHEN** an invariant has severity `fatal` or `high`
- **THEN** it declares at least one `test_refs` entry
- **AND** each entry includes a test file, invariant marker, and evidence kind.

#### Scenario: Test reference marker is missing

- **WHEN** a `test_refs` marker is not present in an `it(...)` title in the referenced file
- **THEN** the invariant guard test fails.

### Requirement: Invariant markers round-trip between tests and contract YAML

Tests SHALL reference Synthesis invariants with `[inv.*]` markers that resolve back to `invariants.yaml`.

#### Scenario: Test contains an invariant marker

- **WHEN** a Synthesis test title contains a marker matching `[inv.*]`
- **THEN** the marker must correspond to an invariant ID in `invariants.yaml`
- **AND** the invariant must list that test file and marker in `test_refs`.

### Requirement: Static-only guards are explicit exceptions

Static source-inspection guards SHALL be limited to architecture-style invariants where a behavior scenario is not the correct enforcement unit.

#### Scenario: Invariant has only static guards

- **WHEN** all test references for an invariant have kind `static_guard`
- **THEN** the invariant ID must be listed as an allowed static-only invariant by the guard test.

### Requirement: Invariants guard split sidecar operations

Invariant guards SHALL distinguish visible graph incremental refresh from hidden full graph rebuild.

#### Scenario: Sidecar refresh does not directly replace graph cache

- **WHEN** static guards inspect the Reference Sidecar refresh path
- **THEN** they SHALL reject direct `replaceCitationGraphState` calls from that path
- **AND** they SHALL allow a separate graph refresh operation.

#### Scenario: Workflow apply cannot bootstrap missing graph

- **WHEN** static guards inspect workflow apply sidecar code
- **THEN** they SHALL reject direct full graph rebuild calls from that path.

### Requirement: Invariants guard lightweight and advanced matcher separation
Synthesis invariant guards SHALL prevent heavy matcher calls from entering lightweight refresh or workflow apply paths.

#### Scenario: Static guard scans lightweight paths
- **WHEN** invariant tests inspect Reference Sidecar refresh and workflow apply sources
- **THEN** they SHALL fail if those paths call `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

#### Scenario: Static guard scans graph rebuild
- **WHEN** invariant tests inspect Citation Graph cache rebuild
- **THEN** they SHALL verify graph rebuild consumes accepted facts and not open proposals.

### Requirement: Cluster harness stays isolated from production hot paths
Clustered dedupe and the external harness SHALL remain outside refresh, workflow
apply, and production Workbench review wiring in this change.

#### Scenario: Refresh or workflow apply code is inspected
- **WHEN** Synthesis refresh or workflow apply paths are checked
- **THEN** they SHALL NOT call `dedupeCanonicalReferencesClustered`.

#### Scenario: Bibliographic containment classifier evolves
- **WHEN** title containment classification is updated
- **THEN** it SHALL prefer structured suffix evidence over expanding a long
  hard-coded concrete venue list.

#### Scenario: Harness source is inspected
- **WHEN** harness source files are checked
- **THEN** they SHALL NOT query `synt_literature_item`,
  `synt_reference_instance`, or `synt_reference_resolution`.

### Requirement: Synthesis Sidecar SHALL Not Materialize Deterministic Invalid References
Synthesis invariant guards SHALL cover the boundary that deterministic invalid
reference extraction rows are not promoted into canonical identities.

#### Scenario: Invalid raw reference reaches sidecar ingestion
- **WHEN** tests provide a deterministic invalid reference row to Synthesis sidecar ingestion
- **THEN** no active raw reference or canonical reference SHALL be materialized from that row
- **AND** warning-only references SHALL still be accepted.

### Requirement: Workbench hot paths are guarded against full refresh
Synthesis invariant guards SHALL prevent full snapshot reads and global rerenders from returning to Workbench hot paths.

#### Scenario: Static guard scans Workbench host
- **WHEN** active Workbench host code is tested
- **THEN** `ready`, `selectTab`, `setFilters`, progress polling, and local review action paths SHALL NOT contain full snapshot calls.

#### Scenario: Static guard scans Workbench frontend
- **WHEN** active Workbench frontend code is tested
- **THEN** surface-local handlers SHALL NOT call global `render()`
- **AND** surface render helpers SHALL NOT clear the Workbench root.

### Requirement: Invariant Guards SHALL Enforce Cluster Production Wiring
Synthesis invariant guards SHALL enforce cluster dedupe production wiring and
lightweight path isolation.

#### Scenario: Static guard scans active sources
- **WHEN** invariant tests inspect Synthesis active sources
- **THEN** `runAdvancedReferenceMatchingNow` SHALL call
  `dedupeCanonicalReferencesClustered`
- **AND** refresh/apply paths SHALL NOT call it
- **AND** active source SHALL NOT expose the old pairwise
  `dedupeCanonicalReferences` symbol.

### Requirement: Advanced dedupe guardrails keep heavy work out of refresh paths
Invariant guards SHALL prevent Reference Sidecar refresh and workflow apply from reconnecting advanced matcher or dedupe logic.

#### Scenario: Static guard scans refresh code
- **WHEN** tests inspect refresh/apply paths
- **THEN** they SHALL fail if those paths call advanced dedupe helpers, `buildReferenceMatcherIndex`, `resolveReferenceWithPolicy`, or write `synt_reference_match_proposal`.

### Requirement: Fuzzy dedupe is bounded
Invariant guards SHALL prevent fuzzy canonical dedupe from becoming an unbounded all-pairs scan.

#### Scenario: Static guard scans matcher code
- **WHEN** tests inspect the dedupe helper
- **THEN** they SHALL require bounded block and pair budget controls for fuzzy candidate generation.

### Requirement: Related-items sync SHALL NOT rebuild graph or run matcher

Related-items sync SHALL be a Zotero side-effect operation over already accepted library-to-library citation facts. It SHALL NOT rebuild Citation Graph cache, scan artifacts, extract references, or run any reference matcher.

#### Scenario: Related-items sync path stays side-effect only

- **WHEN** active source code is inspected
- **THEN** the related-items sync implementation SHALL NOT call `rebuildCitationGraphCacheFromSidecar`
- **AND** it SHALL NOT call artifact scanning, reference extraction, or advanced matcher entry points.

### Requirement: Digest workflow SHALL NOT contain removed auto matching path

The `literature-digest` workflow and apply hook SHALL NOT contain the removed `auto_reference_matching` option or `applyReferenceMatchingToNote` import.

#### Scenario: Static guard inspects digest workflow files

- **WHEN** active digest workflow files are inspected
- **THEN** they SHALL NOT contain `auto_reference_matching`
- **AND** they SHALL NOT contain `applyReferenceMatchingToNote`.

### Requirement: Synthesis invariant guards SHALL prevent legacy artifact fallback
Guardrails SHALL prevent reintroducing note-only or hidden-HTML artifact availability fallback in active Synthesis paths.

#### Scenario: Hidden payload fallback appears in Synthesis artifact availability
- **WHEN** active Synthesis artifact scan code treats hidden HTML payload blocks or note existence as available artifacts
- **THEN** invariant tests SHALL fail.

### Requirement: Topic Structured Artifact engine SHALL remain environment-neutral

The engine package and its transitive runtime imports SHALL not depend on Node,
Zotero, DOM, plugin toolkit, application persistence, Host ports, or absolute
runtime paths.

#### Scenario: Boundary guard scans the engine

- **WHEN** invariant tests inspect the structured-artifact engine import graph
- **THEN** only environment-neutral engine modules SHALL be reachable.

#### Scenario: Application composes the engine

- **WHEN** production legacy or readonly composition creates a Synthesis service
- **THEN** it SHALL inject the engine through the single application adapter
- **AND** the public service inventory SHALL remain `108 methods / 1 direct consumer`.

### Requirement: Inventory SHALL record one in-process graph-build canary

Migration governance SHALL mark graph build as `in_process` with
`sidecar_worker_canary: true` and `production_worker: false`, retain layout and
metrics as the only production workers, and retain the other five engines in
process.

#### Scenario: Inventory is checked
- **WHEN** synthesis migration invariants are evaluated
- **THEN** they SHALL report two production worker engines, one in-process worker canary, five other in-process engines, `108 methods / 1 direct consumer`, and `mutationEnabled: false`

### Requirement: Graph-build worker SHALL have no application authority

The graph-build worker route SHALL NOT import or use repositories, DB access,
canonical files, Host capabilities, Zotero globals, child processes, or a local
production fallback.

#### Scenario: Service boundary is checked
- **WHEN** static dependency governance scans the graph-build route
- **THEN** worker-thread imports SHALL remain allowlisted and all prohibited authority SHALL remain absent

### Requirement: Private Citation Graph application does not change production routing

The migration inventory SHALL retain 108 public methods, one direct consumer, eight production engine owners, two production worker routes, production graph build in-process, and sidecar production mutation disabled.

#### Scenario: Governance detects accidental graph cutover
- **WHEN** the change adds a public graph application capability, automatic invocation, production route, fallback, direct consumer, engine transfer, or mutation enablement
- **THEN** invariant verification fails

### Requirement: Worker-thread imports SHALL remain allowlisted


Synthesis static guards SHALL permit `node:worker_threads` only in designated
compute pool and worker files and SHALL continue rejecting child process,
repository, canonical-file, Host, and Zotero dependencies from the service
compute graph.

#### Scenario: Service boundary imports are inspected

- **WHEN** active service and engine imports are checked
- **THEN** worker-thread usage SHALL match the explicit allowlist
- **AND** forbidden application authority SHALL fail the guard.

### Requirement: Compute canary SHALL not change production ownership


Adding sidecar layout compute SHALL leave production DB, canonical files, all
eight engine compositions, and the public client routing in the plugin process;
`mutationEnabled` SHALL remain false and inventory SHALL remain `108 methods / 1
direct consumer`.

#### Scenario: Migration inventory is checked

- **WHEN** service migration governance is validated
- **THEN** all eight engines SHALL be present
- **AND** layout SHALL be marked as a sidecar worker canary with
  `production_worker: false`.

#### Scenario: Production composition is inspected

- **WHEN** static guards inspect `SynthesisClient` and Workbench composition
- **THEN** no production layout call SHALL target the sidecar
- **AND** no automatic in-process fallback branch SHALL have been added.

### Requirement: Repository canary preserves public migration invariants

The service migration inventory SHALL remain 108 public methods and one direct consumer, all eight engines SHALL retain their declared production owner, the two existing production workers SHALL remain unchanged, and `mutationEnabled` SHALL remain false.

#### Scenario: Governance inventory remains stable
- **WHEN** invariant checks parse the migration manifest and service contracts
- **THEN** no public method, consumer, production worker, engine route, or production mutation authority has moved to the repository canary

### Requirement: Sidecar runtime foundation remains isolated


Synthesis invariant guards SHALL keep the Node service foundation outside the
plugin runtime and outside all production data ownership paths.

#### Scenario: Boundary guard scans the service app

- **WHEN** invariant tests inspect the service application import graph and
  source
- **THEN** they SHALL reject plugin, Zotero, repository, canonical writer, Host
  effect, sync runtime, and compute-engine dependencies
- **AND** they SHALL require the production Synthesis client to remain
  in-process.

#### Scenario: Runtime foundation is added

- **WHEN** the isolated Node service foundation is present
- **THEN** the public service inventory SHALL remain `108 methods / 1 direct
  consumer`.

### Requirement: Topic application foundation does not change production routing

The migration inventory SHALL retain 108 public methods, one direct consumer, eight production engine owners, two production worker routes, and production mutation disabled in the sidecar.

#### Scenario: Governance detects accidental cutover
- **WHEN** the change adds a production sidecar Topic route, public method, direct service consumer, engine transfer, or mutation enablement
- **THEN** invariant verification fails

### Requirement: Benchmark adds no production authority

The Citation Graph build benchmark SHALL NOT add a public `SynthesisClient`
method, production route, runtime capability, worker operation, persistence,
Host access, canonical-file access, Zotero global access, or child-process
authority to the sidecar runtime.

#### Scenario: Boundary inventory is checked
- **WHEN** benchmark implementation and documentation are complete
- **THEN** the inventory remains 108 methods and one direct consumer, `mutationEnabled` remains false, and graph build remains an in-process production engine with an internal worker canary

### Requirement: Streaming canary preserves Synthesis ownership and inventory

The change SHALL preserve `mutationEnabled: false`, eight engine inventory entries, `108 methods / 1 direct consumer`, plugin ownership of DB/canonical/Host/basis/promotion state, and the worker import denylist.

#### Scenario: Governance checks run
- **WHEN** service boundaries and migration inventory are validated
- **THEN** only approved pool/worker modules SHALL import worker threads and no production owner or public client route SHALL move to the service

### Requirement: Transfer staging SHALL preserve Synthesis ownership boundaries

Only the designated service transfer owner and server dispatch MAY use Node filesystem staging. Transfer and worker modules SHALL NOT import production repository, canonical-file, Host capability, Zotero global, or child-process code.

#### Scenario: Static boundaries are checked
- **WHEN** Synthesis dependency guards run
- **THEN** transfer files are restricted to their approved imports and existing worker restrictions remain enforced

#### Scenario: Migration inventory is checked
- **WHEN** service migration governance runs
- **THEN** it still reports eight engines, `108 methods / 1 direct consumer`, `mutationEnabled: false`, and Citation Graph Build `production_worker: false`

### Requirement: Transfer staging SHALL not become production state

Staged manifests and pages SHALL be ephemeral runtime data and SHALL NOT update the Synthesis database, canonical files, cache basis, operations, or last-good graph.

#### Scenario: Transfer fails or expires
- **WHEN** a session is invalid, canceled, expired, or lost on restart
- **THEN** production graph and cache basis remain unchanged

### Requirement: Concept KB index engine SHALL remain environment-neutral


The production Concept KB index engine dependency graph SHALL exclude plugin
runtime, Zotero, repository, persistence, canonical foundation, Host
Capability, filesystem, DOM, and Node-only modules.

#### Scenario: Boundaries are inspected

- **WHEN** Synthesis invariant and service-boundary checks inspect the engine
  and application adapter
- **THEN** engine source SHALL contain only environment-neutral computation
- **AND** storage and public compatibility mapping SHALL remain in the
  application adapter.

### Requirement: Matcher engine guardrails SHALL preserve heavy-path isolation


Static and behavioral guards SHALL require Advanced Reference Matching to use the configured engine and SHALL prevent heavy binding or dedupe methods from entering lightweight refresh, workflow apply, graph rebuild, or related-items paths.

#### Scenario: Active sources are inspected

- **WHEN** invariant tests inspect Synthesis application and engine boundaries
- **THEN** only the explicit Advanced Reference Matching path SHALL invoke `matchBindings` or `dedupeCanonicals`
- **AND** the engine package SHALL contain the bounded fuzzy block and pair controls.

### Requirement: Matcher engine SHALL remain dependency neutral


Boundary guards SHALL reject Node, Zotero, plugin, DOM, repository, filesystem, and Host capability imports from the matcher engine.

#### Scenario: Engine imports are scanned

- **WHEN** the matcher engine source is inspected
- **THEN** it SHALL import only environment-neutral engine modules
- **AND** production service inventory SHALL remain `108 methods / 1 direct consumer`.

### Requirement: Tag Vocabulary engine SHALL remain environment-neutral


The production Tag Vocabulary engine dependency graph SHALL exclude plugin runtime, Zotero, repository, persistence, canonical foundation, Host Capability, and Node-only modules.

#### Scenario: Engine boundary is checked

- **WHEN** Synthesis invariant and service-boundary checks inspect the Tag Vocabulary engine and application adapter
- **THEN** only the application adapter SHALL import application persistence or composition modules
- **AND** the engine package SHALL remain independently type-checkable.

### Requirement: Topic Graph index engine SHALL remain environment-neutral


The production Topic Graph index engine dependency graph SHALL exclude plugin
runtime, Zotero, repository, persistence, canonical foundation, Host
Capability, filesystem, DOM, and Node-only modules.

#### Scenario: Boundaries are inspected

- **WHEN** Synthesis invariant and service-boundary checks inspect the engine
  and application adapter
- **THEN** engine source SHALL contain only environment-neutral computation
- **AND** storage and projection compatibility mapping SHALL remain in the
  application adapter.

### Requirement: Compute capacity does not expand production ownership

The larger compute envelope SHALL NOT route production Synthesis calls, grant
service mutation authority, or change the eight-engine migration inventory.

#### Scenario: Capacity change is validated
- **WHEN** service boundary and migration governance run
- **THEN** layout remains a non-production worker canary, `mutationEnabled` remains false, and inventory remains `108 methods / 1 direct consumer`

### Requirement: Capacity implementation remains dependency-minimal

The service SHALL implement the bounded JSON envelope without compression,
streaming files, child processes, new endpoints, or new third-party packages.

#### Scenario: Runtime boundary is inspected
- **WHEN** static and packaging checks inspect the capacity implementation
- **THEN** no new authority, dependency, or runtime asset is required

### Requirement: Runtime packaging does not activate a production sidecar


Adding product-owned runtime assets and installation SHALL preserve the current
in-process Synthesis production composition and service inventory.

#### Scenario: Production build includes packaged runtime assets

- **WHEN** the plugin and Synthesis runtime assets are built
- **THEN** no startup hook, default client, Workbench path, Host Bridge path, or
  MCP path SHALL install or launch the service
- **AND** the complete service inventory SHALL remain `108 methods / 1 direct
  consumer`.

### Requirement: Installer dependencies remain platform and data isolated


The runtime installer SHALL depend only on environment-neutral bundle contracts,
packaged-asset reads, runtime platform/path services, hashing, and managed
runtime persistence.

#### Scenario: Installer boundary is checked

- **WHEN** dependency guards inspect the installer
- **THEN** it SHALL not import Synthesis repositories, service composition,
  Zotero Host adapters, canonical writers, subprocess launchers, command
  resolution, or Node-only modules.

### Requirement: Exactly one production engine crosses the sidecar worker boundary

Static governance SHALL allow only Citation Graph layout computation to use the
production sidecar worker and SHALL keep the other seven engines in process.

#### Scenario: Service migration inventory is checked
- **WHEN** production engine ownership is validated
- **THEN** Citation Graph layout is `sidecar_worker` with `production_worker: true`
- **AND** the other seven engines remain `in_process` with `production_worker: false`

#### Scenario: Production fallback is checked
- **WHEN** production layout composition is scanned
- **THEN** no in-process layout import, invocation, retry, or fallback branch exists

### Requirement: Production routing does not expand sidecar authority

The sidecar worker SHALL remain unable to access Synthesis repositories,
canonical files, Host capabilities, Zotero globals, or child processes.

#### Scenario: Boundary governance runs after production routing
- **WHEN** sidecar service and worker imports are inspected
- **THEN** existing authority deny rules still pass
- **AND** `108 methods / 1 direct consumer` and `mutationEnabled: false` remain unchanged

### Requirement: Exactly two engines use production workers

Migration governance SHALL mark Citation Graph layout and metrics as
`sidecar_worker` with `production_worker: true`, while the other six extracted
engines remain in process.

#### Scenario: Inventory is checked
- **WHEN** synthesis migration invariants are evaluated
- **THEN** they report two production worker engines, six in-process engines, `108 methods / 1 direct consumer`, and `mutationEnabled: false`

### Requirement: Metrics worker has no host authority

The metrics worker route SHALL NOT import or use repositories, DB access,
canonical files, Host capabilities, Zotero globals, child processes, or a local
production fallback.

#### Scenario: Service boundary is checked
- **WHEN** static dependency governance scans the metrics route
- **THEN** only the designated pool and worker files may import `node:worker_threads` and all prohibited authority remains absent

### Requirement: Sidecar supervision does not change production ownership


The supervised sidecar SHALL remain mutation-disabled and SHALL not become the
production Synthesis client, database owner, canonical-file owner, or Host
effect caller in this change.

#### Scenario: Plugin launches the sidecar
- **WHEN** the supervisor reaches ready
- **THEN** the default production client SHALL remain the in-process composition
- **AND** service inventory SHALL remain `108 methods / 1 direct consumer`.

### Requirement: The initial supervised service has no descendants


The service SHALL not import or invoke child-process, worker-thread, or
equivalent descendant creation APIs before the worker-pool lifecycle is added.

#### Scenario: Boundary validation runs
- **WHEN** service sources are scanned
- **THEN** descendant process and worker imports SHALL fail the boundary gate.
