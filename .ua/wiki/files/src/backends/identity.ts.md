
# src/backends/identity.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/backends](../../../modules/src/backends.md)
<!-- node: file:src/backends/identity.ts -->

后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。
源码：[src/backends/identity.ts](../../../../../src/backends/identity.ts)

## 符号（4）
<!-- node: function:src/backends/identity.ts:computeAcpBackendConfigFingerprint -->
<!-- node: function:src/backends/identity.ts:generateBackendInternalId -->
<!-- node: function:src/backends/identity.ts:isAcpBackendConnectionTestPassed -->
<!-- node: function:src/backends/identity.ts:markAcpBackendConnectionState -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| computeAcpBackendConfigFingerprint | 函数 | 37–64 | 简单 | fingerprint、backend、acp、hashing | 0 | 对 ACP 后端配置做稳定序列化并计算指纹，用于判定配置是否真正变更（而非引用变更）。 |
| generateBackendInternalId | 函数 | 126–146 | 简单 | identity、backend、utility、id-generation | 0 | 为后端生成稳定内部 ID，优先沿用托管本地后端 ID，其余基于后端类型与时间戳派生。 |
| isAcpBackendConnectionTestPassed | 函数 | 66–73 | 简单 | state-query、backend、connection、acp | 0 | 查询某配置指纹下的 ACP 后端连接测试是否已通过且仍然有效。 |
| markAcpBackendConnectionState | 函数 | 75–94 | 简单 | state-machine、backend、connection、caching | 0 | 以指纹为键记录 ACP 后端连接测试结果，配置未变时复用上次通过的结论。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpBackendProbe.ts](../modules/acp/transport/acpBackendProbe.ts.md) | src/modules/acp/transport/acpBackendProbe.ts | ACP 后端运行时能力探测：短暂连接后端以获取可用模式、模型与 MCP 配置，并把结果缓存为运行时选项。 |
| [acpBackendRefreshCacheDiagnostic.ts](../modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts.md) | src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts | ACP 后端刷新与缓存诊断中枢：编排后端探测、连接适配、传输层与运行时持久化缓存，产出可读的诊断报告与日志。 |
| [backendManager.ts](../modules/workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [backendsReadonly.ts](../modules/harness/backendsReadonly.ts.md) | src/modules/harness/backendsReadonly.ts | 后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。 |
| [displayName.ts](displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [hooks.ts](../hooks.ts.md) | src/hooks.ts | 插件生命周期中枢：实现 onStartup / onMainWindowLoad / onShutdown / onNotify / onPrefsEvent，负责样式注入、官方工作流包更新提示、Host Bridge CLI 安装引导、运行时任务恢复与首选项热更新。 |
| [registry.ts](registry.ts.md) | src/backends/registry.ts | 后端注册表：从 Zotero prefs 读取 backends 文档，做 schema 归一化与 id 重映射，为工作流和 provider 提供按类型/兼容性排序的后端查询。 |
| [skillRunnerBackendToasts.ts](../modules/skillRunner/surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [skillRunnerSsoFacts.ts](../modules/skillRunnerSsoFacts.ts.md) | src/modules/skillRunnerSsoFacts.ts | SkillRunner 运行时 SSOT 事实的单一事实源：把 provider 状态集合、终态集合、后端健康探测节奏、事件流连接/断连状态、托管本地后端身份等硬编码常量集中导出，供治理脚本与文档一致性校验读取。 |
| [workflowSettings.ts](../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| computeAcpBackendConfigFingerprint | 函数 | 37–64 | 对 ACP 后端配置做稳定序列化并计算指纹，用于判定配置是否真正变更（而非引用变更）。 |
| generateBackendInternalId | 函数 | 126–146 | 为后端生成稳定内部 ID，优先沿用托管本地后端 ID，其余基于后端类型与时间戳派生。 |
| isAcpBackendConnectionTestPassed | 函数 | 66–73 | 查询某配置指纹下的 ACP 后端连接测试是否已通过且仍然有效。 |
| markAcpBackendConnectionState | 函数 | 75–94 | 以指纹为键记录 ACP 后端连接测试结果，配置未变时复用上次通过的结论。 |
