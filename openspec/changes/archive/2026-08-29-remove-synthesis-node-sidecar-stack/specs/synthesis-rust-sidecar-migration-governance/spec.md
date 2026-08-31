## MODIFIED Requirements

### Requirement: R9a and R9b SHALL remain separately auditable

R9a SHALL establish Rust as the sole production owner and make plugin legacy
code unreachable from production. R9b SHALL execute through the dependency-ordered
`remove-synthesis-plugin-legacy-owner` and
`remove-synthesis-node-sidecar-stack` changes within the same release
milestone. The first R9b change SHALL remove the plugin owner; the second SHALL
remove the executable Node oracle, worker/build stack, dependencies, and
release inventory. No intermediate state may be released, and neither change
may add a request fallback or share live roots.

#### Scenario: R9 changes are reviewed
- **WHEN** the R9a and two R9b changes are compared
- **THEN** every retained/deleted implementation area is assigned exactly once
- **AND** production routes contain no legacy fallback throughout the sequence

#### Scenario: R9a deletion inventory is reviewed
- **WHEN** R9a is ready for verification
- **THEN** production routes contain no legacy fallback
- **AND** retained oracle source is listed for R9b rather than deleted opportunistically

#### Scenario: First R9b deletion change completes
- **WHEN** the plugin legacy owner is absent but the external Node oracle remains
- **THEN** the repository remains an unreleased migration state
- **AND** the next change owns every remaining Node removal

## ADDED Requirements

### Requirement: R9b SHALL preserve accepted evidence without executable Node

Before deleting executable Node code, R9b SHALL map every stable public DTO,
error, canonical byte/hash, repository/recovery, worker reliability, and
package invariant to a surviving language-neutral corpus, Rust test, public
client test, or native package gate. Node private class shape, module
resolution, internal call order, worker messages, and other implementation-only
assertions MUST be deleted rather than recreated.

#### Scenario: Node-dependent evidence is inventoried
- **WHEN** a checker, benchmark, or test imports the Node service or worker
- **THEN** its stable observable invariant has one named surviving owner or is explicitly classified as implementation-only
- **AND** the Node import is removed before the workspace is deleted

### Requirement: R9 and Stage 1 completion SHALL require separately governed final acceptance

This change MAY finish source retirement after its local native-only gates and
an authorized post-deletion seven-target candidate pass. R9 and Stage 1 SHALL
remain incomplete until `complete-synthesis-r9-stage1-acceptance` binds the
final XPI, installation, failure, migration, runbook, and Zotero 7/9
real-machine results to one source identity. Passing either change MUST NOT by
itself publish a release or authorize Gitee synchronization.

#### Scenario: Retirement and candidate gates pass without final matrix
- **WHEN** Node source is absent and all local plus authorized seven-target
  candidate checks pass but XPI, installation, or real-machine evidence is incomplete
- **THEN** this retirement change may complete
- **AND** R9 and Stage 1 MUST remain explicitly incomplete

#### Scenario: Separate final matrix passes
- **WHEN** the acceptance change binds every required result to the same approved source identity
- **THEN** R9 and Stage 1 may be declared complete
- **AND** release publication remains a separate explicitly authorized action
