## MODIFIED Requirements

### Requirement: Literature ingest maps to canonical mutation operation

The CLI SHALL execute literature ingest through mutation.execute with operation literature.ingest, one typed paper, one explicit collection, and a caller operation id. Creating typed metadata and establishing the explicit collection membership are required core effects. The CLI SHALL not wrap batch input or accept paper.ingest, public prepared tokens, or expectedRevision fields.

#### Scenario: Ingest command is called
- **WHEN** zotero-bridge literature ingest is invoked with one input payload
- **THEN** the CLI SHALL submit the parsed single paper and explicit collection inside a canonical mutation execute payload
- **AND** the mutation operation SHALL be literature.ingest.

#### Scenario: Explicit collection is absent
- **WHEN** the input omits collection identity
- **THEN** the CLI SHALL fail validation before sending a mutation request.

## ADDED Requirements

### Requirement: Literature ingest CLI SHALL preserve optional enrichment outcomes

The CLI SHALL preserve the separation between required metadata-plus-collection effects and optional PDF or landing-URL enrichment. If required collection membership fails after item creation, output SHALL report the rolled-back result: only objects created by that invocation may be removed, while reused items and pre-existing memberships remain intact. It SHALL print typed enrichment attempt outcomes, including failed, canceled, unknown, and repair_required, without relabeling a completed required core as a partial receipt or suppressing residual evidence.

#### Scenario: Optional enrichment is unavailable
- **WHEN** required metadata and collection membership commit but optional enrichment cannot complete
- **THEN** CLI output SHALL preserve the required receipt and the distinct enrichment attempt outcome.
