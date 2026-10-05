
# src/workflows
> 目录聚合页：26 个文件、196 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/workflows/archive.ts](../../files/src/workflows/archive.ts.md) | 文件 | 14 | 工作流归档能力：校验条目名并去重、测量本地文件事实、生成或写出 ZIP 字节、原子落盘并按实测摘要校验，同时优先使用 Gecko 的 zip writer/reader 运行时。 |
| [src/workflows/bibliography.ts](../../files/src/workflows/bibliography.ts.md) | 文件 | 5 | 工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。 |
| [src/workflows/clipboard.ts](../../files/src/workflows/clipboard.ts.md) | 文件 | 4 | 工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。 |
| [src/workflows/declarativeRequestCompiler.ts](../../files/src/workflows/declarativeRequestCompiler.ts.md) | 文件 | 10 | 声明式请求编译器：把工作流 manifest 的 request 声明与当前选择集编译为各 provider 的具体请求负载，含任务名模板、附件选择与多步骤 HTTP 序列。 |
| [src/workflows/errorMeta.ts](../../files/src/workflows/errorMeta.ts.md) | 文件 | 3 | 工作流 hook 失败元数据：把 hook 名、工作流标识与能力来源挂到异常对象上，供诊断层读取并生成可读的失败摘要。 |
| [src/workflows/file.ts](../../files/src/workflows/file.ts.md) | 文件 | 10 | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [src/workflows/helpers.ts](../../files/src/workflows/helpers.ts.md) | 文件 | 1 | 工作流 hook 辅助层：为用户编写的 hook 提供条目解析、路径处理与产物就绪判定等安全封装。 |
| [src/workflows/hostApi.ts](../../files/src/workflows/hostApi.ts.md) | 文件 | 4 | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [src/workflows/loader.ts](../../files/src/workflows/loader.ts.md) | 文件 | 14 | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [src/workflows/loaderContracts.ts](../../files/src/workflows/loaderContracts.ts.md) | 文件 | 14 | 工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。 |
| [src/workflows/localization.ts](../../files/src/workflows/localization.ts.md) | 文件 | 7 | 工作流本地化：按插件 locale 解析工作流显示名、标签、任务名模板与参数 schema 的翻译文本。 |
| [src/workflows/manifestContract.ts](../../files/src/workflows/manifestContract.ts.md) | 文件 | 2 | 工作流 manifest 契约投影：把 manifest 中的执行模式、资源要求、provider 需求、结果证据与选择规则投影为可对外发布的稳定契约。 |
| [src/workflows/packageHookBundler.ts](../../files/src/workflows/packageHookBundler.ts.md) | 文件 | 5 | 工作流包 hook 打包器：收集工作流包声明的 hook 脚本与其依赖资源，生成可分发的 bundle 目录结构。 |
| [src/workflows/runtime.ts](../../files/src/workflows/runtime.ts.md) | 文件 | 11 | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [src/workflows/triggerPolicy.ts](../../files/src/workflows/triggerPolicy.ts.md) | 文件 | 2 | 工作流触发策略：以两个纯函数表达工作流是否必须依赖当前选择集，避免 requiresSelection 判断散落各处。 |
| [src/workflows/types.ts](../../files/src/workflows/types.ts.md) | 文件 | 0 | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [src/workflows/workflowHostContract.ts](../../files/src/workflows/workflowHostContract.ts.md) | 文件 | 7 | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
| [src/workflows/workflowHostErrorContract.ts](../../files/src/workflows/workflowHostErrorContract.ts.md) | 文件 | 9 | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [src/workflows/workflowHostOwners.ts](../../files/src/workflows/workflowHostOwners.ts.md) | 文件 | 23 | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |
| [src/workflows/workflowInputMaterialization.ts](../../files/src/workflows/workflowInputMaterialization.ts.md) | 文件 | 4 | 工作流输入物化：把声明的输入文件复制到受管工作区，规范化并去重文件名，拒绝 Windows 保留设备名，然后返回可供后续处理的可信路径。 |
| [src/workflows/workflowInputPlanning.ts](../../files/src/workflows/workflowInputPlanning.ts.md) | 文件 | 18 | 工作流输入规划：把当前 Zotero 选择集展开为可执行单元的候选集合，按选择计数规则、生成笔记就绪度与产物路径冲突筛选并冻结为不可变计划。 |
| [src/workflows/workflowLoggingOwner.ts](../../files/src/workflows/workflowLoggingOwner.ts.md) | 文件 | 3 | 工作流日志 owner：绑定 workflowId/runId 等运行身份，把结构化日志请求校验为严格 JSON 并脱敏 token 与本机路径后写入 runtime log。 |
| [src/workflows/workflowNoteImagePreparation.ts](../../files/src/workflows/workflowNoteImagePreparation.ts.md) | 文件 | 12 | 笔记图片准备：解码并校验 base64 图片、推断 MIME、按有界尺寸与 token 化引用生成 prepared image，供后续在原生事务中导入为笔记附件。 |
| [src/workflows/workflowStoredAttachmentImport.ts](../../files/src/workflows/workflowStoredAttachmentImport.ts.md) | 文件 | 4 | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |
| [src/workflows/zipBundleReader.ts](../../files/src/workflows/zipBundleReader.ts.md) | 文件 | 1 | zip bundle 读取：解析工作流/内容包 zip 归档，校验条目路径安全后解出文件树，并配合泄漏探针清理解包临时目录。 |
| [src/workflows/zoteroHostAccessOptions.ts](../../files/src/workflows/zoteroHostAccessOptions.ts.md) | 文件 | 9 | Zotero 宿主访问运行选项：解析 autoApproveZoteroWrites 声明，构造注入 SkillRunner 的 ZoteroHostAccess 运行时选项，并在旧后端不支持时降级为告警。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/utils](utils.md) | 24 |
| [src/modules](modules.md) | 23 |
| [src/modules/zoteroHost](modules/zoteroHost.md) | 6 |
| [src/config](config.md) | 5 |
| [src/modules/workflowExecution](modules/workflowExecution.md) | 5 |
| [src/platform](platform.md) | 5 |
| [packages/synthesis-contracts/src](../packages/synthesis-contracts/src.md) | 4 |
| [src/modules/workflow/catalog](modules/workflow/catalog.md) | 4 |
| [src/modules/synthesisClient](modules/synthesisClient.md) | 3 |
| [src/providers](providers.md) | 3 |
| [src/modules/hostBridge/workflow](modules/hostBridge/workflow.md) | 2 |
| [src/modules/workflow/ui](modules/workflow/ui.md) | 2 |
| [src/schemas](schemas.md) | 2 |
| [.](../index.md) | 1 |
| [src/modules/skillRunner/run](modules/skillRunner/run.md) | 1 |
| [src/modules/synthesis](modules/synthesis.md) | 1 |
| [src/providers/skillrunner](providers/skillrunner.md) | 1 |
