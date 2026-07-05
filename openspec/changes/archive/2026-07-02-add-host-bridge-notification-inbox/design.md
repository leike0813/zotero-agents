# Design

## Event Source

The inbox is an in-memory Host Bridge module for v1. It stores a bounded list of
lightweight notification events for the current Zotero plugin runtime and tracks
acknowledgement timestamps. The inbox is the state source; external delivery is
left to a later webhook change.

Events are projected from existing workflow/task/skill-run control surfaces.
Listing or waiting refreshes projections before reading from the inbox, so
agents can observe state changes without a long-lived stream.

## Event Shape

Events contain:

- `eventId`
- `createdAt`
- `type`
- `summary`
- optional workflow/skill run handles and metadata
- optional `state`, `liveness`, and `actions`
- `relatedHandles`
- nullable `acknowledgedAt`

Events must not include transcripts, local workspace paths, full provider
errors, provider private payloads, tokens, or raw request/response bodies.

## Filtering

`GET /bridge/v1/notifications` supports filtering by workflow run id, skill run
id, type, since event id, acknowledged state, and limit.

`sinceEventId` is a bounded list filter marker, not a streaming cursor. Unknown
markers behave as "no marker" for v1 so callers can recover by listing recent
events.

## CLI Wait

`zotero-bridge run notification wait` polls `GET /notifications` until a
matching event exists or timeout expires. It returns a single JSON object. On
timeout it returns a stable CLI error code.

## Retention

V1 retention is count/age bounded in memory. `ack` marks events as consumed but
does not delete them.
