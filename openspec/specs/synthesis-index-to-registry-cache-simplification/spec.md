## ADDED Requirements

### Requirement: Registry Cache Replaces Index Foundation Role

The Synthesis architecture SHALL document the former Index / Literature Registry role as a rebuildable Paper Registry Cache, not as the global foundation or source of truth for every Synthesis domain.

#### Scenario: Domain map is read

- **WHEN** a developer reads the Synthesis domain map or governance documents
- **THEN** the registry/cache domain is described as a scoped cache for registry and graph maintenance
- **AND** it is not described as the foundation of Topics, Tags, Concepts, or workflow artifacts.

### Requirement: Registry Cache Scope Is Bounded

The Paper Registry Cache SHALL own only Zotero-bound literature summaries, binding cache, artifact readiness, reference instances/resolutions, cleanup/review surfaces, Citation Graph inputs, and registry/debug maintenance summaries.

#### Scenario: Registry cache rebuild completes

- **WHEN** a full registry/graph cache rebuild completes
- **THEN** Registry UI, cleanup/review, reference resolution, and Citation Graph state may change
- **AND** Topic artifacts, Topic Graph, Tag vocabulary, Concept KB, and workflow artifact content do not change because of that rebuild alone.

### Requirement: Topic Workflows Do Not Require Registry Cache

Topic create/update and topic source-check contracts SHALL use Host Library / Artifact Facade inputs as their primary source and SHALL treat Citation Graph metrics as optional enrichment.

#### Scenario: Registry cache is empty or rebuilding

- **WHEN** a user starts an explicit topic create/update workflow
- **THEN** the workflow contract does not require committed registry cache rows as a prerequisite
- **AND** missing Citation Graph metrics can only reduce optional enrichment.

### Requirement: Registry Events Do Not Fan Out To Independent Domains

Registry cache dirty events, startup reconcile, and full registry/graph cache rebuild SHALL NOT enqueue normal topic source-check, topic discovery, tag, concept, or topic graph work.

#### Scenario: New Zotero item enters registry cache

- **WHEN** a Zotero item or artifact note produces a registry cache dirty event
- **THEN** the system may enqueue bounded registry and citation graph work
- **AND** it does not enqueue topic source-check, topic discovery, tag, concept, or topic graph work by default.

### Requirement: Transitional Index Names Are Marked As Implementation Names

Documentation SHALL mark remaining Index / Literature Registry names as current implementation or compatibility labels when the target semantic role is Paper Registry Cache.

#### Scenario: Existing runbook still references an index event id

- **WHEN** a runbook or event contract uses an existing `index.*` event or command identifier
- **THEN** the document states that its semantic owner is registry/cache maintenance
- **AND** the identifier does not imply global Synthesis rebuild semantics.
