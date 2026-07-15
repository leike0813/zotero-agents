# Synthesis Sidecar Stage 1 Baseline

> Captured: 2026-07-15
>
> Change: `define-synthesis-sidecar-service-boundary`
>
> Scope: current in-process behavior before client, process, persistence, or ownership migration

## Boundary Inventory

| Measure | Baseline |
| --- | ---: |
| Public methods returned by `createSynthesisService()` | 126 |
| Direct production consumers of the full service module/type | 10 |
| `service.ts` lines | 21,265 |
| `repository.ts` lines | 9,329 |
| `uiModel.ts` lines | 4,716 |
| `synthesisWorkbenchTab.ts` lines | 3,460 |
| Active `synt_*` tables created by the repository | 38 |

The reproducible inventory is
`doc/synthesis-layer/contracts/service-api-migration.yaml`. Run:

```bash
npm run check:synthesis-service-boundary
```

Expected result: 126 public methods, 10 direct consumers, and no missing,
unknown, duplicate, or invalid entries.

## Storage and Ownership

- Current production DB: `state/synthesis.db`.
- Current schema version: `2026-06-01.sidecar-cache-hard-cut`.
- Current production owner: Zotero plugin process.
- Topic canonical source: `topics/<topic-id>/current/**`.
- Zotero note shards: mirror/recovery representation, not the ordinary runtime
  read source.
- `synt_operation` is operation progress/history; `synt_cache_basis` is cache
  readiness.
- No `packages/` or `apps/` workspace exists at this baseline.
- No Synthesis Node service, HTTP/SSE protocol, worker pool, owner lock, or
  product-owned Node runtime exists at this baseline.

Reviewable fixtures:

- `test/fixtures/synthesis-sidecar-migration/schema-baseline.json`
- `test/fixtures/synthesis-sidecar-migration/canonical-topic-tree.json`
- `test/fixtures/synthesis-sidecar-migration/bounded-dto-baseline.json`

## Correctness Baseline

```bash
npm run test:synthesis:invariants
```

Result: 21 passing. The command now references the current 121/143 test names
and uses a 10-second timeout for the large Workbench setup hook.

```bash
./node_modules/.bin/tsx node_modules/mocha/bin/mocha \
  "test/core/168-synthesis-sidecar-boundary.test.ts" \
  --require test/setup/zotero-mock.ts --exit
```

Result: 6 passing. It covers method inventory parity, valid dispositions,
direct-consumer growth, and migration fixtures.

## Performance Baseline

```bash
./node_modules/.bin/tsx node_modules/mocha/bin/mocha \
  "test/core/149-synthesis-benchmark-datasets.test.ts" \
  "test/core/150-synthesis-performance-budget.test.ts" \
  --require test/setup/zotero-mock.ts --timeout 30000 --exit
```

Result: 8 passing in approximately 4 seconds on the capture host. The suite
includes deterministic 1k/10k datasets, bounded 10k-paper read/review paths,
surface isolation, bounded reference refresh, and no startup drift fan-out.

The current suite does not measure cross-process payload size, worker CPU/RSS,
event-loop lag under worker saturation, cancellation latency, parent lease, or
service lifecycle. Those metrics become required in the runtime/parity changes;
absence here is a baseline gap, not a passing sidecar result.

## Development and Deployment Baseline

- Capture runtime: Node `v24.12.0`, npm `11.6.2`.
- Production plugin target remains Firefox/Zotero; Node-only modules are not
  available inside the plugin runtime.
- The current plugin package contains Host Bridge native assets but no bundled
  Synthesis Node runtime.
- Clean-machine/no-system-Node, runtime corruption, partial upgrade, parent
  death, crash-loop, worker saturation, and service shutdown tests are not
  applicable until `add-synthesis-sidecar-runtime`.
- Production DB/canonical cutover and restore rehearsal are not applicable until
  `cut-over-synthesis-sidecar-ownership`.

## Baseline Interpretation

Later changes must preserve the observable correctness and bounded-read
semantics above. They may update method count, direct-consumer count, schema,
fixtures, and performance measurements only together with the corresponding
OpenSpec requirements and migration disposition. A passing in-process baseline
does not authorize production sidecar ownership or dual writes.
