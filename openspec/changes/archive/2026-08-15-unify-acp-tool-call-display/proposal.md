## Why

ACP Chat and ACP Skills currently derive tool names, titles, input summaries, result summaries, and compact preview text with separate implementations whose behavior has diverged. The duplication now obscures protocol semantics, loses or overwrites display data during partial updates, and makes renderer compatibility heuristics a competing source of truth.

## What Changes

- Define one ACP tool-call display projection contract shared by ACP Chat and ACP Skills.
- Normalize canonical ACP fields before a closed set of compatibility aliases, with field-aware placeholder handling and bounded display values.
- Make the projection own display-field merge semantics across partial updates while leaving lifecycle, identity, persistence, and publication ownership unchanged.
- Define one compact primary/secondary selector for transcript rows, live previews, and durable transcript indexes.
- Retain compatibility-only `summary` and legacy snapshot rendering without rewriting stored transcript history.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-tool-message-display`: Replace path-specific tool display shaping with one projection and selection contract for ACP Chat and ACP Skills while preserving legacy snapshot compatibility.

## Impact

- Shared transcript display contract under `src/shared`.
- ACP Chat and ACP Skills transcript mirrors and durable preview indexing.
- Assistant Workspace tool-row rendering and DOM-identity regression coverage.
- No backend protocol, transcript storage schema, dependency, or historical-data migration changes.
