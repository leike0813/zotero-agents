
# src/modules/skillRunnerSsoFacts.ts
所属分层：[Agent 协议与后端运行时](../../../layers/agent-runtime.md)  
所属目录：[src/modules](../../../modules/src/modules.md)
<!-- node: file:src/modules/skillRunnerSsoFacts.ts -->

SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。
源码：[src/modules/skillRunnerSsoFacts.ts](../../../../../src/modules/skillRunnerSsoFacts.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [identity.ts](../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [skillRunnerBackendHealthRegistry.ts](skillRunner/connection/skillRunnerBackendHealthRegistry.ts.md) | src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts | SkillRunner 后端健康状态的内存注册表：跟踪每个后端的探针时间、连续失败次数、成功记录与禁用原因，并按指数退避决定何时再探，必要时建议自动禁用不可达后端。 |
| [skillRunnerProviderStateMachine.ts](skillRunner/run/skillRunnerProviderStateMachine.ts.md) | src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts | SkillRunner 运行状态的单一事实源：定义合法状态集合、终态与等待态，规范化事件与状态名，并校验状态转移与事件顺序，违规时返回结构化 violation 而非直接抛错。 |
| [skillRunnerSessionSyncManager.ts](skillRunner/run/skillRunnerSessionSyncManager.ts.md) | src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts | SkillRunner 会话事件流同步管理器：为每个会话维持一条长连接事件流，先应用状态快照再消费历史事件补齐缺口，断线时按状态判定是否应重连，并把会话状态变更广播给订阅者。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [check-skillrunner-ssot-invariants.ts](../../scripts/check-skillrunner-ssot-invariants.ts.md) | scripts/check-skillrunner-ssot-invariants.ts | CI 治理脚本：校验 SkillRunner 单一事实源（SSOT）的不变量文件，检查 current 快照与 facts/ref 引用是否一致、结构是否完整。 |
