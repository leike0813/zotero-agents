## ADDED Requirements

### Requirement: Chat browser transcript cost is mutation proportional

ACP Chat steady transcript application SHALL update only the shared item model entry, row, or text node affected by the mutation. It SHALL NOT clone or reindex the complete page, include `uiRevision` in DOM order identity, clear the transcript container, or rerender Markdown for unaffected rows.

#### Scenario: Equal chunks append to an increasingly long transcript

- **WHEN** equal-sized chunks append to the same visible Chat item while the page grows
- **THEN** receiver and renderer work remains bounded by the suffix and target row
- **AND** accumulated page items and accumulated text are absent from the steady operation cost.
