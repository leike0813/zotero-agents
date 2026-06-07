## Operational Instruction Model

The generated `SKILL.md` must be executable from the text alone. Each stage
should tell the agent:

- run gate first;
- inspect `stage`, `needs_payload`, and the returned command fields;
- fetch Host context through explicit `zotero-bridge` commands or read
  runtime files created by earlier gate actions;
- write only the current `payload_path` when a payload is required;
- execute the returned `submit_command`;
- rerun gate after each successful command or submit.

The gate JSON remains the execution source of truth. The command templates in
`SKILL.md` explain how to use the returned fields; they do not replace the
runtime-generated `command` and `submit_command`.

Command examples embedded in generated skills use portable bare Python, for
example `python scripts/gate.py --db "runtime/topic-synthesis.sqlite"`. Local
developer conveniences such as `uv run --project="$HOME/.ar" --locked` are
test/execution harness details and must not be written into skill
instructions.

## Skill-Local Guidance

The global product paragraph is shared, but concrete quality goals are
skill-local. Prepare skills discuss topic intent, duplicate/update context,
resolver proposal, and paper triage. Core enrichment discusses core synthesis
and KG enrichment. Finalize discusses coverage, reliability, collection
suggestions, and final summary.

The LLM/runtime boundary is also skill-local. Each generated skill lists only
the payloads the LLM authors in that skill and only the runtime-owned files
that skill's scripts create or validate.

## Host Bridge Reads

Host reads are agent actions performed before authoring payloads. This change
does not move `list-topics`, `get-library-index`, or `get-topic-context` into
runtime automation. Resolver, citation metrics, and filtered artifact export
remain runtime-owned cascade work after Stage 20 submit.

## Selective Migration

The change absorbs old skill material only after conversion:

- product goal and quality bar are retained in Chinese;
- `zotero-bridge` guidance uses the current bare CLI form used in ACP run
  workspaces;
- LLM/runtime boundary is rewritten for split stages and current schemas;
- old stage ids, action names, payload paths, fallback wording, and wrapper
  fields are excluded.

## Scope Boundary

This change is instruction/rendering only. It does not change SQLite schema,
gate behavior, Host Bridge cascade behavior, handoff shape, final output
shape, generated package registration, or update runtime completeness.
