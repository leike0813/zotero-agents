
# src/platform/path.ts
所属分层：[插件外壳与核心运行时](../../../layers/plugin-core.md)  
所属目录：[src/platform](../../../modules/src/platform.md)
<!-- node: file:src/platform/path.ts -->

平台路径拼接与规范化：按宿主平台处理分隔符、相对段消除与路径比较规则，供 runtimePlatform 之上的所有路径操作复用。
源码：[src/platform/path.ts](../../../../../src/platform/path.ts)

## 符号（5）
<!-- node: function:src/platform/path.ts:getParentPath -->
<!-- node: function:src/platform/path.ts:inferPathStyle -->
<!-- node: function:src/platform/path.ts:isNonNativeAbsolutePath -->
<!-- node: function:src/platform/path.ts:joinNativePath -->
<!-- node: function:src/platform/path.ts:normalizeNativeLocalPath -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| getParentPath | 函数 | 119–141 | 中等 | 路径处理、工具函数、平台抽象 | 0 | 取路径的父目录，保留盘符与根目录语义，避免直接依赖 Node 的 path 模块。 |
| inferPathStyle | 函数 | 18–34 | 简单 | 路径处理、推断、平台抽象 | 0 | 从路径字符串推断其风格（windows / posix），用于识别异平台路径。 |
| isNonNativeAbsolutePath | 函数 | 57–68 | 简单 | 路径处理、校验、平台抽象 | 0 | 判断给定绝对路径是否属于非当前宿主的路径风格，用于拒绝跨平台路径误用。 |
| joinNativePath | 函数 | 70–111 | 中等 | 路径处理、拼接、平台抽象 | 0 | 按宿主原生分隔符拼接路径段并归一化结果，是平台层唯一的 join 实现。 |
| normalizeNativeLocalPath | 函数 | 143–170 | 中等 | 路径处理、规范化、平台抽象 | 0 | 规范化本地绝对路径：解析 . 与 .. 段并统一分隔符，跨平台复用同一套语义。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimePlatform.ts](runtimePlatform.ts.md) | src/platform/runtimePlatform.ts | 宿主平台探测：识别当前运行的是 Zotero 桌面、sidecar 运行环境还是测试沙箱，并据此选择 sidecar runtime bundle 的平台变体。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [acpSkillRunInteractionFiles.ts](../modules/acp/skillRun/acpSkillRunInteractionFiles.ts.md) | src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts | Skill 运行交互文件管理：把用户交互请求/响应、附件与文件选择投影到 runtime 文件与 assistant 交互契约之间。 |
| [acpTransport.ts](../modules/acp/transport/acpTransport.ts.md) | src/modules/acp/transport/acpTransport.ts | ACP transport 核心：负责启动后端进程、读写 NDJSON 消息流、管理会话生命周期与取消，并向 runtime 性能 profiler 上报时延指标。 |
| [command.ts](command.ts.md) | src/platform/command.ts | 跨平台命令执行抽象：统一 spawn、shell 转义、PATH 解析、超时与退出码语义，向上层提供与宿主平台无关的命令调用面。 |
| [env.ts](env.ts.md) | src/platform/env.ts | 运行环境解析模块：读取并解析 PATH、HOME、可执行文件别名等环境变量，在 Windows/macOS/Linux 上把环境视图归一为平台层可直接消费的形态。 |
| [file.ts](../workflows/file.ts.md) | src/workflows/file.ts | 工作流文件能力 API：基于 runtimePersistence 统一的文件读写、原子写入、目录遍历与移动删除，并接入平台文件选择器，路径与错误均按 Workflow Host 契约规范化。 |
| [path.ts](../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../modules/runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [skillRunnerCtlBridge.ts](../modules/skillRunner/runtime/skillRunnerCtlBridge.ts.md) | src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts | SkillRunner 控制面桥接：与本地 Skill-Runner ctl 服务建立/维持连接，投递运行请求并流式回传事件，是旧后端兼容路径的核心。 |
| [skillRunnerLocalRuntimeManager.ts](../modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts.md) | src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts | 插件托管的本地 SkillRunner 运行时管理器：一键下载安装、配置、启停、诊断、升级与卸载，并维护跨窗口的租约与自动保活循环，确保同一时刻只有一个实例在管理本地运行时。 |
| [workflowStoredAttachmentImport.ts](../workflows/workflowStoredAttachmentImport.ts.md) | src/workflows/workflowStoredAttachmentImport.ts | 已存附件的受管暂存：规范化伴随文件相对路径、拒绝越界与重复项，在创建 Zotero attachment 之前完成校验并返回带 cleanup 的暂存句柄。 |
| [zoteroHostNativeMutations.ts](../modules/zoteroHost/zoteroHostNativeMutations.ts.md) | src/modules/zoteroHost/zoteroHostNativeMutations.ts | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| getParentPath | 函数 | 119–141 | 取路径的父目录，保留盘符与根目录语义，避免直接依赖 Node 的 path 模块。 |
| inferPathStyle | 函数 | 18–34 | 从路径字符串推断其风格（windows / posix），用于识别异平台路径。 |
| isNonNativeAbsolutePath | 函数 | 57–68 | 判断给定绝对路径是否属于非当前宿主的路径风格，用于拒绝跨平台路径误用。 |
| joinNativePath | 函数 | 70–111 | 按宿主原生分隔符拼接路径段并归一化结果，是平台层唯一的 join 实现。 |
| normalizeNativeLocalPath | 函数 | 143–170 | 规范化本地绝对路径：解析 . 与 .. 段并统一分隔符，跨平台复用同一套语义。 |
