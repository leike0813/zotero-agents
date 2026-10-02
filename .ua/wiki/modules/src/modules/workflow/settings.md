
# src/modules/workflow/settings
> 目录聚合页：10 个文件、92 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/modules/workflow/settings/backendManager.ts](../../../../files/src/modules/workflow/settings/backendManager.ts.md) | 文件 | 23 | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |
| [src/modules/workflow/settings/genericHttpBackendPresets.ts](../../../../files/src/modules/workflow/settings/genericHttpBackendPresets.ts.md) | 文件 | 3 | 通用 HTTP Provider 的内置后端预设表（如 MinerU 官方服务），提供预设查询以及从预设派生后端草稿的构造逻辑。 |
| [src/modules/workflow/settings/workflowParameterOptions.ts](../../../../files/src/modules/workflow/settings/workflowParameterOptions.ts.md) | 文件 | 1 | 工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。 |
| [src/modules/workflow/settings/workflowSettings.ts](../../../../files/src/modules/workflow/settings/workflowSettings.ts.md) | 文件 | 26 | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [src/modules/workflow/settings/workflowSettingsDialog.ts](../../../../files/src/modules/workflow/settings/workflowSettingsDialog.ts.md) | 文件 | 6 | 基于 XHTML/DialogHelper 的工作流设置对话框实现：按 schema 渲染参数、Provider 运行时选项与运行选项控件，收集用户输入并回写持久化或一次性设置。 |
| [src/modules/workflow/settings/workflowSettingsDialogModel.ts](../../../../files/src/modules/workflow/settings/workflowSettingsDialogModel.ts.md) | 文件 | 10 | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |
| [src/modules/workflow/settings/workflowSettingsDomain.ts](../../../../files/src/modules/workflow/settings/workflowSettingsDomain.ts.md) | 文件 | 15 | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |
| [src/modules/workflow/settings/workflowSettingsNormalizer.ts](../../../../files/src/modules/workflow/settings/workflowSettingsNormalizer.ts.md) | 文件 | 2 | 针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。 |
| [src/modules/workflow/settings/workflowSettingsOptionLocalization.ts](../../../../files/src/modules/workflow/settings/workflowSettingsOptionLocalization.ts.md) | 文件 | 2 | Provider 运行时选项与工作流运行选项的文案本地化，优先按 locale key 查表，缺失时回落到 schema 自带文本。 |
| [src/modules/workflow/settings/workflowSettingsWebDialog.ts](../../../../files/src/modules/workflow/settings/workflowSettingsWebDialog.ts.md) | 文件 | 4 | 基于独立 Web 页面（iframe/HTML）的工作流设置对话框：接收宿主动作、回传草稿变更，并提供 ACP 运行时缓存与 SkillRunner 模型目录的刷新入口。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](../../workflows.md) | 13 |
| [src/backends](../../backends.md) | 11 |
| [src/utils](../../utils.md) | 11 |
| [src/modules/acp/chat](../acp/chat.md) | 5 |
| [src/providers](../../providers.md) | 5 |
| [src/config](../../config.md) | 4 |
| [src/modules/workflow/catalog](catalog.md) | 4 |
| [src/providers/skillrunner](../../providers/skillrunner.md) | 4 |
| [src/modules](../../modules.md) | 3 |
| [src/modules/skillRunner/run](../skillRunner/run.md) | 3 |
| [src/shared](../../shared.md) | 3 |
| [.](../../../index.md) | 2 |
| [src/modules/acp/transport](../acp/transport.md) | 2 |
| [src/modules/skillRunner/connection](../skillRunner/connection.md) | 2 |
| [src/modules/workflow/ui](ui.md) | 2 |
| [packages/synthesis-contracts/src](../../../packages/synthesis-contracts/src.md) | 1 |
| [src/modules/skillRunner/surface](../skillRunner/surface.md) | 1 |
| [src/modules/synthesisClient](../synthesisClient.md) | 1 |
| [src/modules/workflowExecution](../workflowExecution.md) | 1 |
| [src/platform](../../platform.md) | 1 |
