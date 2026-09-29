# Spec Delta

## MODIFIED Requirements

### Requirement: Owner manages materialized files and generated output

The owner SHALL atomically record a per-owner managed-file manifest. `materializeOrReuse` SHALL reuse a managed copy for the same canonical source revision, size, and copy-time digest even if the agent edits that copy; a changed source SHALL create a new generation and preserve the old one. Missing recorded files SHALL invalidate reuse. A batch of source files SHALL commit all new copies in one manifest update, leave pre-existing copies intact on failure, and remove newly created copies when the batch cannot commit. Generated text SHALL be written to a private bounded staging file and promoted atomically, or discarded without publishing an artifact. Source and staging paths SHALL NOT enter durable manifest records or model-visible output. A managed file SHALL be limited to 256 MiB, newly committed files to 512 MiB per call, and retained files to 2 GiB per owner. Failed cleanup SHALL be reported as pending rather than as a clean rollback.

#### Scenario: Agent edits its managed copy
- **WHEN** the source fingerprint remains unchanged but the managed copy differs
- **THEN** later materialization reuses the recorded managed path

#### Scenario: Source changes
- **WHEN** source revision, size, or digest changes
- **THEN** a new managed path is returned while the previous generation remains

#### Scenario: Attachment page copy fails
- **WHEN** one source in a batch cannot be copied or verified
- **THEN** no new batch entry is published, newly copied files are removed, and previously managed files remain

#### Scenario: Generated text is interrupted
- **WHEN** a staged text output is discarded before commit
- **THEN** it has no managed artifact or manifest entry

#### Scenario: Generated text completes
- **WHEN** a bounded staged text output commits
- **THEN** its path, size, and digest identify one owner-managed file and the stage is removed
