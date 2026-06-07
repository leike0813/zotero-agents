## Design Source

This change implements the first phase of
`artifact/topic-synthesis-multi-skill-contract-design.md`: initialize the
source tree, define shared schemas/templates, and prove the render path. It
does not implement the full SQLite state machine, resolver cascade, handoff
execution, or workflow orchestration.

## Source and Render Boundary

`skills_src/topic-synthesis/` is the source of truth. The four generated
packages under `skills_builtin/` are render outputs and should not become the
long-term editing surface.

The renderer is a Node/TypeScript script run through `tsx`. It reads the
suite contracts, templates, and package-local runtime sources, then writes:

- `SKILL.md`
- `scripts/gate.py`
- `scripts/topic_synthesis_db.py`
- `assets/output.schema.json`
- `assets/runner.json`
- `assets/schemas/<current-skill-stage-schemas>.json`

The extra runner and output schema files keep the packages compatible with the
current built-in skill registry while preserving the design rule that all
agent-facing stage payload schemas come from the suite source.

## First-Phase Runtime

The generated `gate.py` is a contract smoke runtime. It:

- infers the skill id from the package directory;
- parses `--db`, `--input`, and `--payload`;
- emits a stable JSON instruction for the current package's first canonical
  stage;
- rejects unsupported payload submission with a stable error JSON.

It intentionally does not create real run state, call Host Bridge, validate
business payloads, write handoff manifests, or emit final business output.

## Drift Prevention

Focused tests should validate that the suite source exists, the renderer is
deterministic, generated packages are self-contained, generated `SKILL.md`
files expose only local stages, and scripts do not import
`skills_src/topic-synthesis/` at runtime.

The old `create-topic-synthesis` and `update-topic-synthesis` packages remain
outside the renderer in this phase so existing workflow and registry behavior
does not change.
