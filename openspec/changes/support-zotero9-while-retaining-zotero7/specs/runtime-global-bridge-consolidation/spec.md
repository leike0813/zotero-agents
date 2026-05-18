# runtime-global-bridge-consolidation

## MODIFIED Requirements

### Requirement: Runtime bridge 必须提供一致降级语义

当桥接能力不可用或不同 Zotero 版本暴露的宿主 API 不一致时，系统 MUST
使用统一降级行为，避免模块间分支漂移。

#### Scenario: Delay helper works across runtimes

- **WHEN** code needs an async delay
- **THEN** it SHALL call the shared delay helper
- **AND** it SHALL NOT directly depend on `Zotero.Promise.delay`.

#### Scenario: Subprocess helper feature-detects modern and legacy modules

- **WHEN** code needs the Mozilla subprocess module
- **THEN** it SHALL use a shared helper that prefers modern module loading
- **AND** it MAY fall back to the legacy `.jsm` module for Zotero 7.

#### Scenario: File helpers prefer modern IO APIs

- **WHEN** code needs runtime file existence or text IO
- **THEN** it SHALL prefer `IOUtils` / `PathUtils` compatible APIs
- **AND** `OS.File` SHALL only be used as a last fallback.
