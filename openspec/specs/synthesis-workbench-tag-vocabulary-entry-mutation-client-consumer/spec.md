# synthesis-workbench-tag-vocabulary-entry-mutation-client-consumer Specification

## Purpose
Defines the Synthesis Workbench client consumer contract for tag vocabulary entry mutation operations, specifying how Workbench reads and reacts to client-side state changes.

## Requirements

### Requirement: Tag Vocabulary entry mutation contracts are strict and environment-neutral

The system SHALL expose update and delete commands through `SynthesisClient.tags` using strict JSON-safe request DTOs and opaque `SynthesisTagCommandResult` responses without Workbench or persistence types.

#### Scenario: Update request is accepted
- **WHEN** a caller supplies string `originalTag`, `tag`, `facet`, and `note` values whose identifier fields are non-empty after trimming
- **THEN** the adapter rebuilds a canonical request with trimmed identifiers and note, discards unknown JSON-safe fields, and invokes the update port

#### Scenario: Empty note clears the note
- **WHEN** a caller supplies a note containing only whitespace
- **THEN** the update command passes an empty note as an explicit request to clear the stored note

#### Scenario: Delete request is accepted
- **WHEN** a caller supplies a string `originalTag` that is non-empty after trimming
- **THEN** the adapter rebuilds a canonical request with the trimmed tag, discards unknown JSON-safe fields, and invokes the delete port

#### Scenario: Request is invalid or the port fails
- **WHEN** a request is invalid, a port is missing, a known client error or storage-busy failure occurs, an ordinary exception is thrown, or a legacy result is invalid
- **THEN** the adapter validates before port resolution and preserves the established `invalid_request`, `unavailable`, known client error, `storage_busy`, `internal`, and invalid-result classifications

### Requirement: Entry updates are atomic and preserve canonical metadata

The Tag Vocabulary domain SHALL read, mutate, validate, maintain references, and persist an update within one repository transaction.

#### Scenario: Same-tag update succeeds
- **WHEN** an existing entry is updated without changing its canonical tag
- **THEN** only its tag, facet, note, and update timestamp change while source, deprecated state, replacement, entry aliases and abbreviations, usage, last-synced, and creation time are preserved

#### Scenario: Rename succeeds
- **WHEN** an existing entry is renamed to an unoccupied exact and case-insensitive target, including a case-only rename
- **THEN** the entry keeps its hidden metadata and creation time, global aliases and other entries' replacements targeting the old tag are redirected to the new tag, and only affected timestamps change

#### Scenario: Rename conflicts
- **WHEN** another entry occupies the requested exact or case-insensitive target
- **THEN** the command returns one conflict diagnostic without writing or notifying autosync

#### Scenario: Original entry is missing
- **WHEN** the identified original entry does not exist
- **THEN** the command returns one not-found diagnostic without implicitly adding an entry, writing, or notifying autosync

#### Scenario: Candidate is invalid or persistence fails
- **WHEN** final protocol validation or any repository write fails
- **THEN** the complete mutation, including reference maintenance, rolls back

### Requirement: Entry deletion is atomic and removes dangling references

The Tag Vocabulary domain SHALL delete an entry and maintain dependent references within one repository transaction.

#### Scenario: Existing entry is deleted
- **WHEN** the identified entry exists
- **THEN** the command deletes it, removes global aliases targeting it, clears other entries' replacements targeting it, recomputes validation warnings, and preserves all untouched entry, alias, abbreviation, protocol, and timestamp data

#### Scenario: Entry is already absent
- **WHEN** the identified entry does not exist
- **THEN** deletion succeeds as a no-op without a write or autosync notification

#### Scenario: Delete persistence fails
- **WHEN** validation or any repository write fails during deletion
- **THEN** the complete deletion and reference cleanup roll back

### Requirement: Autosync observes committed mutations only

The public Tag service SHALL execute both commands through `runCanonicalWriteWithAutosync` and SHALL notify autosync exactly once only after an actual canonical mutation commits.

#### Scenario: Mutation commits
- **WHEN** an update or deletion writes and commits successfully
- **THEN** autosync is notified exactly once

#### Scenario: Mutation is diagnostic or no-op
- **WHEN** update returns a conflict or not-found diagnostic, or delete finds no entry
- **THEN** autosync is not notified

#### Scenario: Autosync notification fails
- **WHEN** notification fails after the canonical transaction commits
- **THEN** the committed mutation remains persisted and is not rolled back

### Requirement: Workbench routes entry mutations through the Tag client

The Workbench SHALL lazily resolve the default Synthesis client inside the existing single-flight closure and SHALL invoke update and delete through `client.tags` without directly loading or saving the vocabulary.

#### Scenario: Workbench updates an entry
- **WHEN** non-empty update input is submitted
- **THEN** the Workbench preserves identifier trimming, facet-prefix fallback, note string normalization, `{ originalTag }` single-flight arguments, immediate start, diagnostic failure feedback, and Tags-only invalidation

#### Scenario: Workbench deletes an entry
- **WHEN** the user confirms deletion of a non-empty tag
- **THEN** the Workbench preserves UI confirmation ownership, `{ originalTag }` single-flight arguments, immediate start, diagnostic failure feedback, and Tags-only invalidation

#### Scenario: Workbench input is empty
- **WHEN** the normalized original or target tag required by a command is empty
- **THEN** the Workbench skips the command without resolving the client

### Requirement: Adjacent Synthesis boundaries remain unchanged

The migration SHALL leave generic vocabulary save, staged/import/promotion/bootstrap/audit commands, Git/WebDAV Sync, Host Bridge, MCP, and persistence formats unchanged.

#### Scenario: Boundary inventory is checked
- **WHEN** repository boundary checks run after the migration
- **THEN** the Synthesis service exposes 128 public methods, the two new methods are classified as `tag_commands`, `knowledge.tags`, and `client_capability`, and four approved direct consumers remain

#### Scenario: Remaining Workbench direct-service slices are documented
- **WHEN** current-state Workbench documentation is read
- **THEN** Sync is identified as the final direct-service Workbench slice
