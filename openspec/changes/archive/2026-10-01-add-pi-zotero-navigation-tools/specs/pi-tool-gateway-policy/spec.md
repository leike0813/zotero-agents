## ADDED Requirements

### Requirement: Foreground-only tool admission uses trusted Conversation context

A descriptor MAY require a foreground Conversation. Such tools SHALL be absent from Skill Run, automatic and missing-context effective catalogs. Execution and continuation SHALL independently verify conversation owner, interactive mode and the original trusted context before effect, regardless of standing grants. A valid foreground descriptor SHALL authorize its host-control effect without granting other effects or changing Shell/MCP authorization.

#### Scenario: Skill Run requests a foreground tool
- **WHEN** a Skill Run has host-control authorization and requests a foreground-only tool
- **THEN** the tool is undiscoverable and no executor starts

#### Scenario: Foreground context expires after freeze
- **WHEN** the original context becomes invalid before execution or after started publication
- **THEN** no effect occurs and the call fails without fallback or approval

#### Scenario: Eligible navigation needs no per-call permission
- **WHEN** an interactive Conversation has a valid original foreground context
- **THEN** its host-control navigation executes without a permission request

### Requirement: Single-per-batch tools reject conflicting combinations individually

The Gateway SHALL reject every single-per-batch tool call with invalid_request when a batch contains more than one such call, before any preflight or effect for those calls. Independent eligible read calls SHALL still run. Descriptor constraints SHALL participate in frozen identity.

#### Scenario: Two navigation calls accompany a read
- **WHEN** a batch includes two single-per-batch calls and an independent eligible read
- **THEN** neither navigation starts and the read completes in original result order

#### Scenario: One navigation accompanies a read
- **WHEN** a batch contains one single-per-batch call and an eligible read
- **THEN** both may complete under existing resource policy

### Requirement: Uncertain executor failures retain safe cause facts

When an executor reports unknown effect certainty, the Gateway SHALL return state_unknown while preserving its valid bounded stable failure code, retryability and strict-JSON details. Durable receipts SHALL retain uncertainty without copying native diagnostics or failure bodies.

#### Scenario: Navigation fails after its first effect
- **WHEN** an executor reports a typed non-retryable failure with unknown certainty
- **THEN** the result retains the typed cause and reports state_unknown with no replay
