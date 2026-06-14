# 调试工具

## 用途

调试工具包，主要用于 Workflow 系统的开发测试和问题诊断。该包包含多个仅用于调试的 workflow。

## 包含的调试 Workflow

| Workflow | 说明 |
|---------|------|
| Workflow Debug Probe | 检查 Workflow 预执行状态，打开诊断面板 |
| Debug Sequence Linear Probe | 验证串行执行和默认接力传递 |
| Debug Sequence Workspace Reuse Probe | 验证跨步骤的工作区复用 |
| Debug Sequence Context Isolation Probe | 验证显式接力过滤和隔离工作区 |

## 何时使用

- 开发或修改 Workflow 系统后验证行为
- 排查 Workflow 执行的异常问题
- 验证 Sequence Orchestration 的接力机制

## 依赖

- **后端**：Skill-Runner 服务
