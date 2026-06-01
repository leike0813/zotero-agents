## Purpose

External Zotero/source-artifact consistency is handled through direct reads, cache diagnostics, and explicit inspect or refresh actions.

## Requirements

### Requirement: Startup does not fan out external source drift
Synthesis SHALL NOT classify Zotero Library drift during startup or expand it into sidecar work.

#### Scenario: Plugin starts after Zotero Library changed
- **WHEN** Synthesis initializes
- **THEN** it SHALL expose existing sidecar cache status
- **AND** it SHALL NOT scan Zotero Library, enqueue per-item work, or mutate cache rows.

### Requirement: Drift diagnostics are explicit and bounded
External source drift diagnostics SHALL be produced only by explicit inspect, direct read, or explicit cache refresh actions.

#### Scenario: User asks to inspect cache drift
- **WHEN** an explicit inspect action compares sidecar cache against Zotero/artifact state
- **THEN** it SHALL report bounded diagnostics and recommended explicit operations
- **AND** it SHALL NOT create topic work, graph jobs, review cards, or permanent active statusbar jobs.
