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
- `skills_src/zotero-library-agent/semantic/SKILL.md`
- `skills_src/zotero-library-agent/semantic/references/task-routing.md`
- `skills_src/zotero-library-agent/semantic/references/workflow-execution.md`
- `skills_src/zotero-library-agent/semantic/references/evidence-handoff.md`
- `skills_src/host-bridge-shared/terminology.md`
- `skills_src/host-bridge-shared/control-invariants.md`
- `profiles_src/hermes/zotero-librarian/SOUL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/operating-principles.md`

The Zotero Library Agent owns bounded on-demand task policy. The Zotero Librarian profile owns resident indexing, scheduling, monitoring, and maintenance policy. Only terminology and protocol-level control invariants are shared.

## Release Metadata

- `profiles_src/hermes/zotero-librarian/profile-version.json` scopes the
  Profile-owned patch to a CLI major/minor release line. It is release metadata,
  not agent guidance, and does not require semantic-source review by itself.
- `skills_src/zotero-library-agent/bundle-version.json` scopes the
  bundle-owned patch to a CLI major/minor release line. It is release metadata,
  not agent guidance, and does not require semantic-source review by itself.

## Generated Targets

Do not edit these as semantic sources:

- `skills_builtin/zotero-bridge-cli/**`
- `skills_builtin/zotero-library-agent/**`
- `profiles/hermes/zotero-librarian/**`
- `doc/host-bridge-cli.md`
- `skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2`
- topic synthesis built-in packages generated from the topic synthesis renderer.

Generated targets are updated by render scripts after semantic review.
