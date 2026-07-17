# Zotero Librarian Hermes Profile

This repository is the resident Zotero library surface for Hermes. Choose it when work needs a reusable local index, scheduled discovery, run monitoring, notification synchronization, or ongoing maintenance. For a finite on-demand task, use the Zotero Library Agent bundle; for installation and low-level command integration only, use the Host Bridge CLI bundle.

Source project: [leike0813/zotero-agents](https://github.com/leike0813/zotero-agents).

## Install and initialize

Install the published profile repository:

```shell
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

Run `scripts/install_zotero_bridge_cli.py` during profile initialization. It installs the packaged `zotero-bridge` binary and links the Hermes well-known Host Bridge profile path to the host `bridge-profile.json` without changing `HOME`.

Use `assets/host-bridge/profile.example.json` as the connection template and provide the bearer token through `ZOTERO_BRIDGE_TOKEN`; never write tokens into profile files. If the host profile cannot be inferred, set `ZOTERO_BRIDGE_HOST_PROFILE` or pass `--host-profile`. Local state defaults to `$HERMES_HOME/zotero-librarian/index.sqlite`; set `ZOTERO_LIBRARIAN_STATE_DIR` when it must live elsewhere.

Verify the installed CLI offline before resident work starts:

```sh
zotero-bridge surface identity --json
```

Compare the complete identity with `manifest.json.cliIdentity` and confirm the shared `releaseSetId`. A matching version alone does not establish compatibility.

## Resident operating model

- Use the local index for repeated discovery and ranking.
- Confirm current selection, permission, workflow, run, Product, and writeback facts through Host Bridge before acting.
- Treat scheduled jobs as read-only by default. When a job reaches an approval or mutation boundary, produce a reviewable proposal and stop unless current policy explicitly authorizes the operation.
- Keep workflow catalog refresh, run monitoring, notification synchronization, and maintenance state auditable through their profile services and receipts.

Read `SOUL.md` and `skills/zotero-librarian/SKILL.md` for first-level routing. Resident manuals separately cover index freshness and atomic refresh, every scheduled job, monitoring and notifications, workflow execution, maintenance recovery, and helper-script contracts. Generated `references/commands/` cards provide exact Host Bridge invocation and control facts because this profile is distributed independently. Agent-owned workflow handoff and apply-receipt recovery are governed separately by `skills/zotero-workflow-agent-runner/SKILL.md`.

## Resident documentation map

- `resident-index.md`: cached discovery versus live confirmation and atomic refresh recovery.
- `scheduled-jobs.md`: schedule, command, silence, report, mutation, and escalation policy for all seven jobs.
- `monitoring-and-notifications.md`: one-pass run watch, notification sync, typed interaction handles, and retry behavior.
- `workflows.md` plus `workflow-execution-policy.md`: generated catalog inputs/parameters/results and live execution-mode selection.
- `maintenance-and-recovery.md`: cache, Synthesis index, graph metrics, and debug-repair boundaries.
- `profile-script-contracts.md`: deterministic helper commands, outputs, state ownership, and failure behavior.

## Safety and recovery

Do not access or mutate Zotero database or storage files directly. Preserve typed handles and use Host-owned approval paths for writes. Scheduled maintenance must not convert a proposal into a write merely because a previous run was approved.

On a failed Host Bridge operation, inspect `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and optional `nextCommand`. Re-read live Host state when a write may have changed it, query workflow or apply receipts before resuming, and do not reuse consumed handles. Local index or monitor failures may be repaired from their source services, but local cached state is never the authority for current Host facts.
