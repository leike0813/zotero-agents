
# src/modules/acp/chat/acpBackendPresets.ts
所属分层：[Agent 协议与后端运行时](../../../../../layers/agent-runtime.md)  
所属目录：[src/modules/acp/chat](../../../../../modules/src/modules/acp/chat.md)
<!-- node: file:src/modules/acp/chat/acpBackendPresets.ts -->

ACP 后端预设目录：维护内置 Agent 后端（命令、参数、请求类型、显示名）的定义与解析，供后端管理器和连接层复用。
源码：[src/modules/acp/chat/acpBackendPresets.ts](../../../../../../../src/modules/acp/chat/acpBackendPresets.ts)

## 符号（10）
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetDisplayName -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetEnv -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetIsolationArgs -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetIsolationEnv -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetNpxArgs -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:buildAcpBackendPresetProfileId -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:createAcpBackendFromPreset -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:createAcpBackendFromPresetOptions -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:ensureManagedAcpBackendEnvironmentDirectories -->
<!-- node: function:src/modules/acp/chat/acpBackendPresets.ts:normalizePresetOptions -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildAcpBackendPresetDisplayName | 函数 | 321–341 | 简单 | acp、backend、presentation | 0 | 生成预设的展示名，区分内置预设与用户自定义配置。 |
| buildAcpBackendPresetEnv | 函数 | 374–383 | 简单 | acp、backend、env | 0 | 合并预设基础环境变量与隔离变量，输出最终传给子进程的环境表。 |
| buildAcpBackendPresetIsolationArgs | 函数 | 385–402 | 中等 | acp、backend、isolation、cli | 0 | 为隔离运行拼装命令行参数，把缓存/配置目录重定向到受管路径。 |
| buildAcpBackendPresetIsolationEnv | 函数 | 351–372 | 中等 | acp、backend、isolation、env | 0 | 构造预设的隔离环境变量（如独立 HOME/CACHE 路径），避免多个 Agent 互相污染运行时状态。 |
| buildAcpBackendPresetNpxArgs | 函数 | 404–416 | 简单 | acp、backend、cli | 0 | 把预设的命令与参数转换为 npx 形式的启动参数数组。 |
| buildAcpBackendPresetProfileId | 函数 | 302–319 | 简单 | acp、backend、identity | 0 | 由预设 id 与运行档位组合出稳定的 profile id，保证同一预设复用同一隔离环境。 |
| createAcpBackendFromPreset | 函数 | 457–461 | 简单 | acp、backend、factory | 0 | 按预设 id 查出预设并构造 ACP 后端配置，是后端管理器的便捷入口。 |
| createAcpBackendFromPresetOptions | 函数 | 418–455 | 中等 | acp、backend、factory | 0 | 由完整预设选项构造 ACP 后端配置对象（类型、endpoint、command、requestKind）。 |
| ensureManagedAcpBackendEnvironmentDirectories | 函数 | 463–496 | 中等 | acp、backend、filesystem | 0 | 确保预设隔离环境所需的受管目录存在，避免首次运行时因缺目录启动失败。 |
| normalizePresetOptions | 函数 | 278–291 | 简单 | acp、backend、normalization | 0 | 归一化预设选项（命令、参数、env、隔离开关），缺省值由内置配置补全。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [path.ts](../../../utils/path.ts.md) | src/utils/path.ts | 上层路径工具：把平台层路径能力包装为插件内部使用的 dirname/join/扩展名等小工具函数。 |
| [runtimePersistence.ts](../../runtimePersistence.ts.md) | src/modules/runtimePersistence.ts | 跨运行时文件系统 adapter 的唯一事实源：按运行平台与调用点选择 IOUtils / OS.File / stream 实现，并提供统一的存在性、目录与读取接口。 |
| [types.ts](../../../backends/types.ts.md) | src/backends/types.ts | 后端领域类型定义：声明后端类型判别联合、后端实例形状与注册表读写接口，是 backends 目录的类型事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [backendManager.ts](../../workflow/settings/backendManager.ts.md) | src/modules/workflow/settings/backendManager.ts | 后端管理器对话框的完整实现：构建表格 DOM、读写 ACP / SkillRunner / 通用 HTTP 三类后端的草稿配置、发起连接探测与模型缓存刷新，并把结果持久化到插件首选项与后端注册表。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildAcpBackendPresetDisplayName | 函数 | 321–341 | 生成预设的展示名，区分内置预设与用户自定义配置。 |
| buildAcpBackendPresetEnv | 函数 | 374–383 | 合并预设基础环境变量与隔离变量，输出最终传给子进程的环境表。 |
| buildAcpBackendPresetIsolationArgs | 函数 | 385–402 | 为隔离运行拼装命令行参数，把缓存/配置目录重定向到受管路径。 |
| buildAcpBackendPresetIsolationEnv | 函数 | 351–372 | 构造预设的隔离环境变量（如独立 HOME/CACHE 路径），避免多个 Agent 互相污染运行时状态。 |
| buildAcpBackendPresetNpxArgs | 函数 | 404–416 | 把预设的命令与参数转换为 npx 形式的启动参数数组。 |
| buildAcpBackendPresetProfileId | 函数 | 302–319 | 由预设 id 与运行档位组合出稳定的 profile id，保证同一预设复用同一隔离环境。 |
| createAcpBackendFromPreset | 函数 | 457–461 | 按预设 id 查出预设并构造 ACP 后端配置，是后端管理器的便捷入口。 |
| createAcpBackendFromPresetOptions | 函数 | 418–455 | 由完整预设选项构造 ACP 后端配置对象（类型、endpoint、command、requestKind）。 |
| ensureManagedAcpBackendEnvironmentDirectories | 函数 | 463–496 | 确保预设隔离环境所需的受管目录存在，避免首次运行时因缺目录启动失败。 |
