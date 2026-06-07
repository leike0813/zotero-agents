## Instruction Source of Truth

`skills_src/topic-synthesis/contracts/stage-guidance.yaml` is the source of
truth for stage-level instruction enrichment. Generated packages remain render
outputs. The generated package surface stays intentionally small: each package
contains one `SKILL.md`, scripts, schemas, runner metadata, and output schema.
No `references/stages/<stage-id>.md` files are generated.

## Selective Migration Rule

The old monolithic skills are reference material, not contract authority. This
change migrates only durable semantic guidance:

- gate discipline and the LLM/runtime boundary;
- per-paper triage standards;
- resolver proposal intent;
- core synthesis quality standards;
- KG enrichment field intent;
- coverage, reliability, external context, collection suggestion, and summary
  writing standards.

The migration rewrites all stage ids, action names, payload paths, payload
field shapes, and context boundaries to match the split suite. When old
instructions conflict with the new runtime, the split suite contracts win.

## Rendering Model

The renderer reads `stages.yaml`, payload schemas, and `stage-guidance.yaml`.
For each stage it renders:

- command or payload execution steps;
- required-read usage notes;
- field guidance for payload stages;
- quality checks and common pitfalls;
- one schema-valid inline JSON example.

The renderer does not generate reference markdown files. Inline examples come
from `stage-guidance.yaml` when present and fall back to the payload schema
example.

## Scope Boundary

This is an instruction strengthening change. It does not alter runtime-owned
files, SQLite schema, Host Bridge calls, handoff semantics, final output
shape, or workflow registration. It also does not make update runtime complete
or create a full DETR playbook.
