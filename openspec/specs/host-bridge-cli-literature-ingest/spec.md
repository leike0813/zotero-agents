# host-bridge-cli-literature-ingest Specification

## Purpose
TBD - created by archiving change promote-literature-ingest-cli-subcommand. Update Purpose after archive.

## Requirements

### Requirement: Literature ingest has a first-class CLI command

The `zotero-bridge` CLI SHALL expose permission-gated literature ingest through
a top-level `literature ingest` command.

#### Scenario: Agent discovers literature commands

- **WHEN** a user or agent runs top-level CLI help
- **THEN** the help SHALL list `literature`.

#### Scenario: Agent discovers ingest command

- **WHEN** a user or agent runs `zotero-bridge literature --help`
- **THEN** the help SHALL list `ingest`.

### Requirement: Literature ingest preserves JSON input semantics

The `literature ingest` command SHALL accept `--input <JSON_OR_FILE>` using the
same parsing rules as raw `call --input`.

#### Scenario: Input payload is provided

- **WHEN** `zotero-bridge literature ingest --input <payload>` is invoked
- **THEN** the CLI SHALL parse inline JSON, `@file`, an existing file path, or
  `-` using the existing JSON input parser.

### Requirement: Literature ingest maps to canonical mutation operation

The CLI SHALL execute literature ingest through mutation.execute with operation literature.ingest, one typed paper, one explicit collection, and a caller operation id. Creating typed metadata and establishing the explicit collection membership are required core effects. The CLI SHALL not wrap batch input or accept paper.ingest, public prepared tokens, or expectedRevision fields.

#### Scenario: Ingest command is called
- **WHEN** zotero-bridge literature ingest is invoked with one input payload
- **THEN** the CLI SHALL submit the parsed single paper and explicit collection inside a canonical mutation execute payload
- **AND** the mutation operation SHALL be literature.ingest.

#### Scenario: Explicit collection is absent
- **WHEN** the input omits collection identity
- **THEN** the CLI SHALL fail validation before sending a mutation request.

### Requirement: Literature ingest guidance avoids diagnostic raw calls

Agent-facing guidance SHALL recommend `zotero-bridge literature ingest` for
normal literature ingest work.

#### Scenario: Agent reads Host Bridge CLI instructions

- **WHEN** instructions describe how to ingest searched literature
- **THEN** they SHALL recommend `zotero-bridge literature ingest --input ...`
- **AND** they SHALL NOT recommend `call mutation.execute` as the normal path.

### Requirement: Literature ingest CLI supports missing-PDF landing URL attachment option

The literature ingest CLI payload SHALL preserve the optional
`paper.attachLandingUrlOnMissingPdf` field when wrapping input for
`mutation.execute`.

#### Scenario: Payload requests landing URL attachment

- **WHEN** the input payload contains `paper.attachLandingUrlOnMissingPdf: true`
- **THEN** the CLI SHALL forward that field unchanged to the Host Bridge
  `literature.ingest` mutation.

### Requirement: Literature ingest CLI SHALL preserve optional enrichment outcomes

The CLI SHALL preserve the separation between required metadata-plus-collection effects and optional PDF or landing-URL enrichment. If required collection membership fails after item creation, output SHALL report the rolled-back result: only objects created by that invocation may be removed, while reused items and pre-existing memberships remain intact. It SHALL print typed enrichment attempt outcomes, including failed, canceled, unknown, and repair_required, without relabeling a completed required core as a partial receipt or suppressing residual evidence.

#### Scenario: Optional enrichment is unavailable
- **WHEN** required metadata and collection membership commit but optional enrichment cannot complete
- **THEN** CLI output SHALL preserve the required receipt and the distinct enrichment attempt outcome.
