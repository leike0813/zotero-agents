# Surface Map

Use this map after running `scripts/host-bridge-semantic-review-context.ts`.

## Spec Layer

Review these as source-of-truth changes for Host Bridge behavior:

- Host Bridge capability and endpoint source under `src/modules/hostBridge*.ts`, especially capability registry, server, protocol, permission, file, workflow control, and agent-run code.
- Rust CLI command surface in `cli/zotero-bridge/src/args.rs` and `cli/zotero-bridge/src/commands.rs`.
- Surface catalog rules in `scripts/host-bridge-surface-catalog.ts`.
- Built-in workflow catalog and workflow declarations under `workflows_builtin/**`.
- OpenSpec Host Bridge and workflow-runtime specs under `openspec/specs/**` and active OpenSpec change specs.

## Semantic Sources

Edit only these sources when semantic guidance needs to change:

- `skills_src/zotero-bridge-cli/semantic/SKILL.md`
- `skills_src/zotero-bridge-cli/semantic/references/agent-guidance.md`
- `profiles_src/hermes/zotero-librarian/SOUL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/operating-principles.md`

## Generated Targets

Do not edit these as semantic sources:

- `skills_builtin/zotero-bridge-cli/**`
- `profiles/hermes/zotero-librarian/**`
- `doc/host-bridge-cli.md`
- `skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2`
- topic synthesis built-in packages generated from the topic synthesis renderer.

Generated targets are updated by render scripts after semantic review.
