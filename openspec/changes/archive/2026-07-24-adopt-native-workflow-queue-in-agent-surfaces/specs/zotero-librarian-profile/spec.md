## ADDED Requirements

### Requirement: Librarian SHALL delegate admission to the plugin-native queue
Interactive Librarian workflow execution SHALL use the inherited Generic and Minimum contracts to validate live workflow input, submit one reviewed raw selection, inspect Host submission state, and register concrete run handles for resident monitoring.

#### Scenario: Operator submits reviewed workflow
- **WHEN** the current operator has reviewed live `inputs`, `validateSelection`, workflow options, provider profile, execution ownership, result contract, and raw selection
- **THEN** Librarian SHALL invoke one Host workflow submission
- **AND** it SHALL NOT create or reserve profile-owned pending entries

#### Scenario: Submission is pending or admitted
- **WHEN** Host submission inspection reports pending or admitted units
- **THEN** the interactive operation SHALL report the current Host handles and next action
- **AND** resident cron SHALL NOT submit, cancel, approve, or replay those units

#### Scenario: Concrete run handles appear
- **WHEN** task discovery returns workflow or skill run handles
- **THEN** Librarian MAY register those handles with the existing watched-run service
- **AND** monitoring SHALL remain separate from admission

### Requirement: Retired plan state SHALL remain inert
The resident service SHALL NOT create, read, update, submit, or recover profile-owned workflow plan or plan-entry queue state. Existing unknown tables or plan files SHALL remain untouched and SHALL NOT influence current operations.

#### Scenario: Existing state database contains old plan tables
- **WHEN** the current resident service opens that database
- **THEN** it SHALL ignore those tables
- **AND** it SHALL neither submit their rows nor delete their data

## MODIFIED Requirements

### Requirement: Workflow validation SHALL use the live selection contract
The resident operation SHALL describe the live workflow, inspect `inputs` and `validateSelection` separately, preserve the explicit raw Zotero selection, and invoke Host validation before the current authorized submit. Candidate production, filtering, grouping, and immutable prepared-unit construction SHALL remain Host-owned.

#### Scenario: Workflow requires attachments
- **WHEN** the workflow input contract accepts attachment members
- **THEN** the service SHALL preserve attachment identities in the raw selection
- **AND** it SHALL NOT unconditionally convert them to parent items or construct prepared units

#### Scenario: Live workflow contract changes
- **WHEN** current describe or validation facts differ from the reviewed intent
- **THEN** the operation SHALL stop before remote submission
- **AND** it SHALL require a new current review rather than replay cached planning state

## REMOVED Requirements

### Requirement: Workflow plans SHALL have immutable durable identity
**Reason**: The plugin-native submission queue is the only admission owner; a durable Librarian plan backlog would recreate a second queue and recovery authority.

**Migration**: Interactive operations validate current live workflow facts and submit one raw selection directly to Host-native admission. Existing plan files and database rows are ignored and left untouched.

### Requirement: Workflow entries SHALL submit without unsafe replay
**Reason**: Profile-owned entry reservation, launching, unknown-effect recovery, and replay suppression are removed with the external admission queue.

**Migration**: Pending native units are controlled by queue handles, admitted work is discovered through submission/task projections, and restart recovery uses current live state plus already discovered run handles without replaying pending entries.
