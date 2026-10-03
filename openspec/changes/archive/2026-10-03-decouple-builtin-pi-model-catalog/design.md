# Design

## Context

See proposal.md for motivation and the linked decisions for approved scope. Baseline `c71acbc4` has Pi core/ai 1.0.0, OMP 18.0.11, an offline overlay cache and credential-bound in-memory discovery. The plugin has runtime filesystem, encrypted identity revisions, dynamic Pi composition, canonical JSONL and isolated Preact regions. Node facilities remain tooling-only.

## Goals / Non-Goals

**Goals:** one declarative metadata interpretation; one profile-scoped source owner; offline-first availability; immutable turn evidence; bounded state and IO; source-isolated concurrency; accounting that does not turn missing facts into free usage.

**Non-Goals:** SIWC replacement (Change C), new execution APIs or auth, remote code/headers, content-package installation, new Agent or history stores, full C20 release certification.

## Decisions

1. Shared project DTOs own metadata, provenance, applicability, capability knowledge, pricing and input constraints. The pure `piModelCatalogData.ts` normalizer is shared with the maintenance script; its `src/shared/piModelMetadata.ts` leaf also validates canonical owner facts. SDK types stay at execution boundaries; allowlists validate understood declarative fields and discard harmless unknown fields. Unknown request-shaping fields make a model unsupported. Unsupported protocols remain queryable but are not executable. Numeric legacy sentinels are accompanied by explicit knowledge; estimates retain unknown values.
2. The official fixed seed uses the same raw representation and normalization as online data. Remote successful snapshots replace the public base completely, including empty snapshots. Only configured missing models retain their validated description separately. Binding snapshots are captured from the old seed/cache before remote adoption; a changed upstream endpoint cannot redirect a saved credential.
3. `piModelCatalog.ts` owns per-profile source state, current/previous raw public snapshots, adopted overlay and identity-scoped discoveries. Existing atomic runtime IO persists an envelope before publishing. Public 30-second/8-MiB streaming reads, bounded local reads, real runtime version, ETag and one full-response retry after unusable 304 follow the approved protocol. Generation checks and a serial commit lane protect restore/remove/shutdown and cross-source updates. Known retirement facts survive public rollback.
4. One public request and one request per discovery identity are shared. Per-window cancellation releases the waiter; the owner cancels when no authorized waiter remains. Background checks use the latest attempt time and four-hour interval. Lifecycle starts from offline data and stops timers/requests. Credential identity replacement invalidates persisted facts; token renewal does not change identity.
5. Configuration resolves target/auth-applicable facts and deep-freezes them. Safe canonical turn metadata omits URLs/credentials and supports invocation/preparation references; the managed binding retains a versioned target reference. A new continuation revalidates the last actual choice rather than global defaults; the old tool batch and effect checks remain unchanged.
6. Provider mapping uses frozen compat, thinking mapping, prices, limits and defaults. Request byte/image limits are checked before transport; unknown price does not become a project zero estimate. Runtime records provider usage per invocation and projects estimates with one calculation rule. Normal, compaction and title uses retain their own purposes and frozen selections; aggregate completeness survives rebuild and does not depend on current prices.
7. Backend Manager receives bounded safe source state and query results. Catalog changes have independent actions/request IDs; form draft/default state survives status/candidate changes. Lifecycle/status subscriptions refresh only the affected managed region. Existing UI wiring and localization are extended.
8. Maintenance monitoring checks official supply using the same normalizer and declared current/candidate runtime versions, de-duplicates versions and reports safe classifications. Explicit seed preparation uses fixed input/provenance. Build and deterministic tests do not fetch the network.

## File Ownership and Verification

- Main: shared provider DTO, pure normalizer, seed, catalog owner, catalog/runtime IO tests, lifecycle wiring and final integration.
- Provider slice: configuration binding/migration and execution mapping; tests 242/246.
- Owner slice: runtime/preparation, Conversation/Skill Run continuation, canonical metadata/usage and safe workspace projection; tests 240/241/247/256/257/270.
- UI slice: Backend Manager host/access/wire/page handlers/region, locales and tests 251 plus existing Zotero UI wrapper.
- Tooling slice: explicit seed/compatibility script/workflow and documentation; shares main normalizer.

Each implementation slice first extends an existing public-seam behavior test, observes failure, implements and reruns. Run affected shards, dashboard checks, type checks, lint/format, browser guard and build. Existing Zotero core/full runners carry official HTTP and fixed-runtime A-to-B behavior evidence. Record actual local host identity and missing target/service evidence; C20 retains full clean-candidate matrix tasks.

## Risks / Trade-offs

- Upstream required request semantics not implemented locally → mark unsupported, never copy arbitrary headers or new routing authority.
- Persisted public cache is untrusted → re-normalize on load, try previous then seed; no extra signature system.
- Official seed omits a saved OMP model → retain its validated configured description; otherwise require explicit repair, never guess a new endpoint/model.
- Legacy history lacks actual rates/usage → preserve it with incomplete estimates; never price it using today's catalog.
- A full host matrix and real accounts may be unavailable locally → record evidence bounds and keep C20 unfinished.

## Migration Plan

Capture old validated connection/model descriptions before the first refreshed official adoption, keep configuration identities/defaults/credentials and history, then use the official seed/cache for recommendations. `src/config/piModelCatalogMigration.json` pins compact connection/capability facts from the original OMP 18.0.11 catalog solely for already saved configurations; it is not a public recommendation source or a maintained second directory. A migration with no trustworthy original target preserves the configuration and defaults with `repairRequired`, and refuses a new turn until explicit repair. Existing adopted overlay is read-only and validated before reuse. New cache schema preserves current/previous and source state. Configuration-binding changes receive their own revision. SDK-native objects, secrets and paths never enter canonical metadata. Removal of OMP dependency uses a reviewed manifest/lock edit and an offline build.
