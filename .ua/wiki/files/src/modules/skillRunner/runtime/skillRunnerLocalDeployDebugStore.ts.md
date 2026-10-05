
# src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/skillRunner/runtime](../../../../../modules/src/modules/skillRunner/runtime.md)
<!-- node: file:src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts -->

本地运行时部署调试日志的内存存储：只在调试模式开启时记录部署各阶段的结构化条目，供调试对话框查看与复制。
源码：[src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts](../../../../../../../src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts)

## 符号（3）
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts:appendSkillRunnerLocalDeployDebugLog -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts:resetSkillRunnerLocalDeployDebugSession -->
<!-- node: function:src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts:subscribeSkillRunnerLocalDeployDebugLogs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| appendSkillRunnerLocalDeployDebugLog | 函数 | 81–100 | 中等 | diagnostics、logging、event-store | 0 | 追加一条部署调试条目，生成自增 ID 与时间戳、裁剪详情字段后通知订阅者。 |
| resetSkillRunnerLocalDeployDebugSession | 函数 | 57–79 | 简单 | diagnostics、cleanup、state | 0 | 重置部署调试会话，清空条目并把 ID 计数器归零，使每次部署的日志独立可读。 |
| subscribeSkillRunnerLocalDeployDebugLogs | 函数 | 106–113 | 简单 | event-handler、subscription、diagnostics | 1 | 注册部署调试日志订阅者，供调试对话框实时刷新。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [skillRunnerCtlBridge.ts](skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalDeployDebugDialog.ts](../surface/skillRunnerLocalDeployDebugDialog.ts.md) | src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts | 本地运行时部署调试对话框：把调试日志条目渲染为可读列表，支持复制单条详情或整段控制台文本，便于排查一键部署失败。 |
| [skillRunnerLocalRuntimeManager.ts](skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| appendSkillRunnerLocalDeployDebugLog | 函数 | 81–100 | 追加一条部署调试条目，生成自增 ID 与时间戳、裁剪详情字段后通知订阅者。 |
| resetSkillRunnerLocalDeployDebugSession | 函数 | 57–79 | 重置部署调试会话，清空条目并把 ID 计数器归零，使每次部署的日志独立可读。 |
| subscribeSkillRunnerLocalDeployDebugLogs | 函数 | 106–113 | 注册部署调试日志订阅者，供调试对话框实时刷新。 |
