# Proposal

## Why

Issue #26 C14 freezes the next reviewed Pi capability slice after C11: Zotero business mutations. The canonical Broker already owns mutation validation, previews, transactions and receipts, but Pi exposes only its fourteen reads. Exact-call approval also loses a replacement pending call when admission facts change.

## What Changes

- Add the twenty-three reviewed business tools (eleven default, twelve enhanced), with effect-free `dryRun` previews and full preflight before ordinary execution.
- Bind permission to the actual Broker plan and attachment snapshot; preserve renewed permission requests through Conversation and Workspace.
- Reuse owner-scoped file verification and stored-attachment staging for Workspace imports and replacements.
- Keep operation identity and full domain receipts durable; expose bounded semantic results and structured recovery facts.
- Author managed notes using semantic inputs and existing canonical artifact contracts, with Broker-generated Source Reference IDs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-zotero-tool-catalog`: reviewed mutation mappings, business schemas, bounds, authoring and receipt projection.
- `pi-tool-gateway-policy`: domain preflight, plan-bound exact approval and replacement pending handoff.
- `pi-trusted-native-execution`: immutable owner-scoped stored-attachment staging.
- `pi-conversation-integration`: durable mutation identity and receipt evidence, renewed permissions.
- `zotero-host-capability-broker`: prepared-plan identity and semantic managed-artifact authoring.

## Impact

Touches the existing Gateway, Native catalog, native file adapter, Broker/managed-note contracts, Conversation and permission projection, plus their existing tests and domain documentation. No dependency, persistent artifact schema, generic batch API, release or Git commit is added. Targeted real Zotero acceptance is included; the full Workspace E2E and platform matrix remain C20 work.
