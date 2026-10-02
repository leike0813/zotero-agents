
# src/modules/harness/env.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/env.ts -->

Harness 环境变量解析器：只接受白名单内的三个路径变量，正确处理行内注释、引号与 export 前缀。
源码：[src/modules/harness/env.ts](../../../../../../src/modules/harness/env.ts)

## 符号（1）
<!-- node: function:src/modules/harness/env.ts:parseHarnessEnv -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| parseHarnessEnv | 函数 | 42–66 | 简单 | parsing、config、harness | 0 | 解析 harness 环境变量文本，只保留白名单路径变量并处理引号与行内注释。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| parseHarnessEnv | 函数 | 42–66 | 解析 harness 环境变量文本，只保留白名单路径变量并处理引号与行内注释。 |
