
# Zotero 宿主与 Bridge 集成

Zotero 宿主能力与进程外集成：capability broker 与 canonical mutation 权威、Host Bridge server/MCP/CLI 能力面、跨语言 Host Bridge 契约与 JSON Schema，以及 Zotero Bridge、ACP WS Bridge 两个 Rust 二进制和选区上下文投影。
> 本页由知识图谱分层 `layer:zotero-host` 生成，共 94 个文件级节点。

## 目录分布

| 目录 | 文件数 |
| --- | --- |
| [contracts/host-bridge/schemas](../modules/contracts/host-bridge/schemas.md) | 15 |
| [src/modules/hostBridge/server](../modules/src/modules/hostBridge/server.md) | 13 |
| [rust/zotero-bridge/src](../modules/rust/zotero-bridge/src.md) | 11 |
| [src/modules/zoteroHost](../modules/src/modules/zoteroHost.md) | 9 |
| [src/modules/hostBridge/cli](../modules/src/modules/hostBridge/cli.md) | 7 |
| [contracts/host-bridge](../modules/contracts/host-bridge.md) | 6 |
| [src/modules](../modules/src/modules.md) | 5 |
| [src/modules/hostBridge/server/routes](../modules/src/modules/hostBridge/server/routes.md) | 5 |
| [src/modules/hostBridge/workflow](../modules/src/modules/hostBridge/workflow.md) | 5 |
| [src/modules/hostBridge/permissions](../modules/src/modules/hostBridge/permissions.md) | 4 |
| [skills_src/zotero-bridge-cli](../modules/skills_src/zotero-bridge-cli.md) | 3 |
| [rust/zotero-bridge](../modules/rust/zotero-bridge.md) | 2 |
| [rust/zotero-bridge/examples](../modules/rust/zotero-bridge/examples.md) | 2 |
| [rust/zotero-bridge/scripts](../modules/rust/zotero-bridge/scripts.md) | 2 |
| [src/modules/hostBridge/mcp](../modules/src/modules/hostBridge/mcp.md) | 2 |
| [rust/acp-ws-bridge](../modules/rust/acp-ws-bridge.md) | 1 |
| [rust/acp-ws-bridge/src](../modules/rust/acp-ws-bridge/src.md) | 1 |
| [src/modules/literatureArtifactMigration](../modules/src/modules/literatureArtifactMigration.md) | 1 |

## 文件清单

