## MODIFIED Requirements

### Requirement: Mock 变更必须带 parity 测试证据

Node Zotero mock path behavior MUST be explicit about the target runtime path
semantics it simulates.

#### Scenario: 测试模拟 Windows 路径

- **WHEN** a Node test uses Windows drive or UNC path fixtures
- **THEN** the mock SHALL preserve Windows path semantics independent of the
  host OS running the test
- **AND** the test SHALL state that the fixture is a Windows path case.

#### Scenario: 测试模拟 POSIX 路径

- **WHEN** a Node test uses POSIX path fixtures
- **THEN** the mock SHALL preserve POSIX path semantics independent of Windows
  fixture tests.
