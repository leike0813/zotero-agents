## Why

The isolated Synthesis sidecar has no Tag Vocabulary repository or application even though its environment-neutral validation/index engine and Host-effect contracts already exist. Moving the transactional Tag aggregate into shared application/repository foundations is the next WS5 priority-6 slice and prevents a second plugin-local implementation from becoming the shadow service source of truth.

## What Changes

- Add strict private Tag Vocabulary application contracts for bounded reads, validation, vocabulary replacement and entry mutation, staged suggestion management and promotion, index rebuild, regulator export, audit maintenance, admission stop, and shutdown.
- Consolidate Tag row contracts, DDL, CRUD, deterministic normalization and mutation decisions into shared repository/application sources of truth while retaining production-compatible plugin behavior.
- Extend the isolated Node repository with durable vocabulary, staged suggestion, audit, application-state, index-state, and Host-effect plan/receipt facts.
- Execute Tag validation and index construction through the existing bounded sidecar worker pool; promote results only when the captured vocabulary basis remains current.
- Commit staged promotion and pending Host effects atomically, dispatch effects only after commit, and preserve the committed vocabulary when the Host port is absent or fails.
- Compose the application privately after repository recovery and keep HTTP/RPC, `SynthesisClient`, Workbench routes, automatic invocation, production persistence, and production ownership unchanged.
- Keep checkpoint file export and Tag import preview/apply in the later WS5 import/export slice together with asset delivery and WebDAV orchestration.
- Extend focused integration, lifecycle, packaging, invariant, migration-inventory, and current-state documentation coverage.

## Capabilities

### New Capabilities

- `synthesis-sidecar-tag-vocabulary-application-foundation`: Defines the private isolated Tag Vocabulary aggregate, durable staged promotion/effect lifecycle, bounded worker computation, and production-disconnected composition.

### Modified Capabilities

None. Existing production capability requirements and public methods remain unchanged; their implementations and current-state documentation gain shared foundation coverage only.

## Impact

The change affects shared Synthesis contracts, application and repository packages, the isolated Node repository, worker protocol and service lifecycle, production compatibility adapters, package/build inventories, focused Core tests, and Synthesis architecture documentation. It adds no dependency, public protocol method, UI, preference, production database migration, checkpoint/import route, WebDAV behavior, Host adapter activation, WS6 canary, or WS7 cutover.
