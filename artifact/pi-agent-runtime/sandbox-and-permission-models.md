# Agent 沙箱与权限模型研究

研究截面：2026-08-25。本文只采用产品官方文档、官方仓库源码或官方仓库中的规范；未以博客、论坛或第三方测评作为证据。研究对象限定为 OpenAI Codex CLI、Claude Code、Gemini CLI 与 Pi。这里的“Pi”指当前官方仓库 `earendil-works/pi` 中的 coding agent，结论针对把它嵌入 Zotero 的 Built-in Pi Agent Runtime。

## 结论先行

成熟产品普遍把三件事分开：

1. OS/容器/虚拟机边界限制“命令及其子进程能做什么”；
2. workspace trust 决定是否加载项目控制的设置、技能、扩展或钩子；
3. permission/approval 决定一次工具调用是否需要用户确认。

审批本身不是沙箱。Codex 明确把 sandbox 与 approval policy 分成两个独立层；Claude 也明确区分 permission rules 与 Bash 的 OS 级 sandbox。[Codex sandboxing](https://learn.chatgpt.com/docs/sandboxing)；[Claude sandboxing](https://code.claude.com/docs/en/sandboxing)

对 Zotero 插件最关键的边界是：模型循环若在 Zotero/插件进程内运行，给其拉起的 shell 子进程加沙箱，并不能自动限制插件进程内的读写工具、扩展代码、MCP 或网络客户端。Pi 的官方 SDK 是同一 Node 进程内的会话；官方文档因此把 RPC 进程隔离和“Pi 负责循环、工具路由到隔离环境”作为不同部署模式。[Pi SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)；[Pi containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md)

因此 Built-in Pi Agent Runtime 的候选底线是：

- 插件进程只做模型循环、状态管理、用户界面和策略判定；所有文件、shell、进程、网络以及扩展工具都经由类型化 RPC 送往独立 executor。
- executor 必须在每次运行前报告并证明实际沙箱能力；不能证明时返回 `sandbox_unavailable`，不执行工具。
- 默认无网络、无宿主凭据继承、只读或限定 workspace 写入；不得自动变为宿主权限、`danger-full-access`、`--yolo` 或 Pi 的直接 host 工具。
- 运行时不可用时 fail closed。Claude Code 的默认“警告后无沙箱执行”和 `allowUnsandboxedCommands` 是成熟产品中的明确逃生路径，但不适合作为 Zotero 插件的隐式降级。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing)

## 术语与进程边界

建议把运行时画成下面的边界，而不是把“Agent”笼统地称为沙箱：

```text
[Zotero 7/9 插件进程]
  Pi model loop、会话状态、UI、审批、策略
             |
             | 仅允许类型化、可审计的 ToolRequest/ToolResult RPC
             v
[独立 executor 进程 / 容器 / 微型 VM]
  canonical path、网络、环境、凭据、资源限制
             |
             v
[shell / 子进程 / 文件与网络工具]
```

有两种可接受的部署形态：

1. 在隔离进程/容器/VM 中运行完整 Pi，插件通过 RPC 与它通信；
2. 模型循环留在插件进程，但 Pi 的每个内置工具和每个扩展工具都只能调用 executor 的 RPC。

第二种形态要求工具全集是封闭的。Pi 官方文档特别提醒：host 上运行 Pi 时，工具路由只能隔离被委派的内置工具，未委派的自定义扩展工具仍在 host 执行；“在容器里运行整个 Pi”与“只把工具送入隔离环境”不是同一安全边界。[Pi containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md)

## 逐产品事实

### OpenAI Codex CLI

