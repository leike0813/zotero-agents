## ADDED Requirements

### Requirement: Published CLI surfaces SHALL describe every public command and option
Each published CLI package SHALL expose a machine-readable descriptor whose command inventory exactly matches its parser and whose options have non-empty operational meaning.

#### Scenario: Surface is generated
- **WHEN** a CLI or helper surface is generated
- **THEN** every public leaf command, local option, and global option has exactly one descriptor entry
- **AND** missing, duplicate, or orphan semantic bindings fail generation.

### Requirement: Workflow catalog entries SHALL explain purpose
Every visible workflow SHALL declare a non-empty purpose description that is returned by runtime list/describe and indexed by surface search.

#### Scenario: Agent searches for a workflow task
- **WHEN** an agent searches the offline surface by task intent
- **THEN** matching workflows include their stable id, localized label, purpose, execution modes, and result evidence.

### Requirement: Helper surfaces SHALL remain package-local
Library Agent and Librarian helpers SHALL publish separate helper descriptors and SHALL NOT imply that commands from the other package are installed.

#### Scenario: Library Agent helper surface is inspected
- **WHEN** an agent inspects the Library Agent helper descriptor
- **THEN** resident-only Librarian commands are absent
- **AND** every included helper describes its arguments, result, errors, and effects.
