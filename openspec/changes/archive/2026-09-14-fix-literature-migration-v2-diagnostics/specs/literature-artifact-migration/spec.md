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
- **WHEN** a database or transaction failure prevents the set's commit
- **THEN** the set and run SHALL report a typed failure
- **AND** the runtime SHALL stop claiming later sets while preserving every earlier committed receipt
- **AND** independently committed sets SHALL not be rolled back by a global coordinator.

### Requirement: Migration history SHALL expose bounded run and set outcomes

The Dashboard SHALL present migration history as a run list and selected-run detail. Run detail SHALL include state, timestamps, processed and remaining counts, reason, and bounded diagnostics. Its paged set receipts SHALL include the persisted parent title, classification, outcome, counts, reason codes, and bounded diagnostics without exposing raw payloads or native refs. Terminal set rows SHALL display their outcome rather than an unchecked selection control. A selected failed or attention-required run SHALL resolve at most one primary non-success set through a bounded durable lookup and SHALL project its safe mutation-authority evidence independently of runtime log availability.

#### Scenario: A user inspects a failed migration
- **WHEN** the user selects a failed run in migration history
- **THEN** the Dashboard SHALL identify which sets applied, failed, were skipped, changed, or still remained pending
- **AND** it SHALL display an inline diagnostic card containing the safe failure message, stable authority and effect phases, recovery, operation identity, attempt identity, and affected/residual counts when settled authority evidence exists
- **AND** sparse run diagnostics or missing correlated runtime logs SHALL NOT hide settled authority evidence
- **AND** unavailable authority evidence SHALL be stated explicitly while bounded receipt diagnostics remain visible
- **AND** it SHALL offer one bounded diagnostic export containing the run, non-success set receipts, mutation authority summaries, and correlated runtime issue logs
- **AND** the export SHALL NOT contain raw payloads, parent or native refs, titles, paths, or unsanitized exceptions
- **AND** Continue SHALL start a fresh scan rather than replaying the old plan.
