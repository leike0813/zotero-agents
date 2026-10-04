## REMOVED Requirements

### Requirement: Built-in Agent page manages Codex account connection

**Reason**: The development Codex capability is replaced by official Sign in with ChatGPT.
**Migration**: Remove obsolete Codex configuration, credentials and discovery/default references; retain all historical owner and effect evidence without automatic rebind.

### Requirement: Built-in Agent page refreshes official Codex models

**Reason**: The development Codex capability is replaced by official Sign in with ChatGPT.
**Migration**: Remove obsolete Codex configuration, credentials and discovery/default references; retain all historical owner and effect evidence without automatic rebind.

## ADDED Requirements

### Requirement: Built-in Agent page manages ChatGPT registrations and plan use

The Zotero Agent configuration interface SHALL offer Continue with ChatGPT, distinct saved registration selection, reauthorization, cancellation, sign out/removal and explicit model refresh in its independent settings window rather than detailed Backend Manager forms. The interface SHALL expose only safe request-bound status, active registration and plan permission, welcome confirmation and Manage Usage. Active authorization SHALL retain its original request until completion or explicit cancellation.

#### Scenario: Plan permission missing

- **WHEN** a verified login lacks direct-plan scope
- **THEN** the page preserves login and offers explicit consent while blocking inference

#### Scenario: Login completes after window closes

- **WHEN** an authorization owner is closed
- **THEN** late result cannot replace another registration or publish into the closed window

### Requirement: Recovery and task consent preserve managed regions

Registration pause recovery SHALL be user-triggered and permit one trial; tasks SHALL separately expose explicit continuation and bounded task restart consent defaulting off in their existing task surfaces. Account/directory status in the configuration interface SHALL preserve drafts and unrelated region identity. Transcript-only changes SHALL not rebuild chrome or add transcript revisions to its signatures.

#### Scenario: Streaming while consent details are unchanged

- **WHEN** transcript chunks arrive with unchanged task consent and Details state
- **THEN** Details and all unrelated managed regions preserve DOM identity
