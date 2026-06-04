## ADDED Requirements

### Requirement: Synthesis resolver CLI input uses canonical wrapper
Host Bridge CLI guidance SHALL document Synthesis command input shapes precisely enough for agents to call semantic subcommands without using raw capability names.

#### Scenario: Resolver CLI input uses canonical wrapper
- **WHEN** an agent calls `zotero-bridge synthesis resolve-resolver`
- **THEN** the input SHALL be documented as a JSON object containing a top-level `resolver` field
- **AND** guidance SHALL reject `topic_resolver`, root-level `queries`, and the resolver object by itself as CLI input shapes.
