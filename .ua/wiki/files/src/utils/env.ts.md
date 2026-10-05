
# src/utils/env.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/env.ts -->

读取构建期注入的 __env__，返回 development / production 运行环境标识。
源码：[src/utils/env.ts](../../../../../src/utils/env.ts)

## 符号（1）
<!-- node: function:src/utils/env.ts:resolveAddonRuntimeEnv -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveAddonRuntimeEnv | 函数 | 3–7 | 简单 | environment、build、utility、exported | 0 | 读取构建期注入的 __env__ 并归一为 development / production。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [addon.ts](../addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [ztoolkit.ts](ztoolkit.ts.md) | src/utils/ztoolkit.ts | zotero-plugin-toolkit 的初始化与扩展：创建并缓存 MyToolkit 实例、在诊断非详细模式下静音 toolkit 自身日志，并提供剪贴板复制能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveAddonRuntimeEnv | 函数 | 3–7 | 读取构建期注入的 __env__ 并归一为 development / production。 |
