## REMOVED Requirements

### Requirement: Budget admission fails closed

**Reason**: The approved authentication replacement moves the unknown-output reserve from obsolete Codex execution to explicit SIWC authentication while retaining all context and budget safeguards.
**Migration**: Use authentication-applicable budget admission below; existing historical preparation remains unchanged.

## ADDED Requirements

### Requirement: Context budget admission is authentication applicable

Preparation SHALL calculate the effective context window from the smallest declared model, provider and resource limits, then subtract the frozen output reserve and adapter safety margin. It SHALL use a named versioned provider-aligned estimator, reject unknown or nonpositive context limits, and reject unsupported tool or modality requirements. A SIWC ChatGPT selection whose official discovery omits an output ceiling MAY reserve output within the known context without inferring a separate ceiling; other provider selections SHALL require a known positive output ceiling. It SHALL never silently truncate mandatory context or historical units.

#### Scenario: Mandatory input exceeds the budget

- **WHEN** mandatory instructions, current input, or tool schema cannot fit even without compactable history
- **THEN** preparation fails with `context_budget_exceeded`

#### Scenario: History makes the request too large

- **WHEN** projected input exceeds the budget and the selected path has a safe compaction boundary
- **THEN** automatic compaction is planned before a normal Provider invocation

#### Scenario: ChatGPT discovery omits a separate output ceiling

- **WHEN** the frozen SIWC ChatGPT selection has known context and an unknown output ceiling
- **THEN** preparation admits only an output reserve and safety margin that leave positive input budget within that context

### Requirement: SIWC tools and incomplete text retain preparation meaning

Preparation SHALL budget the actual namespace tool definitions and use the turn's frozen name mapping. SIWC output reserve SHALL constrain input preparation rather than claim a server output cap. Incomplete assistant text SHALL not be projected as a normal completed message, and compaction SHALL retain existing revision/leaf CAS and settled-effect gates.

#### Scenario: Partial assistant response

- **WHEN** a failed SIWC invocation leaves visible partial text
- **THEN** the next normal model context does not treat it as a completed assistant message
