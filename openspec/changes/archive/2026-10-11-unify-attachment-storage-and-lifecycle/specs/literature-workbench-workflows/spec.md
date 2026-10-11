## ADDED Requirements

### Requirement: Derived attachment lookup SHALL be unambiguous
Translation and deep-reading output lookup SHALL enumerate the parent's attachment pages, prefer exact target paths, then accept only one stored-filename match. Windows paths SHALL compare case-insensitively and POSIX paths case-sensitively. Missing-file candidates SHALL not be silently treated as absent. Ambiguous candidates or indistinguishable source names SHALL fail before writes.

#### Scenario: A stored filename match precedes an exact linked path
- **WHEN** enumeration returns a stored filename match before an exact target-path match
- **THEN** the exact path wins regardless of enumeration order

#### Scenario: Multiple stored results match
- **WHEN** no exact path matches and several stored attachments have the target filename
- **THEN** the workflow reports conflict before overwriting any output

### Requirement: Adjacent workbench results SHALL replace complete output sets
Translation and deep-reading SHALL retain adjacent output naming and overwrite on rerun without manual-edit protection. Complete output SHALL be staged before promotion and attachment mutation. Confirmed failure SHALL restore old adjacent files; uncertainty SHALL preserve recovery material. New attachments SHALL be stored and existing linked outputs SHALL retain their links.

#### Scenario: Alignment write or attachment update fails
- **WHEN** a translation cannot commit its Markdown and alignment output set
- **THEN** it does not report success with a mixed old/new result

### Requirement: Translation alignment SHALL be readable after file sync
Deep-reading SHALL prefer valid alignment beside the matched translation attachment and fall back to the established source-adjacent alignment location. Resolution SHALL retain the existing language and alignment-format validation.

#### Scenario: Translation was synced to another machine
- **WHEN** the translated attachment and its alignment are available but no source-adjacent alignment exists
- **THEN** deep-reading reads alignment from the translated attachment directory
