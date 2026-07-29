# Synthesis R9a retirement baseline

## Source identity

- Source commit: `f4e3650530c7cdcb2ad6c355aa83b33f3df77b7c`
- Production capability fingerprint: `0e8e1f406d382d24183a3ac078254d966aba7c1d2d15fe82cac347a192f1f372`
- Capability manifest SHA-256: `bce2277d49025cbdfa8574cc0c781ff275732262dfc2048ff1010d8dd837e680`
- Operation metadata SHA-256: `ddeed19ff70db6eeeca34c9c19ef3c227c44c64ea4514656e3e3458c17bab28b`
- TypeScript and Rust ready rosters each contain the same closed 95-operation
  set as `synthesis-production-client-v1/capabilities.json`; its fingerprint is
  the roster identity above.

## Durable surface corpus identities

| Surface | Operations | SHA-256 |
| --- | ---: | --- |
| Topic/Workbench | 18 | `c47fa459a7b7673bbb2447721e4d4e8cce27cf7609c6f0dfe2ef2ca6608e799c` |
| Citation Graph | 12 | `2a751bc7bc736be128f9e151e69a70b555cc15ff05e0971523731cc544a299d5` |
| Reference/Canonical | 16 | `a3649a6c2976c11fd81cdc5d5e380f85c2d27cae6ae335a21d9d6a8a6b676577` |
| Tag | 19 | `eb910a47c779a4ec1f3c9a4cfa08f407c895972073130034e10a508cd246f82c` |
| Concept/Topic Graph | 9 | `7cdd2a2562141127b55d288289bb8e1e214243cc4f02273a75831584a6fc68f3` |
| Artifact/Library/Debug | 12 | `e67714d92b97a187a63c77b6dd816fdcbf5aa44beb54cd0102922825fee44872` |
| WebDAV/Maintenance | 9 | `d3ae82b40d965ea63ba48fc226578bcbd424e56eea6a21b065eb35b724538fec` |

The seven corpora partition all 95 operations. Artifact/Library/Debug is a
current-state product corpus; no checker reads its historical ownership record.

## Retained deletion inventory

The plugin owner inventory for `remove-synthesis-plugin-legacy-owner` is:

- `src/modules/synthesisClient/legacyComposition.ts`
- `src/modules/synthesisClient/inProcessClient.ts` (its neutral adapter must be
  extracted before the owner-specific implementation is removed)
- `src/modules/synthesis/service.ts`
- `src/modules/synthesis/repository.ts`

The external Node owner inventory for `remove-synthesis-node-sidecar-stack` is
the complete `apps/synthesis-service` workspace: its package and TypeScript
configs plus the 23 files under `apps/synthesis-service/src/`. Neither inventory
has been deleted by this change.

## Focused gate baseline

The archive-independent production capability checker and all seven surface
parity checkers pass from current contract and source paths. The focused Core
suite for `220`, `229`, and `230`–`235` passes 18 tests. The initial
pre-repair capability checker failed because it read the absent active
`cut-over-synthesis-production-owner-to-rust` change directory; that path is
not part of the repaired gate.

## Seven-platform prebuild evidence before asset-layout migration

The completed build-only prebuild is bound to the source identity immediately
before the platform-first add-on layout change:

- Repository/ref: `leike0813/zotero-agents`, `dev-refactor`
- Local and remote source SHA:
  `777401f05a635237a0d0da22fe93acb6b344d568`
