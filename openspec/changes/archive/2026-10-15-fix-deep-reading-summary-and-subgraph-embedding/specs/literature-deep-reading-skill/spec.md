# Spec Delta

## MODIFIED Requirements

### Requirement: Bootstrap Host Preflight

The `literature-deep-reading` runtime SHALL expose best-effort Host preflight information before the agent writes `context-request.json`.

#### Scenario: Host preflight exports target artifacts

- **GIVEN** bootstrap can infer the target paper ref from `source-manifest.json`
- **AND** Host Bridge returns target digest, references, and citation-analysis artifacts in a filtered export manifest
- **WHEN** `bootstrap` runs
- **THEN** the runtime SHALL write `runtime/views/host-preflight-view.json`
- **AND** it SHALL copy available exported target artifacts into the unpacked source artifact directory
- **AND** `target-artifacts-view.json` and `references-seed-view.json` SHALL reflect those available artifacts.

#### Scenario: Host preflight exposes topic candidates

- **GIVEN** bootstrap can infer the target paper ref from `source-manifest.json`
- **AND** Host Bridge `topics.find_by_paper_ref` returns topic candidates
- **WHEN** `bootstrap` runs
- **THEN** the runtime SHALL write `runtime/views/topic-candidates-view.json`
- **AND** `host-preflight-view.json` SHALL include the normalized candidates
- **AND** a single candidate SHALL be usable as the default topic for later `topics get-context`.

#### Scenario: Topic association is queried using the current contract

- **WHEN** bootstrap queries `topics.find_by_paper_ref`
- **THEN** its request SHALL contain `paper_refs` as an array containing the target paper ref
- **AND** a failed query SHALL remain distinguishable from a successful query with no associations.

#### Scenario: Associated timeline is available

- **GIVEN** the current paper has an associated topic with usable timeline data
- **WHEN** Stage 10 selects topic context
- **THEN** a single candidate SHALL be selected automatically and multiple candidates SHALL use the agent's explicit topic choice
- **AND** the final HTML SHALL include that topic timeline
- **AND** no timeline region SHALL be included when no usable timeline exists.

#### Scenario: Ambiguous topic candidates require an agent choice

- **GIVEN** `topic-candidates-view.json` contains multiple topics
- **AND** `context-request.json` requests topic context without `selected_topic_id`
- **WHEN** Stage 10 context collection runs
- **THEN** the runtime SHALL NOT guess a topic id
- **AND** `topic-context.json` SHALL include a diagnostic explaining that `selected_topic_id` is required.

#### Scenario: Host preflight degrades when Host is unavailable

- **GIVEN** Host Bridge is unavailable
- **WHEN** `bootstrap` runs
- **THEN** bootstrap SHALL still succeed
- **AND** `host-preflight-view.json` SHALL include a diagnostic instead of blocking the run.

### Requirement: Citation graph layout SHALL come from Host Bridge layout state

The runtime SHALL use `citation-graph get-layout` for graph coordinates and SHALL NOT compute replacement force layout coordinates.

#### Scenario: Layout is ready

- **GIVEN** `citation-graph get-slice` returns a graph snapshot
- **AND** `citation-graph get-layout` returns ready persisted force-layout coordinates
- **WHEN** Stage 10 is submitted
- **THEN** `citation-graph-snapshot.json` SHALL retain the topology result
- **AND** `citation-graph-layout.json` SHALL retain the raw layout result
- **AND** its normalized nodes SHALL include coordinates keyed by node id.

#### Scenario: Layout contains stale or partial coordinates

- **GIVEN** a persisted layout contains usable coordinates for some or all nodes in the current citation graph snapshot
- **WHEN** Stage 10 requests the layout with `allowStale: true`
- **THEN** the final graph SHALL include the intersection of snapshot nodes and finite stored coordinates and only edges between those nodes
- **AND** stale layout state SHALL be preserved
- **AND** the runtime SHALL neither recompute layout nor fabricate missing coordinates.

#### Scenario: Layout has no usable coordinates

- **GIVEN** `citation-graph get-layout` returns `missing`, `stale`, `too_large`, or `invalid_request`
- **WHEN** Stage 10 is submitted
- **THEN** the runtime SHALL keep the citation graph snapshot if available
- **AND** it SHALL write layout diagnostics
- **AND** it SHALL NOT generate fallback layout coordinates.
- **AND** the final HTML SHALL omit the citation graph region when no nodes are drawable.

### Requirement: Summary SHALL prefer target digest artifact

The Stage 20 summary view SHALL use the target paper digest artifact when available.

#### Scenario: Target digest exists

- **GIVEN** `runtime/source/artifacts/digest.md` exists
- **AND** the enrichment payload includes fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "digest_artifact"`
- **AND** it SHALL derive summary sections from the digest artifact.

#### Scenario: Digest is read from a canonical managed note

- **GIVEN** the Host managed digest payload contains a `markdown` string
- **WHEN** Synthesis reads that digest and the workflow builds the source bundle
- **THEN** `artifacts/digest.md` SHALL contain that Markdown rather than an implicit string conversion of the payload object
- **AND** descriptor identity, hash-guarded reads, and invalid-payload errors SHALL remain intact.

#### Scenario: Target digest is missing

- **GIVEN** `runtime/source/artifacts/digest.md` is missing
- **AND** the enrichment payload enables fallback summary sections
- **WHEN** Stage 20 is submitted
- **THEN** `summary-view.json` SHALL declare `source: "agent_fallback"`
- **AND** it SHALL use the fallback summary sections.

#### Scenario: Digest summary keeps only leading sections

- **GIVEN** `artifacts/digest.md` contains more than five top-level `##` sections
- **WHEN** Stage 20 builds `summary-view.json`
- **THEN** it SHALL include only the first five top-level sections.
