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
