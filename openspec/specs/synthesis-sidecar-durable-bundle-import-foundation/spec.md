## ADDED Requirements

### Requirement: Staged canonical import owns the writer permit

The canonical owner SHALL reject ordinary promotion while a durable import
batch is staged and SHALL allow only the exact staged batch to promote until
that batch is committed, discarded, or recovered.

#### Scenario: Ordinary Topic promotion overlaps repository commit

- **WHEN** a canonical import batch is staged and an ordinary Topic writer
  attempts promotion before the repository commit resolves
- **THEN** ordinary promotion SHALL return `canonical_store_busy`, leave current
  unchanged, and preserve the staged batch for forward commit

#### Scenario: Matching batch commits forward

- **WHEN** the repository commit receipt matches the staged batch
- **THEN** canonical promotion SHALL apply the exact staged targets and release
  ordinary writer admission only after durable batch cleanup

#### Scenario: Restart reconciles staged admission

- **WHEN** startup recovery finds a staged batch with either a matching
  repository receipt or no repository receipt
- **THEN** recovery SHALL respectively complete the exact batch or discard it
  before ordinary canonical mutation admission resumes
