## ADDED Requirements

### Requirement: Explicit alias audit SHALL remain available

The Concept application SHALL expose an explicit bounded alias audit through the grouped client and Concepts Workbench. The audit SHALL create deterministic review items for canonical-label conflicts and structural alias ownership risks without modifying canonical Concept, sense or alias facts. Repeated audit SHALL preserve existing review identity, including resolved items. New reviews SHALL use the existing CAS and durable replacement path; stale input SHALL not partially write.

#### Scenario: A colliding alias is audited twice
- **WHEN** the user audits an alias whose normalized text names another canonical Concept and repeats the audit
- **THEN** one review for the exact alias and owner is persisted
- **AND** the original Concept and alias facts remain unchanged and survive reopen
- **AND** existing keep/remove review actions remain available

### Requirement: Concept query windows SHALL preserve caller selection

The public Concept query SHALL default to 25 labels, retain deduplicated input order before truncation, and report the effective requested limit independently of total matching input labels. Querying SHALL remain read-only.

#### Scenario: More labels are supplied than requested
- **WHEN** a caller requests two labels from an ordered set of three distinct labels
- **THEN** the first two labels are queried and the response reports limit 2, total 3 and truncated true
