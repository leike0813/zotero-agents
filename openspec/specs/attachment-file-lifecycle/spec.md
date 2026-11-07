# attachment-file-lifecycle Specification

## Purpose
Define the ownership of attachment input files and permanent Zotero content, including portable filenames, complete companion sets, and native file synchronization.

## Requirements

### Requirement: Permanent file attachments SHALL own stored content
New file attachments SHALL import complete main and companion content into Zotero storage before success. Temporary inputs SHALL not become permanent linked attachments. Existing linked attachments SHALL remain readable without automatic conversion.

#### Scenario: Upload source is removed after import
- **WHEN** a successfully imported attachment's upload or staging source is removed
- **THEN** the stored main file and companions remain readable

### Requirement: Physical attachment names SHALL be portable
Physical filenames SHALL be safe on Windows and POSIX while preserving human-readable titles. Main filenames SHALL replace prohibited characters, avoid reserved names and trailing dots/spaces, and preserve extensions when shortened. Companion destinations SHALL be validated without silently renaming referenced paths.

#### Scenario: Title includes a colon
- **WHEN** a caller uploads a file named `AiFed: adaptive.pdf`
- **THEN** its physical name is portable and its display title retains the colon

#### Scenario: Companion path cannot be stored safely
- **WHEN** a companion has traversal, a symlink source, a conflicting destination, or an unsafe path component
- **THEN** preparation fails before attachment creation or replacement

#### Scenario: A generated filename fits individually but not below its destination
- **WHEN** the staging directory leaves less room than the normal main-filename cap
- **THEN** the generated physical main name SHALL fit the remaining complete-path budget while preserving its extension
- **AND** its display title SHALL remain unchanged
- **AND** companion paths SHALL be validated without renaming referenced members.

### Requirement: Native attachment destinations SHALL be checked before mutation
Stored imports SHALL preflight the eight-character-key storage directory, main and companion paths, and native fulltext atomic-cache paths before attachment creation. Stored replacements SHALL validate their new and backup paths before moving old content. Insufficient budget SHALL fail without changing Windows path behavior or moving the user's storage root.

#### Scenario: Native storage has no space for a required auxiliary path
- **WHEN** the main filename fits but a native fulltext cache or its temporary sibling does not
- **THEN** import SHALL fail before dispatching attachment creation.

### Requirement: Workflow staging failure SHALL preserve previous adjacent output
Workflow output staging SHALL use exclusively owned bounded internal names. Rollback SHALL undo confirmed owned effects only; uncertain effects SHALL retain recovery evidence.

#### Scenario: MinerU cannot write staged Markdown
- **WHEN** staged output preparation fails before promotion
- **THEN** previous adjacent Markdown and images SHALL remain unchanged
- **AND** failed staging reservation SHALL NOT authorize cleanup of another owner.

### Requirement: Changed complete attachment sets SHALL enter native sync
A changed stored main file or companion set SHALL enter Zotero's normal upload flow while preserving remote conflict detection. Identical complete content SHALL not be rewritten. Replacement rollback SHALL restore file content and synchronization state.

#### Scenario: Only an image changes
- **WHEN** replacement changes an image but leaves the Markdown bytes unchanged
- **THEN** the attachment is queued for upload and native packing includes the updated image

#### Scenario: Replacement fails before confirmed completion
- **WHEN** a stored replacement can be confirmed failed
- **THEN** the prior complete file set and synchronization state are restored