# Ingest, Output, And Recovery

Use this reference for Stages 60, 70, and terminal output. The runtime owns
typed payload generation, hashes, state transitions, and receipt binding. The
agent owns exact command execution, audit-summary writing, and truthful final
business output.

## Typed Payload Mapping

Stage 60 reads accepted Stage 40 and Stage 50 payloads and emits exactly one
immutable file for each metadata-qualified candidate:

```json
{
  "paper": {
    "itemType": "journalArticle",
    "fields": {
      "title": "隧道衬砌病害智能识别研究",
      "publicationTitle": "隧道工程学报",
      "date": "2024",
      "language": "zh-CN"
    },
    "creators": [],
    "identifiers": {
      "doi": "10.5555/tunnel.001"
    },
    "landingUrl": "https://doi.org/10.5555/tunnel.001",
    "pdfUrl": "https://journal.example.org/articles/tunnel.001.pdf",
    "attachLandingUrlOnMissingPdf": true
  },
  "collection": "1:COLLECTION"
}
```

The top level contains `paper` and optional `collection`. It never contains a
batch array.

### Item-type-specific fields

Map only accepted Zotero fields for the chosen item type:

| Item type | Direct-work fields | Container/issuing fields |
| --- | --- | --- |
| `journalArticle` | title, date, volume, issue, pages, language | publicationTitle |
| `conferencePaper` | title, date, pages, place, language | proceedingsTitle, conferenceName |
| `book` | title, edition, date, language | publisher, place |
| `bookSection` | title, pages, date, language | bookTitle, publisher, place |
| `thesis` | title, date, thesisType, language | university, place |
| `report` | title, date, reportNumber, reportType, language | institution, place |
| `document` | verified general fields only | verified publisher or institution fields only |

Use `document` when evidence does not support a narrower supported type. Do not
guess a type to unlock attractive fields.

### Creators

Preserve Stage 40 order and representation:

- `{"creatorType": "author", "name": "张三"}` for a verified unsplit native
  name or organization;
- `{"creatorType": "author", "firstName": "Ada", "lastName": "Lovelace"}`
  where an authoritative source supports segmentation;
- `[]` when creator completeness is `incomplete` or `unknown`.

Do not recover, translate, or synthesize creators during payload generation.

### Identifiers and URLs

- DOI remains only in `paper.identifiers.doi`.
- ISBN, PMID, and arXiv values remain in their named identifier keys.
- `landingUrl` is the Stage 40 authoritative direct-work page.
- `pdfUrl` exists only when Stage 50 selected a public, reachable,
  identity-matched PDF.
- `attachLandingUrlOnMissingPdf: true` lets the Host preserve the landing page
  when no PDF attachment succeeds.
- `collection` is copied from the authorized workflow parameter, not inferred
  from metadata.

The Host chooses native Zotero fields and validates item-type compatibility. The
runtime must not place DOI in `fields.DOI` or a `DOI:` Extra line.

## Stage 60 Hash Boundary

For every qualified candidate, Stage 60:

1. rereads the accepted metadata and PDF payload paths;
2. recomputes and verifies their recorded hashes;
3. maps accepted semantic values into the typed one-paper payload;
4. writes the stable numbered payload path;
5. records the payload's SHA-256 hash and candidate binding in gate state.

After generation:

- do not edit, reformat, rename, move, combine, or regenerate the payload by
  hand;
- do not copy its bytes to another candidate;
- do not add an identifier or URL discovered after the accepted upstream
  payload;
- do not treat an audit ledger copy as the executable payload.

If an accepted upstream file or generated payload changes, the runtime returns a
blocker. Restore the accepted bytes when they are known and authorized; otherwise
restart through an authorized upstream gate action. Never patch state hashes.

## Stage 70 Mutation Contract

For each prepared candidate, the gate returns:

- `candidate_id`;
- `ingest_payload_path`;
- `ingest_payload_hash`;
- exact one-paper `command`;
- `receipt_path`;
- `submit_command`.

Execute the exact command. Write the exact Host response inside the bound
wrapper:

```json
{
  "candidate_id": "doi:10.5555/tunnel.001",
  "ingest_payload_hash": "sha256:<gate-issued-hash>",
  "host_response": {
    "result": {
      "ingest": {
        "status": "created",
        "item": {
          "id": 101,
          "key": "ITEM101",
          "libraryId": 1
        },
        "hasPdfAttachment": true
      }
    }
  }
}
```

The Host response, not intent, determines:

- `created`, `existing`, or paper-specific `failed`;
- item id, key, and library id;
- whether a PDF attachment actually exists;
- attachment or status-tag warnings.

Never infer `attached` from the presence of `pdfUrl`. A download or attachment
may fail after item creation.

### Existing items

Record `existing` exactly as returned. Preserve the actual `itemRef`.
Deduplication by the Host is successful reuse, not a new creation. Attachment
and status-tag results remain those reported for the existing item.

