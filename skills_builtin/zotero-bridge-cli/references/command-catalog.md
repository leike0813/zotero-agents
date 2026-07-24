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

## Connect, inspect the current selection, or discover capabilities

Use this family to establish the live Zotero connection, inspect what the user is referring to in the UI, and discover the current command contract.

Natural-language cues:

- this item, these papers, the current collection, or what is selected.
- can Zotero do this, which command exists, or what input does it need.
- connection, profile, endpoint, authentication, or bridge availability.

Read [the connection and context command reference](commands/connection-and-context.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge bridge backend list` | List redacted backend profile diagnostics |
| `zotero-bridge bridge backend status` | Read one redacted backend profile status |
| `zotero-bridge bridge manifest` | Read the authenticated Zotero Bridge service manifest |
| `zotero-bridge bridge profile diagnose` | Diagnose Zotero Bridge connection-profile readiness |
| `zotero-bridge bridge profile inspect` | Inspect the redacted Zotero Bridge connection profile |
| `zotero-bridge bridge status` | Check Zotero Bridge service health without authentication |
| `zotero-bridge context collection open` | Open one Zotero collection |
| `zotero-bridge context current` | Read current Zotero UI context |
| `zotero-bridge context item open` | Open one Zotero item |
| `zotero-bridge context note open` | Open one Zotero note |
| `zotero-bridge context selection get` | Read selected Zotero item summaries |
| `zotero-bridge context selection open` | Open one or more Zotero items as the active selection |
| `zotero-bridge surface describe` | Describe one canonical command |
| `zotero-bridge surface identity` | Print exact CLI build and command-catalog identity |
| `zotero-bridge surface search` | Search canonical commands by task intent |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Find, inspect, page through, or export library content

Use this family for current Zotero items, collections, notes, attachments, readiness, snapshots, and bounded exports.

Natural-language cues:

- what is in my library, collection, or current research set.
- find papers about a topic, inspect one item, or list its children.
- read notes, attachments, annotations, readiness, or a paged snapshot.

Read [the library command reference](commands/library.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge library annotation export` | Export reader annotations for one Zotero item |
| `zotero-bridge library annotation list` | List reader annotations for one Zotero item |
| `zotero-bridge library item attachments` | List child attachments for one Zotero item |
| `zotero-bridge library item get` | Get detailed metadata for one Zotero item |
| `zotero-bridge library item notes` | List child notes for one Zotero item |
| `zotero-bridge library item search` | Search Zotero library items |
| `zotero-bridge library items list` | List compact Zotero library item summaries |
| `zotero-bridge library note get` | Read one Zotero note body chunk |
| `zotero-bridge library note payload` | Read one embedded workflow payload from a Zotero note |
| `zotero-bridge library note payloads` | List embedded workflow payloads in one Zotero note |
| `zotero-bridge library readiness audit` | Audit PDF, source Markdown, and literature-analysis artifact readiness |
| `zotero-bridge library readiness missing-analysis` | List Zotero items missing literature-analysis generated artifacts |
| `zotero-bridge library readiness missing-markdown` | List Zotero items missing same-stem source Markdown |
| `zotero-bridge library readiness missing-pdf` | List Zotero items missing a PDF attachment |
| `zotero-bridge library snapshot` | Sync a Zotero library metadata snapshot page |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Preview and apply an explicit Zotero data change

Use this family only after the target identity and desired state are concrete and the current request authorizes a reviewed mutation.

Natural-language cues:

- change metadata, tags, collections, notes, links, or attachments.
- preview a write, apply an approved payload, or inspect mutation status.
- merge, delete, relink, or overwrite a known Zotero object.

Read [the mutation command reference](commands/mutation.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge mutation apply` | Apply a Zotero mutation |
| `zotero-bridge mutation collection add-items` | Add Zotero items to a collection |
| `zotero-bridge mutation collection create` | Create a Zotero collection |
| `zotero-bridge mutation collection remove-items` | Remove Zotero items from a collection |
| `zotero-bridge mutation item attach-file` | Attach a file uploaded through Zotero Bridge to a Zotero item |
| `zotero-bridge mutation item update` | Update Zotero item fields |
| `zotero-bridge mutation literature-ingest` | Ingest searched literature into Zotero |
| `zotero-bridge mutation note create` | Create a child note under one Zotero item |
| `zotero-bridge mutation note update` | Update one Zotero note |
| `zotero-bridge mutation note upsert-payload` | Upsert one embedded note payload |
| `zotero-bridge mutation preview` | Preview a Zotero mutation |
| `zotero-bridge mutation tag add` | Add tags to Zotero items |
| `zotero-bridge mutation tag remove` | Remove tags from Zotero items |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Move bytes, inspect Products, or follow durable operations

Use this family when a Zotero object or workflow result names a file, Product, asset, or long-running operation that must be transferred or verified.

Natural-language cues:

- upload or download a file without confusing a path and file handle.
- inspect a Product or retrieve one of its declared assets.
- resume or verify an operation using its durable receipt.

Read [the files, products, and operations command reference](commands/files-products-and-operations.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge file download` | Download one registered file handle |
| `zotero-bridge file upload` | Upload one local file through Zotero Bridge and return a short-lived file handle |
| `zotero-bridge operation get` | Read one durable Zotero operation receipt |
| `zotero-bridge product download` | Download one or all Dashboard Product assets |
| `zotero-bridge product get` | Read one normal Dashboard Product |
| `zotero-bridge product list` | List normal Dashboard Products |
| `zotero-bridge product remove` | Remove one Dashboard Product record through Zotero approval |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Discover, validate, submit, or apply a workflow

Use this family to inspect the live workflow contract, validate selection and provider inputs, submit supported execution, or apply agent-owned results.

Natural-language cues:

- use an installed workflow for analysis, acquisition, synthesis, or curation.
- check workflow options, provider profile, selection, or readiness.
- submit, inspect artifacts, or apply an agent-owned result.

Read [the workflow command reference](commands/workflow.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge workflow agent-abandon` | Abandon an unconsumed agent run |
| `zotero-bridge workflow agent-apply` | Apply finalized self-owned agent workflow result bundles |
| `zotero-bridge workflow agent-apply-status` | Read the auditable apply-back receipt for an agent run |
| `zotero-bridge workflow agent-bundle inspect` | Inspect a local agent handoff directory |
| `zotero-bridge workflow agent-renew` | Renew an unconsumed agent-run lease |
| `zotero-bridge workflow agent-result validate` | Validate a local agent result directory against an output contract |
| `zotero-bridge workflow agent-run` | Prepare a self-owned agent workflow handoff bundle |
| `zotero-bridge workflow describe` | Describe workflow selection and workflow options |
| `zotero-bridge workflow list` | List loaded workflows |
| `zotero-bridge workflow profile describe` | Describe the provider profile contract for one backend |
| `zotero-bridge workflow profile list` | List configured backend provider profiles |
| `zotero-bridge workflow profile validate` | Validate and normalize one backend provider profile |
| `zotero-bridge workflow queue cancel` | Cancel one still-pending Zotero-managed workflow queue unit |
| `zotero-bridge workflow queue list` | List pending Zotero-managed workflow queue units |
| `zotero-bridge workflow requirements` | Read workflow requirements |
| `zotero-bridge workflow submission get` | Read one active Zotero-managed workflow submission |
| `zotero-bridge workflow submit` | Submit a workflow with explicit JSON input |
| `zotero-bridge workflow validate` | Validate workflow input without starting execution |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Monitor, interact with, or cancel a workflow run

Use this family after a workflow has returned a typed run handle and the task needs current status, prompts, notifications, results, or cancellation.

Natural-language cues:

- what is this workflow doing, did it finish, or what does it need.
- answer a run prompt, acknowledge a notification, or cancel a run.
- inspect terminal result evidence without treating termination as output proof.

Read [the run command reference](commands/run.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge run active` | List lightweight active workflow runtime tasks |
| `zotero-bridge run cancel` | Request cancellation of a workflow run |
| `zotero-bridge run get` | Read one workflow run status |
| `zotero-bridge run list` | List active and recent workflow runtime tasks |
| `zotero-bridge run notification ack` | Acknowledge workflow notification inbox events |
| `zotero-bridge run notification list` | List workflow notification inbox events |
| `zotero-bridge run notification wait` | Poll until a workflow notification is available |
| `zotero-bridge run permission get` | Read one Zotero-side permission request |
| `zotero-bridge run permission pending` | List pending Zotero-side permission requests |
| `zotero-bridge run recent` | List lightweight recent workflow runtime tasks |
| `zotero-bridge run skill connect` | Connect a recoverable ACP skill run |
| `zotero-bridge run skill events` | List lightweight lifecycle events for one skill run |
| `zotero-bridge run skill get` | Read one concrete skill run |
| `zotero-bridge run skill recent` | List recent concrete skill runs |
| `zotero-bridge run skill reply` | Reply to a waiting ACP skill run |
| `zotero-bridge run workflow recent` | List recent workflow runs |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Inspect or maintain Synthesis topics, indexes, graphs, and artifacts

Use this family for the plugin's derived research structures, including topic context, sidecar indexes, citation graphs, resolver state, attention queues, and exports.

Natural-language cues:

- topic context, synthesis report, graph relation, metric, or evidence gap.
- index status, resolver candidates, freshness, or maintenance receipts.
- export or inspect a synthesis artifact without confusing it with live library truth.

Read [the synthesis command reference](commands/synthesis.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge synthesis artifact export-filtered` | Export bounded paper artifacts into the run workspace |
| `zotero-bridge synthesis artifact manifest` | Read paper artifact manifest metadata |
| `zotero-bridge synthesis artifact read` | Read selected paper artifacts |
| `zotero-bridge synthesis artifact resolve-topic-digest` | Resolve a topic paper digest |
| `zotero-bridge synthesis cache invalidate` | Invalidate a constrained Synthesis cache scope |
| `zotero-bridge synthesis cache refresh-reference-sidecar` | Start a reference-sidecar refresh |
| `zotero-bridge synthesis cache status` | Read Synthesis cache maintenance status |
| `zotero-bridge synthesis concept query` | Query Synthesis Concept KB candidates |
| `zotero-bridge synthesis graph get-layout` | Read persisted citation graph layout coordinates |
| `zotero-bridge synthesis graph get-metrics` | Read citation graph metrics for selected papers |
| `zotero-bridge synthesis graph get-slice` | Read a Synthesis citation graph slice |
| `zotero-bridge synthesis graph overview` | Read a paged Synthesis citation graph overview |
| `zotero-bridge synthesis graph query-cluster` | Query a topic-scoped citation graph cluster |
| `zotero-bridge synthesis graph rank-external-references` | Rank external references from the citation graph |
| `zotero-bridge synthesis graph rank-library-papers` | Rank library papers from citation graph metrics |
| `zotero-bridge synthesis graph refresh-metrics` | Refresh persisted citation graph complex metrics |
| `zotero-bridge synthesis graph update` | Start a citation graph update |
| `zotero-bridge synthesis index library get` | Read an index page |
| `zotero-bridge synthesis index reference get` | Read an index page |
| `zotero-bridge synthesis index status` | Read Synthesis index maintenance status |
| `zotero-bridge synthesis insight attention-queue` | Read aggregate graph/artifact/reference attention items |
| `zotero-bridge synthesis resolver resolve` | Resolve a topic resolver into a paper set |
| `zotero-bridge synthesis schema get` | Read Synthesis Layer schema metadata |
| `zotero-bridge synthesis topic find-by-paper-ref` | Find active topic synthesis topics by paper_ref |
| `zotero-bridge synthesis topic get-context` | Read one topic synthesis context |
| `zotero-bridge synthesis topic get-report` | Read one topic synthesis report markdown body |
| `zotero-bridge synthesis topic get-review-input` | Read review workflow input from Synthesis |
| `zotero-bridge synthesis topic list` | List existing topic synthesis topics |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Diagnose the bridge or make an advanced raw call

Use this family only when the semantic command surface cannot diagnose the problem or an exact low-level capability call is explicitly required.

Natural-language cues:

- collect a bounded diagnostic report for an unavailable or inconsistent surface.
- inspect raw capability behavior while preserving the normal authority boundary.
- avoid using diagnostics as a shortcut around semantic validation.

Read [the diagnostics command reference](commands/diagnostics.md) after selecting a candidate command. It contains the exact argv, schemas, effects, approval, handles, and recovery contract.

| Canonical command | Purpose |
| --- | --- |
| `zotero-bridge call` | Advanced diagnostic raw capability call |
| `zotero-bridge debug acp-skill-run reapply-result` | Re-run applyResult for one existing ACP skill run result |
| `zotero-bridge debug persistence` | Read debug-only persistence diagnostics |
| `zotero-bridge debug status` | Read debug-only Zotero Bridge service runtime status |
| `zotero-bridge debug synthesis cache` | List debug-only Synthesis sidecar cache basis rows |
| `zotero-bridge debug synthesis clean-install-reset` | Dangerous debug operation: reset Synthesis install state |
| `zotero-bridge debug synthesis diff` | Read debug-only Synthesis DB/cache differences |
| `zotero-bridge debug synthesis inspect-paper` | Inspect one debug Synthesis paper |
| `zotero-bridge debug synthesis inspect-topic` | Inspect one debug Synthesis topic |
| `zotero-bridge debug synthesis operations` | List debug-only Synthesis explicit operations |
| `zotero-bridge debug synthesis profiler` | List debug-only Synthesis profiler timings |
| `zotero-bridge debug synthesis snapshot` | Read a debug-only Synthesis snapshot |
| `zotero-bridge debug tasks` | Read debug-only workflow task diagnostics |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>' --json` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.


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
