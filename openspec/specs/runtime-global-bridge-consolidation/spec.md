# runtime-global-bridge-consolidation Specification

## Purpose
TBD - created by archiving change consolidate-runtime-global-bridges. Update Purpose after archive.
## Requirements
### Requirement: Runtime 全局桥接访问必须通过统一边界

系统 MUST 通过统一的 runtime bridge 访问全局桥接对象能力（例如 `ztoolkit`、`addon`、宿主注入对象），而不是在业务模块中分散直接读取。

#### Scenario: 模块读取全局桥接能力

- **WHEN** 任一模块需要使用全局桥接能力（如 toast/dialog）
- **THEN** 模块 MUST 通过统一 bridge API 获取能力
- **AND** 模块 SHALL NOT 自行拼接 `globalThis/addon/ztoolkit` 的多源读取链

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

### Requirement: Runtime bridge 必须支持可控测试注入

系统 MUST 提供可测试的 bridge 注入/重置机制，以确保测试可稳定覆盖不同运行时能力组合。

#### Scenario: 测试覆盖不同全局能力组合

- **WHEN** 测试需要模拟仅 `addon` 可用、仅 `ztoolkit` 可用或均不可用
- **THEN** 测试 MUST 可通过 bridge 注入机制稳定构造这些场景
- **AND** 测试结束后 MUST 能重置注入状态，避免污染后续用例

