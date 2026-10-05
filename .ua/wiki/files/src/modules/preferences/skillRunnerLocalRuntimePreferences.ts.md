
# src/modules/preferences/skillRunnerLocalRuntimePreferences.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/preferences](../../../../modules/src/modules/preferences.md)
<!-- node: file:src/modules/preferences/skillRunnerLocalRuntimePreferences.ts -->

SkillRunner 本地运行时相关的偏好面板绑定，负责安装目录、版本、自动拉取与自动拉起等设置的读写与即时生效。
源码：[src/modules/preferences/skillRunnerLocalRuntimePreferences.ts](../../../../../../src/modules/preferences/skillRunnerLocalRuntimePreferences.ts)

## 符号（1）
<!-- node: function:src/modules/preferences/skillRunnerLocalRuntimePreferences.ts:bindSkillRunnerLocalRuntimePreferences -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [bindSkillRunnerLocalRuntimePreferences](../../../../symbols/src/modules/preferences/skillRunnerLocalRuntimePreferences.ts/bindSkillRunnerLocalRuntimePreferences.md) | 函数 | 14–617 | 复杂 | preferences、event-handler、skillrunner、monolith | 1 | 为偏好面板中的 SkillRunner 本地运行时分区绑定全部控件事件与状态同步。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [debugMode.ts](../debugMode.ts.md) | src/modules/debugMode.ts | 插件调试开关的事实源，集中暴露 ACP 性能剖析器、语义 trace、SkillRunner 连接审计、Synthesis sidecar 诊断等细粒度诊断能力的可用性判断，并提供测试覆盖入口。 |
| [locale.ts](../../utils/locale.ts.md) | src/utils/locale.ts | Fluent 本地化封装：初始化插件 FTL 资源、按 message id 取文案并提供带 fallback 的取值，同时暴露当前 locale 与 ztoolkit 实例。 |
| [package.json](../../../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
| [skillRunnerLocalRuntimeManager.ts](../skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [preferenceScript.ts](../preferenceScript.ts.md) | src/modules/preferenceScript.ts | 首选项面板（preferences.xhtml）的全部交互绑定：一个超长 bindPrefEvents 集中处理所有偏好项的读取、回写、即时生效与 UI 同步，并处理工作流运行时、内容包订阅、Assistant 显示策略和本地运行时版本等跨模块联动。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [bindSkillRunnerLocalRuntimePreferences](../../../../symbols/src/modules/preferences/skillRunnerLocalRuntimePreferences.ts/bindSkillRunnerLocalRuntimePreferences.md) | 函数 | 14–617 | 为偏好面板中的 SkillRunner 本地运行时分区绑定全部控件事件与状态同步。 |
