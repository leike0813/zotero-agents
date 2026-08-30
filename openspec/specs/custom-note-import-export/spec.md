# custom-note-import-export Specification

## Purpose
TBD - created by archiving change custom-note-import-export. Update Purpose after archive.
## Requirements
### Requirement: export-notes MUST support custom note export
Custom and conversation markdown notes SHALL support v2 embedded payload storage while retaining legacy read compatibility.

#### Scenario: markdown note payload is v2-backed
- **WHEN** a package-managed custom or conversation markdown note is created or migrated
- **THEN** its markdown payload SHALL be stored as a v2 anchored embedded payload attachment
- **AND** export SHALL read that payload without requiring hidden HTML payload blocks.

### Requirement: import-notes MUST support custom note import via UI button

import-notes workflow MUST provide a dedicated UI area for importing custom markdown files.

#### Scenario: user clicks "Import Custom Note(s)" button

- **WHEN** user clicks the button in the import dialog
- **THEN** file picker MUST open with `.md` filter
- **AND** user MUST be able to select multiple files (via repeated pickFile calls with confirm prompt)
- **THEN** selected files MUST appear in a scrollable list below the button

#### Scenario: user removes a selected file from the list

- **WHEN** user clicks "Remove" on a list item
- **THEN** that file MUST be removed from the selection
- **AND** the list MUST re-render with updated indices

#### Scenario: no custom notes selected

- **WHEN** the custom notes list is empty
- **THEN** a message "No custom notes selected" MUST be displayed
- **AND** the message MUST have gray color (#888)

### Requirement: imported custom notes MUST follow consistent structure

Custom notes imported via import-notes MUST have a predictable structure for future export compatibility.

#### Scenario: importing a markdown file

- **WHEN** a markdown file is imported
- **THEN** a new note MUST be created under the selected parent item
- **AND** note title MUST be the filename without `.md` extension
- **AND** note content MUST include:
  - `<div data-zs-note-kind="custom">` wrapper
  - `<h1>` header with the note title
  - `<div data-zs-view="custom-html">` with rendered HTML
- **AND** the note MUST have a v2 embedded `custom-markdown` payload attachment with a matching note HTML payload anchor
- **AND** the note MUST NOT create a new hidden `data-zs-payload` block

#### Scenario: custom note round-trip

- **WHEN** a custom note is imported and then exported
- **THEN** the exported markdown MUST match the original imported content
- **AND** the export MUST produce a `.md` file (not `.html`)

### Requirement: export-notes filterInputs MUST allow all notes

export-notes `filterInputs` hook MUST not filter out non-special notes.

#### Scenario: parent item has mixed notes

- **WHEN** a parent item has both literature-digest notes and ordinary notes
- **THEN** ALL notes MUST pass through `filterInputs`
- **AND** each note MUST be assigned a `kind` value (existing kinds or `"custom"`)

#### Scenario: direct selection of ordinary notes

- **WHEN** user directly selects ordinary notes (not literature-digest notes)
- **THEN** these notes MUST be included in `exportCandidates`
- **AND** each MUST have `kind: "custom"`

### Requirement: Note mutations SHALL be confirmed and revision-aware

Note creation, content update, removal, and payload upsert SHALL validate portable refs and expected revisions, execute through canonical mutation admission, and return current normalized note or payload state with a confirmed receipt or structured attempt.

#### Scenario: Note content revision conflicts

- **WHEN** a note content update supplies an expected revision that no longer matches
- **THEN** the mutation returns a conflict before changing content or embedded resources

### Requirement: Embedded image writes SHALL preserve one content boundary

Prepared note images and note content changes SHALL validate all image inputs and managed destinations before the note mutation boundary. If a later resource write fails, the operation SHALL compensate or return `unknown`/`repair_required` with the original failure retained as primary.

#### Scenario: Image copy fails after note creation

- **WHEN** an accepted note mutation creates state but an embedded image cannot be finalized
- **THEN** cleanup is attempted and the returned attempt reports any remaining note or resource state without claiming committed success

### Requirement: Note payload diagnostics SHALL be closed

Note payload listing and reads SHALL expose only the declared payload provenance, health, and value variants. Native file errors and open warning bags MUST NOT enter the public result.

#### Scenario: Payload storage is missing

- **WHEN** a declared note payload has no readable backing value
- **THEN** its public health state uses the closed diagnostic union and does not expose a local path or native exception

