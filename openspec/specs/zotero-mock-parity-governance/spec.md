# zotero-mock-parity-governance Specification

## Purpose
TBD - created by archiving change govern-zotero-mock-parity. Update Purpose after archive.
## Requirements
### Requirement: Mock parity 必须有显式治理合同

系统 MUST 为 Node 测试中的 Zotero mock 建立显式 parity 治理合同，定义哪些 API 行为必须与真实 Zotero 一致，以及可登记偏差的边界。

#### Scenario: 定义必须一致的 API 语义

- **WHEN** 维护者扩展或修改 mock API 行为
- **THEN** 变更 MUST 对照 parity contract 标注其语义归属
- **AND** 对于 contract 范围内行为，mock MUST 与真实 Zotero 保持一致

### Requirement: Mock drift 必须可登记且可追踪

系统 MUST 提供 drift register 记录 mock 与真实 Zotero 的已知偏差、风险等级、豁免原因与收敛条件。

#### Scenario: 发现 mock/real 行为差异

- **WHEN** 测试或真实运行暴露 mock/real 差异
- **THEN** 该差异 MUST 被登记到 drift register
- **AND** 记录 SHALL 包含风险等级与后续收敛计划

### Requirement: Mock 变更必须带 parity 测试证据

系统 MUST 要求 mock 行为变更附带 drift/parity 测试证据，防止未验证差异进入主干。
Node Zotero mock path behavior MUST be explicit about the target runtime path
semantics it simulates.

#### Scenario: 提交 mock 行为变更

- **WHEN** 变更涉及 `tests/setup/zotero-mock.ts` 或相关 mock helper
- **THEN** 提交 MUST 同步包含对应 parity 测试更新
- **AND** 测试必须覆盖高风险语义（如路径解析、deleted/只读字段、关键运行时调用）

#### Scenario: 测试模拟 Windows 路径

- **WHEN** a Node test uses Windows drive or UNC path fixtures
- **THEN** the mock SHALL preserve Windows path semantics independent of the
  host OS running the test
- **AND** the test SHALL state that the fixture is a Windows path case.

#### Scenario: 测试模拟 POSIX 路径

- **WHEN** a Node test uses POSIX path fixtures
- **THEN** the mock SHALL preserve POSIX path semantics independent of Windows
  fixture tests.

### Requirement: Mock reset SHALL isolate shared prototype changes

Resetting the Node Zotero mock SHALL restore the initial behavior and property descriptors of shared mock prototypes. Toolkit hooks and test mutations SHALL NOT affect subsequent tests or accumulate across resets.

#### Scenario: Toolkit field hooks are reset

- **WHEN** a test installs toolkit field hooks and resets the mock
- **THEN** newly created items SHALL use the original field read and write behavior
- **AND** repeated resets SHALL NOT retain earlier hooks

#### Scenario: Prototype members are added, removed, or replaced

- **WHEN** a test changes shared prototype methods or accessors, removes an existing member, or adds string or symbol members
- **AND** the mock is reset
- **THEN** original descriptors SHALL be restored and added members SHALL be absent
