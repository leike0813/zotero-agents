## ADDED Requirements

### Requirement: ACP Skills unfinished rows SHALL expose submission identity

ACP Skills queued, running, waiting, and resumption-pending task rows owned by a Host submission SHALL display that submission's stable symbol immediately before the task title. Terminal rows SHALL omit it. The symbol SHALL have a localized tooltip and equivalent `aria-label` containing the symbol, frozen provider, and frozen model, while the subtitle SHALL retain only its existing skill/workflow and sequence semantics.

#### Scenario: Related ACP tasks share lineage

- **WHEN** unfinished ACP task rows belong to the same submission
- **THEN** they SHALL display the same symbol and frozen tooltip metadata
- **AND** a row from a different submission SHALL display a different symbol

#### Scenario: ACP task completes

- **WHEN** an ACP task becomes terminal
- **THEN** its row SHALL no longer display a submission symbol
