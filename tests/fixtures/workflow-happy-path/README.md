# Workflow happy-path fixtures

`WF-01` uses these synthetic inputs and external ACP/HTTP peers with the real
Zotero workflow engine, Host APIs, apply hooks, and current-source Rust sidecar.
The public workflow boundary is separate from the ACP fault scenarios.

All 20 non-debug workflows have reviewed successful live evidence. The admitted
contract covers terminal execution and apply, managed-note ownership, readable
attachments and image companions, product assets, collection membership,
metadata identity, ingestion, planned-topic materialization, and a topic's
fresh → stale → fresh transition. Bundle import creates independent parents;
note import must restore four managed kinds into a parent with no notes.

`contract.json` fixes scenario coverage and structural outcomes. It contains no
real titles, authors, body text, local paths, source identities, or databases.
The source tree and all simulated prose are wholly synthetic. Do not copy live
workspaces or raw outputs here. Actual private evidence remains outside the
repository. Failed and interrupted attempts are excluded from the contract.

The peers choose deterministic valid content. Assertions cover observable
business state, schema validation, final apply and asset readability; wording,
model reasoning, tool ordering, repair counts, optional bibliography fallback,
and optional enrichment failures are not golden expectations.

Use the existing `npm run test:zotero:e2e` runner with
`ZOTERO_TEST_GREP='System E2E runner foundation|WF-01'` and an explicit Zotero
executable. Offline is the default. `ZOTERO_WORKFLOW_E2E_MODE=live` requires the
private capture inputs documented in `docs/dev/zotero-e2e.md`.

ACP sessions are closed in family cleanup. Durable synthetic literature,
topics, products and terminal receipts remain declared family carry-over in
the disposable test profile for diagnosis; the runner stages a fresh profile
for each independent invocation.
