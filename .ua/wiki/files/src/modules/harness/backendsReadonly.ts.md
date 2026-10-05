
# src/modules/harness/backendsReadonly.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/backendsReadonly.ts -->

后端只读快照：从 prefs 读取 backends 配置并归一化为 Harness 专用形状，不做任何 id 重映射或引用同步。
源码：[src/modules/harness/backendsReadonly.ts](../../../../../../src/modules/harness/backendsReadonly.ts)

## 符号（2）
<!-- node: function:src/modules/harness/backendsReadonly.ts:loadBackendsRegistryReadonly -->
<!-- node: function:src/modules/harness/backendsReadonly.ts:normalizeBackendEntry -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [loadBackendsRegistryReadonly](../../../../symbols/src/modules/harness/backendsReadonly.ts/loadBackendsRegistryReadonly.md) | 函数 | 123–168 | 中等 | harness、readonly、backends、loader | 2 | 读取并返回只读后端列表，读取失败时返回空集合而不是抛出。 |
| normalizeBackendEntry | 函数 | 43–112 | 中等 | harness、readonly、normalization、backends | 1 | 把松散的后端配置归一化为 Harness 后端 DTO，保留类型、显示名、启用态与连接参数摘要。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [identity.ts](../../backends/identity.ts.md) | src/backends/identity.ts | 后端身份与配置指纹的事实源：规范化托管本地后端 ID、生成内部 ID、计算 ACP 配置指纹并维护连接测试状态。 |
| [prefs.ts](../../utils/prefs.ts.md) | src/utils/prefs.ts | 插件首选项读写封装：在 prefs 前缀上拼接 key，并通过 addon.data.prefs 提供的接口读写与清除。 |
| [types.ts](../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantReadonlyPublication.ts](assistantReadonlyPublication.ts.md) | src/modules/harness/assistantReadonlyPublication.ts | 只读 Harness 会话发布器：以只读方式重建 Assistant Workspace 的后端、ACP Chat 会话与 SkillRunner run 视图，供测试 Harness 页面在没有真实 Agent 的情况下驱动 UI。 |
| [dashboardReadonlyModel.ts](dashboardReadonlyModel.ts.md) | src/modules/harness/dashboardReadonlyModel.ts | Dashboard 只读视图模型：聚合后端、任务历史、SkillRunner run 与工作流产品资产，产出各 surface 的行数据与签名，供 Harness Dashboard 渲染。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [loadBackendsRegistryReadonly](../../../../symbols/src/modules/harness/backendsReadonly.ts/loadBackendsRegistryReadonly.md) | 函数 | 123–168 | 读取并返回只读后端列表，读取失败时返回空集合而不是抛出。 |