| 文件 | 类型 | 语言 | 摘要 |
| --- | --- | --- | --- |
| [contracts/host-bridge/capabilities.v2.json](../files/contracts/host-bridge/capabilities.v2.json.md) | 配置 | — | Host Bridge v2 能力契约的单一事实源，以 5 万余行 JSON Schema 声明每项 Zotero 宿主能力的输入输出、mutation 语义与 note 详情结构。Rust 侧桥与插件侧校验器都从这份契约派生，保证 MCP/CLI 暴露面与 Zotero 宿主实现不漂移。 |
| [contracts/host-bridge/cli-commands.v2.json](../files/contracts/host-bridge/cli-commands.v2.json.md) | 配置 | — | Host Bridge CLI 命令契约，声明 bridge 命令行暴露的全部命令、参数 schema 与能力映射。预编译 CLI 二进制与插件侧技能包据此生成 agent-facing 指令，保证 CLI 表面与 capability 契约一致。 |
| [contracts/host-bridge/schemas/host-bridge-argument-error.v1.schema.json](../files/contracts/host-bridge/schemas/host-bridge-argument-error.v1.schema.json.md) | 配置 | — | 定义 Host Bridge 结构化参数错误的 JSON Schema v1 契约，规定错误码、消息、失败参数路径与重试提示等字段形态，供 CLI/MCP 面向上报可判读的 argument 错误。 |
| [contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge-capabilities.v2.schema.json.md) | 配置 | — | 定义 Host Bridge 可执行能力契约（capability contracts）v2 的 JSON Schema，约束每项能力的输入输出形状、mutation 语义与 note detail 输出结构，是 Broker 能力面与调用方之间的类型事实源。 |
| [contracts/host-bridge/schemas/host-bridge-cli-command-contracts.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge-cli-command-contracts.v2.schema.json.md) | 配置 | — | 定义 Zotero Bridge CLI 可执行命令契约 v2 的 JSON Schema，逐命令规定参数、退出码与结构化输出 envelope，是 CLI 面向代理发布的接口形状来源。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v2.schema.json.md) | 配置 | — | Host Bridge Agent Surface v2 的 JSON Schema，描述向 Agent 暴露的 MCP 工具、参数与响应面，是 agent-facing surface 的早期版本基线。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v3.schema.json](../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v3.schema.json.md) | 配置 | — | Host Bridge Agent Surface v3 的 JSON Schema，扩展 v2 的工具面与响应结构，反映 Broker 能力暴露方式的演进。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v4.schema.json](../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v4.schema.json.md) | 配置 | — | Zotero Bridge Agent Surface v4 的 JSON Schema，定义该版本 Agent 可见的工具清单、输入 schema 与语义化指令文本面。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v5.schema.json](../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v5.schema.json.md) | 配置 | — | Zotero Bridge Agent Surface v5 的 JSON Schema，扩充工具与参数面并引入更细的语义约束，是当前较新一版 agent-facing 契约。 |
| [contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json](../files/contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json.md) | 配置 | — | Zotero Bridge Agent Surface v6 的 JSON Schema，本批中规模最大的 agent 面契约，覆盖最新工具集合、参数校验与响应 envelope。 |
| [contracts/host-bridge/schemas/host-bridge.release-receipt.v1.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-receipt.v1.schema.json.md) | 配置 | — | Host Bridge 发布回执（release receipt）v1 的 JSON Schema，规定一次受治理发布产出的身份、版本与证据字段。 |
| [contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json.md) | 配置 | — | Host Bridge 发布回执 v2 的 JSON Schema，在 v1 基础上补充发布证据链与目标平台信息，供 release 身份校验使用。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v1.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-set.v1.schema.json.md) | 配置 | — | Host Bridge 发布集合（release set）v1 的 JSON Schema，描述一次发布中各平台二进制与身份文件的集合结构。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-set.v2.schema.json.md) | 配置 | — | Host Bridge 发布集合 v2 的 JSON Schema，扩展集合条目以携带校验摘要与目标平台标识。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v3.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-set.v3.schema.json.md) | 配置 | — | Host Bridge 发布集合 v3 的 JSON Schema，引入按平台分组的条目布局与更严格的必填字段约束。 |
| [contracts/host-bridge/schemas/host-bridge.release-set.v4.schema.json](../files/contracts/host-bridge/schemas/host-bridge.release-set.v4.schema.json.md) | 配置 | — | Host Bridge 发布集合 v4 的 JSON Schema，为当前最新的发布集合契约，规定多平台产物、身份文件与回执的组合关系。 |
| [contracts/host-bridge/schemas/host-bridge.semantic-guidance.v2.schema.json](../files/contracts/host-bridge/schemas/host-bridge.semantic-guidance.v2.schema.json.md) | 配置 | — | Host Bridge 语义指导（semantic guidance）v2 的 manifest JSON Schema，约束面向代理发布的语义说明条目结构，保证 agent-facing 指令文本可校验。 |
| [contracts/host-bridge/surfaces.json](../files/contracts/host-bridge/surfaces.json.md) | 配置 | — | Host Bridge 面向代理的 surface 清单，列出 MCP、CLI 与插件内置 skill 包三类 surface 及其发布身份。是判断某个能力从哪条代理通道暴露、以及 CLI 发布版本的权威配置。 |
| [contracts/host-bridge/surfaces.json](../files/contracts/host-bridge/surfaces.json.md) | 服务 | — | 最小核心 agent-facing surface：把 Host Bridge CLI 自身作为一个 skill 挂载出来（sourceRoot 为 skills_src/zotero-bridge-cli），是其它 surface 的基座，patch 号决定内置技能包内容版本。 |
| [contracts/host-bridge/surfaces.json](../files/contracts/host-bridge/surfaces.json.md) | 服务 | — | Hermes facet 下的 hosted-agent surface，extends zotero-library-agent，以 Hermes Profile 形式发布 zotero-librarian skill，落到 profiles/hermes/zotero-librarian，是 Profile 发布链路的终端 surface。 |
| [contracts/host-bridge/surfaces.json](../files/contracts/host-bridge/surfaces.json.md) | 服务 | — | 通用代理 surface，extends zotero-bridge-cli，额外挂载 library-agent 与 library-query、literature-acquisition、literature-analysis、research-synthesis、library-curation 六个 skill，覆盖文献获取到综合的完整链路。 |
| [rust/acp-ws-bridge/Cargo.toml](../files/rust/acp-ws-bridge/Cargo.toml.md) | 文件 | — | ACP WebSocket Bridge 的 Cargo 清单，声明二进制 crate 名称、运行时依赖与 workspace 成员关系。 |
| [rust/acp-ws-bridge/src/main.rs](../files/rust/acp-ws-bridge/src/main.rs.md) | 文件 | — | ACP WS Bridge 的可执行入口，桥接插件侧 ACP 会话与 Agent 后端的 WebSocket 连接，负责握手、消息转发与生命周期管理。 |
| [rust/zotero-bridge/Cargo.toml](../files/rust/zotero-bridge/Cargo.toml.md) | 配置 | — | Zotero Bridge crate 的 Cargo 清单：声明面向 Zotero 宿主的桥接二进制构建依赖与 target 配置。 |
| [rust/zotero-bridge/cli-build-recipe.json](../files/rust/zotero-bridge/cli-build-recipe.json.md) | 配置 | — | 声明 Zotero Bridge CLI 的跨平台交叉编译配方，记录七个目标平台的 cargo-zigbuild 目标三元组、产物名称与打包约定，供构建与发布脚本消费。 |
| [rust/zotero-bridge/examples/export-agent-surface.rs](../files/rust/zotero-bridge/examples/export-agent-surface.rs.md) | 文件 | — | 极简 Rust 示例程序，将 Host Bridge 的面向代理接口面（agent surface）序列化输出，用于校验 CLI 的导出契约是否稳定。 |
| [rust/zotero-bridge/examples/export-command-inventory.rs](../files/rust/zotero-bridge/examples/export-command-inventory.rs.md) | 文件 | — | 遍历 Host Bridge CLI 命令树并导出命令清单与参数位置信息的 Rust 示例，用于固化命令 inventory 契约。 |
| [rust/zotero-bridge/scripts/install.ps1](../files/rust/zotero-bridge/scripts/install.ps1.md) | 文件 | — | Windows 侧的 Zotero Bridge CLI 安装脚本，负责挑选 Profile 路径、校验写权限、复制预编译二进制并写入安装 receipt。 |
| [rust/zotero-bridge/scripts/install.sh](../files/rust/zotero-bridge/scripts/install.sh.md) | 文件 | — | POSIX shell 版 Zotero Bridge CLI 安装脚本，提供与 PowerShell 版本一致的目录选择、权限校验、哈希计算与安装摘要输出。 |
| [rust/zotero-bridge/src/args.rs](../files/rust/zotero-bridge/src/args.rs.md) | 文件 | — | Zotero Bridge CLI 的 clap 命令行参数定义，涵盖 surface、bridge、operation、navigation、context、item、note、library、annotation、synthesis、topics、concepts、citation-graph 等全部命令树，并提供 operation id 归一化工具。 |
| [rust/zotero-bridge/src/client.rs](../files/rust/zotero-bridge/src/client.rs.md) | 文件 | — | Bridge 客户端门面：把 config 与 capability 组合成对 Host Bridge 的调用，识别 canonical mutation 并分流到 mutation 专用接口，同时提供 HTTP get/post/upload/download 快捷封装。 |
| [rust/zotero-bridge/src/commands.rs](../files/rust/zotero-bridge/src/commands.rs.md) | 文件 | — | Bridge 命令实现层：把每个 CLI 子命令翻译为 capability 调用与参数映射，包含直接研究包（direct paper/topic research bundle）的本地 zip 输出、产物校验与分页游标等支撑逻辑。 |
| [rust/zotero-bridge/src/config.rs](../files/rust/zotero-bridge/src/config.rs.md) | 文件 | — | Bridge 配置与 profile 解析：加载 CLI 配置、要求访问 token、定位 profile 文件（显式路径或 well-known 路径），并归一化 endpoint 与连接模式。 |
| [rust/zotero-bridge/src/contract.rs](../files/rust/zotero-bridge/src/contract.rs.md) | 文件 | — | Host Bridge 契约的单一事实源：解析并校验 meta schema，构建 capability/command 注册表，解析组合式 command 的输入与结果 schema，并生成带 violations 的校验错误与安全引用值。 |
| [rust/zotero-bridge/src/error.rs](../files/rust/zotero-bridge/src/error.rs.md) | 文件 | — | 统一错误模型：按 config/validation/connection/protocol/auth/internal 分类构造 CliError，携带 retryable、state change、handle consumption 与 safe next actions 等控制语义，并映射为进程退出码与错误 payload。 |
| [rust/zotero-bridge/src/main.rs](../files/rust/zotero-bridge/src/main.rs.md) | 文件 | — | Zotero Bridge 二进制入口：解析 clap CLI，把 clap 自身的 usage 与校验错误转成统一的 CliError 输出，并驱动命令分发与最终退出码。 |
| [rust/zotero-bridge/src/output.rs](../files/rust/zotero-bridge/src/output.rs.md) | 文件 | — | 统一输出层：把成功结果与错误结果序列化成固定的 SuccessOutput / ErrorOutput envelope，并暴露当前 CLI schema 供自描述使用。 |
| [rust/zotero-bridge/src/schema.rs](../files/rust/zotero-bridge/src/schema.rs.md) | 文件 | — | CLI schema 自省子命令：识别 schema 请求形式的 argv，展开命令树为带 example 的完整 JSON schema，并用契约补全各命令的 help 与参数示例。 |
| [rust/zotero-bridge/src/surface.rs](../files/rust/zotero-bridge/src/surface.rs.md) | 文件 | — | Agent-facing surface 生成器：把命令树编译为 invocation schema、argv 绑定与 agent 目标描述，产出带 checksum 的稳定描述符，并支撑 describe / search 子命令。 |
| [rust/zotero-bridge/src/transport.rs](../files/rust/zotero-bridge/src/transport.rs.md) | 文件 | — | HTTP 传输层：endpoint 解析、认证头注入、JSON 请求/响应处理、operation id 生成与记录、错误到 CliError 的映射，以及带重试与 sha256 校验的文件上传下载。 |
| [skills_src/zotero-bridge-cli/output.schema.json](../files/skills_src/zotero-bridge-cli/output.schema.json.md) | 配置 | — | Zotero Bridge CLI 输出的 JSON Schema，声明输出为无结构化约束的任意对象，边界由运行时与 SKILL.md 指令兜底。 |
| [skills_src/zotero-bridge-cli/profile.template.json](../files/skills_src/zotero-bridge-cli/profile.template.json.md) | 配置 | — | Provider profile 模板，规定 schema 标识、协议、endpoint、连接模式与 auth 结构，作为 agent 侧填写连接配置的骨架。 |
| [skills_src/zotero-bridge-cli/runner.json](../files/skills_src/zotero-bridge-cli/runner.json.md) | 配置 | — | Runner 描述文件，声明 Zotero Bridge CLI 的 id、名称、版本、执行模式、输入输出 schema 引用与 entrypoint，供 Skill 运行时发现可执行入口。 |
| [src/modules/hostBridge/cli/hostBridgeCliInjection.ts](../files/src/modules/hostBridge/cli/hostBridgeCliInjection.ts.md) | 文件 | — | 把 Host Bridge CLI 注入到 Agent 进程的环境与配置中（认证令牌、写入自动审批登记、Server 地址），使 Agent 可直接调用 CLI 暴露的宿主能力。 |
| [src/modules/hostBridge/cli/hostBridgeCliInstaller.ts](../files/src/modules/hostBridge/cli/hostBridgeCliInstaller.ts.md) | 文件 | — | Host Bridge CLI 安装器：按平台从打包资产中解析预编译二进制，校验并落盘到运行时持久化目录，同时处理 Windows 命令解析差异。 |
| [src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts](../files/src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts.md) | 文件 | — | Host Bridge CLI 的安装提示流程：探测 CLI 是否可用、组装提示文案与用户交互入口，并驱动用户进入安装流程。 |
| [src/modules/hostBridge/cli/hostBridgeCliResolver.ts](../files/src/modules/hostBridge/cli/hostBridgeCliResolver.ts.md) | 文件 | — | 解析 Host Bridge CLI 的最终可执行路径，优先使用环境变量覆盖与已安装版本，回退到默认平台安装位置。 |
| [src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts](../files/src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts.md) | 文件 | — | 构建随插件分发的 Host Bridge agent skill 包：以 contracts/host-bridge/surfaces.json 为事实源生成 skill 内容，并用 SHA-256 摘要判断是否需要重新物化。 |
| [src/modules/hostBridge/cli/hostBridgeProfileStore.ts](../files/src/modules/hostBridge/cli/hostBridgeProfileStore.ts.md) | 文件 | — | Host Bridge CLI 的 well-known profile 存储：按平台解析 profile 根目录，并把连接所需的 token、端口与主机信息写成 Agent 可发现的 profile 文件。 |
| [src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts](../files/src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts.md) | 文件 | — | 为 SkillRunner 后端推导 Host Bridge 运行环境：判定后端连接本地还是远程，据此拼装代理侧连接 Host Bridge 所需的环境变量。 |
| [src/modules/hostBridge/mcp/zoteroMcpProtocol.ts](../files/src/modules/hostBridge/mcp/zoteroMcpProtocol.ts.md) | 文件 | — | Host Bridge 的 MCP 协议层：把 40 余个 capability 暴露为 JSON-RPC tool 定义，负责参数 schema 校验、权限审批请求、结果压缩与面向模型的紧凑文本渲染。 |
| [src/modules/hostBridge/mcp/zoteroMcpServer.ts](../files/src/modules/hostBridge/mcp/zoteroMcpServer.ts.md) | 文件 | — | 内嵌的 MCP HTTP server：承载 JSON-RPC 端点、内建轻量 HTTP 解析、origin 校验、熔断与并发闸门、运行时诊断日志以及 tool 调用 admission 后的执行链路。 |
| [src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts](../files/src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts.md) | 文件 | — | ACP 会话侧的 Host Bridge 权限注册表：登记权限处理器并暂存待审批的 Host Bridge 工具调用。 |
| [src/modules/hostBridge/permissions/hostBridgePermissionManager.ts](../files/src/modules/hostBridge/permissions/hostBridgePermissionManager.ts.md) | 文件 | — | Host Bridge 权限管理器：维护全局与按会话作用域的待审批队列，把 capability 执行所需的审批需求投影到 ACP 与 SkillRunner 两条通道，并处理审批超时。 |
| [src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts](../files/src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts.md) | 文件 | — | Host Bridge 写操作的自动授权登记处：签发、吊销与按 run 回收 write auto-approval grant，并判定某个 scope 是否落在自动放权范围内。 |
| [src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts](../files/src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts.md) | 文件 | — | SkillRunner 侧的 Host Bridge 权限注册表：保存待审批权限请求、发布订阅通知并支持按请求 ID 结算。 |
| [src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts](../files/src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts.md) | 文件 | — | 广告主机检测：探测 Host Bridge 在网络上可被外部访问的地址，剔除不可用或明显不合法的 IPv4 候选，供远程后端生成可达连接配置。 |
| [src/modules/hostBridge/server/hostBridgeAuth.ts](../files/src/modules/hostBridge/server/hostBridgeAuth.ts.md) | 文件 | — | Host Bridge 认证与 token 生命周期：基于持久化主密钥派生 master token，支持轮换、脱敏展示与定长比较的授权校验。 |
| [src/modules/hostBridge/server/hostBridgeCapabilityContract.ts](../files/src/modules/hostBridge/server/hostBridgeCapabilityContract.ts.md) | 文件 | — | Host Bridge capability 合约层：加载 `contracts/host-bridge` 的 v2 JSON Schema，为每个 capability 提供入参/出参校验与 mutation 专用校验入口。 |
| [src/modules/hostBridge/server/hostBridgeFileRegistry.ts](../files/src/modules/hostBridge/server/hostBridgeFileRegistry.ts.md) | 文件 | — | Host Bridge 文件登记处：把宿主文件句柄、上传文件、工作流产物与导出结果登记为带租约的 file handle，供 Agent 下载或后续 mutation 引用。 |
| [src/modules/hostBridge/server/hostBridgeMutationAdapter.ts](../files/src/modules/hostBridge/server/hostBridgeMutationAdapter.ts.md) | 文件 | — | canonical mutation 的适配层：把 Host Bridge 的 mutation 请求转成 ZoteroHostCapabilityBroker 的 canonical mutation 操作，并缓存 prepared 资源以复用文件与授权事实。 |
| [src/modules/hostBridge/server/hostBridgeNotificationInbox.ts](../files/src/modules/hostBridge/server/hostBridgeNotificationInbox.ts.md) | 文件 | — | Host Bridge 通知收件箱：把 notificationHub 的工作流与 skill run 事件投影成 Agent 可读的通知事件，维护有界事件列表、确认语义与剪枝。 |
| [src/modules/hostBridge/server/hostBridgeOperationStore.ts](../files/src/modules/hostBridge/server/hostBridgeOperationStore.ts.md) | 文件 | — | Host Bridge 服务端操作存储：基于 pluginStateStore 记录 Bridge 操作的 view 与 receipt，并按任务保留策略清理过期记录。 |
| [src/modules/hostBridge/server/hostBridgePagination.ts](../files/src/modules/hostBridge/server/hostBridgePagination.ts.md) | 文件 | — | Host Bridge 通用分页与游标实现：基于内容指纹的稳定游标解码、行分页与长文本分块，保证翻页过程中结果集不漂移。 |
| [src/modules/hostBridge/server/hostBridgeProtocol.ts](../files/src/modules/hostBridge/server/hostBridgeProtocol.ts.md) | 文件 | — | Host Bridge 协议核心：定义协议版本、CLI profile schema 与统一响应构造，使 HTTP 路由、MCP 与 CLI 共用同一套响应形态与错误码。 |
| [src/modules/hostBridge/server/hostBridgeRouteContract.ts](../files/src/modules/hostBridge/server/hostBridgeRouteContract.ts.md) | 文件 | — | Host Bridge 路由契约的纯类型定义：声明路由 admission 类别、匹配结果形态与响应回调签名，让路由实现与 server 之间保持单向依赖。 |
| [src/modules/hostBridge/server/hostBridgeServer.ts](../files/src/modules/hostBridge/server/hostBridgeServer.ts.md) | 文件 | — | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [src/modules/hostBridge/server/hostHttpRequestReader.ts](../files/src/modules/hostBridge/server/hostHttpRequestReader.ts.md) | 文件 | — | 有界 HTTP 请求读取器：在 Zotero 沙箱内用 Components 流读取请求，解析 Content-Length 与分块帧，并施加大小、超时与并发上限。 |
| [src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts](../files/src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts.md) | 文件 | — | Host Bridge capability 路由：把 HTTP 请求映射为 capability 调用，完成路由匹配、分页入参解析、审批提示构造、上下文/选区读取与错误映射。 |
| [src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts](../files/src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts.md) | 文件 | — | Host Bridge 诊断路由：对外暴露 profile 体检、后端状态与运行选项缓存的只读视图，所有输出均做敏感字段脱敏。 |
| [src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts](../files/src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts.md) | 文件 | — | Host Bridge 文件路由：处理 Agent 的文件上传与下载，校验 file handle 租约、字节上限与内容类型，并把底层文件错误映射为统一响应。 |
| [src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts](../files/src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts.md) | 文件 | — | Host Bridge Synthesis 路由：把 sidecar 的维护状态、缓存与索引状态暴露给 Agent，并支持经审批的缓存失效操作。 |
| [src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts](../files/src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts.md) | 文件 | — | Host Bridge 工作流与活动路由：为 Agent 提供工作流目录、校验与提交、运行与队列管理、任务与权限查询、通知确认、provider profile 维护以及 skill run 触发。 |
| [src/modules/hostBridge/server/runtimeHttpResponse.ts](../files/src/modules/hostBridge/server/runtimeHttpResponse.ts.md) | 文件 | — | Host Bridge HTTP 响应构造层：把 JSON、文本、空响应与文件响应统一准备成可直接写入 Zotero 输出流的字节载荷，并在内存拷贝与异步文件传输之间做统一的分块、超时与失败清理。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts](../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts.md) | 文件 | — | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts](../files/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts.md) | 文件 | — | Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts](../files/src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts.md) | 文件 | — | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts](../files/src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts.md) | 文件 | — | Host Bridge 工作流资源层：管理一次运行期间的输入输出槽位绑定、文件登记与物化，为工作流提供受约束的读写资源 API。 |
| [src/modules/hostBridge/workflow/researchBundleService.ts](../files/src/modules/hostBridge/workflow/researchBundleService.ts.md) | 文件 | — | 研究文献包（Research Bundle）核心服务：负责把 canonical 文献产物物化成可下载的 bundle 目录、发布直连研究包，以及提供面向工作流的文献包导入 effects 与 importer。 |
| [src/modules/hostBridgeCapabilityRegistry.ts](../files/src/modules/hostBridgeCapabilityRegistry.ts.md) | 文件 | — | Host Bridge 能力注册表：把 MCP / CLI 暴露的每个能力映射到 Broker 语义、权限审批要求与执行 handler，覆盖文献浏览、导航、canonical mutation、工作流产品导出、Synthesis 透传与 debug eval。 |
| [src/modules/literatureArtifactMigration.ts](../files/src/modules/literatureArtifactMigration.ts.md) | 文件 | — | 文献产物迁移的运行时服务：扫描旧版 managed note payload 标记的 legacy 数据，经 converter 转成 canonical 产物，并通过 zoteroHostMutationAuthority 执行受控写入。 |
| [src/modules/literatureArtifactMigration/converter.ts](../files/src/modules/literatureArtifactMigration/converter.ts.md) | 文件 | — | legacy 文献产物到 canonical 产物的纯转换器：解析旧 payload 标签、匹配 source reference、归一 citation 结构并输出转换分类与诊断。 |
| [src/modules/selectionContext.ts](../files/src/modules/selectionContext.ts.md) | 文件 | — | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [src/modules/zoteroHost/libraryArtifactReadiness.ts](../files/src/modules/zoteroHost/libraryArtifactReadiness.ts.md) | 文件 | — | 库级文献产物就绪度评估：分页扫描 Zotero 条目的受管笔记与附件，判断每篇文献已具备哪些产物（digest、references、citation-analysis、literature-score）并支持序列化往返。 |
| [src/modules/zoteroHost/notePayloadCodec.ts](../files/src/modules/zoteroHost/notePayloadCodec.ts.md) | 文件 | — | 受管笔记负载编解码器：把逻辑 payload 编码进笔记 HTML 的隐藏块与内嵌 PNG 分块中，并提供 Markdown 渲染、块枚举、锚点校验与逻辑哈希。 |
| [src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts](../files/src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts.md) | 文件 | — | Broker 的原生写入原语集合：封装 Zotero.Item 的保存、删除、作者更新、元数据写入、分类更新与链接附件创建，供 Broker 在原生事务内调用。 |
| [src/modules/zoteroHost/zoteroHostNativeMutations.ts](../files/src/modules/zoteroHost/zoteroHostNativeMutations.ts.md) | 文件 | — | Zotero 宿主原生 mutation 执行层：把已审批的写操作落到原生 transaction 与 Zotero API，覆盖元数据创建、附件写入等 canonical mutation 路径。 |
| [src/modules/zoteroHost/zoteroHostPreparedFiles.ts](../files/src/modules/zoteroHost/zoteroHostPreparedFiles.ts.md) | 文件 | — | 已准备文件的事实描述层：为受管附件的主文件与伴随文件计算相对路径、大小与 sha256 摘要，形成可被审批与重放校验的不可变快照。 |
| [src/modules/zoteroHost/zoteroHostTrash.ts](../files/src/modules/zoteroHost/zoteroHostTrash.ts.md) | 文件 | — | 宿主回收站变更的准备与执行：按 portable ref 解析目标条目、采集变更前版本与实体观察值，先产出无副作用的预检结果，再执行实际的置入回收站。 |
| [src/modules/zoteroHost/zoteroLibraryPageQuery.ts](../files/src/modules/zoteroHost/zoteroLibraryPageQuery.ts.md) | 文件 | — | Zotero 库的分页查询层：把库条目、子条目、批注、分类与已保存检索统一成带签名游标的有界分页，并为每类查询提供可注入的测试 adapter。 |
| [src/modules/zoteroHost/zoteroManagedNotes.ts](../files/src/modules/zoteroHost/zoteroManagedNotes.ts.md) | 文件 | — | 受管笔记语义的唯一事实源：定义六类受管笔记的 kind/payload 类型、内容分类、语义哈希、引用健康度推导、父子引用集校验与产物写入，并托管旧负载的迁移读取。 |
| [src/modules/zoteroHost/zoteroNotePayloadResolver.ts](../files/src/modules/zoteroHost/zoteroNotePayloadResolver.ts.md) | 文件 | — | 笔记负载解析器：按条目分页列出笔记中的 payload 块，必要时从笔记附件中读取并校验内嵌负载字节，为引用图谱与产物读取提供统一的取数入口。 |
| [src/modules/zoteroHostCapabilityBroker.ts](../files/src/modules/zoteroHostCapabilityBroker.ts.md) | 文件 | — | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [src/modules/zoteroHostMutationAuthority.ts](../files/src/modules/zoteroHostMutationAuthority.ts.md) | 文件 | — | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 对其它分层的依赖

| 目标分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [插件外壳与核心运行时](plugin-core.md) | 93 | imports×93 |
| [工作流引擎与执行](workflow-engine.md) | 55 | imports×55 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 23 | imports×22、configures×1 |
| [构建、发布与工程配置](build-tooling.md) | 21 | defines_schema×21 |
| [Agent 协议与后端运行时](agent-runtime.md) | 15 | imports×15 |
| [页面与交互界面](ui-surface.md) | 7 | imports×6、defines_schema×1 |
| [项目文档与规范](documentation.md) | 1 | configures×1 |

## 被其它分层依赖

| 来源分层 | 边数 | 关系类型 |
| --- | --- | --- |
| [工作流引擎与执行](workflow-engine.md) | 27 | imports×27 |
| [Agent 协议与后端运行时](agent-runtime.md) | 18 | imports×18 |
| [Synthesis 领域与侧车](synthesis-domain.md) | 12 | imports×12 |
| [页面与交互界面](ui-surface.md) | 9 | imports×9 |
| [插件外壳与核心运行时](plugin-core.md) | 7 | imports×7 |
| [构建、发布与工程配置](build-tooling.md) | 2 | imports×2 |
