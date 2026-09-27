## MODIFIED Requirements

### Requirement: Every canonical command SHALL declare one output boundary
The command-contract registry SHALL classify every canonical leaf command as `fixed`,
`cursor`, `offset`, `limit`, `file`, or `raw`. The classification SHALL be the unique
source consumed by Agent Surface generation and command-card rendering.

#### Scenario: Full command inventory is audited
- **WHEN** the canonical command inventory and command-contract registry are validated
- **THEN** every command has exactly one valid output boundary
- **AND** no high-cardinality read remains fixed or unclassified
- **AND** no cursor command lacks a cursor input or continuation output.

### Requirement: Cursor pages SHALL bind scope and criteria
Cursor-paged Host Bridge reads SHALL use opaque continuations bound to the canonical
command scope, normalized filters, stable ordering, and last returned row key.

#### Scenario: Caller continues with matching criteria
- **WHEN** a caller supplies `nextCursor` with the same command and filters
- **THEN** the next page contains no repeated or skipped row from an unchanged source
- **AND** the response reports the domain array, `nextCursor`, `hasMore`, `returned`,
  `total`, and the effective `limit`; payload scans SHALL use total:null and a scanned count when an exact total would require reading all source files.

#### Scenario: Caller changes criteria or supplies an invalid cursor
- **WHEN** a cursor is malformed, expired when its domain has a lifecycle, scoped to another command, or paired with
  different filters
- **THEN** the command preserves its structured domain cursor failure
- **AND** it does not silently restart at page one.

### Requirement: Long text and complete artifacts SHALL have bounded delivery
Readable long text SHALL use its declared domain boundary. Canonical note detail
and note payload reads SHALL return the complete value within their hard content
bounds, failing rather than truncating an oversized value. Other text-window
commands SHALL preserve `offset` and `maxChars` continuation. Complete exports and
heavy diagnostic/artifact payloads SHALL use Host Bridge file descriptors without
local paths.

#### Scenario: Caller reconstructs text
- **WHEN** a caller follows `nextOffset` from a text-window command until `hasMore` is false
- **THEN** concatenating the chunks reproduces the original text exactly
- **AND** an offset beyond the end returns a stable empty terminal chunk.

#### Scenario: Caller downloads a complete payload
- **WHEN** a file-output command succeeds
- **THEN** stdout contains a `fileId` descriptor, byte size, and SHA-256 when available
- **AND** downloading that handle yields the complete source bytes
- **AND** stdout exposes no host-local path.

## ADDED Requirements

### Requirement: Payload scan continuation SHALL not depend on nonempty output
A payload page SHALL distinguish source scan progress from returned matches. Empty output with hasMore:true SHALL include a progressing nextCursor. Consumers SHALL use continuation, not array length or an unavailable total, to determine completion.

#### Scenario: Empty candidate page is followed by a matching page
- **WHEN** the first bounded candidate page has no payload and a later page has one
- **THEN** the consumer continues and includes the later payload without claiming premature absence.
