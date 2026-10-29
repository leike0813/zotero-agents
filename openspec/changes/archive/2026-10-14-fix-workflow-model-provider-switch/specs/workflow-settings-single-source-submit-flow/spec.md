## ADDED Requirements

### Requirement: Workflow model-provider changes SHALL select a model from the new provider

Both workflow settings surfaces SHALL retain an explicitly selected model provider and refresh its model choices. An explicit ACP or SkillRunner provider dropdown change SHALL select the first advertised model in that provider's catalog order. An old model's provider prefix SHALL NOT override a valid explicit provider.

#### Scenario: Switch provider and then select another model

- **WHEN** the user switches from provider A to provider B in Workflow Options or the submit dialog
- **THEN** the model list SHALL contain provider B's models and select its first model
- **AND** choosing another B model SHALL keep provider B selected
- **AND** saving or confirming SHALL use that selected model, including its complete ACP raw identifier.

#### Scenario: Target provider has no models

- **WHEN** an explicit provider change has no advertised target model
- **THEN** the system SHALL retain the selected provider and unavailable model state
- **AND** execution validation SHALL reject the unavailable selection without selecting a different provider or model.

#### Scenario: Confirm before the provider change is reflected by the page

- **WHEN** the user confirms immediately after an explicit provider change, before the form receives its updated model
- **THEN** the confirmed selection SHALL use the model selected by that provider change
- **AND** other fields typed immediately before confirmation SHALL be retained
- **AND** a subsequent explicit model choice SHALL take precedence over the provider-change model.

### Requirement: Ordinary ACP form projection SHALL preserve explicit and unset selections

Opening or refreshing a workflow form SHALL preserve unset ACP options and unavailable explicit values. Provider filtering SHALL use the same UI provider selection shown by the form. The first-model rule SHALL apply only to an explicit provider dropdown change and SHALL NOT derive or reset ACP reasoning.

#### Scenario: Refresh with no explicit model

- **WHEN** the form opens or its catalog refreshes with no explicit ACP model or reasoning
- **THEN** those selections SHALL remain unset and SHALL NOT produce runtime overrides.

#### Scenario: Explicit raw value becomes unavailable

- **WHEN** a catalog refresh removes an explicit ACP model or reasoning value
- **THEN** the form SHALL preserve the value as unavailable
- **AND** execution SHALL fail validation rather than substitute a catalog entry.

### Requirement: Submit descriptor refresh SHALL preserve the latest draft

A submit-dialog descriptor refresh SHALL only apply its result to the draft that initiated it. An older refresh completion SHALL NOT overwrite a newer provider, model or other edited field.

#### Scenario: Rapid provider changes complete out of order

- **WHEN** the user switches to B and then C while B's descriptor refresh is pending
- **AND** B's refresh completes after C's
- **THEN** the form and confirmed submission SHALL retain C and its selected model.
