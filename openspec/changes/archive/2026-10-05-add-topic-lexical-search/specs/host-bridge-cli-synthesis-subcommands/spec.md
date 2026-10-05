# Spec Delta

## ADDED Requirements

### Requirement: CLI SHALL expose Topic lexical search

The Host Bridge CLI SHALL expose `zotero-bridge synthesis topic search` as a read-only command that invokes the existing `topics.search` capability and returns its shared bounded result.

#### Scenario: CLI executes Topic search
- **WHEN** a caller invokes `zotero-bridge synthesis topic search --query <json>` with a valid Topic search request
- **THEN** the CLI calls `topics.search` and preserves the query object, cursor, and result DTO without renaming the JSON `--query` container

#### Scenario: CLI receives invalid search input
- **WHEN** the request query is empty or violates the search bounds
- **THEN** the CLI reports the stable capability error and does not substitute Topic list or source-reference lookup

#### Scenario: CLI continues a search cursor
- **WHEN** the caller passes the opaque `nextCursor` in the next `--query` object
- **THEN** the CLI forwards it unchanged and surfaces stale or expired cursor errors without retrying the search
