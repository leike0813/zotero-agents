## MODIFIED Requirements

### Requirement: Migration apply SHALL use a runtime-owned plan and one verified parent-set commit

The UI SHALL submit only a scan operation identity and runtime-issued candidate IDs. The runtime SHALL re-read current facts, permissions, definition version, and basis before each set. The writer SHALL commit paired References and Citation in one Zotero transaction with one operation identity and one durable set receipt. It SHALL verify the pair and basis before retiring superseded source data.

#### Scenario: A candidate changed after scan
- **WHEN** the current artifact, note revision, permission, or basis no longer matches the scan plan
- **THEN** the set SHALL produce `changed_since_scan` without writing
- **AND** other independent sets MAY continue.

#### Scenario: A paired set passes verification
- **WHEN** staging, References/Citation validation, basis verification, and parent-set commit all succeed
- **THEN** the canonical pair SHALL be visible as one committed semantic result
- **AND** only then MAY old inline payloads be removed and superseded payload attachments moved to Trash.

#### Scenario: A reused migration target temporarily contains v1 and v2 payload attachments
- **WHEN** a canonical v2 payload has been written to a reused legacy note while its exact legacy v1 payload attachment is retained for compensation
- **THEN** migration verification SHALL ignore only that identified v1 attachment after verifying the v2 logical hash
- **AND** ordinary managed-note reads SHALL retain their strict ambiguous-payload behavior
- **AND** the identified v1 attachment SHALL remain part of the required cleanup tail.

#### Scenario: A reused migration target contains a superseded v2 payload attachment
- **WHEN** migration replaces an attachment-backed v2 payload whose logical schema or canonical payload hash differs from the requested payload
- **THEN** the superseded attachment and its file SHALL remain available until the pair has passed canonical verification
- **AND** migration verification SHALL omit only the exact superseded attachment after verifying the replacement's logical hash
- **AND** the superseded attachment SHALL be moved to Trash as part of the same parent-set operation after verification.

#### Scenario: Zotero unloads a superseded attachment at commit
- **WHEN** a superseded attachment is retired and its prior native item object cannot be read
- **THEN** the parent-set receipt SHALL use its captured identity and the retirement outcome
- **AND** an unreadable object alone SHALL NOT invalidate verified retirement evidence.

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

#### Scenario: The native host uses different spellings for a storage directory
- **WHEN** a committed payload file was staged in a directory whose native spelling differs from the file path's parent spelling
- **THEN** staging cleanup SHALL retain that committed file for verification.

#### Scenario: The canonical replacement fails post-commit verification
- **WHEN** a migrated parent cannot read back the newly written canonical pair
- **THEN** the writer SHALL attempt to restore the source note content and remove the unverified replacement
- **AND** it SHALL retain the source attachments and their files for recovery.

### Requirement: Migration guidance SHALL keep navigation and decisions accessible

The review wizard SHALL show numbered steps and place the problem-step navigation directly beneath the shared choices and above the affected document list. Shared choices SHALL state their whole-scan scope and identify individual exceptions. Long titles and supporting text SHALL remain bounded with a way to inspect the available text, while data-discard and replacement consequences remain visible.

#### Scenario: A user moves between problem review and final review
- **WHEN** the user advances through problem groups and returns from final review
- **THEN** the previous-step action SHALL return to the prior problem group or overview and restore the previously reviewed group when returning from final review
- **AND** a preview without problem groups SHALL proceed directly to final review
- **AND** the final write command SHALL remain in the fixed footer and require the existing explicit confirmation.

#### Scenario: A user pages or filters documents
- **WHEN** the user changes a page or filter
- **THEN** choices and inclusion decisions SHALL remain unchanged
- **AND** entering a multi-digit page number SHALL wait for Enter or focus departure before navigating
- **AND** document paging SHALL return the list to its start without closing the selected document details
- **AND** an empty filtered list SHALL retain problem choices and wizard navigation.

#### Scenario: A user reviews long content in a narrow window
- **WHEN** titles, hints, or expanded details exceed the available width
- **THEN** the content SHALL wrap or expose a bounded summary without horizontal page overflow
- **AND** navigation and pagination SHALL remain reachable independently of document scrolling
- **AND** the narrow detail view SHALL provide a return action to the document list.

## ADDED Requirements

### Requirement: Final review SHALL expose all pending migration problems

Final review SHALL show whole-plan counts of selected, pending, and skipped parent sets and link each pending reason to its strategy step. The runtime SHALL issue any newly discovered blocking reason as a reviewable issue while preserving existing issue identities and choices.

#### Scenario: A user reviews a filtered preview
- **WHEN** a pending parent is on another page or excluded by the current filter
- **THEN** the pending parent SHALL still contribute to the whole-plan counts and to each applicable pending reason
- **AND** following a reason link SHALL reveal the affected documents and their strategy.

#### Scenario: Recalculating a strategy discovers a blocking reason
- **WHEN** the current conversion gains a blocking reason
- **THEN** that reason SHALL be visible with runtime-issued options and prevent inclusion until resolved
- **AND** prior choices and the currently viewed issue group SHALL be preserved.

### Requirement: Migration apply SHALL show settled outcomes while it runs

The Dashboard SHALL show how many selected parent sets have migrated, failed, or need other attention as their receipts are persisted. Parent-set diagnostics SHALL preserve a stable failure stage when the writer knows it.

#### Scenario: An early write fails and independent parents remain
- **WHEN** the failed parent receipt is persisted and the run remains active
- **THEN** the failed count SHALL advance before terminal review
- **AND** remaining independent parents SHALL remain eligible to run.

#### Scenario: The writer detects a specific failure stage
- **WHEN** a parent set fails in an identifiable read, staging, commit, verification, or cleanup step
- **THEN** diagnostics SHALL retain that stage using safe structured evidence without exposing native exception text or paths.
