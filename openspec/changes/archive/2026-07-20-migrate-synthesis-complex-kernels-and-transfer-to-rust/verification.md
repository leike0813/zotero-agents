# R5 Acceptance Evidence

Date: 2026-07-20

Implementation commit: `0adb1ab1a06768bf3c14db6c20e32d89231ac954`

Rust source fingerprint: `8fc770a19fa059d3d47dbd0e3b27135360fe4e005ba16329aa9672740eb24c80`

## Local acceptance

- `cargo +stable fmt --all -- --check`
- `cargo +stable clippy --workspace --all-targets --locked -- -D warnings`
- `cargo +1.92.0 test --workspace --locked`
- `npm run check:synthesis-cross-language-contracts`
- TypeScript checks for contracts, engine, application, and service
- `npm run build:synthesis-service`
- `npm run test:node:synthesis-sidecar:stage1` (all 44 Core 175–218 files)
- `npm run check:synthesis-service-boundary`
- `npm run test:synthesis:invariants`
- changed-file ESLint and Prettier checks
- `git diff --check`
- `openspec validate migrate-synthesis-complex-kernels-and-transfer-to-rust --strict`
- fourteen-operation release worker smoke

Repository-wide `npm run lint:check` reports only four unchanged pre-existing Prettier findings: Core 164, Core 172, Core 173, and workflow literature workbench Core 48. No R5-changed file has an ESLint or Prettier failure.

The local Linux x64 candidate is 839,579 compressed bytes, below the 15 MiB gate. The final three-run resource results are recorded in `artifact/synthesis_reference_resolution_r5_migration_baseline_20260720.md`.

## Remote acceptance

GitHub Actions run: https://github.com/leike0813/zotero-agents/actions/runs/29750812676

| Target | Compressed bytes | Worker smoke |
| --- | ---: | --- |
| Windows x64 | 694,928 | passed |
| macOS x64 | 764,844 | passed |
| macOS arm64 | 715,190 | passed |
| Linux x64 | 839,717 | passed |
| Linux arm64 | 806,844 | passed |
| Aggregate | 3,821,523 | 75 MiB gate passed |

R5 is implemented and accepted. The change remains unarchived; R6 layout, R7 durable parity, R8 native lifecycle, and R9 production cutover remain future work.
