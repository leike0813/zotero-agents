# Surface Map

Use this map after running `scripts/host-bridge-semantic-review-context.ts`.

## Spec Layer

Review these as source-of-truth changes for Host Bridge behavior:

- Host Bridge capability and endpoint source under `src/modules/hostBridge*.ts`, especially capability registry, server, protocol, permission, file, workflow control, and agent-run code.
- Rust CLI command, Agent Control Contract, identity, and error surface in
  `cli/zotero-bridge/src/args.rs`, `cli/zotero-bridge/src/commands.rs`,
  `cli/zotero-bridge/src/surface.rs`, `cli/zotero-bridge/src/error.rs`, and the
  developer-only Clap inventory exporter under `cli/zotero-bridge/examples/`.
- Agent descriptor and surface catalog rules in
  `scripts/host-bridge-agent-surface.ts` and
  `scripts/host-bridge-surface-catalog.ts`.
- Release identity and receipt contracts in `scripts/host-bridge-release-set.ts`,
  the Host Bridge planner/renderer/materializer/coordinator scripts,
  `schemas/host-bridge.*`, and `.github/workflows/release-host-bridge.yml`.
- Built-in workflow catalog and workflow declarations under `workflows_builtin/**`.
- OpenSpec Host Bridge and workflow-runtime specs under `openspec/specs/**` and active OpenSpec change specs.

## Semantic Sources

Edit only these sources when semantic guidance needs to change:

- `skills_src/zotero-bridge-cli/semantic/SKILL.md`
- `skills_src/zotero-bridge-cli/README.md` (CLI bundle root README; it is not part of the nested wrapper skill)
- `skills_src/zotero-bridge-cli/semantic/references/agent-guidance.md`
- `skills_src/zotero-bridge-cli/semantic/references/identity-and-connection.md`
- `skills_src/zotero-bridge-cli/semantic/references/invocation-and-json-input.md`
- `skills_src/zotero-library-agent/semantic/SKILL.md`
- `skills_src/zotero-library-agent/semantic/README.md`
- `skills_src/zotero-library-agent/semantic/references/task-routing.md`
- `skills_src/zotero-library-agent/semantic/references/workflow-execution.md`
- `skills_src/zotero-library-agent/semantic/references/evidence-handoff.md`
- `skills_src/zotero-library-agent/semantic/references/helper-script-contract.md`
- `skills_src/zotero-library-agent/semantic/references/journeys/**`
- `skills_src/host-bridge-shared/terminology.md`
- `skills_src/host-bridge-shared/control-invariants.md`
- `skills_src/host-bridge-shared/semantic/*.json` for domain-owned command-selection supplements; effective guidance must remain command-specific.
- `profiles_src/hermes/zotero-librarian/SOUL.md`
- `profiles_src/hermes/zotero-librarian/README.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/operating-principles.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/library-maintenance.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/resident-index.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/scheduled-jobs.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/monitoring-and-notifications.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/maintenance-and-recovery.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/profile-script-contracts.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/workflow-execution-policy.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/common-tasks.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/SKILL.md`
- `profiles_src/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/references/agent-run-playbook.md`

The Zotero Library Agent owns bounded on-demand task policy. The Zotero Librarian profile owns resident indexing, scheduling, monitoring, and maintenance policy. Only terminology and protocol-level control invariants are shared.

## Release Metadata

- `cli/zotero-bridge/release.json` governs Rust CLI release identity.
- `skills_src/zotero-bridge-cli/runner.json` governs CLI wrapper content
  identity.
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
- `cli/zotero-bridge/src/agent-surface.json`
- `host-bridge/release-set.json`
- `doc/host-bridge-cli.md`
- `skills_src/topic-synthesis/templates/fragments/zotero-bridge-cli.md.j2`
- topic synthesis built-in packages generated from the topic synthesis renderer.
- generated `references/commands/**` and `references/output-and-recovery.md` under the wrapper and Profile targets. The Library Agent routes exact command contracts to its bundled CLI wrapper.

Generated targets are updated by render scripts after semantic review.
