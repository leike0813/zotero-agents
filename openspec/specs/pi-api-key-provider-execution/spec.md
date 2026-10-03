# Pi API-key Provider Execution

## Purpose

Executes a frozen Built-in Pi model selection through a native API-key or explicitly keyless Provider stream while keeping credentials and native SDK details inside the plugin.

## Requirements

### Requirement: Frozen selection admits only supported native API streams

The execution path SHALL use the selected model, API dialect, endpoint, and reasoning without selecting a fallback Provider or reading ambient credentials. Unsupported API or model facts SHALL fail before network access.

#### Scenario: Supported API-key selection
- **WHEN** a supported frozen selection and its matching encrypted API-key credential are supplied
- **THEN** native Provider text deltas are streamed into the prepared turn without exposing the key

#### Scenario: Keyless custom endpoint
- **WHEN** a custom OpenAI-compatible endpoint is explicitly configured with no credential
- **THEN** the request uses only that endpoint and no ambient authorization

#### Scenario: Unsupported adapter
- **WHEN** the selected API has no admitted browser-compatible adapter
- **THEN** execution fails with a structured unsupported Provider result before issuing a request

### Requirement: Provider requests fail closed and cancel promptly

The execution path SHALL reject missing or unreadable credentials, require explicit Local Network authorization for local endpoints, propagate abort to the native stream and request, and expose only bounded redacted project failures.

#### Scenario: Credential is cleared after selection
- **WHEN** a selected credential is removed before execution
- **THEN** execution reports `credential_missing` without falling back to another key or environment variable

#### Scenario: Local endpoint lacks authorization
- **WHEN** a local endpoint is selected without a successful Local Network preflight
- **THEN** no request is sent

#### Scenario: Provider request fails
- **WHEN** the Provider returns authentication, rate-limit, other HTTP, network, or malformed-stream failure
- **THEN** the caller receives the corresponding project failure code without response bodies, headers, secrets, or native exception chains

#### Scenario: Turn is canceled during streaming
- **WHEN** the turn abort signal fires while a stream is active
- **THEN** request and stream work stop and late text cannot revive the turn

### Requirement: Browser build admits only the proven unreachable host import

The production browser build SHALL allow only the exact `provider-env.js -> node:fs` import with an execution-time throw, and SHALL reject other Node or Bun builtins.

#### Scenario: Unexpected builtin import
- **WHEN** a different reachable host builtin enters the Pi Provider import graph
- **THEN** the browser build fails

### Requirement: Provider input retains prepared instruction and tool meaning

The Provider adapter SHALL normalize the prepared request while preserving instructions, message roles and tool definitions exactly once. Normalization SHALL NOT expand credentials, permission, Provider selection or durable transcript formats.

#### Scenario: Prepared instructions and tools reach an API request
- **WHEN** the frozen Provider executes a prepared instruction/message/tool context
- **THEN** the actual API request retains each instruction and tool definition once and uses only the selected authorization

### Requirement: Frozen metadata governs the actual provider request
The Provider SHALL map only understood frozen compat, reasoning mappings, defaults and applicable limits into its request. Known serialized byte and image-count bounds SHALL be enforced before transport. Remote data SHALL NOT provide arbitrary headers, credentials, routing privileges or new adapters. Custom and subscription targets SHALL NOT inherit public API pricing or capabilities merely from model identity.

#### Scenario: Serialized request exceeds a frozen bound
- **WHEN** the actual prepared request exceeds a known byte or image limit
- **THEN** no request is dispatched and a safe structured failure is returned

### Requirement: Usage and estimates retain actual invocation facts
Provider usage SHALL retain obtained token-category facts. Estimated costs SHALL use frozen applicable per-million rates and tiers with one calculation version. Missing price or required usage SHALL remain unknown; explicit zero rates SHALL permit zero estimates. Subscription usage SHALL NOT be priced using public API rates.

#### Scenario: Price changes after completion
- **WHEN** the directory publishes a new rate after a completed invocation
- **THEN** its persisted estimate remains based on the original selection and the new rate applies only to later selections
