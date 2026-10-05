
# scripts/host-bridge/check-host-bridge-agent-language.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/check-host-bridge-agent-language.ts -->

治理校验脚本：检查 Host Bridge 面向代理的 surface 文案是否符合 agent 语言规范（可执行指令、证据要求、完成条件等），是 AGENTS.md 中 agent-facing surface 硬约束的自动化闸门。
源码：[scripts/host-bridge/check-host-bridge-agent-language.ts](../../../../../scripts/host-bridge/check-host-bridge-agent-language.ts)

## 符号（4）
<!-- node: function:scripts/host-bridge/check-host-bridge-agent-language.ts:findAgentLanguageViolations -->
<!-- node: function:scripts/host-bridge/check-host-bridge-agent-language.ts:textFiles -->
<!-- node: function:scripts/host-bridge/check-host-bridge-agent-language.ts:validateHostBridgeAgentLanguage -->
<!-- node: function:scripts/host-bridge/check-host-bridge-agent-language.ts:violationsInString -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findAgentLanguageViolations | 函数 | 50–66 | 简单 | validation、governance、agent-surface | 0 | 遍历 surface 文案中的全部字符串，汇总并去重 agent 语言违规项。 |
| textFiles | 函数 | 68–77 | 简单 | utility、filesystem、discovery | 0 | 列出参与校验的 Markdown 文本文件，跳过生成目录与非文本文件。 |
| validateHostBridgeAgentLanguage | 函数 | 79–109 | 中等 | validation、entry-point、governance | 0 | 校验入口：读取 agent-facing surface 目录，发现违规即失败，是 CI 上的 agent 语言闸门。 |
| violationsInString | 函数 | 39–48 | 简单 | validation、utility、agent-surface | 0 | 在单段文本中匹配被禁用的 agent 语言模式，返回结构化违规条目。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findAgentLanguageViolations | 函数 | 50–66 | 遍历 surface 文案中的全部字符串，汇总并去重 agent 语言违规项。 |
| validateHostBridgeAgentLanguage | 函数 | 79–109 | 校验入口：读取 agent-facing surface 目录，发现违规即失败，是 CI 上的 agent 语言闸门。 |
