## ADDED Requirements

### Requirement: Every canonical command SHALL declare one output boundary
The command-contract registry SHALL classify every canonical leaf command as `fixed`,
`cursor`, `offset`, `limit`, `file`, or `raw`. The classification SHALL be the unique
source consumed by Agent Surface generation and command-card rendering.

#### Scenario: Full command inventory is audited
- **WHEN** the 125-command inventory and command-contract registry are validated
- **THEN** every command has exactly one valid output boundary
- **AND** no high-cardinality read remains fixed or unclassified
- **AND** no cursor command lacks a cursor input or continuation output.

### Requirement: Cursor pages SHALL bind scope and criteria
Cursor-paged Host Bridge reads SHALL use opaque continuations bound to the canonical
command scope, normalized filters, stable ordering, and last returned row key.

#### Scenario: Caller continues with matching criteria
- **WHEN** a caller supplies `nextCursor` with the same command and filters
- **THEN** the next page contains no repeated or skipped row from the stable snapshot
- **AND** the response reports the domain array, `nextCursor`, `hasMore`, `returned`,
  `total`, and the effective `limit`.

#### Scenario: Caller changes criteria or supplies an invalid cursor
- **WHEN** a cursor is malformed, expired, scoped to another command, or paired with
  different filters
- **THEN** the command returns structured `invalid_host_bridge_cursor`
- **AND** it does not silently restart at page one.

### Requirement: Ordinary rich-object pages SHALL use bounded defaults
Unless a command declares a stricter limit, cursor and limit-bounded rich DTO reads
SHALL default to at most 25 entries and accept at most 100 entries.

#### Scenario: Readiness audit omits a limit
- **WHEN** `library readiness audit` is invoked without an explicit limit
- **THEN** it scans and returns at most 25 items
- **AND** the caller can traverse the remaining library through opaque cursors.

### Requirement: Long text and complete artifacts SHALL have bounded delivery
Readable long text SHALL use `offset` and `maxChars` with continuation metadata.
Complete exports and heavy diagnostic/artifact payloads SHALL use Host Bridge file
descriptors without local paths.

#### Scenario: Caller reconstructs text
- **WHEN** a caller follows `nextOffset` until `hasMore` is false
- **THEN** concatenating the chunks reproduces the original text exactly
- **AND** an offset beyond the end returns a stable empty terminal chunk.

#### Scenario: Caller downloads a complete payload
- **WHEN** a file-output command succeeds
- **THEN** stdout contains a `fileId` descriptor, byte size, and SHA-256 when available
- **AND** downloading that handle yields the complete source bytes
- **AND** stdout exposes no host-local path.