### Ordinary paper-specific failures

A Host response whose ingest status is `failed` is a terminal outcome for that
candidate. Submit it and continue to the next prepared candidate. Preserve its
structured error in the final outcome.

### Fatal execution failures

If the Host command cannot start or authority for remaining writes is absent,
submit the gate-bound failure wrapper:

```json
{
  "candidate_id": "doi:10.5555/tunnel.001",
  "ingest_payload_hash": "sha256:<gate-issued-hash>",
  "status": "failed",
  "reason": "host_unavailable",
  "message": "The required Zotero Host Bridge mutation could not start."
}
```

Fatal reasons are:

- `host_unavailable`;
- `approval_denied`;
- `execution_blocked`.

They produce a canceled terminal state, preserve earlier candidate receipts, and
prevent later mutations. Do not convert a fatal run-level stop into several
invented paper failures.

## Idempotency And Replay

An exact stage payload or receipt replay is idempotent. The runtime compares
normalized action identity, discovery round where applicable, file path, and
content hash.

- Exact same bytes at the same issued path return the accepted state.
- Changed bytes for an accepted action are a conflicting replay and fail.
- A receipt copied to another candidate fails candidate binding.
- A correct receipt written to a non-issued path fails.
- A receipt with a different payload hash fails.
- A modified generated payload fails before mutation advancement.

When uncertain, rerun the initial gate. Do not resubmit from conversation
memory.

## Recovery Protocol

### Normal resume

1. Run `python3 scripts/gate_runtime.py --run-root "$SKILL_RUN_ROOT" --common-input "$SKILL_COMMON_INPUT"`.
2. Read `stage`, `next_action`, `allowed_actions`, `required_reads`,
   `discovery_round`, and `resume_packet`.
3. Read only the returned stage reference.
4. Use only the returned payload path and command.
5. After any accepted state change, rerun the initial gate.

### Blocker

`next_action: "blocked"` means no legal continuation command exists. Report the
structured blocker. Do not improvise around:

- invalid or corrupt state;
- input hash drift;
- missing accepted payload;
- accepted payload hash mismatch;
- generated ingest payload hash mismatch;
- wrong receipt candidate, path, or hash;
- conflicting replay.

### Corrupt state

The state file is the execution source of truth. If required keys, types,
candidate bindings, or stage invariants are corrupt, stop. Do not reconstruct
state from the ledger, result directory, or chat transcript.

### Input drift

The parameter input hash is bound at initialization. A changed query, mode,
breadth, language hints, or target collection is a different authorization
context. Stop and begin a distinct run instead of mutating current state.

### Context recovery

Conversation compression does not change the protocol. The gate's
`resume_packet` supplies current candidate ids, accepted paths, receipts, and
round. The agent must not mark a stage complete because it remembers doing the
work.

## Compact Ledger

Write `result/search-ledger.json` only after the terminal gate is reached. The
ledger is an audit summary and path index, not execution state.

Minimum useful content:

```json
{
  "querySummary": "隧道衬砌视觉检测",
  "inputHash": "sha256:<bound-input-hash>",
  "searchMode": "guided",
  "breadth": "broad",
  "languages": ["zh-CN", "en"],
  "discoveryRounds": [
    {
      "round": 1,
      "queryAttemptCount": 8,
      "sourceFailureCount": 1,
      "candidateIds": [
        "doi:10.5555/tunnel.001",
        "source:uncertain-002"
      ],
      "uncoveredGaps": ["traditional-Chinese terminology"],
      "stopReason": "scope_review_requested"
    },
    {
      "round": 2,
      "queryAttemptCount": 3,
      "sourceFailureCount": 0,
      "candidateIds": [
        "doi:10.5555/tunnel.001",
        "source:uncertain-002"
      ],
      "uncoveredGaps": [],
      "stopReason": "all_applicable_lanes_completed"
    }
  ],
  "scope": {
    "approvedCandidateIds": [
      "doi:10.5555/tunnel.001",
      "source:uncertain-002"
    ],
    "excludedCandidateIds": []
  },
  "candidates": [
    {
      "candidateId": "doi:10.5555/tunnel.001",
      "metadataPayloadPath": "runtime/stages/metadata-doi_10.5555_tunnel.001.json",
      "pdfPayloadPath": "runtime/stages/pdf-doi_10.5555_tunnel.001.json",
      "ingestPayloadPath": "runtime/payloads/ingest-paper-001.json",
      "receiptPath": "runtime/receipts/ingest-001.json",
      "ingestStatus": "created",
      "pdfStatus": "attached",
      "needsCuration": true
    },
    {
      "candidateId": "source:uncertain-002",
      "metadataPayloadPath": "runtime/stages/metadata-source_uncertain-002.json",
      "ingestStatus": "not_attempted",
      "pdfStatus": "skipped",
      "needsCuration": true
    }
  ],
  "terminal": {
    "status": "completed"
  }
}
```

