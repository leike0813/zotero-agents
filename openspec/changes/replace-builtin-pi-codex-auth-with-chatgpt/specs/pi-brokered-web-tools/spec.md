## ADDED Requirements

### Requirement: ChatGPT native search uses official completed grounding

ChatGPT native search SHALL use the selected registration and public Responses endpoint with shared authentication, quota and actual-terminal policy. It SHALL retain the sealed outbound network boundary, one dispatch per source, actual search-call evidence and supplied citations. Missing service capability SHALL fail visibly without restoring private endpoints or changing source implicitly.

#### Scenario: Answer has no completed search

- **WHEN** the SIWC response contains prose but no completed native search evidence
- **THEN** the source cannot report grounded success

#### Scenario: Native search returns citations

- **WHEN** a completed official search returns bounded answer and citation annotations
- **THEN** existing external-untrusted grounding preserves supplied citations and source attempt identity
