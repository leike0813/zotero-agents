## ADDED Requirements

### Requirement: Debug sequence probe workflows declare ACP sequence contracts

Debug sequence probe workflows SHALL declare `skillrunner.sequence.v1` manifests
that exercise serial execution, workflow workspace reuse, and explicit handoff
filtering.

#### Scenario: Sequence probe manifests load

- **WHEN** the debug probe package is loaded in debug mode
- **THEN** the linear sequence probe SHALL declare a three-step sequence
- **AND** the workspace reuse probe SHALL declare downstream `reuse-workflow`
  workspace intent
- **AND** the context isolation probe SHALL declare explicit handoff mapping
  with pass-through disabled.
