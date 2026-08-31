## ADDED Requirements

### Requirement: CLI SHALL expose direct paper and Topic bundle commands

The CLI SHALL expose `library items export-research-bundle` with canonical item-ref array input and `synthesis topic export-research-bundle` with one or more Topic ids. Each leaf SHALL declare exact argv bindings, strict input and result schemas, file output boundary, read-only Zotero effect, local filesystem effect, no-approval status, typed delivery, completion evidence, intent aliases, and recovery commands in the executable command contract.

#### Scenario: Paper bundle schema is requested
- **WHEN** an agent invokes `zotero-bridge library items export-research-bundle --schema`
- **THEN** schema mode exposes the item-ref array, connection-dependent output directory, bounds, and discriminated delivery result without loading a profile or contacting Zotero.

#### Scenario: Topic command uses repeated ids
- **WHEN** an agent invokes `zotero-bridge synthesis topic export-research-bundle --topic-id <id>` one or more times
- **THEN** the CLI preserves first-occurrence order, rejects an empty selection, and sends the normalized Topic id array to the canonical capability.

#### Scenario: Connection mode and output directory disagree
- **WHEN** local mode omits `--output-dir` or remote mode supplies it
- **THEN** the CLI fails before capability execution with a structured usage error.
