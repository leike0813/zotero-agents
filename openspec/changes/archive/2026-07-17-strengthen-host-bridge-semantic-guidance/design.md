## Context

The current Agent Surface is generated from a catalog assembled by regular-expression parsing and manual classification sets. That path misses block-form Rust match arms, cannot express real argument/result schemas, and infers approval or mutation behavior from command names. The generated human reference is consequently a flat command table with renderer-owned prose, while the three published surfaces repeat too much information and still underspecify important command-selection decisions.

The repository already treats semantic sources and generated targets separately and has a coordinated Release Set. This change must strengthen that architecture without bumping a component version or publishing before the accumulated changes are prepared on `main`.

## Goals / Non-Goals

**Goals:**

- Make the Rust CLI and backend registries authoritative for command and behavior facts.
- Guarantee complete, backend-aligned Agent Surface v2 coverage.
- Keep authored semantics DRY through operation groups while requiring a command-specific decision record for every public leaf command.
- Give each materialized surface a reference-backed operating manual that is sufficient without repository source access and remains within its ownership boundary.
- Keep deterministic CLI/backend facts in the machine contract and semantic judgment in schema-validated authored sources.
- Use source-blind agent journeys as a completion gate.
- Let feature branches render and validate version-neutral content independently of release identity.
- Accumulate changes against the latest completed release and publish only an explicitly prepared release set.

**Non-Goals:**

- Changing Host Bridge HTTP protocol v1 or endpoint payloads.
- Publishing a new Host Bridge release, updating versions, or replacing the current release set in this change.
- Moving bounded task policy into the CLI wrapper or resident policy into the general Library Agent.
- Exposing a new public command-inventory endpoint or adding runtime dependencies.

## Decisions

### Generate command inventory from Clap metadata

The Rust package will expose an internal inventory exporter based on Clap `CommandFactory`. The generator will invoke that exporter and combine it with a checked-in structured command binding rather than parse Rust source text. This makes aliases, required arguments, flags, enum values, and every leaf command observable through the same model used by the executable.

Alternative: improve the existing regular expressions. Rejected because Rust syntax is not a stable data format and the current omissions demonstrate that syntax variants remain invisible.

### Compose facts and semantics through one source model

`host-bridge-agent-surface.ts` will consume three layers: generated CLI inventory, structured backend bindings, and semantic operation guidance. Domain sources define reusable operation invariants plus a command-specific decision record for every leaf command. A validation pass will require every leaf command to resolve to one binding, one operation, and one command-specific record; family inheritance alone cannot satisfy coverage.

Backend bindings remain explicit where capability names do not correspond mechanically to commands. Agent Surface v2 separates CLI invocation from the decoded request, stable result data, effects, staged approval, typed handle transitions, and recovery actions whose required handles are validated. Generic catch-all schemas and recovery actions that name an unavailable handle are invalid for public commands.

### Render detailed command cards from facts plus authored decisions

The CLI wrapper is the canonical detailed command reference. Each card explains backend source and freshness, selection and near-misses, invocation and decoded payload, result evidence and paging/file delivery, approval/effects/handles, and failure recovery. Library Agent references add bounded task journeys and route exact command details to the bundled wrapper. The resident Profile receives the canonical command cards because it is distributed independently, then adds index, schedule, monitoring, maintenance, and agent-runner overlays.

Renderer code contains formatting only. Task policy, examples, and decision prose live in semantic sources; CLI/backend schemas and runtime facts remain generated. Every `SKILL.md` directly links its owned references and states when to read them.

### Evaluate materialized packages without source access

Evaluation fixtures describe tasks and required structured answer fields, not expected prose. Three independent agents receive only one materialized surface each and report chosen references, commands, inputs, evidence, approval/effects, and recovery. Wrong handle planes, approval bypass, direct database access, scheduled mutation, or invalid payloads are critical failures. Completion requires no critical failure, at least 90% required facts overall, at least 85% per surface, and a 25-point improvement over the recorded baseline.

### Keep machine coverage complete and human disclosure progressive

Agent Surface v2 contains raw and debug commands so exact description remains complete. `surface search` excludes raw/debug by default, accepts `--include-debug`, returns match reasons, and limits results to ten unless `--limit` is supplied. Human references are grouped by domain and loaded on demand; first-level Skill files contain only selection rules and control invariants.

### Make semantic content release-neutral

Generated semantic references will not embed a specific CLI SemVer. They will tell agents to compare `surface identity` with the installed release envelope. The content renderer writes descriptors and semantic packages but skips version files, release manifests, release-set copies, and identity-bound distribution metadata.

`render:host-bridge-content` and `check:host-bridge-content` are therefore safe for feature work. The existing full surface commands compose the content path with release-set materialization and remain owned by `prepare:host-bridge-release`.

### Defer versioning and publication until an accumulated main release

The planner will compare the current source to the latest completed receipt/release identity, falling back to the existing merge-base behavior only when no completed receipt exists. Ordinary source and generated-content merges do not trigger publication. The workflow push trigger is narrowed to reviewed version/release-set preparation inputs; manual dispatch remains recovery-only and requires a release-set identity.

Because Agent Surface and CLI schema v2 are breaking agent contracts, the later preparation command will use explicit `minor` intent. The resulting version is not selected or written in this change.

## Risks / Trade-offs

- [Clap inventory output can drift from backend bindings] → Require exact one-to-one binding coverage and fail generation on missing, duplicate, or orphan entries.
- [Operation inheritance can hide weak guidance] → Require one command-specific decision record per leaf command and validate examples, related commands, and recovery handle preconditions.
- [Detailed references can drift or become repetitive] → Generate cards from one descriptor, keep role policy in surface-owned sources, and test source ownership rather than prose snapshots.
- [Content-only and release render paths can diverge] → Implement the full renderer as composition over the same content functions and test idempotence in both modes.
- [Removing embedded SemVer can weaken human checks] → Keep exact identity comparison in machine assets and generated control instructions rather than prose constants.
- [Latest receipt may be unavailable in a fresh clone] → Fall back deterministically to the committed completed release identity and report the selected baseline.
- [Workflow path filtering may miss an intended release] → Treat the prepared release-set file as the single publication trigger and retain explicit manual recovery by `releaseSetId`.

## Migration Plan

1. Add failing inventory, v2 schema, metadata-alignment, search, semantic-ownership, and content-only tests.
2. Introduce the internal Clap inventory export and structured bindings, then render Agent Surface v2.
3. Add semantic supplement sources and render the three human surfaces.
4. Split content-only validation from release identity materialization and narrow release workflow triggers.
5. Complete this change with versions and the current release set untouched.
6. After this and any related changes merge to `main`, run one explicit minor release preparation, review its generated identity changes, and let the unified workflow publish that prepared Release Set.

Rollback before publication consists of reverting the feature commits. After the later release is prepared, recovery must reuse its immutable `releaseSetId`; incompatible bytes require a new release preparation rather than overwriting the release.

## Open Questions

None.
