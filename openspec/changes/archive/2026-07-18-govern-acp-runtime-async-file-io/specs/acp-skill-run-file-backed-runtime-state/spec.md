## ADDED Requirements

### Requirement: Transcript index recovery SHALL be byte-bounded and linear

ACP transcript complete and stale-tail index recovery SHALL scan the canonical
JSONL in bounded byte chunks and apply each valid event once to a shared ordered
builder. Recovery SHALL NOT materialize the complete transcript text or clone
the complete derived index once per event.

#### Scenario: Missing or invalid index is rebuilt
- **WHEN** a current transcript index is missing, malformed, old-version, or longer than its JSONL source
- **THEN** recovery SHALL scan source bytes incrementally
- **AND** the resulting items, order, previews, event sequence, byte offsets, and source length SHALL match the canonical JSONL.

#### Scenario: Valid index is behind the JSONL source
- **WHEN** a current index source length is shorter than the transcript JSONL
- **THEN** only the unindexed byte tail SHALL be scanned and applied through the same builder
- **AND** invalid lines SHALL advance the scanned source length without becoming transcript events.

#### Scenario: UTF-8 content crosses a scan boundary
- **WHEN** a JSONL line or multi-byte character crosses a physical read boundary or the final line has no newline
- **THEN** recovery SHALL preserve exact UTF-8 byte offsets and parse the complete logical line once.
