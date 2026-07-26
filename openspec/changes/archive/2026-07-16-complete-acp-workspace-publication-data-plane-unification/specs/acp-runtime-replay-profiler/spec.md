## ADDED Requirements

### Requirement: Replay drain uses an exact publication barrier
Diagnostic force SHALL always return a publication identity even when content is unchanged. Replay SHALL wait for that identity and work queued before its barrier on the same surface, and SHALL NOT require unrelated historical pending publications to disappear.

#### Scenario: Forced equal-content snapshot
- **WHEN** Replay forces publication without a content change
- **THEN** Host posts a diagnostic snapshot with a new publicationId
- **AND** sidecar completes from that exact render-complete identity.

### Requirement: Replay verifies the complete v3 lifecycle
Each successful publication SHALL correlate the same publicationId across post, shell-forward, child-apply, and render-complete. Old-owner, stale, gap, superseded, or invalid publications SHALL not modify DOM.

#### Scenario: Valid transcript delta replays
- **WHEN** child accepts and renders it
- **THEN** all successful lifecycle stages report the same publicationId and terminal outcome.

### Requirement: Formal acceptance is atomic across surfaces
Formal boundary runs SHALL require Chat and Skills transcript visibility, complete execution and measurement, zero forbidden steady materialization, Chat bytes below 2.7 MB, Skills bytes no greater than 557610, and no greater-than-100ms drift regression on available Zotero 7/9 hosts.

#### Scenario: One surface fails
- **WHEN** either Chat or Skills has missing transcript, timeout, incomplete measurement, forbidden materialization, or budget regression
- **THEN** the entire change remains incomplete.
