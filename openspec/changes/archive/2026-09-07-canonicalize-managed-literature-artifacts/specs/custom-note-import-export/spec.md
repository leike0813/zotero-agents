## MODIFIED Requirements

### Requirement: export-notes MUST support custom note export

Custom and conversation markdown notes SHALL be exported through the canonical managed-note semantic reader. Storage wrappers, v2 payload anchors, HTML representations, and attachment keys MAY remain implementation details, but export SHALL round-trip the `{ title, markdown }` semantic content and managed type without exposing an alternate wrapper contract.

#### Scenario: A managed markdown note is exported
- **WHEN** a custom or conversation managed note is selected for export
- **THEN** export SHALL read its canonical semantic payload
- **AND** the resulting markdown SHALL preserve title, markdown, and declared managed type
- **AND** export SHALL not require callers to decode a hidden HTML payload block.

#### Scenario: markdown note payload is v2-backed
- **WHEN** a package-managed custom or conversation markdown note is created or migrated
- **THEN** its internal payload MAY be stored as the canonical v2 anchored attachment representation
- **AND** export SHALL read the semantic payload through the managed-note owner without requiring hidden HTML payload blocks.

#### Scenario: A damaged managed note is exported
- **WHEN** the note marker and semantic payload disagree or required payload storage is unreadable
- **THEN** export SHALL return a closed diagnostic
- **AND** it SHALL not silently export the note as ordinary content.

### Requirement: imported custom notes MUST follow consistent structure

Custom notes imported via import-notes MUST be created through the canonical `managed_note.write_custom` semantic operation. The visible markdown and title SHALL be preserved, and any storage wrapper or payload attachment SHALL be produced only by the canonical owner.

#### Scenario: importing a markdown file
- **WHEN** a markdown file is imported
- **THEN** a new custom managed note SHALL be created under the selected parent item
- **AND** its semantic title SHALL be the filename without the `.md` extension
- **AND** its semantic markdown SHALL equal the imported content
- **AND** the import SHALL not create a second hidden payload representation.

#### Scenario: custom note round-trip
- **WHEN** a custom note is imported and then exported
- **THEN** the exported markdown SHALL preserve the imported semantic content
- **AND** it SHALL be produced through the same canonical reader/writer contract.

### Requirement: Note mutations SHALL be confirmed and revision-aware

Note creation, content update, removal, and managed payload upsert SHALL validate portable references and current revisions, execute through canonical mutation admission, and return current normalized state with one confirmed receipt or structured attempt. Public callers SHALL not compose list/create/update/duplicate-cleanup effects to emulate a managed operation.

#### Scenario: Note content revision conflicts
- **WHEN** a private prepared content update is based on a revision that no longer matches
- **THEN** the mutation SHALL return a conflict before changing content or embedded resources
- **AND** it SHALL not create a second managed note or Trash an existing candidate.
- **AND** the public content-update DTO SHALL not accept a caller-supplied revision as write authority.

#### Scenario: Managed payload upsert is replayed
- **WHEN** the same managed operation identity and semantic input are replayed
- **THEN** the canonical result SHALL be reused
- **AND** no duplicate note, payload, or derived image SHALL be created.

### Requirement: Note payload diagnostics SHALL be closed

Note payload listing and reads SHALL expose only the declared managed provenance, health, semantic value, and bounded byte facts. Native file errors, local paths, host objects, and open-ended warning bags SHALL not enter the public result.

#### Scenario: Payload storage is missing
- **WHEN** a declared managed note payload has no readable backing value
- **THEN** its public health state SHALL use the closed diagnostic union
- **AND** the result SHALL not expose a local path or native exception
- **AND** a caller SHALL not receive an ordinary-note fallback.

## ADDED Requirements

### Requirement: Ordinary note import and export SHALL remain distinct from managed artifacts

Ordinary note operations SHALL continue to support ordinary content while refusing reserved managed markers and refusing to mutate a note already classified as managed. The custom-note UI SHALL label ordinary and managed outcomes using their typed result, not by inspecting storage HTML.

#### Scenario: An ordinary note is directly selected for export
- **WHEN** a user exports an ordinary note
- **THEN** it SHALL use the ordinary note semantic path
- **AND** it SHALL not be assigned a managed artifact type or managed payload.

#### Scenario: An ordinary note attempts to become managed implicitly
- **WHEN** ordinary note import content contains a reserved managed marker or anchor without the matching managed operation
- **THEN** validation SHALL fail before mutation
- **AND** the UI SHALL report a typed conflict rather than silently converting the note.
