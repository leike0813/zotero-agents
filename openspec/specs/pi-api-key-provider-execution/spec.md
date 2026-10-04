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

### Requirement: SIWC wire follows explicit frozen authentication

ChatGPT execution SHALL use the public Responses endpoint with stream true, store false and complete array input without previous_response_id or system items. Explicit auth variant SHALL govern policy independently of key shape. Unsupported automatic SDK fields SHALL be removed at the final boundary, while explicit unsupported user options SHALL fail before sending.

#### Scenario: SDK late override

- **WHEN** a generated payload reintroduces an unsupported field
- **THEN** the final actual request omits it or rejects the explicit user option before transport

#### Scenario: API key has no customary prefix

- **WHEN** an API-key selection uses a non-sk credential
- **THEN** its supported API parameters remain governed by API-key policy

### Requirement: Actual Responses terminal gates tool effects

SIWC success SHALL require actual response.completed and existing result validation. Incomplete, failed, missing-terminal disconnect, cancellation and timeout SHALL remain distinct structured results. Partial text SHALL remain incomplete. No tool batch SHALL dispatch before successful terminal evidence and complete valid arguments; namespace mapping SHALL preserve Gateway identity.

#### Scenario: Arguments finish before failure

- **WHEN** a tool's arguments are complete but the response fails
- **THEN** no tool effect occurs

#### Scenario: SDK normalizes incomplete as done

- **WHEN** the SDK reports done or length after response.incomplete
- **THEN** the project records incomplete instead of success

#### Scenario: Completed response omits repeated output items

- **WHEN** actual response.completed has an empty output array and every streamed output item has a valid response.output_item.done at contiguous output indices
- **THEN** the provider validates those completed wire items against the SDK result and delivers them as the completed response output, preserving the original tool namespace and arguments

#### Scenario: Stream output is not complete

- **WHEN** terminal output is empty and streamed output items are missing, duplicated or still pending
- **THEN** the provider rejects the result and delivers no completed response or tool batch

### Requirement: SIWC usage and retries retain actual request evidence

SIWC SHALL retain complete, partial or unknown measured usage even on failure and SHALL not price plan use with public API rates. SDK retries SHALL be disabled. Only identified temporary 503 before streamed output SHALL permit at most two bounded retries within the original turn deadline; each actual request SHALL have distinct canonical invocation evidence and no doubled aggregate.

#### Scenario: Failure after output

- **WHEN** a response fails after producing text
- **THEN** partial evidence persists and no automatic retry occurs

#### Scenario: Temporary pre-output failure

- **WHEN** two retryable 503 failures precede a successful request
- **THEN** three actual request identities are recorded under one frozen turn and lease
