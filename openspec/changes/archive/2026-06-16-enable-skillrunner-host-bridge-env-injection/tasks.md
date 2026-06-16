## 1. OpenSpec Contract

- [x] Add proposal, design, tasks, and delta specs for CLI/profile and
  SkillRunner request semantics.

## 2. CLI And Profiles

- [x] Add CLI endpoint env fallback before profile endpoint.
- [x] Accept profile `connectionMode`.
- [x] Mark local profiles as `local` and remote profiles as `remote`.

## 3. SkillRunner Env Injection

- [x] Build remote Host Bridge env from LAN `remoteEndpoint`.
- [x] Inject `ZOTERO_BRIDGE_ENDPOINT` and `ZOTERO_BRIDGE_TOKEN` into
  `runtime_options.env`.
- [x] Preserve unrelated env entries and strip `runtime_options.zotero_host_access`.
- [x] Fail preparation when LAN remote endpoint requirements are not met.

## 4. Documentation

- [x] Update Host Bridge CLI docs.
- [x] Update Host Bridge prompt/injection docs.

## 5. Verification

- [x] Add/update Rust and TypeScript focused tests.
- [x] Run Rust CLI tests.
- [x] Run focused mocha tests.
- [x] Run TypeScript check.
- [x] Run OpenSpec strict validation.
- [x] Run `git diff --check`.
