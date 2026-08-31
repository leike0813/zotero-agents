# Research Bundle Workflow

## ADDED Requirements

### Requirement: Topic-resolved papers are mandatory candidates

The Research Bundle runtime SHALL include every unique `paper_ref` found in the selected Topic `resolved_paper_set` in the candidate set and final selection unless the paper cannot be resolved by the host at materialization time.

#### Scenario: Topic paper has low semantic relevance

- **WHEN** a selected Topic resolves a paper whose Stage 50 semantic relevance is below `0.45`
- **THEN** the paper remains eligible and is normalized into the final `papers` array
- **AND** its Topic association is recorded in the selection/audit data.

#### Scenario: Search and Topic results overlap

- **WHEN** a paper is returned by library search and by one or more selected Topics
- **THEN** it appears once, keyed by `paper_ref`
- **AND** its sources and Topic ids are merged.

### Requirement: Related-paper limits exclude mandatory Topic papers

`maxRelatedPapers` SHALL limit only non-Topic-associated additional papers. `maxCorePapers` SHALL continue to limit the number of papers assigned the `core` role.

#### Scenario: Mandatory Topic papers exceed the related limit

- **WHEN** the selected Topics resolve more papers than `maxRelatedPapers`
- **THEN** all resolved Topic papers remain in the final selection
- **AND** no additional non-Topic papers are admitted once the configured related budget is filled.

### Requirement: Candidate assessment budget preserves Topic papers

The bounded candidate budget SHALL never truncate a Topic-associated candidate. Non-Topic candidates MAY be truncated deterministically after all mandatory Topic candidates are retained.

#### Scenario: Candidate budget is exceeded

- **WHEN** mandatory Topic candidates plus optional candidates exceed the assessment budget
- **THEN** all mandatory Topic candidates enter assessment packets
- **AND** only optional candidates are truncated.

### Requirement: Selection normalization accepts mandatory Topic papers

The shared selection normalizer SHALL allow low-score Topic-associated papers, preserve their Topic association, and enforce count limits only for non-Topic papers and core role count. It SHALL continue rejecting duplicate refs, invalid scores, and malformed core prefixes.

#### Scenario: Normalizer validates optional count

- **WHEN** a normalized selection contains too many non-Topic papers
- **THEN** normalization rejects it
- **AND** a selection with additional mandatory Topic papers remains valid.
