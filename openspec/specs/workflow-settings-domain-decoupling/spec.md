# workflow-settings-domain-decoupling Specification

## Purpose
Defines the workflow settings domain's versioned document contract and single domain parser for settings normalization.

## Requirements

### Requirement: Workflow settings persistence MUST use a versioned domain document

Workflow settings persistence MUST support a versioned document contract owned by the workflow settings domain.

#### Scenario: New settings writes use versioned document

- **WHEN** workflow settings are saved by the domain settings writer
- **THEN** the persisted `workflowSettingsJson` payload SHALL contain a schema version
- **AND** workflow-specific settings SHALL be stored under a workflow-id keyed document field.

#### Scenario: Existing unversioned settings remain readable

- **WHEN** `workflowSettingsJson` contains the existing unversioned workflow-id keyed record
- **THEN** the workflow settings domain SHALL parse it as valid settings
- **AND** execution settings resolution SHALL remain behavior-equivalent.

#### Scenario: Malformed settings fail closed

- **WHEN** `workflowSettingsJson` contains malformed JSON or a non-object payload
- **THEN** the workflow settings domain SHALL treat it as an empty settings record
- **AND** workflow execution SHALL not receive partially parsed settings.

### Requirement: Workflow settings normalization MUST have a single domain parser

Workflow settings normalization MUST route persisted, run-once, and hook-returned settings patches through shared domain parsing helpers rather than duplicate local parsers.

#### Scenario: NormalizeSettings hook returns a partial patch

- **WHEN** a workflow `normalizeSettings` hook returns a partial settings patch
- **THEN** the patch SHALL be interpreted by the shared workflow settings domain parser
- **AND** merge precedence between persisted settings and incoming override SHALL remain unchanged.

#### Scenario: Backend id remap updates versioned settings

- **WHEN** backend registry maintenance remaps or removes a backend id referenced by workflow settings
- **THEN** the remap operation SHALL support the versioned settings document
- **AND** the resulting persisted settings SHALL remain readable by the workflow settings domain.

### Requirement: Workflow settings SHALL model Host queue options as a versioned domain

The versioned workflow settings document MUST support a provider-independent
Host options domain containing `queue.maxConcurrency`. The canonical stored
value MUST be a non-negative integer or absent; blank input and `0` MUST
normalize to the same unlimited runtime meaning.

#### Scenario: Positive maximum is persisted

- **WHEN** a user saves maximum concurrency `3` as the workflow default
- **THEN** the settings domain SHALL persist canonical integer `3` under the Host queue options domain
- **AND** it SHALL remain separate from workflow parameters and provider settings

#### Scenario: User clears the maximum

- **WHEN** a user explicitly saves a blank maximum-concurrency field
- **THEN** the settings domain SHALL remove the persisted maximum or store its canonical absent form
- **AND** later submissions SHALL resolve the default as unlimited

#### Scenario: Invalid stored value is read

- **WHEN** stored maximum concurrency is negative, fractional, non-numeric, or outside the supported integer range
- **THEN** settings normalization SHALL reject or ignore that value according to the existing settings error contract
- **AND** it SHALL NOT forward the invalid value to queue admission

### Requirement: Settings migration SHALL preserve existing workflow configuration

The settings schema MUST advance to a version that can represent Host options
while continuing to read the current version and legacy workflow settings.
Migration MUST preserve workflow parameters and provider selections, and absent
Host queue options MUST resolve to unlimited concurrency.

#### Scenario: Existing settings have no Host options

- **WHEN** a prior-version workflow settings document is loaded
- **THEN** its workflow parameters and provider settings SHALL retain their current values
- **AND** maximum concurrency SHALL resolve to unlimited

#### Scenario: Migrated settings are saved

- **WHEN** a prior-version settings document is edited and saved
- **THEN** it SHALL be written in the new canonical settings shape
- **AND** Host options SHALL have one schema-owned source of truth

### Requirement: Host options SHALL not leak into provider contracts

Host queue options MUST be consumed by plugin orchestration only. They MUST NOT
be serialized into ACP, SkillRunner, Generic HTTP, or pass-through provider
request payloads.

#### Scenario: Supported provider request is built

- **WHEN** an ACP Skills or SkillRunner execution unit is admitted
- **THEN** the provider request SHALL contain only its existing provider and workflow fields
- **AND** `queue.maxConcurrency` SHALL remain Host-local metadata
