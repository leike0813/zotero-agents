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

## Downstream dependency boundary

`remove-synthesis-plugin-legacy-owner` and
`remove-synthesis-node-sidecar-stack` both declare this change as a
prerequisite. They retain their own deletion work and do not treat this
baseline as authorization to delete either inventory.
