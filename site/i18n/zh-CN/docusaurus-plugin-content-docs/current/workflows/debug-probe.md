# 调试工具

## 用途

调试工具包，主要用于 Workflow 系统的开发测试和问题诊断。该包包含多个仅用于调试的 workflow，覆盖 `applyResult` contract、Sequence Orchestration、交互式执行和 Host Bridge 连接等场景。

所有调试 workflow 均标记为 `debug_only: true`，仅在调试模式下可见。

## 包含的调试 Workflow

### Apply Contract 调试

验证 `buildRequest` / `applyResult` hook 的各种调用组合：

| Workflow | 说明 |
|---------|------|
| Debug: Apply Single Result | 单 job + result 获取方式 |
| Debug: Apply Single Bundle | 单 job + bundle 获取方式 |
| Debug: Apply Sequence Result | 多步骤 sequence + result 获取 |
| Debug: Apply Sequence Bundle | 多步骤 sequence + bundle 获取 |
| Debug: Apply Bundle Then Result | bundle 后接 result 的组合调用 |
| Debug: Apply Result Then Bundle | result 后接 bundle 的组合调用 |

### Sequence 调试

验证 Sequence Orchestration 的多步骤协调机制：

| Workflow | 说明 |
|---------|------|
| Debug Sequence Linear Probe | 验证串行执行和默认接力传递（handoff pass_through） |
| Debug Sequence Workspace Reuse Probe | 验证跨步骤的工作区复用（workspace: reuse-workflow） |
| Debug Sequence Context Isolation Probe | 验证显式接力过滤和隔离工作区（workspace: new + handoff 选择性映射） |

### 交互式调试

验证需要用户回复的交互式 workflow：

| Workflow | 说明 |
|---------|------|
| Debug: Interactive Choice Probe | 验证交互式选择流程 |
| Debug: Interactive Then Result | 交互式执行后获取 result |

### Host Bridge 调试

| Workflow | 说明 |
|---------|------|
| Debug: Host Bridge Connectivity Probe | 验证 Host Bridge 的连接通路和权限 |

### 通用

| Workflow | 说明 |
|---------|------|
| Workflow Debug Probe | 检查 Workflow 预执行状态，打开诊断面板 |

## 何时使用

- 开发或修改 Workflow 系统后验证行为
- 排查 Workflow 执行的异常问题
- 验证 Sequence Orchestration 的接力机制
- 验证 `applyResult` Hook 的 contract 是否符合预期
- 验证 Host Bridge 的连接和权限配置

## 依赖

- **后端**：Skill-Runner 服务
- 全部标记为 `debug_only`，仅在调试模式下出现

## 下一步

- [调试与测试](custom/debugging) — 自定义 Workflow 的调试方法
- [Hook 系统](custom/hooks) — Hook API 签名和用法
