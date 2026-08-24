## ADDED Requirements

### Requirement: SkillRunner upload path projection SHALL come from one provider mapping module

The declarative request compiler and the sequence runtime SHALL derive
uploads-root relative input paths through one SkillRunner upload mapping module
so single-job and sequence requests share the same wire path shape.

#### Scenario: Single-job upload declarations use the shared projection

- **WHEN** a `skillrunner.job.v1` request declares `request.input.upload.files`
- **THEN** `input.<key>` SHALL be built by the shared SkillRunner upload mapping module as `inputs/<sanitized-key>/<basename>`
- **AND** `upload_files[].path` SHALL remain the local file path.

#### Scenario: Sequence frontend-local uploads use the shared projection

- **WHEN** a sequence step maps a frontend-local file into SkillRunner input
- **THEN** the upload-relative `input.<key>` SHALL be built by the same shared mapping module
- **AND** the matching `upload_files` entry SHALL reference the local file path.

#### Scenario: Projection fallback and sanitization stay deterministic

- **WHEN** a file key is empty or contains non-segment characters
- **THEN** the mapping module SHALL sanitize the key into a safe path segment with the existing `file` fallback
- **AND** a local path with no basename SHALL project to `upload.bin`.
