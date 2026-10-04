## MODIFIED Requirements

### Requirement: Existing product surfaces own export actions

Selected Pi owner Details drawer SHALL expose scoped export; the independent Zotero Agent settings maintenance section SHALL expose global export. Host picker cancellation SHALL perform no export. The action SHALL retain its captured owner and SHALL NOT switch to a later selection. Transcript-only/loading/streaming updates SHALL preserve all unrelated managed-region DOM identities. Diagnostics SHALL remain passive without health UI or probes.

#### Scenario: Transcript update during owner export

- **WHEN** the selected owner's transcript updates while its Details drawer is open
- **THEN** Details and all other unrelated chrome regions preserve their DOM identity

#### Scenario: Global settings export is canceled

- **WHEN** destination selection is canceled in the independent settings window
- **THEN** no file is generated and no owner workspace is scanned
