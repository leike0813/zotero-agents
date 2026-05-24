## ADDED Requirements

### Requirement: Workflow manifest schema SHALL use provider as backend compatibility source

The standalone workflow manifest schema MUST require executable workflow
manifests to declare top-level `provider`, and it MUST NOT expose
`execution.supportedBackends` as an authoring field.

#### Scenario: Author declares provider

- **WHEN** a workflow manifest declares top-level `provider`
- **THEN** schema validation SHALL accept that provider declaration
- **AND** runtime backend compatibility SHALL be derived from it.

#### Scenario: Author declares execution.supportedBackends

- **WHEN** a workflow manifest declares `execution.supportedBackends`
- **THEN** schema validation SHALL reject the manifest with deterministic
  diagnostics
- **AND** diagnostics SHALL direct authors to top-level `provider` for backend
  compatibility semantics.

#### Scenario: Author omits provider

- **WHEN** a workflow manifest omits top-level `provider`
- **THEN** schema validation or runtime scan diagnostics SHALL reject the
  workflow as missing executable provider metadata
- **AND** validation SHALL NOT recover by inspecting `request.kind`.