Paths and counts must come from state. The ledger may include recorded hashes,
but must not duplicate full discovery, metadata, PDF, or Host evidence.

## Completed Output

Emit exactly one JSON object that validates against
`assets/output.schema.json`. Every important displayed candidate appears in
`outcomes`; every approved candidate has a terminal ingest status.

```json
{
  "kind": "literature_search_ingest",
  "status": "completed",
  "query": "隧道衬砌视觉检测",
  "search_mode": "guided",
  "searchSummary": {
    "breadth": "broad",
    "languages": ["zh-CN", "en"],
    "queryLaneCount": 4,
    "sourceLaneCount": 7,
    "uniqueCandidateCount": 2,
    "selectedCount": 2,
    "stopReason": "all_applicable_lanes_completed"
  },
  "outcomes": [
    {
      "candidateId": "doi:10.5555/tunnel.001",
      "title": "隧道衬砌病害智能识别研究",
      "candidateTier": "needs_curation",
      "discoverySources": [
        {
          "source": "China DOI",
          "url": "https://doi.org/10.5555/tunnel.001",
          "queryLane": "core"
        }
      ],
      "identifiers": {
        "doi": "10.5555/tunnel.001"
      },
      "decision": "approved",
      "ingestStatus": "created",
      "pdfStatus": "attached",
      "needsCuration": true,
      "itemRef": {
        "id": 101,
        "key": "ITEM101",
        "libraryId": 1
      },
      "landingUrl": "https://doi.org/10.5555/tunnel.001",
      "manualSearchLinks": [],
      "reasonCode": "native_creator_names_unverified"
    },
    {
      "candidateId": "source:uncertain-002",
      "title": "隧道衬砌检测方法研究",
      "candidateTier": "needs_curation",
      "discoverySources": [
        {
          "source": "University repository",
          "url": "https://repository.example.org/record/002",
          "queryLane": "multilingual"
        }
      ],
      "identifiers": {},
      "decision": "approved",
      "ingestStatus": "not_attempted",
      "pdfStatus": "skipped",
      "needsCuration": true,
      "landingUrl": "https://repository.example.org/record/002",
      "manualSearchLinks": [
        "https://repository.example.org/record/002"
      ],
      "reasonCode": "material_conflict_unresolved"
    }
  ],
  "searchLedgerPath": "result/search-ledger.json"
}
```

Outcome rules:

- `created` and `existing` use the actual Host `itemRef`;
- `failed` preserves the Host error;
- `not_attempted` preserves the metadata gate reason;
- `pdfStatus: "attached"` requires Host attachment confirmation;
- `missing`, `failed`, or `skipped` remain distinct;
- `needsCuration` reflects evidence and Host warnings;
- rejected, unselected, or unresolved displayed candidates retain an honest
  decision and terminal outcome without fabricated mutation data.

## Canceled Output

Stage 10 or Stage 30 user cancellation:

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "user_cancelled",
  "message": "The user declined the ingest scope."
}
```

Fatal Stage 70 cancellation:

```json
{
  "kind": "literature_search_ingest_canceled",
  "status": "canceled",
  "reason": "host_unavailable",
  "message": "The required Zotero Host Bridge mutation could not start."
}
```

Use the stable terminal reason and message returned by the gate. If earlier
candidate receipts exist, preserve them in the compact ledger; do not add them
to the canceled envelope unless the output schema explicitly supports it.

## Examples And Anti-examples

### Good: mixed multi-candidate completion

One candidate is created with an attached PDF, one exact duplicate is returned
as existing, one paper-specific Host mutation fails, and one metadata conflict
is `not_attempted`. The run is completed because every approved candidate has a
terminal outcome.

### Good: exact retry

After context recovery, the same receipt bytes remain at the issued path.
Submitting them again is idempotent. Rerunning the gate advances or returns the
same terminal state.

### Reject: payload edited after preparation

An agent adds a creator directly to `ingest-paper-001.json`. The hash no longer
matches. Restore the generated bytes or restart through an authorized metadata
action; do not update the hash.

### Reject: receipt reused for another candidate

The Host response for candidate A is copied into candidate B's issued receipt
path. Even if both records are `created`, the candidate and payload-hash
bindings differ. The runtime must fail closed.

### Reject: approval denied but reported as paper failure

Write authorization is denied before the remaining mutation can run. Submit
`reason: "approval_denied"` and return canceled terminal output. Do not invent a
Host paper result or continue mutations.

### Reject: Host unavailable but outcomes remain pending

Pending is not a terminal business status. Submit the fatal receipt, preserve
completed evidence, and return the canceled envelope.

### Reject: ledger repairs state

A state file is corrupt, but a ledger claims every candidate completed. The
ledger cannot authorize continuation or reconstruct hashes. Stop with the gate
blocker.
