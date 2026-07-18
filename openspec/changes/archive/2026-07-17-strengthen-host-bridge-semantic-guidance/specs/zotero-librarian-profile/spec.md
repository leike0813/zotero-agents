## ADDED Requirements

### Requirement: Librarian guidance SHALL compose resident policy over generated Host Bridge facts

The Zotero Librarian profile SHALL consume the same generated command and family facts as the general Library Agent while keeping resident indexing, scheduling, monitoring, maintenance, and local-state policy in profile-owned semantic sources.

#### Scenario: Resident task selects a data source
- **WHEN** repeated retrieval can use the profile-owned local index
- **THEN** the profile SHALL prefer that index for discovery
- **AND** SHALL confirm current selection, workflow, permission, product, and writeback facts through canonical Host Bridge reads before acting.

#### Scenario: Scheduled work reaches a state-change boundary
- **WHEN** scheduled maintenance would require approval or mutate Host state
- **THEN** the profile SHALL stop at a reviewable proposal unless explicit current policy authorizes the operation.

#### Scenario: Profile guidance is rendered
- **WHEN** shared command facts or profile semantic supplements change
- **THEN** the renderer SHALL compose the generated profile without copying bounded task policy into the CLI wrapper or resident policy into the general Library Agent.

### Requirement: Librarian references SHALL use progressive domain disclosure

The profile SHALL expose short first-level routing guidance and load domain, output, or error references only for the current task.

#### Scenario: Librarian handles an unfamiliar Host Bridge domain
- **WHEN** a task involves context navigation, attachments/files, Product lifecycle, workflow/run interaction, Synthesis subdomains, or diagnostics
- **THEN** the profile SHALL route to the relevant generated domain reference
- **AND** SHALL NOT require scanning one flat complete command table.

### Requirement: Librarian repository README SHALL select the resident surface

The Librarian Profile release repository README SHALL explain installation, resident indexing and scheduling, live Host Bridge confirmation, default read-only scheduled behavior, monitoring, and reviewable recovery.

#### Scenario: User or agent opens the profile repository
- **WHEN** the repository README is the first document read
- **THEN** it SHALL distinguish resident work from bounded Library Agent tasks and CLI-only integration
- **AND** SHALL route detailed policy to profile-owned skills and references rather than duplicating generated command tables.

### Requirement: Librarian references SHALL document resident operating contracts

The Profile SHALL document local-index freshness and atomic refresh, every scheduled job's read/write and silence policy, notification and run monitoring, workflow catalog refresh and live confirmation, cache and graph maintenance boundaries, helper-script I/O, and agent-owned apply-back receipts.

#### Scenario: Resident work reaches uncertain or mutable state
- **WHEN** cached facts may be stale, a schedule proposes a write, or apply-back is interrupted
- **THEN** the Profile SHALL identify the required live Host Bridge confirmation, approval or review stop, preserved local state, and auditable recovery command.
