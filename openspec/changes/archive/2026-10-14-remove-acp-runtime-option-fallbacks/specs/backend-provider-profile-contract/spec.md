# Spec Delta

## MODIFIED Requirements

### Requirement: Provider option application SHALL fail closed

Explicit ACP and SkillRunner provider options SHALL be validated against the
selected backend catalog and SHALL either be applied before execution starts or
produce a structured failure. A value that is invalid or cannot be resolved
unambiguously SHALL fail with `provider_profile_option_unavailable`, keeping its
original value; it SHALL NOT be replaced by a default, an observed current value,
or an alternate variant of the same option. Previously persisted profiles SHALL
NOT be migrated automatically.

#### Scenario: ACP option becomes unavailable

- **WHEN** an ACP mode, model, or reasoning value is unavailable before the first prompt
- **THEN** the run fails before prompting
- **AND** the failure identifies the rejected option key and reason without recording its value.

#### Scenario: SkillRunner option is unknown

- **WHEN** an explicit SkillRunner engine, provider, model, or effort is absent from the backend catalog
- **THEN** submission fails before backend dispatch
- **AND** the option is not silently replaced by a default.

#### Scenario: Invalid ACP selection keeps its original value

- **WHEN** an ACP profile selects a mode, model, or reasoning value that the
  backend catalog does not offer or cannot resolve unambiguously
- **THEN** validation SHALL fail with `provider_profile_option_unavailable`
- **AND** the error SHALL carry the requested value unchanged
- **AND** it SHALL NOT fall back to the backend current value, the first catalog
  entry, or another variant of the same model.

#### Scenario: Persisted profiles are not auto-migrated

- **GIVEN** a stored profile carries a value a backend no longer accepts
- **WHEN** that profile is next submitted unchanged
- **THEN** the submission SHALL fail as an unavailable option
- **AND** the plugin SHALL NOT rewrite the stored profile to a nearby value.

### Requirement: ACP provider and model form one selection tuple

The provider/model relationship SHALL be validated and compared semantically
before raw ACP model-id handling. A valid provider-plus-model selection SHALL not
be reported as `could_not_be_applied` merely because the stored id differs in
form from the requested one. The requested raw model id SHALL be preserved as
given, without deriving a provider-qualified form or migrating to a bare model
name. The public field names SHALL stay unchanged and `acpModelId` SHALL carry the
complete raw model id.

#### Scenario: Provider-qualified model validates semantically

- **WHEN** a profile selects a model that belongs to the named model provider
- **THEN** validation SHALL accept the tuple and return its canonical flat
  provider-options representation
- **AND** the profile option SHALL keep the requested raw model id unchanged
- **AND** it SHALL NOT be rewritten into a provider-qualified or bare model name.

#### Scenario: Public fields keep their names and raw model identity

- **WHEN** a provider option payload is emitted
- **THEN** its public field names SHALL be unchanged from the current contract
- **AND** `acpModelId` SHALL contain the complete raw model id, including any
  suffix such as `@high` or `:thinking`.
