## Purpose

Host Bridge CLI Synthesis commands distinguish cache views from current Zotero Library reads.
## Requirements
### Requirement: Index and registry CLI subcommands are cache views or removed
Host Bridge CLI guidance SHALL not present Synthesis index or Reference Sidecar Index subcommands as synchronized Zotero Library views.

#### Scenario: CLI help lists Synthesis commands
- **WHEN** `zotero-bridge synthesis --help` lists cache-backed commands
- **THEN** commands that expose reference or graph sidecar state SHALL be named or documented as cache views
- **AND** agent guidance SHALL prefer Zotero item/artifact read commands for current library facts.

### Requirement: CLI does not expose queue control for Synthesis
The CLI SHALL NOT expose Synthesis queue drain, pause, resume, retry, WorkItem, or dirty-event controls as normal or debug Synthesis commands.

#### Scenario: Debug commands are listed
- **WHEN** Host Bridge CLI debug commands are listed
- **THEN** Synthesis debug commands SHALL include cache/operation diagnostics only
- **AND** queue-control commands SHALL be absent.

### Requirement: Synthesis resolver CLI input uses canonical wrapper
Host Bridge CLI guidance SHALL document Synthesis command input shapes precisely enough for agents to call semantic subcommands without using raw capability names.

#### Scenario: Resolver CLI input uses canonical wrapper
- **WHEN** an agent calls `zotero-bridge synthesis resolve-resolver`
- **THEN** the input SHALL be documented as a JSON object containing a top-level `resolver` field
- **AND** guidance SHALL reject `topic_resolver`, root-level `queries`, and the resolver object by itself as CLI input shapes.

