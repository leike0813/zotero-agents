# citation-graph-visual-weighting Specification

## Purpose
Define visual weighting, sizing, and metric projection rules for citation graph UI rendering, ensuring formal metrics take precedence over fallback calculations and isolated nodes are scored correctly.

## Requirements

### Requirement: Citation graph UI preserves formal incoming-degree metrics
The system SHALL project a persisted node `internal_in_degree` to graph UI nodes and SHALL use a finite formal metric in preference to fallback degree calculation.

#### Scenario: Persisted metric reaches the Workbench
- **WHEN** the graph cache contains a library node with persisted incoming degree
- **THEN** the Workbench graph input contains that node's `metrics.internal_in_degree`

#### Scenario: Formal zero remains authoritative
- **WHEN** a visible node has `internal_in_degree` equal to zero and visible edges target it
- **THEN** the node's visual incoming degree remains zero

### Requirement: Fallback visual degree reflects the visible graph
The system SHALL calculate fallback incoming degree only from non-hover edges whose source and target are both visible graph nodes, and SHALL weight each included edge by a sanitized `mention_count` of at least one.

#### Scenario: Hidden source is excluded
- **WHEN** an edge targets a visible node but its source is not visible
- **THEN** that edge does not contribute to fallback incoming degree

#### Scenario: Hover-only edge is excluded
- **WHEN** an edge is marked `hover_only`
- **THEN** that edge does not contribute to fallback incoming degree

#### Scenario: Mention count is weighted
- **WHEN** a visible edge has `mention_count` greater than one
- **THEN** its target receives that count as fallback incoming-degree weight

### Requirement: Node size uses continuous weighted-degree scaling
The system SHALL derive positive node importance from `log1p(degree) / log1p(maxDegree + 1)` and SHALL apply the existing node base, cap, and current-paper multiplier rules.

#### Scenario: Single positive degree does not reach the cap
- **WHEN** all positive nodes have incoming degree one
- **THEN** each positive node has importance `log(2) / log(3)` and remains below its node-size cap

#### Scenario: Higher degree receives greater importance
- **WHEN** two nodes have different positive weighted incoming degrees
- **THEN** the node with the higher degree has greater visual importance

### Requirement: Isolated-node composite scores exclude graph centrality
The system SHALL exclude normalized in-degree, out-degree, and PageRank contributions from foundation and frontier scores for an isolated library node.

#### Scenario: Old isolated node retains only age contribution
- **WHEN** an isolated library node has maximum normalized age
- **THEN** its foundation score is `0.15` and its frontier score contains no PageRank contribution

#### Scenario: Recent isolated node retains only recency contribution
- **WHEN** an isolated library node has maximum normalized recency
- **THEN** its frontier score is `0.55` and its foundation score contains no PageRank contribution

### Requirement: Metric semantics invalidate stale graph caches
The system SHALL version citation graph metrics and cache policy when isolated-node composite-score semantics change.

#### Scenario: Prior cache policy is encountered
- **WHEN** stored citation graph cache metadata has an earlier policy version
- **THEN** the cache is marked stale and follows the existing rebuild path
