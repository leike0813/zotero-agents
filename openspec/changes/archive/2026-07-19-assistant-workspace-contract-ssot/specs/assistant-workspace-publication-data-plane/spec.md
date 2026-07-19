## MODIFIED Requirements

### Requirement: Wire contract has one shared source

The v1 wire contract SHALL have one shared source:
`src/shared/assistantWireContract.ts`, imported by both the host modules and
the page-bundle modules. The v1 wire field lists, message types, bridge keys,
and out-of-band action names SHALL be defined only there. Hand-duplicated
contract literals in page scripts or host modules SHALL be rejected by an
anti-hardcoding test guard. The publication module MAY re-export the shared
constants for compatibility.

#### Scenario: A message type is needed on both sides

- **WHEN** a host module and a page module both reference a wire message
  type, bridge key, or field list
- **THEN** both SHALL import the same constant from the shared contract
- **AND** the anti-hardcoding guard SHALL fail if a literal is reintroduced.

#### Scenario: Dead vocabulary stays removed

- **WHEN** the shell resolves per-tab message types
- **THEN** the removed `acp-skill-run:*` and `acp:*` types SHALL NOT
  reappear
- **AND** drawer closing uses `assistant-workspace:close-drawers` and the
  details drawer action uses `open-details-drawer` on both emitter and
  listeners.

### Requirement: Action payloads are typed with registry drift guards

Every action in `ASSISTANT_WORKSPACE_ACTION_REGISTRY` SHALL have a payload
type in `src/shared/assistantActionContract.ts`. Compile-time guards SHALL
fail the type check when the type map's keys differ from the registry's
`payloadKeys` or when the chat/skills action subsets differ from the
registry's `sources`. Runtime registry validation SHALL remain the receiver
gate; the types add compile-time checking without changing runtime behavior.

#### Scenario: A registry action gains a payload key

- **WHEN** a registry entry's `payloadKeys` changes without a matching
  payload type update
- **THEN** `tsc --noEmit` SHALL fail at the drift guard.
