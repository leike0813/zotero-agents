# Zotero Library Agent Bundle

This repository is the bounded, on-demand task surface for Zotero library and Zotero Agents work. Choose it when an agent must complete a finite request, select a canonical Host Bridge command, preserve evidence, and return an auditable result.

Use the CLI bundle when you only need installation, connection, or low-level command contracts. Use the Zotero Librarian Profile when the job needs a resident index, schedules, monitoring, or ongoing maintenance.

## What this bundle provides

- the task router at `skills/zotero-library-agent/SKILL.md`;
- the connection and command contract at `skills/zotero-bridge-cli/SKILL.md`;
- detailed bounded journeys plus the bundled CLI wrapper's generated command cards;
- evidence schemas and the portable helper under `skills/zotero-library-agent/assets/` and `skills/zotero-library-agent/scripts/`;
- verified CLI binaries, installers, a connection profile template, and a release manifest.

Start with the Library Agent skill. It routes the current intent to a command family, completion evidence, approval boundary, and recovery path without requiring a complete command-table scan.

## Install, connect, and verify

Install the current-platform CLI with `install.ps1` on Windows or `install.sh` on Linux and macOS. Use `--yes --json --write-profile` for unattended setup, supply credentials through `ZOTERO_BRIDGE_TOKEN`, and keep tokens out of files and evidence bundles.

Before a task, verify the packaged command surface offline:

```sh
zotero-bridge surface identity --json
```

Compare the complete result with `manifest.json.cliIdentity` and confirm the repository `releaseSetId`. Do not infer compatibility from the CLI version alone. For unfamiliar work, use `surface search --intent ... --json`, then `surface describe ... --json`, and load only the matching domain reference.

## Bounded task flow

1. Read the wrapper skill and confirm connection and identity.
2. Read `skills/zotero-library-agent/references/task-routing.md`, then exactly one matching file under `references/journeys/`.
3. Preserve current Host facts, returned handles, local artifacts, and approval state as distinct evidence.
4. For workflows, follow `references/workflow-execution.md`; never send workflow options through an execution mode that does not accept them.
5. Build and validate the final evidence bundle using `references/evidence-handoff.md` and the bundled helper.

The journey manuals cover current context and library reads, notes/attachments/readiness, Synthesis context, Host-owned workflows, agent-owned handoff/apply-back, concrete writeback, and Product/file delivery. They specify branches, near-misses, evidence, approval, and recovery. For exact argv, payload, result, paging, or typed-handle fields, follow the journey into the bundled `skills/zotero-bridge-cli/references/commands/` card rather than relying on a copied command table.

The task is complete only when the requested result and its evidence are observable. A submit acknowledgement, prepared handoff, or write request is not completion by itself.

## Safety and recovery

Reads and diagnostics may be retried only when the command contract marks them retryable. Writes, apply-back, file consumption, and Product operations must respect approval, typed-handle, and state-change contracts.

On error, inspect `retryable`, `stateChanged`, `handleConsumed`, `safeNextActions`, and `nextCommand`. Re-read current state after an uncertain write, query the applicable receipt after partial apply-back, and never reuse a consumed handle. Do not bypass Host Bridge by accessing Zotero storage directly.
