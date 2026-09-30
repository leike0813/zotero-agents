# Spec Delta

## MODIFIED Requirements

### Requirement: Budget admission fails closed

Preparation SHALL calculate the effective context window from the smallest declared model, provider and resource limits, then subtract the frozen output reserve and adapter safety margin. It SHALL use a named versioned provider-aligned estimator, reject unknown or nonpositive context limits, and reject unsupported tool or modality requirements. A native Codex selection whose official discovery omits an output ceiling MAY reserve output within the known context without inferring a separate ceiling; other provider selections SHALL require a known positive output ceiling. It SHALL never silently truncate mandatory context or historical units.

#### Scenario: Mandatory input exceeds the budget
- **WHEN** mandatory instructions, current input, or tool schema cannot fit even without compactable history
- **THEN** preparation fails with `context_budget_exceeded`

#### Scenario: History makes the request too large
- **WHEN** projected input exceeds the budget and the selected path has a safe compaction boundary
- **THEN** automatic compaction is planned before a normal Provider invocation

#### Scenario: Codex discovery omits a separate output ceiling
- **WHEN** the frozen native Codex selection has known context and an unknown output ceiling
- **THEN** preparation admits only an output reserve and safety margin that leave positive input budget within that context
