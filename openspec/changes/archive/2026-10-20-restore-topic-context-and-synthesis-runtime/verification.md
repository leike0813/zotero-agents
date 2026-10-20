# Verification

## Root cause and final behavior

The `57dc41f81` native migration narrowed get-context to required topicId/view and artifact detail. Graph-owned plans remained available to planning reads, but could not cross the context result schemas. Public list/resolver inputs also reached strict native rebuilders before defaults and selector normalization. These are regressions relative to `57dc41f81^`, rather than expired topic identities.

Native context now projects planned and materialized DTOs separately, preserving planning and discovery evidence. The host adapter restores optional-view flat reads, includes, aliases, intent echoes and file/archive delivery. Public mixed inventory shares one projection; native artifact lists retain their original meaning. Read failures and incomplete scans propagate instead of masquerading as an empty complete inventory.

Create uses the existing buildRequest lifecycle after submission admission to capture a complete planned snapshot. The producer removes inactive parameters and names the actual selected target. Prepare consumes that snapshot without another plan read or duplicate check. Ad-hoc identity selection and final no-overwrite/CAS checks remain in place. Update preparation uses semantic/digest/audit and all resolver pages; metrics are optional.

ACP final-state writes serialize by runtime directory and refresh current canonical state after apply/detach. Previously recorded stderr/transport diagnostics survive. Canonical success cannot acquire an error from a stale close snapshot. The final transcript projection and marker stripping remain unchanged: raw output and completion evidence already exist in output revisions/ACP updates.

## Executed checks

- Current-source sidecar: `cargo +nightly-2026-07-25 build --locked --manifest-path rust/synthesis-sidecar/Cargo.toml -p synthesis-sidecar` passed.
- Real production Topic routes: all 14 tests in `239-synthesis-topic-mutations.test.ts` passed, including planned four views, stale planning reads, real buildRequest snapshot construction, public Bridge inventory, internal artifact list isolation, flat includes, canonical update and stale apply rejection.
- Read/client/export/workflow-seam suites (`123`, `175`, `182`, `220`, `239`, `48`) passed together: 207 tests. Numeric paging, complete no-selector inventory beyond one page and public remote-delivery contract checks also passed in the full `123` suite (22 tests).
- Request/renderer suites (`124`, `153`, `builtin-skill-request-contracts`) passed together: 108 tests; 44 validated production Skill/schema boundaries. Unused namespaces are explicitly reported by the existing harness.
- Generated split runtime suite (`155`) passed: 18 tests. Snapshot missing/mismatch, update definition/scope/discovery, resolver pages/errors/nonadvancing cursor, empty result and optional metrics failure are exercised through the runtime/gate seam.
- ACP compatible runner suite (`107`) passed: 199 tests. Both successful and failed apply survive late close audit writes; the existing transcript projection/raw revision tests remain green.
- Host Bridge agent surface suite (`169`) passed: 15 tests.
- TypeScript root and synthesis-contracts checks passed. Changed-file ESLint passed. Rust application Clippy with `-D warnings`, focused Topic application test and workspace rustfmt check passed.
- Builtin workflow manifest, canonical validators, Topic Workbench surface parity and strict OpenSpec validation passed.
- Topic skill regeneration compared 41 delivered files against fresh isolated renderer output: zero differences. Host Bridge content/baseline-relative package gates and review mirror checks passed.

## Limits and release inputs

No installed plugin or original failing runtime workspace was modified. No commit, push, dependency change or publication was performed.

The plugin build preflight found seven-platform Synthesis bundles and the Host Bridge CLI release manifest with source fingerprint mismatches, plus a published dev Content Package whose semantics differ from the local modified content. The Windows ACP bridge freshness check passed. A fresh local debug sidecar was used for native tests. No XPI build or real Zotero/ACP backend E2E was performed, because this working tree does not yet have synchronized release inputs. These checks do not grant commit, push, prebuild dispatch or publication authority.

The full cross-language checker reported no contract errors and all 480 entry obligations covered. Recursive structure coverage was 14393/14671; actual workflow-producer execution coverage was 0/10 in that check's collected evidence. Its overall result remains incomplete. Real targeted route/producer tests do not establish 100% protocol coverage, and no such claim is made here.
