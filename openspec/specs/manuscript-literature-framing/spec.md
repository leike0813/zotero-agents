# manuscript-literature-framing Specification

## Purpose
TBD - created by archiving change add-manuscript-literature-framing-workflow. Update Purpose after archive.
## Requirements
### Requirement: Interactive manuscript literature framing workflow
The system SHALL provide a builtin ACP interactive workflow named `manuscript-literature-framing`.

#### Scenario: Workflow is discoverable
- **WHEN** builtin workflows are loaded
- **THEN** `manuscript-literature-framing` is present
- **AND** it uses task title `Frame manuscript literature: {paperTitle}`.

### Requirement: MCP dependency declaration
The workflow SHALL declare all Synthesis and direct Zotero MCP tools required to recommend topics, inspect evidence, resolve citekeys, and draft literature framing.

#### Scenario: Required tools are smoked before execution
- **WHEN** the workflow is executed through ACP
- **THEN** the workflow MCP contract includes synthesis topic/review/graph tools and direct Zotero library/note/attachment tools.

### Requirement: Confirmed writing process
The skill SHALL collect manuscript context, confirm topics, and confirm a writing plan before rendering LaTeX.

#### Scenario: Missing topic evidence pauses the workflow
- **WHEN** no adequate Topic Synthesis topic is available
- **THEN** the workflow pauses or cancels with a recommendation to create topic synthesis first.

### Requirement: Run-local LaTeX artifacts
The skill SHALL write run-local Introduction and Related Work LaTeX artifacts and SHALL NOT write Zotero notes or Synthesis canonical state.

#### Scenario: Missing citekey is not fabricated
- **WHEN** evidence lacks a Zotero citekey
- **THEN** generated LaTeX uses a TODO citation comment and diagnostics record the missing citekey.