- Workflow/run:
  `prebuild-synthesis-sidecar-runtime.yml`, run
  [`30437128176`](https://github.com/leike0813/zotero-agents/actions/runs/30437128176)
- Request ID: `ssp-2026-07-29-dev-refactor-fresh-v14`
- Result schema/artifact:
  `synthesis-sidecar-runtime-prebuild-result.v2`,
  `artifact/synthesis_sidecar_prebuild_result_20260729.json`,
  SHA-256 `ef1767618c8e6c27e35e95afd1b12925cc3437511504a03eef14e4a871624806`
- Build fingerprint:
  `5136480a56dfa1ab8c2d95c7c1cead7221c2e072e36c515bfc3b36be5f3d3335`
- Rust source fingerprint:
  `a124776332ad57cbd26f6b226690e88f6466ae88ec5f74e0911043ca8c9401a0`
- Cargo lock SHA-256:
  `ff91fdcf6949880da14c82907b72ae531fdebebf88c391ab3c43c31db6519c54`
- Aggregate:
  `f7ca685fe05b09751e8ff028c0496d49f39dcdd3b3f3c9b321adf24090bb7b56`
- Prebuild commit:
  `20c72001686ffa3d1f3d7ddcf396318c70389299`
- Immutable set:
  `sets/f7ca685fe05b09751e8ff028c0496d49f39dcdd3b3f3c9b321adf24090bb7b56`
  on `synthesis-sidecar-runtime-prebuilds`
- Cache: zero hits; all seven targets were cache misses and were built by this
  run.

| Target | Bundle ID | Archive bytes | Archive SHA-256 |
| --- | --- | ---: | --- |
| `darwin-arm64` | `044a1964eb3175cd638ee3129066772d5351b6063ace387e6bfc3f199aca8b75` | 2,106,124 | `81641accc9f92f65b8a5f2c731e228d29b3029682335afec64e642809d8fec55` |
| `darwin-x64` | `56f550bc318128b4cc29118d3df5a81217a880e4385bf210b3be099f79c74620` | 2,265,940 | `3a8d72030836c770bf9e063df0e2b49ca3a4e2bc4c0c666145bad8161d635a24` |
| `linux-arm` | `106ea046a97c71f144091ba2e376de832597200edfc89c3bc5bdbd869799cf98` | 2,402,586 | `4ce8af3078c502f1484cbe9eaba0de7b10789c27f120291103745d091f0e3b40` |
| `linux-arm64` | `7dc401b1c01830004afd464a832af56b3fa0d279b1a96d0077d4a4a112dd4fc7` | 2,340,173 | `eb2341565b967ac9f0dd1c7ff04741249f299733a17359a2a1fd0c77f73919df` |
| `linux-x64` | `04ea7b86ba535f048b73b091e230d40458c243407e49b39c8d67b305bc0ab3c1` | 2,508,249 | `d1c095015838cfb4b803b5f771fffcb08f3f38853ca1081810e9b09fd7e6d753` |
| `linux-x86` | `1ce4afbec83bfffae026c89f23ee0c7d882f4704dd139b878d599e82dd2c4242` | 2,617,697 | `ebb3e2aad97c9ca39465c6416a54b7fa91c3549d120e690327665a78cb0a8d5d` |
| `win32-x64` | `b412afb4f65b15bba0c080b2f2c767c6a3406fabb8a78774d74c01ccec80a8e7` | 2,216,048 | `9c4f50b8e9c6b9f0dff815cc52666c7f8756a6c88e06a57366efd71f6fee5818` |

The aggregate archive size is 16,456,817 bytes. This is pre-deletion evidence,
not signing, final XPI, upgrade/offline-install, release, Stage-1 completion,
or Gitee evidence. The verified set was synchronized transactionally to
`addon/bin`, with each bundle at
`addon/bin/<target>/synthesis-sidecar/`; tracked Host Bridge assets retained
their bytes and the obsolete `addon/bin/synthesis-sidecar` root was removed.
The platform-first materialization change modifies current fingerprint inputs:
the post-change build fingerprint is
`9cea52483ab180a82ee19c1a629daf4442974fb72d8f5386386a63335b0aef6c`
and the post-change Rust source fingerprint is
`44e45f0fc993bbe0e64fa104ef25f273cdc87351a4ee2242f3b452ae90148545`,
while this run carries `5136480a...`. The required freshness command therefore
fails closed on all seven targets, as intended, and this run cannot satisfy the
final freshness gate for the post-change source. A new seven-platform prebuild
and representative clean-machine results remain required before the R9b
decision gate can be accepted.

## Downstream dependency boundary

`remove-synthesis-plugin-legacy-owner` and
`remove-synthesis-node-sidecar-stack` both declare this change as a
prerequisite. They retain their own deletion work and do not treat this
baseline as authorization to delete either inventory.
