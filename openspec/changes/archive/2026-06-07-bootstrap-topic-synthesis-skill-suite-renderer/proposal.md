## Why

The current topic synthesis built-in skills are maintained as two large
hand-authored packages. The multi-skill design in
`artifact/topic-synthesis-multi-skill-contract-design.md` requires four
published skills that share one source contract, but the repository does not
yet have a `skills_src/topic-synthesis/` source tree or a deterministic render
path.

## What Changes

- Add `skills_src/topic-synthesis/` as the source of truth for the future
  four-skill topic synthesis suite.
- Add shared contract assets for paths, canonical stages, handoff envelopes,
  stdout envelopes, SQLite bootstrap schema, and stage-local payload schemas.
- Add reusable `SKILL.md` templates and public fragments that render a
  single agent-facing document per published skill.
- Add a TypeScript renderer that emits the four generated packages under
  `skills_builtin/` without adding dependencies.
- Add first-phase smoke runtime scripts that prove package-local `gate.py`
  commands can be invoked from any current directory.
- Keep the existing `create-topic-synthesis` and `update-topic-synthesis`
  packages and workflows unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `topic-synthesis-skills`: topic synthesis skills gain a generated
  four-package suite source/render contract while preserving the existing
  two-package workflow entry points.

## Impact

- Affected areas: OpenSpec contract, `skills_src/topic-synthesis/`, four new
  generated packages under `skills_builtin/`, and focused renderer tests.
- No dependency installation, database migration, workflow registration
  switch, Host Bridge behavior change, or development server startup is
  required.
