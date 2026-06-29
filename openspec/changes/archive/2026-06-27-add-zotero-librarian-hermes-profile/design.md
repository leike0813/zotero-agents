## Profile Boundary

`zotero-librarian` is a Hermes profile distribution, not a Zotero Agents ACP
backend preset. It uses the published `zotero-bridge` CLI to call the Zotero
Agents Host Bridge and stores its own library metadata index under the Hermes
profile state directory.

The profile is distributed as an isolated branch with its own `distribution.yaml`,
Hermes instructions, skills, cron templates, helper scripts, Host Bridge profile
example, and platform CLI prebuilds. Runtime data such as SQLite indexes,
memories, sessions, logs, and credentials are excluded from the profile source
and publish branch.

## Library Indexing

The profile owns an agent-side SQLite index. Host Bridge exposes the current
Zotero facts through a read-only `library.sync_snapshot` capability. The CLI maps
that capability to `zotero-bridge library snapshot --input <JSON_OR_FILE>`.

The snapshot capability returns only metadata and structure fields needed for
library management: stable refs, bibliographic identifiers, tags, collections,
and note/attachment counts. It does not index PDF text, attachment content, full
note bodies, or Zotero storage paths.

The helper script performs atomic refreshes by paging through CLI snapshot
responses, writing to a temporary table, and replacing active rows after a
successful refresh. Items missing from the latest refresh are marked deleted.

## Workflow Catalog And Run Monitoring

Release-time rendering creates a static catalog from bundled workflow manifests.
At runtime the profile can refresh the catalog by calling `workflow list` and
`workflow describe` for new or changed workflows. The catalog records selection
requirements, workflow option fields, provider profile expectations, and command
examples for direct submit.

Workflow submit results are registered locally by `run-register`. The recurring
`run-monitor` job reads active runs and calls `workflow run <runId>` until a
terminal state is observed.

## SSOT Rendering

Host Bridge capability documentation remains sourced from
`src/modules/hostBridgeCapabilityRegistry.ts` and Rust CLI command mappings.
The existing `HostBridgeSurfaceCatalog` feeds all generated Host Bridge surfaces,
including the new profile references.

Bundled workflow catalog text is generated from `workflows_builtin/**/workflow.json`
and package metadata. Generated sections use stable markers, and check scripts
fail if rendered profile references drift from their source registries.

## Release

The profile publisher copies the profile source tree, `addon/bin` CLI prebuilds,
the generated Host Bridge profile example, and a manifest into
`host-bridge/zotero-librarian-profile`. The publisher fails when expected
prebuilds are absent instead of building binaries locally.
