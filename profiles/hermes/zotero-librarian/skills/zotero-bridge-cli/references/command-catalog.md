# Zotero Bridge command catalog

Use this catalog when you know what the user wants to do in Zotero but do not yet know the canonical command. It is the navigation layer for the detailed command references, not a replacement for them.

## Discovery sequence

1. Restate the requested outcome in Zotero terms: the object, scope, freshness, deliverable, and whether state may change.
2. Find the matching task family below and inspect its natural-language cues.
3. Select one or more candidate canonical commands from the compact index.
4. If the mapping remains ambiguous, run `zotero-bridge surface search --intent <plain-language intent>`.
5. Confirm the live command contract with `zotero-bridge surface describe '<canonical command>'`.
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

## File, Product, and operation identity model

File transfer, Product inspection, and operation recovery can appear in one task, but their identifiers are not interchangeable.

- A local path identifies bytes already available to the agent.
- A `fileId` identifies bridge-mediated transfer access and can expire or be consumed.
- A Product ID identifies a Zotero plugin Product record, not one of its assets.
- A Product asset has its own declared role, media type, size, checksum, and delivery route.
- An operation ID identifies a durable state-changing or maintenance operation and its receipt.
- A workflow artifact remains owned by its workflow or request contract until it is downloaded or applied through that contract.
- A Zotero attachment is live library state and must be read through the library or mutation surface.

Start from the identity returned by the owning command. Do not turn an absolute-looking Zotero path into a local path, infer a `fileId` from a Product, or use an operation ID as a run handle.

Before download, identify the attachment, Product asset, artifact, or operation that owns the bytes; obtain its declared transfer instruction; choose an absolute local destination when required; inspect overwrite and checksum expectations; then download once and verify the result. Before upload, resolve the local file, identify the later semantic operation that will consume it, upload without treating the path as Zotero evidence, preserve the returned handle and integrity fields, and use that handle only in the declared next command. Upload alone does not attach or persist bytes in Zotero, and download alone does not prove a Product or workflow result complete.

For every candidate command, inspect `outputBoundary` before choosing it. A cursor command requires full continuation traversal under unchanged criteria; an offset command requires ordered text reconstruction; a limit command may require a narrower selector; a file command requires handle download and integrity verification; a fixed command is complete only within its declared hard bound. `surface search` returns compact candidates only, so use `surface describe` or the linked command card for these details.

Inspect a Product before selecting an asset. Confirm its identity and producing workflow, inspect state and declared assets, select by role and media type rather than guessed filename, preserve size and checksum, request delivery through the current contract, and verify downloaded bytes independently. A terminal workflow with no expected Product is not successful output delivery; a missing required asset is not a complete deliverable; a downloaded Product is not automatically a Zotero attachment or note.

When a prior command returns an operation receipt, interpret `stateChange`, `handleConsumption`, and `retryable` together before repeating anything. An unchanged state permits only the declared safe continuation; changed state requires a live read before another write; unknown state requires receipt and target inspection. A consumed or unknown handle must not be replayed. Never replace an unknown receipt with a fresh submission, upload, mutation, or maintenance call.

For a workflow Product, verify the terminal run contract, inspect the declared Product, select the required asset, download through its current handle, verify checksum and bytes, and report missing expected assets separately. To attach a local artifact, verify the parent and current attachments, upload bytes, preserve the issued `fileId`, preview the exact attachment mutation, obtain current approval, apply once, and re-read attachments. To recover interrupted maintenance, preserve the operation ID and scope, read the durable receipt, inspect affected live state, separate completed, failed, unattempted, and unverifiable subjects, and construct only the residual action permitted by the receipt.

Expired file access must be reacquired from the owner. A checksum mismatch must not be used as evidence. A missing Product asset must be reported rather than substituted. Unknown operation state blocks replay. A consumed handle must be reacquired from its owner. Partial transfer is reusable only when the command explicitly supports resume. Completion evidence is verified local bytes for transfer, inspected required assets for a Product, or a durable receipt plus live state for an operation.

## Connect, inspect the current selection, or discover capabilities

