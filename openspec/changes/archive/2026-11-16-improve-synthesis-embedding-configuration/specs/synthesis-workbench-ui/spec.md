# Spec Delta

## ADDED Requirements

### Requirement: Synthesis embedding Preferences SHALL manage saved connections through drafts

Synthesis embedding Preferences SHALL list saved connections and edit one connection in a draft with create, edit, delete, primary selection, and ordered fallback controls. Saving SHALL persist only explicit edits, preserve the current retrieval scope, and SHALL NOT enable, test, activate, or start index work. A preset SHALL fill only a new unsaved draft and SHALL NOT start network work, save, establish a primary/fallback selection, enable, test, activate, or index a connection.

#### Scenario: User selects a preset

- **WHEN** the user selects any of the OpenAI, Ollama, TEI, Cohere, Voyage, or Gemini protocol templates; the LM Studio, vLLM, Xinference, Azure OpenAI, or Jina provider presets; or the `qwen3-embedding:0.6b` or `qwen3-embedding:4b` local templates
- **THEN** a new unsaved draft is filled with the provider's correct name and compatible starting values
- **AND** no request, save, primary/fallback selection, enable, test, activation, or index operation starts
- **AND** no private-network example is inserted

#### Scenario: User creates or edits a connection

- **WHEN** the user saves a valid connection draft
- **THEN** only that explicit connection edit persists
- **AND** the selected protocol, raw model identifier, and other user edits remain visible after refresh

#### Scenario: User changes connection order

- **WHEN** the user selects one primary and orders distinct fallbacks
- **THEN** saving persists that explicit order

#### Scenario: User deletes a saved connection

- **WHEN** the user deletes a saved connection
- **THEN** that connection and its encrypted credential are removed
- **AND** the primary becomes unset when the deleted connection was primary
- **AND** the deleted connection is removed from fallbacks while every other fallback retains its relative order

#### Scenario: Explicit selection is invalid

- **WHEN** an explicit primary or fallback selection references an unknown, deleted, or duplicate connection, or selects the primary as its own fallback
- **THEN** saving rejects the selection and retains the existing saved selection

#### Scenario: Connection save completes

- **WHEN** a connection draft is saved
- **THEN** retrieval scope and the existing published index remain unchanged
- **AND** no activation, probe, discovery, or index operation starts

### Requirement: Synthesis embedding Preferences SHALL expose complete connection fields

Preferences SHALL expose protocol, endpoint, model, discovery, authentication, encoding parameters, prefixes, dimensions, encrypted write-only credentials, and scope. Invalid JSON SHALL remain editable. Discovery hints SHALL not set requested output dimensions; a synthetic probe SHALL establish actual dimensions.

#### Scenario: User chooses a protocol

- **WHEN** the user selects OpenAI, Ollama, TEI, Cohere, Voyage, or Gemini
- **THEN** Preferences presents that protocol's supported endpoint, authentication, parameter, discovery, and model controls
- **AND** unsupported generic discovery remains manual

#### Scenario: Parameter JSON is invalid

- **WHEN** a common, query, or document parameter entry is malformed or attempts to override an adapter-owned field
- **THEN** the affected field reports a validation error
- **AND** the draft and all other connection values remain intact

#### Scenario: A credential is configured

- **WHEN** a credential has been saved
- **THEN** Preferences may show only configured state or update metadata and SHALL NOT render the secret value

#### Scenario: Discovery reports a dimensional hint

- **WHEN** discovery or Ollama `show` metadata includes a model dimension
- **THEN** Preferences leaves the output-dimension control unchanged
- **AND** the actual dimension appears only after an explicit synthetic probe

#### Scenario: User selects named-header authentication

- **WHEN** authentication type is set to `header`
- **THEN** Preferences requires a safe header name
- **AND** changing away from `header` does not expose or persist the credential in visible configuration

### Requirement: Synthesis embedding model discovery SHALL be explicit and draft-scoped

Model discovery SHALL start only from an explicit user action and SHALL use the active unsaved draft and available credential. OpenAI, Ollama, TEI, Cohere, and Gemini shall expose only catalog-returned model identifiers. Completed results and explicit partial-results state SHALL remain visible; canceling, dropping, replacing the owner, or a late response SHALL apply nothing to a current or other draft; a discovery failure SHALL retain every field already entered.

#### Scenario: Preferences open or fields change

- **WHEN** the Preferences page opens, a preset fills a draft, or a connection field changes
- **THEN** no model discovery request starts

#### Scenario: Discovery returns partial results

- **WHEN** an explicit discovery request reaches its deadline, page bound, or entry bound after finding models
- **THEN** Preferences shows those models as partial results
- **AND** it does not replace the model field unless the user selects a result

#### Scenario: Discovery fails or is canceled

- **WHEN** discovery fails, is canceled, or completes after its draft owner changes
- **THEN** every entered field remains available for the current owner
- **AND** the stale result is not shown or applied to another draft

### Requirement: Synthesis embedding save-and-test SHALL show version-bound status

Save-and-test SHALL validate before mutation, persist configuration and encrypted credentials with failure rollback, then run the synthetic probe. Verification SHALL bind request-affecting configuration and credential revision, excluding ID, name, and discovery. Changes SHALL invalidate stale success. Failure SHALL retain the draft and show bounded diagnostics; index actions SHALL require a valid tested identity.

#### Scenario: Save-and-test succeeds

- **WHEN** configuration and credential save, then the synthetic query/document probe succeeds
- **THEN** Preferences shows success for that saved configuration version and its reported dimensions and latency

#### Scenario: Save-and-test fails

- **WHEN** configuration or credential save succeeds but the synthetic probe fails
- **THEN** Preferences reports failure without clearing the draft or claiming a tested identity
- **AND** no index is created or updated

#### Scenario: Configuration persistence fails

- **WHEN** validation or persistence of configuration or the encrypted credential fails
- **THEN** Preferences restores the previous configuration and encrypted credential and sends no synthetic probe

#### Scenario: The tested configuration changes

- **WHEN** the connection draft, its saved configuration, or its credential changes after a successful test
- **THEN** Preferences no longer presents the older test as applying to the new version

#### Scenario: A test finishes late

- **WHEN** a test completes after the selected connection or draft owner changes
- **THEN** Preferences does not mark the newer owner as tested

#### Scenario: An older identical probe finishes late

- **WHEN** two probes for the same request configuration overlap and the newer probe succeeds first
- **THEN** the older completion cannot replace the newer success

#### Scenario: Different connections save concurrently

- **WHEN** configuration or credential writes for different connections overlap
- **THEN** both credential-list entries persist and their probes remain independent
