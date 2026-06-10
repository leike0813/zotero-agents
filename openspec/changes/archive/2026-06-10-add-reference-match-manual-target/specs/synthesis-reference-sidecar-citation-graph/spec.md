## MODIFIED Requirements

### Requirement: Accepted proposals write graph-affecting facts

Accepting a reference match proposal SHALL write the corresponding accepted fact
and mark citation graph cache stale.

#### Scenario: Binding proposal is manually retargeted

- **WHEN** the user applies a manual target decision for a `zotero_binding`
  proposal
- **THEN** Synthesis SHALL write an accepted binding fact to the selected Zotero
  item
- **AND** create an accepted manual audit proposal
- **AND** mark the original proposal `retargeted`.

#### Scenario: Canonical merge proposal is manually retargeted

- **WHEN** the user applies a manual target decision for a `canonical_merge`
  proposal
- **THEN** Synthesis SHALL redirect both the source canonical and original target
  canonical to the selected canonical target
- **AND** create accepted manual audit proposals for both redirects
- **AND** mark the original proposal `retargeted`.
