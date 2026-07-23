# Zotero Librarian Hermes Profile

Use this hosted surface for continuous Zotero library supervision, cached discovery, scheduled maintenance analysis, workflow-run monitoring, notification handling, attention reporting, and library questions. Finite query, acquisition, analysis, synthesis, curation, and self-owned workflow tasks use the bundled Generic Skills; exact Zotero operations use the bundled CLI Skill.

## Install and initialize

Install the published profile with:

```sh
hermes profile install https://github.com/leike0813/zotero-librarian-profile.git <--alias>
```

During initialization, run `scripts/install_zotero_bridge_cli.py`. It installs the packaged `zotero-bridge` binary and links its well-known connection profile without changing `HOME`. When profile discovery needs an explicit location, use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME`. Provide credentials through the Zotero Bridge service environment, normally `ZOTERO_BRIDGE_TOKEN`; never put tokens in profile files, plan files, cron jobs, receipts, or local state.

Verify the installed executable offline with `zotero-bridge surface identity --json`. Compare protocol, CLI schema, version, build fingerprint, and command-catalog checksum with the packaged release identity. Use the matching profile copy and CLI shim when any identity field differs.

## Resident model

Resident state defaults to `$HERMES_HOME/zotero-librarian/state.sqlite`. Set `ZOTERO_LIBRARIAN_STATE_DIR` to place it elsewhere. The state database is a local cache and journal, not a replacement for live Zotero facts.

`scripts/zotero_librarian_service.py` is the only resident entrypoint and the only owner of the database schema. Interactive requests and cron jobs invoke one bounded subcommand and receive `zotero-librarian.operation-receipt.v1`. The shipped cron jobs may index, inspect, monitor, synchronize notification metadata, and produce review candidates; they never submit workflows or mutate Zotero.

Workflow submission is interactive. The service reads the workflow's live selection contract, validates each supported selected object, and writes an immutable registered plan to an absolute path. The operator reviews its plan ID, digest, selection refs, and entries before a separate submit call with explicit current authority. Default concurrency is one. Launched and uncertain entries are never automatically replayed. Provider-profile decisions, unsupported selection/options, and self-owned agent handoffs use the inherited Generic workflow contract.

The service performs one pass and exits. Shipped cron files provide fixed profile schedules for read-only supervision, but the Librarian Skill and service do not create, edit, enable, disable, or reschedule cron. A request such as “check every hour” must be treated as a one-time check or an external schedule-configuration need; never report that a schedule was created when only a pass ran.

## Documentation map

Read `SOUL.md` for librarian posture and `skills/zotero-librarian/SKILL.md` for the executable resident contract. That Skill directly links:

- `resident-operations.md` for every service command, receipt, library question, run, notification, and scheduled pass;
- `automation-policy.md` for authority, workflow ownership, planning, submission, provider profiles, concurrency, cron, maintenance, and interaction;
- `state-and-recovery.md` for cache freshness, atomic updates, typed handles, uncertain outcomes, installation, and state rebuild.

The bundled Generic and CLI Skills are part of the effective profile. Do not copy their task playbooks or command facts into the resident documentation.
