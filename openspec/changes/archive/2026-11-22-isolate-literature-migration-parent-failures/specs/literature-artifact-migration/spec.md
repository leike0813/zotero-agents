# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Migration batches SHALL continue only after proven candidate-local terminal failures`
- TO: `### Requirement: Migration batches SHALL isolate outcomes by parent set`

## MODIFIED Requirements

### Requirement: Migration apply SHALL use a runtime-owned plan and one verified parent-set commit

The UI SHALL submit only a scan operation identity and runtime-issued candidate IDs. The runtime SHALL re-read current facts, permissions, definition version, and basis before each set. For a paired References/Citation set, the trusted writer SHALL commit both artifacts in the same Zotero transaction with one operation identity and one durable set receipt; it SHALL verify the pair and basis before any cleanup.

#### Scenario: A candidate changed after scan
- **WHEN** the current artifact, note revision, permission, or basis no longer matches the scan plan
- **THEN** the set SHALL produce `changed_since_scan` without writing
- **AND** other independent sets MAY continue.

#### Scenario: A paired set passes verification
- **WHEN** staging, References/Citation validation, basis verification, and parent-set commit all succeed
- **THEN** the canonical pair SHALL be visible as one committed semantic result
- **AND** only then MAY old inline payloads be removed and old user payload attachments moved to Trash.

#### Scenario: A reused migration target temporarily contains v1 and v2 payload attachments
- **WHEN** a canonical v2 payload has been written to a reused legacy note while its exact legacy v1 payload attachment is retained for compensation
- **THEN** migration verification SHALL ignore only that identified v1 attachment after verifying the v2 logical hash
- **AND** ordinary managed-note reads SHALL retain their strict ambiguous-payload behavior
- **AND** the identified v1 attachment SHALL remain part of the required cleanup tail.

#### Scenario: A reused migration target contains a superseded v2 payload attachment
- **WHEN** migration replaces an attachment-backed v2 payload whose logical schema or canonical payload hash differs from the requested payload
- **THEN** the superseded v2 attachment SHALL be removed in the same parent-set transaction as its replacement
- **AND** it SHALL NOT be retained or ignored as legacy cleanup evidence
- **AND** final managed-note verification SHALL observe exactly the requested canonical v2 payload.

#### Scenario: Zotero unloads a superseded attachment at commit
- **WHEN** a superseded payload attachment is erased and its native item object becomes unreadable when the transaction commits
- **THEN** the parent-set SHALL still settle as committed with strict-JSON deletion evidence captured before erase
- **AND** receipt construction SHALL NOT read the erased native item after commit.

#### Scenario: Zotero unloads a newly created payload attachment at commit
- **WHEN** the replacement payload attachment has been saved but its native item object becomes unreadable when the transaction commits
- **THEN** the parent-set SHALL still settle as committed with strict-JSON creation evidence captured before the transaction boundary
- **AND** receipt construction SHALL NOT read the newly created native item after commit.

#### Scenario: The parent has an unrelated historical or damaged managed artifact
- **WHEN** migration verifies a References/Citation parent-set and the same parent has a Score, Digest, or other known managed note that is historical, invalid, or unreadable
- **THEN** singleton discovery and Citation dependency enrichment SHALL inspect only the requested managed kind
- **AND** the unrelated artifact SHALL remain unchanged and SHALL NOT turn the committed parent-set into a failed receipt
- **AND** directly reading that unrelated artifact SHALL retain its own normalized result or typed diagnostic.

#### Scenario: Cleanup fails after canonical commit
- **WHEN** canonical verification succeeds but cleanup cannot be completed
- **THEN** the canonical result SHALL be retained
- **AND** the set SHALL be `repair_required` and the run SHALL be `completed_with_attention`.

#### Scenario: An infrastructure failure occurs before a set commits
- **WHEN** the transaction for one parent set fails and the batch can still record receipts and admit independent sets
- **THEN** migration SHALL preserve the set's failure receipt and attempt the next eligible parent set
- **AND** independently committed sets SHALL remain intact.

### Requirement: Migration batches SHALL isolate outcomes by parent set

Each parent-set operation SHALL confine effects to its parent and owned artifacts. Migration SHALL durably record each set outcome before attempting the next eligible independent set. A run that finishes processing with failed or repair-required sets SHALL report `completed_with_attention`.

#### Scenario: Candidate-local validation failure has no residual effects
- **WHEN** a parent set fails without residual effects
- **THEN** migration SHALL preserve the failed set's receipt
- **AND** later eligible independent sets SHALL be attempted regardless of the failed set's error code.

#### Scenario: A parent set needs repair
- **WHEN** applying a parent set throws with unverified effects, or its uncertain or residual effects are confined to that parent
- **THEN** migration SHALL record the set as repair-required and preserve available authority evidence
- **AND** later eligible independent sets SHALL be attempted once the set outcome is durable.

#### Scenario: Failure is unsafe to continue
- **WHEN** the run is canceled, the host shuts down, the library is no longer writable, or required run, set, or mutation evidence cannot be persisted
- **THEN** migration SHALL stop admitting new writes and preserve earlier receipts and any available evidence for the affected set
- **AND** unattempted sets SHALL remain eligible for a fresh scan.
