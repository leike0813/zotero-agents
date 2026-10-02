
# src/utils/localizationGovernance.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/utils](../../../modules/src/utils.md)
<!-- node: file:src/utils/localizationGovernance.ts -->

本地化治理层：canonicalize locale、按语言回退链取值、识别未解析的原始文案，并集中产出托管本地运行时与 SkillRunner 后端相关的 toast 文案。
源码：[src/utils/localizationGovernance.ts](../../../../../src/utils/localizationGovernance.ts)

## 符号（6）
<!-- node: function:src/utils/localizationGovernance.ts:canonicalizeLocale -->
<!-- node: function:src/utils/localizationGovernance.ts:fallbackByLocale -->
<!-- node: function:src/utils/localizationGovernance.ts:getStringWithLocaleFallback -->
<!-- node: function:src/utils/localizationGovernance.ts:looksLikeUnresolvedLocalizationValue -->
<!-- node: function:src/utils/localizationGovernance.ts:resolveManagedLocalRuntimeToastText -->
<!-- node: function:src/utils/localizationGovernance.ts:resolveSkillRunnerBackendUnavailableToastText -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| canonicalizeLocale | 函数 | 14–26 | 简单 | i18n、normalization、locale、exported | 0 | 把任意 locale 输入规范化为 BCP-47 形式，非法值回退到 en-US。 |
| fallbackByLocale | 函数 | 53–62 | 简单 | i18n、fallback、locale、exported | 0 | 按语言推导 FTL 回退链，缺失文案时逐级向上查找。 |
| getStringWithLocaleFallback | 函数 | 83–113 | 简单 | i18n、fallback、lookup、exported | 0 | 按回退链取文案，是治理后的推荐取值入口。 |
| looksLikeUnresolvedLocalizationValue | 函数 | 64–81 | 简单 | i18n、quality、detection | 0 | 识别「看起来像未翻译的原始值」的情况，避免把 FTL id 或占位符直接显示给用户。 |
| resolveManagedLocalRuntimeToastText | 函数 | 145–164 | 简单 | i18n、toast、copy、exported | 0 | 产出托管本地运行时的上/下/异常停止三类 toast 文案。 |
| resolveSkillRunnerBackendUnavailableToastText | 函数 | 183–198 | 简单 | i18n、toast、skillrunner、exported | 0 | 产出 SkillRunner 后端不可用与自动禁用的 toast 文案。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [locale.ts](locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [dashboardSnapshot.ts](../modules/dashboard/dashboardSnapshot.ts.md) | src/modules/dashboard/dashboardSnapshot.ts | Dashboard 快照构建的事实源：把后端、任务、日志、工作流目录、文献迁移与 ACP 性能诊断投影为页面 wire snapshot，并内置共享 profile 的 Markdown 安全渲染。 |
| [displayName.ts](../backends/displayName.ts.md) | src/backends/displayName.ts | 解析后端显示名：对托管本地后端返回本地化名称，其余回退到用户配置名或后端 ID 本身。 |
| [skillRunnerBackendToasts.ts](../modules/skillRunner/surface/skillRunnerBackendToasts.ts.md) | src/modules/skillRunner/surface/skillRunnerBackendToasts.ts | 后端相关 toast 提示的构造与展示层：统一解析后端显示名、生成语义化提示文案与 payload，并区分插件托管的本地后端与外部后端。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [workflowHostOwners.ts](../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| canonicalizeLocale | 函数 | 14–26 | 把任意 locale 输入规范化为 BCP-47 形式，非法值回退到 en-US。 |
| fallbackByLocale | 函数 | 53–62 | 按语言推导 FTL 回退链，缺失文案时逐级向上查找。 |
| getStringWithLocaleFallback | 函数 | 83–113 | 按回退链取文案，是治理后的推荐取值入口。 |
| resolveManagedLocalRuntimeToastText | 函数 | 145–164 | 产出托管本地运行时的上/下/异常停止三类 toast 文案。 |
| resolveSkillRunnerBackendUnavailableToastText | 函数 | 183–198 | 产出 SkillRunner 后端不可用与自动禁用的 toast 文案。 |
