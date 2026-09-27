## ADDED Requirements

### Requirement: References and Citation writes SHALL preserve paired semantic behavior within managed-note limits

References-only writes SHALL retain an existing Citation note while making it stale when the basis changes. Citation-only writes SHALL validate every referenced source ID against the current References set and compute the current basis in a private preflight. Trusted workflow, migration, and paired import paths MAY commit References and Citation together through one parent-set semantic operation. Parent-set postcommit verification SHALL return canonical managed-note detail without optional public enrichment, so derived projections cannot turn a successful commit into a resource-limit failure.

An opted-in trusted Citation write MAY compact snippet text to fit the existing content, payload, and envelope limits. Compaction SHALL preserve every non-snippet value, array order, item count, and mention count, and SHALL fail before native mutation if the artifact cannot fit with empty snippets. Direct public Citation upsert SHALL remain strict and non-compacting.

#### Scenario: Commit fits but enriched response would not
- **WHEN** a parent-set Citation commit and canonical detail fit the managed-note limit but optional derived Markdown would exceed it
- **THEN** postcommit verification SHALL succeed with canonical detail
- **AND** public detail reads MAY still provide enrichment subject to their normal resource limit.

#### Scenario: Opted-in Citation requires tighter snippets
- **WHEN** a trusted Citation write opts into compaction and its managed-note envelope exceeds the limit
- **THEN** the owner SHALL reduce one uniform Unicode code-point snippet cap until the exact stored content fits
- **AND** it SHALL report truncated snippet count, final maximum characters, and original and final payload bytes.

#### Scenario: Citation cannot fit with empty snippets
- **WHEN** an opted-in Citation still exceeds a managed-note limit after every snippet is empty
- **THEN** preflight SHALL fail with typed `resource_limited`
- **AND** no native mutation SHALL occur.

#### Scenario: Direct Citation upsert is oversized
- **WHEN** a direct strict Citation upsert exceeds a managed-note limit
- **THEN** it SHALL fail without automatic compaction.
