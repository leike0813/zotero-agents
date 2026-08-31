## ADDED Requirements

### Requirement: CLI Agent Surface SHALL disclose provider-profile selection gates
The generated mechanism surface, command cards, and `zotero-bridge-cli` Skill SHALL state the provider-profile resolution precedence, the special handling of `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, the explicit empty-object override, and the no-environment user-confirmation gate. They SHALL instruct the Agent to present the exact candidate/profile fields and wait for user confirmation when required, and SHALL prohibit guessing or shape-copying a provider, model, or reasoning value.

#### Scenario: Agent uses an environment default
- **WHEN** the environment default is available and the Agent has no explicit profile argument
- **THEN** the published guidance directs the Agent to invoke describe/validate and submit using the environment-resolved profile without asking the user to reconfirm it
- **AND** it does not tell the Agent to synthesize another profile.

#### Scenario: Agent must confirm a non-environment candidate
- **WHEN** no environment default exists and discovery returns a Host-saved default or catalog candidate
- **THEN** the published guidance requires the Agent to show the candidate's backend/provider/model/reasoning fields and obtain a clear user confirmation before submit
- **AND** it distinguishes that confirmation from workflow approval and ACP permission approval.

#### Scenario: Agent cannot infer a profile
- **WHEN** no explicit profile or environment default exists and the user has not selected a profile
- **THEN** the Agent is instructed to ask the user which valid profile to use
- **AND** it MUST NOT choose by catalog order, backend popularity, or matching JSON shape.

### Requirement: CLI Agent Surface SHALL expose profile refresh and structured recovery
The public command contract SHALL include backend-scoped profile refresh, describe, validate, and submit relationships, including readiness diagnostics and stable recovery guidance for stale, missing, contradictory, or unavailable catalogs. Generated references SHALL preserve the existing agent-facing semantic depth and SHALL be materialized from governed sources.

#### Scenario: Agent repairs a stale catalog
- **WHEN** describe or validate reports a stale/non-ready catalog
- **THEN** the command surface directs the Agent to refresh that backend and re-run describe/validate before submission
- **AND** it does not recommend submitting the stale profile.

#### Scenario: Surface contract is incomplete
- **WHEN** a generated card omits profile confirmation, environment-default precedence, refresh, or structured error/recovery facts
- **THEN** surface validation fails and the release gate reports the missing semantic unit.
