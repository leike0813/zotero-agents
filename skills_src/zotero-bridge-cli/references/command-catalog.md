# Zotero Bridge command catalog

Use this catalog when you know what the user wants to do in Zotero but do not yet know the canonical command. It is the navigation layer for the detailed command references, not a replacement for them.

## Discovery sequence

1. Restate the requested outcome in Zotero terms: the object, scope, freshness, deliverable, and whether state may change.
2. Find the matching task family below and inspect its natural-language cues.
3. Select one or more candidate canonical commands from the compact index.
4. If the mapping remains ambiguous, run `zotero-bridge surface search --intent <plain-language intent>`.
5. Confirm the live command contract with `zotero-bridge surface describe '<canonical command>' --json`.
6. Read the linked detailed command reference before constructing argv or payload.
7. Execute only after resolving the required identity, input channel, authority, and recovery path.

## How to read the index

- The command name and one-line purpose help with discovery.
- Detailed references own argv, bindings, invocation and result schemas, pagination, effects, approval, handles, targets, aliases, and recovery.
- A command appearing in the catalog does not prove that the current Zotero instance is connected, that a workflow is available, or that a requested write is authorized.
- `surface search` returns candidates; it does not select the correct command or authorize execution.
- `surface describe` is the live authority for the selected command. If it differs from static guidance, follow the live descriptor and report the mismatch.
- Use the smallest semantic command that owns the requested effect. Do not replace it with `call` or `debug` merely because a low-level path appears shorter.

## Requests that span families

Many user requests require an ordered sequence rather than one command. Keep each family boundary explicit:

- Resolve current context before reading “this paper” or “these items.”
- Read and verify identity before proposing a mutation.
- Upload bytes before attaching an issued file handle.
- Validate a workflow before submission.
- Monitor only the typed run handle returned by submission.
- Verify Products, artifacts, downloaded bytes, or live Zotero state after a terminal run.
- Diagnose a stale Synthesis model before proposing a maintenance operation.

Do not let an earlier read, candidate list, validation result, or completed run imply authority for a later state change.

<!-- host-bridge-command-catalog:entries -->

## Completion check

Before leaving the catalog, you must know:

- the exact canonical command or ordered command sequence;
- the detailed reference that owns each command;
- the live object, selection, handle, or workflow identity required by the first command;
- whether the action is read-only, prepares a proposal, or changes state;
- where approval can occur;
- what evidence proves completion;
- which handle or live read prevents unsafe replay after interruption.

If any of these remains unknown, continue discovery or ask the user for the material missing decision. Do not guess command syntax from the user's wording.
