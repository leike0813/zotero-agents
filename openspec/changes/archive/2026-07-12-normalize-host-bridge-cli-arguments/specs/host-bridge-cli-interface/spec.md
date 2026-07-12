## ADDED Requirements

### Requirement: CLI SHALL distinguish semantic read queries from write payloads
The Host Bridge CLI SHALL use `--query <JSON_OR_FILE>` as the canonical
argument for semantic read-only commands that accept a generic JSON object.
It SHALL keep `--input` as a hidden compatibility alias for those reads. Raw
`call`, mutation commands, workflow submission requests, and other non-read
payload commands SHALL retain `--input` as their canonical argument.

#### Scenario: Read command receives a canonical JSON query
- **WHEN** an agent invokes a semantic read command with `--query` and inline
  JSON, stdin, `@file`, or a bare file path
- **THEN** the CLI SHALL decode the value with the existing JSON-or-file rules
- **AND** it SHALL send the existing capability payload without protocol change.

#### Scenario: Read command uses the compatibility alias
- **WHEN** a caller invokes a semantic read command with `--input`
- **THEN** the CLI SHALL accept it as the same query value
- **AND** it SHALL omit the alias from primary help output.

#### Scenario: Non-read command receives JSON
- **WHEN** a caller invokes raw `call`, a mutation, workflow submission, or
  another non-read payload command
- **THEN** the canonical argument SHALL remain `--input`
- **AND** `--query` SHALL NOT be offered as its generic payload synonym.

### Requirement: CLI SHALL keep item search and item inventory reads distinct
The CLI SHALL require `library item search --query` to be a JSON object whose
supported fields map to the existing bounded `library.search_items` payload.
It SHALL continue to expose `library items list --query` for paged inventory
reads and SHALL not merge the two commands.

#### Scenario: Search maps a JSON query object
- **WHEN** a caller runs `library item search --query '{"text":"...","limit":10,"libraryId":1}'`
- **THEN** the CLI SHALL map it to the existing `library.search_items` payload
  with query text, limit, and library id
- **AND** it SHALL preserve the command's finite-candidate semantics.

#### Scenario: Search receives a prior bare-text query
- **WHEN** a caller supplies a non-JSON bare string to `library item search --query`
- **THEN** the CLI SHALL reject the argument before dispatching a request.

#### Scenario: Inventory list uses a paged query
- **WHEN** a caller runs `library items list --query` with query, cursor, or
  collection filters
- **THEN** the CLI SHALL send the existing `library.list_items` payload
- **AND** the result SHALL remain a paged inventory read.

### Requirement: CLI SHALL use domain-specific workflow and product arguments
The CLI SHALL use `--selection` for workflow submit, validate, and agent-run
selection JSON; `--workflow` for workflow requirements; and `--output-dir` for
product download destinations. It SHALL retain hidden compatibility forms as
specified and reject conflicting duplicate forms.

#### Scenario: Workflow selection uses its canonical flag
- **WHEN** a caller invokes workflow submit, validate, or agent-run with
  `--selection <JSON_OR_FILE>`
- **THEN** the CLI SHALL map the decoded selection to the existing request
  payload
- **AND** it SHALL reject `--selection` with `--none`.

#### Scenario: Workflow requirements uses the named workflow flag
- **WHEN** a caller invokes `workflow requirements --workflow <id>`
- **THEN** the CLI SHALL request requirements for that workflow id
- **AND** it SHALL reject supplying both the named and hidden positional forms.

#### Scenario: Product download distinguishes directories from file paths
- **WHEN** a caller invokes `product download <id> --output-dir <dir>`
- **THEN** the CLI SHALL use the directory for product export
- **AND** `file download --output <path>` SHALL remain the file-path command.

### Requirement: Generated agent guidance SHALL use canonical argument intent
Generated Host Bridge CLI guidance SHALL demonstrate inline JSON as the default
JSON-or-file form. The rendered reference, wrapper skill, and Zotero Librarian
guidance SHALL explain intentional stdin and file use and restrict raw `call`
to raw-only capabilities or diagnostics.

#### Scenario: Agent follows semantic command guidance
- **WHEN** an agent consults generated Host Bridge CLI guidance
- **THEN** it SHALL use semantic commands with `--query` for reads and
  `--input` for requests or mutations
- **AND** it SHALL not be directed to bypass semantic argument validation with
  raw `call`.
