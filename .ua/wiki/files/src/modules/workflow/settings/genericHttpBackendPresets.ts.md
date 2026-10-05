
# src/modules/workflow/settings/genericHttpBackendPresets.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/genericHttpBackendPresets.ts -->

通用 HTTP Provider 的内置后端预设表（如 MinerU 官方服务），提供预设查询以及从预设派生后端草稿的构造逻辑。
源码：[src/modules/workflow/settings/genericHttpBackendPresets.ts](../../../../../../../src/modules/workflow/settings/genericHttpBackendPresets.ts)

## 符号（3）
<!-- node: function:src/modules/workflow/settings/genericHttpBackendPresets.ts:createGenericHttpBackendDraftFromPreset -->
<!-- node: function:src/modules/workflow/settings/genericHttpBackendPresets.ts:findGenericHttpBackendPreset -->
<!-- node: function:src/modules/workflow/settings/genericHttpBackendPresets.ts:listGenericHttpBackendPresets -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createGenericHttpBackendDraftFromPreset | 函数 | 51–77 | 简单 | preset、generic-http、draft、factory | 0 | 由预设生成通用 HTTP 后端配置草稿，填入 baseUrl、鉴权方式与超时等默认值。 |
| findGenericHttpBackendPreset | 函数 | 44–49 | 简单 | preset、generic-http、lookup | 1 | 按 ID 查找通用 HTTP 后端预设。 |
| listGenericHttpBackendPresets | 函数 | 40–42 | 简单 | preset、generic-http、listing | 0 | 列出全部通用 HTTP 后端预设。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createGenericHttpBackendDraftFromPreset | 函数 | 51–77 | 由预设生成通用 HTTP 后端配置草稿，填入 baseUrl、鉴权方式与超时等默认值。 |
| findGenericHttpBackendPreset | 函数 | 44–49 | 按 ID 查找通用 HTTP 后端预设。 |
| listGenericHttpBackendPresets | 函数 | 40–42 | 列出全部通用 HTTP 后端预设。 |