Use this family to establish the live Zotero connection, inspect what the user is referring to in the UI, and discover the current command contract.

Natural-language cues:

- this item, these papers, the current collection, or what is selected.
- can Zotero do this, which command exists, or what input does it need.
- connection, profile, endpoint, authentication, or bridge availability.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge bridge backend list` | List redacted backend profile diagnostics | [Open card](commands/bridge/backend/list.md) |
| `zotero-bridge bridge backend status` | Read one redacted backend profile status | [Open card](commands/bridge/backend/status.md) |
| `zotero-bridge bridge manifest` | Read the authenticated Zotero Bridge service manifest | [Open card](commands/bridge/manifest.md) |
| `zotero-bridge bridge profile diagnose` | Diagnose Zotero Bridge connection-profile readiness | [Open card](commands/bridge/profile/diagnose.md) |
| `zotero-bridge bridge profile inspect` | Inspect the redacted Zotero Bridge connection profile | [Open card](commands/bridge/profile/inspect.md) |
| `zotero-bridge bridge status` | Check Zotero Bridge service health without authentication | [Open card](commands/bridge/status.md) |
| `zotero-bridge context collection open` | Open one Zotero collection | [Open card](commands/context/collection/open.md) |
| `zotero-bridge context current` | Read current Zotero UI context | [Open card](commands/context/current.md) |
| `zotero-bridge context item open` | Open one Zotero item | [Open card](commands/context/item/open.md) |
| `zotero-bridge context note open` | Open one Zotero note | [Open card](commands/context/note/open.md) |
| `zotero-bridge context selection get` | Read selected Zotero item summaries | [Open card](commands/context/selection/get.md) |
| `zotero-bridge context selection open` | Open one or more Zotero items as the active selection | [Open card](commands/context/selection/open.md) |
| `zotero-bridge surface describe` | Describe one canonical command | [Open card](commands/surface/describe.md) |
| `zotero-bridge surface identity` | Print exact CLI build and command-catalog identity | [Open card](commands/surface/identity.md) |
| `zotero-bridge surface search` | Search canonical commands by task intent | [Open card](commands/surface/search.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Find, inspect, page through, or export library content

Use this family for current Zotero items, collections, notes, attachments, readiness, snapshots, and bounded exports.

Natural-language cues:

- what is in my library, collection, or current research set.
- find papers about a topic, inspect one item, or list its children.
- read notes, attachments, annotations, readiness, or a paged snapshot.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge library annotation export` | Export reader annotations for one Zotero item | [Open card](commands/library/annotation/export.md) |
| `zotero-bridge library annotation list` | List reader annotations for one Zotero item | [Open card](commands/library/annotation/list.md) |
| `zotero-bridge library item attachments` | List child attachments for one Zotero item | [Open card](commands/library/item/attachments.md) |
| `zotero-bridge library item get` | Get detailed metadata for one Zotero item | [Open card](commands/library/item/get.md) |
| `zotero-bridge library item notes` | List child notes for one Zotero item | [Open card](commands/library/item/notes.md) |
| `zotero-bridge library item search` | Search Zotero library items | [Open card](commands/library/item/search.md) |
| `zotero-bridge library items list` | List compact Zotero library item summaries | [Open card](commands/library/items/list.md) |
| `zotero-bridge library note get` | Read one Zotero note body chunk | [Open card](commands/library/note/get.md) |
| `zotero-bridge library note payload` | Read one embedded workflow payload from a Zotero note | [Open card](commands/library/note/payload.md) |
| `zotero-bridge library note payloads` | List embedded workflow payloads in one Zotero note | [Open card](commands/library/note/payloads.md) |
| `zotero-bridge library readiness audit` | Audit PDF, source Markdown, and literature-analysis artifact readiness | [Open card](commands/library/readiness/audit.md) |
| `zotero-bridge library readiness missing-analysis` | List Zotero items missing literature-analysis generated artifacts | [Open card](commands/library/readiness/missing-analysis.md) |
| `zotero-bridge library readiness missing-markdown` | List Zotero items missing same-stem source Markdown | [Open card](commands/library/readiness/missing-markdown.md) |
| `zotero-bridge library readiness missing-pdf` | List Zotero items missing a PDF attachment | [Open card](commands/library/readiness/missing-pdf.md) |
| `zotero-bridge library snapshot` | Sync a Zotero library metadata snapshot page | [Open card](commands/library/snapshot.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Preview and apply an explicit Zotero data change

Use this family only after the target identity and desired state are concrete and the current request authorizes a reviewed mutation.

Natural-language cues:

- change metadata, tags, collections, notes, links, or attachments.
- preview a write, apply an approved payload, or inspect mutation status.
- merge, delete, relink, or overwrite a known Zotero object.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge mutation apply` | Apply a Zotero mutation | [Open card](commands/mutation/apply.md) |
| `zotero-bridge mutation collection add-items` | Add Zotero items to a collection | [Open card](commands/mutation/collection/add-items.md) |
| `zotero-bridge mutation collection create` | Create a Zotero collection | [Open card](commands/mutation/collection/create.md) |
| `zotero-bridge mutation collection remove-items` | Remove Zotero items from a collection | [Open card](commands/mutation/collection/remove-items.md) |
| `zotero-bridge mutation item attach-file` | Attach a file uploaded through Zotero Bridge to a Zotero item | [Open card](commands/mutation/item/attach-file.md) |
| `zotero-bridge mutation item update` | Update Zotero item fields | [Open card](commands/mutation/item/update.md) |
| `zotero-bridge mutation literature-ingest` | Ingest searched literature into Zotero | [Open card](commands/mutation/literature-ingest.md) |
| `zotero-bridge mutation note create` | Create a child note under one Zotero item | [Open card](commands/mutation/note/create.md) |
| `zotero-bridge mutation note update` | Update one Zotero note | [Open card](commands/mutation/note/update.md) |
| `zotero-bridge mutation note upsert-payload` | Upsert one embedded note payload | [Open card](commands/mutation/note/upsert-payload.md) |
| `zotero-bridge mutation preview` | Preview a Zotero mutation | [Open card](commands/mutation/preview.md) |
| `zotero-bridge mutation tag add` | Add tags to Zotero items | [Open card](commands/mutation/tag/add.md) |
| `zotero-bridge mutation tag remove` | Remove tags from Zotero items | [Open card](commands/mutation/tag/remove.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Move bytes, inspect Products, or follow durable operations

Use this family when a Zotero object or workflow result names a file, Product, asset, or long-running operation that must be transferred or verified.

Natural-language cues:

- upload or download a file without confusing a path and file handle.
- inspect a Product or retrieve one of its declared assets.
- resume or verify an operation using its durable receipt.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge file download` | Download one registered file handle | [Open card](commands/file/download.md) |
| `zotero-bridge file upload` | Upload one local file through Zotero Bridge and return a short-lived file handle | [Open card](commands/file/upload.md) |
| `zotero-bridge operation get` | Read one durable Zotero operation receipt | [Open card](commands/operation/index.md) |
| `zotero-bridge product download` | Download one or all Dashboard Product assets | [Open card](commands/product/download.md) |
| `zotero-bridge product get` | Read one normal Dashboard Product | [Open card](commands/product/get.md) |
| `zotero-bridge product list` | List normal Dashboard Products | [Open card](commands/product/list.md) |
| `zotero-bridge product remove` | Remove one Dashboard Product record through Zotero approval | [Open card](commands/product/remove.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Discover, validate, submit, or apply a workflow

Use this family to inspect the live workflow contract, validate selection and provider inputs, submit supported execution, or apply agent-owned results.

Natural-language cues:

- use an installed workflow for analysis, acquisition, synthesis, or curation.
- check workflow options, provider profile, selection, or readiness.
- submit, inspect artifacts, or apply an agent-owned result.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge workflow agent-abandon` | Abandon an unconsumed agent run | [Open card](commands/workflow/agent-abandon.md) |
| `zotero-bridge workflow agent-apply` | Apply finalized self-owned agent workflow result bundles | [Open card](commands/workflow/agent-apply.md) |
| `zotero-bridge workflow agent-apply-status` | Read the auditable apply-back receipt for an agent run | [Open card](commands/workflow/agent-apply-status.md) |
| `zotero-bridge workflow agent-bundle inspect` | Inspect a local agent handoff directory | [Open card](commands/workflow/agent-bundle/inspect.md) |
| `zotero-bridge workflow agent-renew` | Renew an unconsumed agent-run lease | [Open card](commands/workflow/agent-renew.md) |
| `zotero-bridge workflow agent-result validate` | Validate a local agent result directory against an output contract | [Open card](commands/workflow/agent-result/validate.md) |
| `zotero-bridge workflow agent-run` | Prepare a self-owned agent workflow handoff bundle | [Open card](commands/workflow/agent-run.md) |
| `zotero-bridge workflow describe` | Describe workflow selection and workflow options | [Open card](commands/workflow/describe.md) |
| `zotero-bridge workflow list` | List loaded workflows | [Open card](commands/workflow/list.md) |
| `zotero-bridge workflow profile describe` | Describe the provider profile contract for one backend | [Open card](commands/workflow/profile/describe.md) |
| `zotero-bridge workflow profile list` | List configured backend provider profiles | [Open card](commands/workflow/profile/list.md) |
| `zotero-bridge workflow profile validate` | Validate and normalize one backend provider profile | [Open card](commands/workflow/profile/validate.md) |
| `zotero-bridge workflow queue cancel` | Cancel one still-pending Zotero-managed workflow queue unit | [Open card](commands/workflow/queue/cancel.md) |
| `zotero-bridge workflow queue list` | List pending Zotero-managed workflow queue units | [Open card](commands/workflow/queue/list.md) |
| `zotero-bridge workflow requirements` | Read workflow requirements | [Open card](commands/workflow/requirements.md) |
| `zotero-bridge workflow submission get` | Read one active Zotero-managed workflow submission | [Open card](commands/workflow/submission/get.md) |
| `zotero-bridge workflow submit` | Submit a workflow with explicit JSON input | [Open card](commands/workflow/submit.md) |
| `zotero-bridge workflow validate` | Validate workflow input without starting execution | [Open card](commands/workflow/validate.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Monitor, interact with, or cancel a workflow run

Use this family after a workflow has returned a typed run handle and the task needs current status, prompts, notifications, results, or cancellation.

Natural-language cues:

- what is this workflow doing, did it finish, or what does it need.
- answer a run prompt, acknowledge a notification, or cancel a run.
- inspect terminal result evidence without treating termination as output proof.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge run active` | List lightweight active workflow runtime tasks | [Open card](commands/run/active.md) |
| `zotero-bridge run cancel` | Request cancellation of a workflow run | [Open card](commands/run/cancel.md) |
| `zotero-bridge run get` | Read one workflow run status | [Open card](commands/run/get.md) |
| `zotero-bridge run list` | List active and recent workflow runtime tasks | [Open card](commands/run/list.md) |
| `zotero-bridge run notification ack` | Acknowledge workflow notification inbox events | [Open card](commands/run/notification/ack.md) |
| `zotero-bridge run notification list` | List workflow notification inbox events | [Open card](commands/run/notification/list.md) |
| `zotero-bridge run notification wait` | Poll until a workflow notification is available | [Open card](commands/run/notification/wait.md) |
| `zotero-bridge run permission get` | Read one Zotero-side permission request | [Open card](commands/run/permission/get.md) |
| `zotero-bridge run permission pending` | List pending Zotero-side permission requests | [Open card](commands/run/permission/pending.md) |
| `zotero-bridge run recent` | List lightweight recent workflow runtime tasks | [Open card](commands/run/recent.md) |
| `zotero-bridge run skill connect` | Connect a recoverable ACP skill run | [Open card](commands/run/skill/connect.md) |
| `zotero-bridge run skill events` | List lightweight lifecycle events for one skill run | [Open card](commands/run/skill/events.md) |
| `zotero-bridge run skill get` | Read one concrete skill run | [Open card](commands/run/skill/get.md) |
| `zotero-bridge run skill recent` | List recent concrete skill runs | [Open card](commands/run/skill/recent.md) |
| `zotero-bridge run skill reply` | Reply to a waiting ACP skill run | [Open card](commands/run/skill/reply.md) |
| `zotero-bridge run workflow recent` | List recent workflow runs | [Open card](commands/run/workflow/recent.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Inspect or maintain Synthesis topics, indexes, graphs, and artifacts

Use this family for the plugin's derived research structures, including topic context, sidecar indexes, citation graphs, resolver state, attention queues, and exports.

Natural-language cues:

- topic context, synthesis report, graph relation, metric, or evidence gap.
- index status, resolver candidates, freshness, or maintenance receipts.
- export or inspect a synthesis artifact without confusing it with live library truth.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge synthesis artifact export-filtered` | Export bounded paper artifacts into the run workspace | [Open card](commands/synthesis/artifact/export-filtered.md) |
| `zotero-bridge synthesis artifact manifest` | Read paper artifact manifest metadata | [Open card](commands/synthesis/artifact/manifest.md) |
| `zotero-bridge synthesis artifact read` | Read selected paper artifacts | [Open card](commands/synthesis/artifact/read.md) |
| `zotero-bridge synthesis artifact resolve-topic-digest` | Resolve a topic paper digest | [Open card](commands/synthesis/artifact/resolve-topic-digest.md) |
| `zotero-bridge synthesis cache invalidate` | Invalidate a constrained Synthesis cache scope | [Open card](commands/synthesis/cache/invalidate.md) |
| `zotero-bridge synthesis cache refresh-reference-sidecar` | Start a reference-sidecar refresh | [Open card](commands/synthesis/cache/refresh-reference-sidecar.md) |
| `zotero-bridge synthesis cache status` | Read Synthesis cache maintenance status | [Open card](commands/synthesis/cache/status.md) |
| `zotero-bridge synthesis concept query` | Query Synthesis Concept KB candidates | [Open card](commands/synthesis/concept/query.md) |
| `zotero-bridge synthesis graph get-layout` | Read persisted citation graph layout coordinates | [Open card](commands/synthesis/graph/get-layout.md) |
| `zotero-bridge synthesis graph get-metrics` | Read citation graph metrics for selected papers | [Open card](commands/synthesis/graph/get-metrics.md) |
| `zotero-bridge synthesis graph get-slice` | Read a Synthesis citation graph slice | [Open card](commands/synthesis/graph/get-slice.md) |
| `zotero-bridge synthesis graph overview` | Read a paged Synthesis citation graph overview | [Open card](commands/synthesis/graph/overview.md) |
| `zotero-bridge synthesis graph query-cluster` | Query a topic-scoped citation graph cluster | [Open card](commands/synthesis/graph/query-cluster.md) |
| `zotero-bridge synthesis graph rank-external-references` | Rank external references from the citation graph | [Open card](commands/synthesis/graph/rank-external-references.md) |
| `zotero-bridge synthesis graph rank-library-papers` | Rank library papers from citation graph metrics | [Open card](commands/synthesis/graph/rank-library-papers.md) |
| `zotero-bridge synthesis graph refresh-metrics` | Refresh persisted citation graph complex metrics | [Open card](commands/synthesis/graph/refresh-metrics.md) |
| `zotero-bridge synthesis graph update` | Start a citation graph update | [Open card](commands/synthesis/graph/update.md) |
| `zotero-bridge synthesis index library get` | Read an index page | [Open card](commands/synthesis/index/library/get.md) |
| `zotero-bridge synthesis index reference get` | Read an index page | [Open card](commands/synthesis/index/reference/get.md) |
| `zotero-bridge synthesis index status` | Read Synthesis index maintenance status | [Open card](commands/synthesis/index/status.md) |
| `zotero-bridge synthesis insight attention-queue` | Read aggregate graph/artifact/reference attention items | [Open card](commands/synthesis/insight/attention-queue.md) |
| `zotero-bridge synthesis resolver resolve` | Resolve a topic resolver into a paper set | [Open card](commands/synthesis/resolver/resolve.md) |
| `zotero-bridge synthesis schema get` | Read Synthesis Layer schema metadata | [Open card](commands/synthesis/schema/get.md) |
| `zotero-bridge synthesis topic find-by-paper-ref` | Find active topic synthesis topics by paper_ref | [Open card](commands/synthesis/topic/find-by-paper-ref.md) |
| `zotero-bridge synthesis topic get-context` | Read one topic synthesis context | [Open card](commands/synthesis/topic/get-context.md) |
| `zotero-bridge synthesis topic get-report` | Read one topic synthesis report markdown body | [Open card](commands/synthesis/topic/get-report.md) |
| `zotero-bridge synthesis topic get-review-input` | Read review workflow input from Synthesis | [Open card](commands/synthesis/topic/get-review-input.md) |
| `zotero-bridge synthesis topic list` | List existing topic synthesis topics | [Open card](commands/synthesis/topic/list.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
- Read the linked detailed reference before execution; the compact index is not an argv or approval contract.

## Diagnose the bridge or make an advanced raw call

Use this family only when the semantic command surface cannot diagnose the problem or an exact low-level capability call is explicitly required.

Natural-language cues:

- collect a bounded diagnostic report for an unavailable or inconsistent surface.
- inspect raw capability behavior while preserving the normal authority boundary.
- avoid using diagnostics as a shortcut around semantic validation.

Select one command below, then read its linked command card. Each card contains the exact argv, schemas, examples, effects, approval, handles, and recovery contract.

| Canonical command | Purpose | Command card |
| --- | --- | --- |
| `zotero-bridge call` | Advanced diagnostic raw capability call | [Open card](commands/call/index.md) |
| `zotero-bridge debug acp-skill-run reapply-result` | Re-run applyResult for one existing ACP skill run result | [Open card](commands/debug/acp-skill-run/reapply-result.md) |
| `zotero-bridge debug persistence` | Read debug-only persistence diagnostics | [Open card](commands/debug/persistence.md) |
| `zotero-bridge debug status` | Read debug-only Zotero Bridge service runtime status | [Open card](commands/debug/status.md) |
| `zotero-bridge debug synthesis cache` | List debug-only Synthesis sidecar cache basis rows | [Open card](commands/debug/synthesis/cache.md) |
| `zotero-bridge debug synthesis clean-install-reset` | Dangerous debug operation: reset Synthesis install state | [Open card](commands/debug/synthesis/clean-install-reset.md) |
| `zotero-bridge debug synthesis diff` | Read debug-only Synthesis DB/cache differences | [Open card](commands/debug/synthesis/diff.md) |
| `zotero-bridge debug synthesis inspect-paper` | Inspect one debug Synthesis paper | [Open card](commands/debug/synthesis/inspect-paper.md) |
| `zotero-bridge debug synthesis inspect-topic` | Inspect one debug Synthesis topic | [Open card](commands/debug/synthesis/inspect-topic.md) |
| `zotero-bridge debug synthesis operations` | List debug-only Synthesis explicit operations | [Open card](commands/debug/synthesis/operations.md) |
| `zotero-bridge debug synthesis profiler` | List debug-only Synthesis profiler timings | [Open card](commands/debug/synthesis/profiler.md) |
| `zotero-bridge debug synthesis snapshot` | Read a debug-only Synthesis snapshot | [Open card](commands/debug/synthesis/snapshot.md) |
| `zotero-bridge debug tasks` | Read debug-only workflow task diagnostics | [Open card](commands/debug/tasks.md) |

Selection check:

- Match the user's requested outcome, object type, freshness, and state-change boundary to this family.
- If several commands remain plausible, use `zotero-bridge surface search --intent <plain-language intent>` to narrow the candidates.
- Confirm the selected command with `zotero-bridge surface describe '<canonical command>'` before constructing the invocation.
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
