## Context

`exportTopicSynthesisReport` is the only remaining standalone Workbench report read and still calls `getDefaultSynthesisService().getTopicReport`. The contracts package, in-process client, legacy composition, and Workflow Host already expose `SynthesisClient.topics.getTopicReport`, including JSON normalization and stable client error handling. The Workbench can therefore consume the existing capability without changing any service or client interface.

Progress polling is intentionally separate: `getSynthesisBackgroundJobRows` currently performs stale-operation reconciliation before returning rows, so it is not yet a pure query boundary. Commands and mutations also remain direct legacy consumers.

## Goals / Non-Goals

**Goals:**

- Route Workbench Topic Report export through `SynthesisClient.topics.getTopicReport`.
- Preserve all validation, report interpretation, file selection, filename, write, newline, and command-lifecycle behavior.
- Keep the client and service public contracts, service inventory, method count, and direct-consumer allowlist unchanged.

**Non-Goals:**

- Add a Workbench-specific report method or modify Topic Report DTOs.
- Migrate progress polling, stale reconciliation, commands, mutations, Host Bridge, or MCP.
- Change runtime process, database, canonical file, mirror, or Zotero ownership.

## Decisions

### 1. Reuse the existing topics capability directly

The Workbench resolves the default client lazily inside `exportTopicSynthesisReport` and calls `client.topics.getTopicReport({ topicId })`. Topic Reports are a topics-domain query already shared with the Workflow Host, so no Workbench facade or duplicate capability is introduced.

Alternative: add `workbench.readTopicReport`. Rejected because it would duplicate the established topics contract and create two public owners for the same domain read.

### 2. Change only the report read boundary

The existing topicId guard remains before client resolution. Report Markdown and title extraction, unavailable-body failure, file-picker cancellation, safe filename generation, newline normalization, and runtime file write remain in their current order and owners.

Alternative: refactor the complete export pipeline. Rejected because export presentation and host file effects are unrelated to the transport migration and would expand regression risk.

### 3. Retain the service method and migration inventory

`getTopicReport` remains a public service method behind the in-process client and for other recorded consumers. The Workbench also continues to call the legacy service for progress, commands, and mutations, so the public method count stays 125 and the direct-consumer allowlist stays at four.

Alternative: remove the service method. Rejected because the current in-process client composition and non-Workbench consumers still depend on it.

## Risks / Trade-offs

- **Client error normalization could alter thrown error identity** → Preserve the original message and cover the existing in-process route with client regression tests; user-visible command reporting already consumes message semantics rather than error class identity.
- **Static routing can regress back to the service** → Add Workbench and service-boundary guards for the exact export helper.
- **The remaining direct service dependency can obscure progress** → Update current-state documentation to list only progress polling, commands, and mutations as remaining Workbench legacy scope.

## Migration Plan

1. Add failing Workbench and boundary assertions for topics-client report routing.
2. Replace the single legacy report call with the existing client capability.
3. Update current-state documentation and run focused through production validation.

Rollback restores the one Workbench service call; no persisted data migration is involved.

## Open Questions

None.