- **文件与进程。** Codex 将 sandbox 应用于本地命令及其派生的子进程，包括 git、包管理器和测试运行器，不只限制内置文件操作。公开模式为 `read-only`、`workspace-write`、`danger-full-access`；后者取消沙箱边界。[Codex sandboxing](https://learn.chatgpt.com/docs/sandboxing) 因而可以借鉴前两种模式和“子进程继承”，但 Built-in Pi Runtime 应拒绝第三种模式。
- **审批。** `untrusted`、`on-request`、`never` 是独立于沙箱的审批策略；审批用于决定何时停下来问人，不能替代 OS 强制边界。对 workspace-write 的额外权限，官方指导优先授予狭窄的网络或文件例外，并保留沙箱。[Codex approvals/security](https://learn.chatgpt.com/docs/agent-approvals-security)；[Codex permission request](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/permissions/approval_policy/on_request_rule_request_permission.md)
- **网络。** 本地 Codex 默认关闭网络；workspace-write 可显式打开网络。另有独立的网络代理/域名允许列表能力，代理默认关闭；启用时可拒绝 loopback、link-local 和私有地址，只放行明确域名，但文档将 DNS/重绑定防护描述为限制而非绝对保证。[Codex approvals/security](https://learn.chatgpt.com/docs/agent-approvals-security) Built-in Pi Runtime 应把默认值收紧为 deny，并要求每个允许域名和端口可审计。
- **跨平台执行。** macOS 使用 Seatbelt；Linux/WSL2 使用 bubblewrap 配合 seccomp/namespace 路径；原生 Windows 使用 Windows sandbox 实现。[Codex sandboxing](https://learn.chatgpt.com/docs/sandboxing) Linux/WSL2 在 `bwrap` 或用户 namespace 受限时会尝试 bundled helper，并在无法建立隔离时发出启动警告；这仍须由调用方核验，不能把“有 warning”当成安全成功。
- **Windows 强弱模式。** 原生 Windows 文档区分首选的 `elevated`（专用低权限 sandbox 用户、ACL 与防火墙）和较弱的 `unelevated`（当前用户的 restricted token、ACL 与环境级离线控制）。[Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox) Zotero 应记录实际模式；如果只能提供弱模式，必须显式告知用户，而不是标成与强模式等价。
- **workspace trust 与配置。** 项目 `trust_level` 可为 `trusted` 或 `untrusted`；不受信项目跳过项目 `.codex` 配置、hooks 和 rules。[Codex config reference](https://learn.chatgpt.com/docs/config-file/config-reference) 这解决的是“项目能否控制 Agent”，不是 OS 文件隔离；两层都要保留。
- **凭据与环境。** `CODEX_HOME` 作为配置、认证、日志和会话根目录；`CODEX_API_KEY`、`CODEX_ACCESS_TOKEN` 以及 provider 的 `env_key` 可提供凭据。[Codex environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables) 该设计说明模型凭据属于 Agent 侧配置，不应无条件复制到 sandbox executor 的环境；executor 应采用环境变量 allowlist 或短期 secret handle。
- **资源与失败。**  reviewed Codex 文档提供命令审批、网络和路径边界，但没有给出可移植的 CPU/内存硬配额。沙箱后端、namespace 和网络状态应成为运行时能力的一部分；Zotero 不能以 `danger-full-access` 作为不可用时的自动恢复。

### Claude Code

- **文件与进程。** 内置 Bash 沙箱对每条 Bash 命令及其子进程施加 OS 级文件和网络限制；默认只允许工作目录和会话临时目录写入。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing) 但该边界只覆盖 Bash。内置 Read/Edit/WebFetch、MCP server、hooks 等不自动落在同一 Bash sandbox 内；官方说明需要 whole-process sandbox 才能把完整 Claude 进程包住。[Claude sandbox environments](https://code.claude.com/docs/en/sandbox-environments)
- **权限与审批。** sandbox 有“自动允许”和“仍走常规 permission”两种交互模式，技术限制相同；`allow`/`ask`/`deny` 规则另行决定用户确认。[Claude permissions](https://code.claude.com/docs/en/permissions) 这是一种可移植的分层模型，但不能把 permission allow 当成 host 文件系统授权。
- **网络。** 默认网络受限；新的域名可触发询问或由分类器处理。sandbox 的网络 allowlist/proxy 可按域名配置，但宽域名允许会扩大外传面，代理默认不做 TLS 检查。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing) Zotero 应只允许精确域名，阻止 loopback、私网和代理绕过。
- **凭据与环境。** sandbox credentials 可对文件和环境变量采用 `deny` 或 `mask`；`deny` 在每次 sandbox 命令前拒绝读取/取消环境变量，`mask` 通过受控注入把值交给批准的主机。`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` 可清除子进程中的 Anthropic/cloud provider 凭据。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing) 这些措施只保证 sandboxed Bash；插件侧工具和 MCP 仍需独立的凭据策略。
- **workspace trust。** 项目设置中的 permissions 和额外目录在 trust 对话之后才生效；无信任时项目控制的规则不应取得权限。[Claude permissions](https://code.claude.com/docs/en/permissions) headless/SDK 没有交互式信任对话，故 Built-in Pi Runtime 的无界面路径应拒绝而不是自动信任。
- **跨平台。** Bash sandbox 当前依赖 macOS Seatbelt 或 Linux/WSL2 的 bubblewrap/socat；原生 Windows 不支持该内置路径，官方建议在 WSL2 中运行。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing) 对 Zotero 7/9 的 Windows 原生插件不能直接移植，必须有单独的 Windows executor 或保持不可用。
- **不可用时的行为。** sandbox 启动失败时默认会警告并无沙箱运行；`sandbox.failIfUnavailable=true` 才硬失败。`allowUnsandboxedCommands` 还允许被阻止的命令以 `dangerouslyDisableSandbox` 重试。[Claude sandboxing](https://code.claude.com/docs/en/sandboxing) 这是研究中最清晰的反例：Pi Runtime 必须固定 fail closed，不能提供隐式的同等逃生开关。
- **整体进程选项。** 官方 sandbox runtime 是独立的研究预览，目标是限制整个 Claude 进程的网络和写入路径。[sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime) 若采用同类设计，必须把版本、依赖和 capability receipt 纳入 Zotero 的 executor 健康检查。
- **资源。** reviewed 文档没有承诺通用 CPU/内存配额；命令超时、输出上限和进程树回收需要由 Built-in Runtime 自行契约化，而不能从 Bash sandbox 推断出来。

### Gemini CLI

- **沙箱开关与边界。** sandbox 默认不是始终开启，用户可用 `--sandbox`、`GEMINI_SANDBOX` 或 `tools.sandbox` 启用；`security.toolSandboxing` 还可单独按工具隔离，默认关闭。[Gemini sandbox](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md)；[Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md) 工具级隔离不能替代完整进程边界。
- **执行后端。** 官方列出 macOS Seatbelt、Docker/Podman、Linux runsc/gVisor 与 LXC/LXD，以及 Windows 使用低完整性级别的原生方案；Docker/Podman 把 workspace 以相同绝对路径挂入容器，workspace 写入会反映到宿主。[Gemini sandbox](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md) 这提供跨平台选择，但“workspace 可写”仍要与宿主其余路径严格隔离。
- **网络。** 配置参考提供 `tools.sandboxNetworkAccess`，默认值为 `false`；sandbox 页面描述某些 macOS `permissive-open` profile 的网络更宽松。[Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)；[Gemini sandbox](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md) 两个官方页面的默认描述并不完全一致，因此候选 Runtime 不能依赖隐式 profile，必须显式设置 deny 并在 executor receipt 中回报有效策略。
- **按次扩展。** 遇到 sandbox 拒绝（例如需要安装依赖）时，Gemini 可弹窗请求扩展权限，获批后只对本次执行放宽。[Gemini sandbox](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md) 该“单次、可见、带理由”的模式可作为候选审批；不可接受的是自动把所有失败重试到宿主。
- **workspace trust。** trust 对话发生在加载项目配置之前；不受信安全模式会忽略 workspace settings、项目 `.env`、扩展管理和 memory，并禁用 MCP/自定义命令；无交互 headless 的 `ask_user` 会按拒绝处理，可能以 `FatalUntrustedWorkspaceError` 退出。[Gemini trusted folders](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/trusted-folders.md) 这接近“没有用户确认就不执行”。但官方配置参考与 trusted-folders 页面对 trust 默认状态存在需要核验的差异，候选 Runtime 应显式设置而不依赖默认值。[Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
- **策略。** policy engine 使用 `allow`、`deny`、`ask_user`，高优先级规则胜出；非交互环境的 `ask_user` 视为 deny。[Gemini policy engine](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/policy-engine.md) 这是适合迁移到插件的结构化审批接口，但仍必须叠加 OS sandbox。
- **环境与凭据。** CLI 会按项目路径加载 `.env`；`GEMINI_API_KEY` 等环境变量以及 `GEMINI_CLI_HOME` 影响凭据/状态位置，环境变量 redaction 默认不是强制开启。[Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md) Built-in Runtime 应默认不继承插件全量环境，也不应在未信任 workspace 时加载项目 `.env`。
- **资源。** shell inactivity timeout 默认 300 秒，输出截断阈值为 40,000 字符，并有 `advanced.autoConfigureMemory` 的 Node 内存配置能力。[Gemini configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md) 这些是工具/进程运行参数，不等于跨平台的 OS CPU/内存配额；Pi Runtime 仍需自己的进程树、输出和资源上限。
- **危险开关。** CLI reference 暴露 `--approval-mode` 的 `yolo` 等模式。[Gemini CLI reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md) Built-in Pi Runtime 不应映射或隐藏地启用此类全放行模式。

### Pi

- **核心默认边界。** Pi 的官方 README 把它定位为可在当前工作目录运行并修改文件的 coding harness，默认工具包括 read/write/edit/bash；核心没有内建 permission popup 或 sandbox，安全责任交给容器或扩展自行构建确认流程。[Pi coding-agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md) 因而 Pi 本身不是隔离执行器。
- **同进程 SDK 与 RPC。** `createAgentSession` SDK 在同一 Node 进程中运行，工具可选择默认集合或只读集合；RPC 模式是进程隔离、语言无关的接口。[Pi SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md) 把 SDK 直接嵌入 Zotero 进程时，Pi 的内置工具不能被称为沙箱；需要改成 RPC 或把所有工具实现替换为 executor client。
- **扩展与包。** Pi extensions/packages 运行时拥有系统访问能力，技能也可能让模型执行任意程序；官方要求审阅第三方包源代码。[Pi coding-agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md) 这意味着只隔离 `bash` 而允许 host extension 是不完整的权限模型。
- **项目 trust。** Pi 的 project trust 保存于 `~/.pi/agent/trust.json`；交互启动可询问是否信任项目，信任后才加载项目设置、资源与 skills。`defaultProjectTrust`、`--approve`/`--no-approve` 控制信任选择。[Pi settings](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md) 该机制保护的是项目控制内容的加载，不是 OS 文件、网络或进程隔离；非交互路径不能把“总是信任”当默认安全策略。
- **容器/VM 方案。** 官方 containerization 文档列出整 Pi 放入 Docker、OpenShell policy sandbox，或使用 Gondolin 微型 VM 覆盖内置工具；同时明确 host Pi 的工具路由不会隔离未委派的扩展工具。[Pi containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md) 这些是 Built-in Runtime 可以适配的外部执行器模式；必须把工具全集纳入路由，不能只包住 shell。
- **凭据。** Docker 示例把 provider key 传入容器，并警告挂载 host `~/.pi/agent` 会暴露认证与会话；建议使用容器自己的 agent volume。[Pi containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md) 对 Zotero 更安全的默认是模型凭据留在插件/服务侧，executor 不继承；若必须注入则按次、短期、最小范围注入。
- **可选 sandbox 扩展。** 官方示例使用 `@anthropic-ai/sandbox-runtime` 覆盖 Pi 的 bash，macOS 使用 Seatbelt、Linux 使用 bubblewrap，并示范 denyRead/denyWrite 与允许域名。[Pi sandbox extension](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/sandbox/index.ts) 这是可选扩展，不是 Pi core 的强制保证；它不能约束未经覆盖的自定义工具。
- **shell 与资源。** Pi 的 bash/exec 源码支持 cwd、timeout、abort，以及超时后的 SIGTERM/SIGKILL 回收，但没有跨平台 OS 沙箱、路径 allowlist 或 CPU/内存配额的核心承诺。[Pi bash source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/bash.ts)；[Pi exec source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/exec.ts) Built-in Runtime 不能把这些进程控制参数误认为安全边界。

## 对比矩阵

| 产品 | Agent loop 与工具边界 | 文件/进程 | 网络 | 凭据与环境 | trust / 审批 | 资源与跨平台 | 不可用时的含义 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Codex CLI | CLI/IDE 负责 loop，OS sandbox 覆盖本地命令及子进程 | read-only / workspace-write / full access；workspace 可写路径可配置 | 默认关闭；可按配置/代理放行 | `CODEX_HOME` 与 provider env key；需另行隔离 executor 环境 | trust、approval 与 sandbox 分层 | macOS Seatbelt、Linux/WSL2 bwrap/helper、Windows native；文档未承诺通用 CPU/内存配额 | 后端诊断/警告；项目必须自行禁止 host fallback |
| Claude Code | Bash sandbox 覆盖 Bash 子树；完整工具要 whole-process runtime | 工作目录/临时目录写入；Read/Edit/MCP/hooks 不自动受 Bash 边界保护 | 默认限制，域名/代理可配置 | credential deny/mask 与 subprocess scrub 主要针对 sandboxed Bash | permission 与 sandbox 模式分层；trust 后项目设置生效 | macOS、Linux/WSL2；原生 Windows 无内置 Bash sandbox | 默认可能警告后无沙箱；`failIfUnavailable` 才硬失败；Zotero 应拒绝该默认 |
| Gemini CLI | 可整进程 sandbox，也可选择工具级 sandbox；后者默认关闭 | macOS Seatbelt、容器、runsc/gVisor、LXC/LXD、Windows 低完整性 | `tools.sandboxNetworkAccess`；profile 默认需显式核验 | `.env`、API key、home 可配置；redaction 默认非强制 | policy `allow/deny/ask_user`；不信任时隔离项目资源 | shell timeout/output limit；无通用 OS CPU/内存配额；多平台后端 | sandbox 被拒绝可单次弹窗扩展；必须保持可见、按次、不可自动 host 重试 |
| Pi | core 默认 loop 与工具同进程；RPC/容器/VM 才能形成额外边界 | 默认可改 cwd 文件；无 core sandbox；扩展可全系统访问 | 由宿主/外部 sandbox 决定 | SDK/扩展沿用宿主环境；官方警告 host agent volume/密钥挂载风险 | project trust 只管资源加载；core 无内建 permission popup | timeout/abort 有限；无 core OS 沙箱、配额或统一 Windows 保证 | 必须由集成方提供；没有 executor 就只能拒绝工具执行 |

## 可移植原则

### 1. 强制边界优先于提示

模型提示、工具白名单和审批 UI 都可能被模型输出、项目指令或扩展代码影响；它们只能表达意图。文件、进程和网络必须由 executor 的 OS/容器/VM 强制实施，并覆盖所有子进程。Pi 的“只委派一部分工具”模式必须明确列出未委派工具并禁用它们。[Pi containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md)

### 2. loop 与 executor 分离

Zotero 主进程不能在自己已经拥有宿主权限的情况下“把自己降权”当成插件级沙箱。若模型 loop 留在插件进程，插件只能持有策略和 typed RPC client；不能直接调用 Node/JS 的任意文件、shell、网络 API，也不能加载未经信任的 extension。若要使用 Pi 默认工具，应将完整 Pi 置于外部 sandbox 并以 RPC 接入。

### 3. workspace trust 只解决“谁能控制 Agent”

未信任 workspace 应跳过项目设置、skills、extensions、hooks、MCP 和项目 `.env`；即使 workspace 已信任，仍要通过 canonical path 和 OS sandbox 限制文件/进程/网络。无交互路径遇到需要信任时应 deny/exit，不能隐式 `always`。

### 4. 默认最小权限

- 运行模式只提供 `read-only` 与 `workspace-write`；写入默认限定当前 workspace 和专用 scratch，禁止宿主配置、凭据目录、插件目录、外部 worktree、任意绝对路径。
- 网络默认 deny；启用时以精确域名和端口 allowlist 为单位，并拒绝 loopback、link-local、私网、Unix socket、代理绕过和可疑 DNS 解析。
- 环境采用 allowlist，不继承插件全量环境；项目 `.env` 不自动进入 executor。模型 API key 留在宿主侧模型客户端或可信 gateway；executor 如需 secret，只接受按次、短期 secret reference，不写入命令行、日志、文件或 crash dump。
- 禁止把 `danger-full-access`、`yolo`、`--no-approve`、`allowUnsandboxedCommands` 或任意 sandbox flags 映射为 Built-in Runtime 的普通选项。

### 5. 每次运行先取得能力证明

executor 在接收 ToolRequest 前应返回不可伪造性足够的 capability receipt，至少包含：后端类型与版本、操作系统、canonical workspace root、实际可写路径、网络是否开启及 allowlist、环境 scrub 结果、子进程继承情况、超时/输出/进程上限。缺失、过期或与请求不匹配就拒绝执行。仅显示“sandbox enabled”字符串不构成证明。

### 6. 失败必须可见且 fail closed

缺少 bwrap/Seatbelt/Windows helper、容器/VM 不可启动、用户 namespace 被禁止、网络策略无法安装、路径 canonicalization 失败或进程树无法回收时，状态应为 `sandbox_unavailable`/`sandbox_failed`，显示原因和恢复建议；不能重试到宿主 shell，也不能把 UI 上的“允许”解释成移除 OS 边界。只有用户明确选择并确认一个已知、可审计的外部边界时，才可切换到另一个受支持 executor。

## Built-in Pi Agent Runtime 候选安全契约

下面是用于原型和评审的候选契约，不是现有代码的承诺。建议把每一项变成跨平台 executor 的结构化字段和测试断言。

| 契约面 | 候选要求 | 明确拒绝 |
| --- | --- | --- |
| 运行形态 | `embedded-loop + typed-RPC-executor` 或 `external-Pi + RPC`；executor 是独立进程、容器或 VM | Pi SDK 默认工具直接在 Zotero 进程访问宿主；只隔离 Bash、放任扩展/Read/Edit/MCP 在 host |
| 模式 | `read-only`、`workspace-write` 两档；每次请求携带 mode 与 workspace identity | full host access、静默从 read-only 变 workspace-write、全局“信任此机器” |
| 路径 | 启动前 canonicalize root；读取/写入都做 symlink、junction、reparse point、`..` 和外部 worktree 检查；默认只允许 workspace + 独立 scratch | 依赖字符串前缀；可写宿主 home、Zotero profile、插件安装目录、凭据目录或任意挂载 |
| 文件工具 | 内置 read/write/edit/grep/find/ls 全部转 RPC，结果限制大小并标记路径 | 认为 Pi project trust 或工具 approval 已经限制了文件系统 |
| shell/进程 | 非交互 shell；cwd 固定；继承 sandbox；超时杀进程树；限制输出、进程数、句柄/临时文件 | 在超时后留下后台进程；允许改变 sandbox 外 cwd；把 SIGTERM 失败当作成功 |
| 网络 | 默认 deny；显式 allowlist；阻止私网/loopback/link-local 和代理绕过；receipt 回报有效策略 | 任意网络、任意代理、宽域名通配、仅 UI 显示“网络关闭”而未验证 |
| 环境/凭据 | `inherit: none`，最小 allowlist；项目 `.env` 需 trust + 用户确认；secret 仅按次注入、擦除并禁止日志化 | 继承 Zotero 全量环境、挂载 host `~/.pi/agent`、把 API key 写入命令行或 workspace |
| trust | untrusted 时不加载项目设置/skills/extensions/hooks/MCP/.env；headless 无法询问则 deny | 用项目里的配置来决定该项目是否可信；默认 `always trust` |
| approval | read-only workspace 内安全读可自动；写、shell、网络、外部路径和权限扩大按请求确认，显示目标路径/域名/理由；授权只对一次请求或受信项目生效 | `ask` 失败后自动 retry host；全局持久化 allow；把模型的文字同意当用户同意 |
| 资源 | 每 tool timeout、max output、max process、session turn/cost 可配置；OS CPU/内存/磁盘配额若后端不支持必须回报 unsupported 并按策略拒绝 | 宣称“有 timeout 就有资源隔离”；无限输出、无限 fork、超时只杀 shell 不杀子树 |
| executor 健康 | 每次启动/切换 OS 后重新探测；能力 receipt 与请求 capability 精确匹配 | 后端缺失时静默改用宿主权限或未审计的任意 sandbox flags |
| 审计 | 记录 request id、tool、canonical paths、domains、mode、receipt 摘要、approval decision、失败原因，不记录 secret 内容 | 记录完整环境、token、命令中的 secret 或可直接复用的授权令牌 |

一个最小的请求契约可以表达为：

```text
ToolRequest {
  requestId,
  owner: { zoteroProfileId, workspaceRoot },
  mode: "read-only" | "workspace-write",
  tool: "read" | "write" | "edit" | "grep" | "find" | "ls" | "shell" | "network",
  paths: canonical paths,       // executor 再次校验
  domains: exact allowlist,     // 默认空
  env: allowlisted names,       // 默认空；secret 为一次性 reference
  limits: { timeoutMs, outputBytes, processCount },
  approval: { required, decision, scope },
  failClosed: true
}
```

`failClosed` 不是给模型或项目设置覆盖的字段，而是运行时不变量。对于模型 loop 在插件进程内的方案，任何未列入 `tool` 枚举的自定义工具都应拒绝注册，除非它声明并通过同一 executor 合约。

## 仍需原型验证的问题

这些问题不能仅凭产品文档得出结论，应在 Zotero 7 与 Zotero 9 的实际宿主中做最小跨平台测试矩阵：

1. **进程边界。** Pi SDK 嵌入插件后，确认模型、extension、Read/Edit 和自定义工具是否仍能调用宿主文件/网络 API；随后切换到 RPC，验证每个工具是否都经过 executor，包含异常路径和取消路径。
2. **路径逃逸。** 对 workspace 外的 `..`、符号链接、macOS alias、Windows junction/reparse point、嵌套 worktree、网络盘、大小写变化和 TOCTOU 进行读写测试；检查 `.git/hooks`、`.git/config`、Zotero profile、插件目录、系统临时目录的实际结果。
3. **子进程继承。** shell 生成孙进程、后台进程、不同 shell、包管理器、解释器和脚本时，验证 cwd、环境、文件描述符、网络和 sandbox 都继承；取消/超时后确认进程树没有残留。
4. **网络拒绝。** 测试 DNS、IPv4/IPv6 loopback、link-local、私网、代理环境变量、重定向、非 HTTP socket、Unix socket 和允许域名到私网解析的情况；检查实际连接而非只检查配置文本。
5. **凭据泄漏。** 枚举 executor 环境、`/proc`/Windows 进程参数、临时文件、日志、错误对象、core dump、子进程继承和项目 `.env`；确保模型 key、Zotero 凭据、Host Bridge token、Pi auth/session 不进入受限进程，或只按次短期出现。
6. **trust 与审批。** 新 workspace、未信任 workspace、已信任 workspace、项目设置修改、skill/extension/MCP 注册和 headless 启动分别测试；确认无 UI 时 `ask` 是 deny/exit，不是 auto-allow。
7. **后端不可用。** 人为移除/禁用 bwrap、Seatbelt/helper、Windows executor、容器运行时、QEMU/OpenShell，模拟用户 namespace、ACL、低完整性权限失败；预期是明确的 `sandbox_unavailable`，且没有任何宿主工具执行记录。
8. **资源边界。** 测试超时、超大输出、递归 fork、长时间空闲、内存/磁盘压力、取消和 Zotero 关闭；分别验证 shell、孙进程、executor 和 UI 状态，不能只测父进程退出。
9. **跨平台打包。** 在 macOS、Linux、Windows 以及 Zotero 7/9 的实际 JavaScript/XUL 环境记录可用 executor、权限提示、安装/更新路径、路径编码和恢复方式；当某平台没有经过验证的后端时必须保持 disabled，而不是使用宿主权限替代。
10. **能力 receipt。** 将 receipt 与实际探测（写入外部路径、访问被拒网络、子进程环境、进程树）交叉验证，确认 receipt 不是模型可伪造的文本，并在 executor 重启、睡眠唤醒、workspace 切换后重新生成。

## 一手来源

以下链接是本文引用的官方资料入口；均应以研究截面时的当前内容为准：

### OpenAI Codex CLI

- [Sandboxing](https://learn.chatgpt.com/docs/sandboxing)
- [Agent approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security)
- [Windows sandbox](https://learn.chatgpt.com/docs/windows/windows-sandbox)
- [Config reference](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Environment variables](https://learn.chatgpt.com/docs/config-file/environment-variables)
- [Approval permission request template](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/permissions/approval_policy/on_request_rule_request_permission.md)

### Claude Code

- [Sandboxing](https://code.claude.com/docs/en/sandboxing)
- [Sandbox environments](https://code.claude.com/docs/en/sandbox-environments)
- [Permissions](https://code.claude.com/docs/en/permissions)
- [Settings](https://code.claude.com/docs/en/settings)
- [Security](https://code.claude.com/docs/en/security)
- [IAM and credentials](https://code.claude.com/docs/en/iam)
- [Anthropic sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime)

### Gemini CLI

- [Sandbox](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/sandbox.md)
- [Configuration reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md)
- [Policy engine](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/policy-engine.md)
- [Trusted folders](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/trusted-folders.md)
- [CLI reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md)
- [Tools reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/tools.md)

### Pi

- [Coding-agent README](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/README.md)
- [SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [Settings](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/settings.md)
- [Containerization](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md)
- [Sandbox extension example](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/sandbox/index.ts)
- [Bash tool source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/bash.ts)
- [Exec source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/exec.ts)
