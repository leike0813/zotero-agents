## MODIFIED Requirements

### Requirement: Synthesis Cross-Task Paths Are Absolute

Generated split topic synthesis skills SHALL emit absolute paths for files that
are consumed by downstream tasks.

#### Scenario: Handoff output exposes absolute state and manifest paths

- **WHEN** a generated synthesis handoff skill completes
- **THEN** `db_path` SHALL be an absolute path
- **AND** `handoff_manifest_path` SHALL be an absolute path
- **AND** the output schema SHALL mark `handoff_manifest_path` with
  `x-type: "artifact-manifest"`.

#### Scenario: Generated manifests expose absolute artifact paths

- **WHEN** a synthesis runtime script writes a handoff manifest or artifact
  manifest
- **THEN** every file path intended for downstream task consumption SHALL be an
  absolute path under the run root
- **AND** missing files or paths outside the run root SHALL fail the script.

#### Scenario: Skill instructions avoid cwd-sensitive command examples

- **WHEN** a generated synthesis `SKILL.md` describes gate execution
- **THEN** it SHALL instruct the agent to use gate-returned absolute commands
  and paths
- **AND** it SHALL NOT present `--db "runtime/topic-synthesis.sqlite"` as a
  runnable command example.
