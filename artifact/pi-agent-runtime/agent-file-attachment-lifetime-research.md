# 主流 Agent Harness 的单次文件附件生命周期（一手资料核查）

核查日期：2026-09-05。本文为 Wayfinder `#26` 的附件生命周期决策提供事实底稿，只采用产品官方文档、官方仓库源码与公开协议。这里的“附件”指用户在某条消息中显式选择、拖入或 `@` 引用的本地文件；工作区、项目根目录和额外目录授权另行统计。

证据强度标记：**明确**表示官方资料直接说明；**推断**表示由已公开的数据流或会话合同推出；**未公开**表示官方资料不足以确定，不能当成产品保证。

## 结论

主流 coding agent 并没有把“给这一条消息附加文件”普遍解释成一个持续存在的精确文件权限。更常见的是两层机制：

1. 发送时读取或上传文件内容，把它作为本次请求及其会话历史的一部分；后续轮次可以通过历史上下文继续使用这份内容，但会受上下文压缩、截断或会话删除影响。
2. Agent 对原始文件的持续读取能力由工作区、启动目录、额外挂载目录或 sandbox 决定。只附加一个文件，通常不会顺带授权其父目录。

Aider 是样本中的明确例外：`/add` 把文件加入当前 chat file set，此后每次请求都从原路径重新读取，直到 `/drop` 或 `/reset`。这是一种“持续 live path”模型，但不是本次样本中的主流做法。

因此，如果当前票要在“仅本轮可用”和“同一对话持续持有原始文件访问权”之间二选一，两者都不够准确。更贴近现有产品的规则是：

> 附件在发送时形成会话副本。同一对话的后续轮次可以继续使用该副本；它不授予原始路径或父目录的持续访问权，原文件后续变化也不会自动反映。需要最新内容时由用户重新附加。删除会话时一并删除其附件副本。

这条规则适合 Pi Conversation；它无需把附件提升为 Broker navigation 或文件系统授权，也不要求持续持有 Zotero 外部路径。

## 对照表

| Harness / 产品面 | 后续轮次能否继续使用 | 实际授权范围 | 副本还是 live path | 撤销 / 删除 |
| --- | --- | --- | --- | --- |
| **OpenAI Codex CLI / app-server / app** | **明确**：线程 item 会持久化并作为后续模型上下文；IDE 的选区和打开文件则明确只属于当前 turn。 | 工作区权限由 cwd、project roots 和 permission profile 决定；直接附件不是目录授权。公开 Codex 协议只定义本地图像/音频，没有通用文档附件类型。 | **明确**：本地图像/音频在进入模型输入前被读成 inline data URL 快照；UI 可另保留本地路径用于“编辑历史消息后重新附加”，该路径不是模型输入。Codex app 的通用文件附件是否采用同一物理存储方式为**未公开**。 | `thread/delete` 可硬删除整条线程及子线程。公开 app-server API 没有“删除已发送消息中的单个附件”操作；文件系统权限可通过 permission/workspace 配置另行收回。 |
| **Claude Code** | **明确**：恢复 session 会恢复消息历史和已读文件上下文；压缩后只保留 summary、近期对话及少量近期已读文件，因此不能保证原文永久留在模型上下文。 | 内置文件工具按启动目录工作，`--add-dir` / `/add-dir` 才扩大到额外目录；附加文件不会自动授权父目录。额外目录也不会仅因恢复会话而自动恢复。 | `@file` 在请求时读取工作树中的文件；后续若工具仍有权限，可再次读取 live path。IDE 拖入附件在客户端、本地记录或服务端如何保存，官方资料为**未公开**。 | 发送前可用附件旁的 `X` 移除。`/clear` 清空当前上下文但旧会话仍可恢复，不是删除；未找到已发送后按单附件撤销的公开合同。项目级 `claude project purge` 可清理项目会话资料。 |
| **Gemini CLI** | **明确 / 推断**：`@path` 把读取结果注入当前 prompt；保存的 session 包含完整对话、工具调用与输出，恢复后可继续利用这些历史内容。长会话仍可能被压缩。 | 文件工具受 workspace 和 sandbox mount 控制；`@directory` 会递归读目录，但 `@file` 本身不是一个持续目录 grant。 | 当前 `@` 引用由 `read_many_files` 读取当时内容，可视为请求快照。若之后再次调用文件工具，读取的是当前 live file；旧 prompt 不会随源文件自动更新。 | 官方支持删除整个 session，并按保留策略清理 session 数据；未找到已发送后只撤销一个 `@file` 的操作。sandbox mount 在运行边界另行配置或移除。 |
| **GitHub Copilot：VS Code agent mode / Copilot CLI** | **明确**：每次请求由当前消息、conversation history、显式引用、隐式上下文和工具输出共同组装；旧内容可能在 compaction 时被摘要或省略。 | 文件/文件夹是两种显式上下文。CLI 对 cwd 外的内容要求批准其所在目录，`/add-dir` 才形成目录级访问；单文件附件本身不等于目录授权。 | `@file` 将当时内容加入请求。Copilot SDK 的本地图像输入会读取绝对路径并转成 base64，明确是快照；一般文件是否另存专用附件副本为**未公开**。Agent 若仍拥有 workspace 权限，也可重新读取 live file。 | 本地 chat/session 可以整体删除。未找到已发送后按附件撤销的公开操作；删除前，旧内容仍可能存在于 history 或其摘要中。 |
| **GitHub Copilot coding agent（云端）** | issue / pull request 中提供的上下文可进入该云端 session；后续步骤在同一个任务环境中使用。 | 权限是云端 checkout 的仓库和其临时执行环境，不存在对用户电脑原始目录的 live path 授权。 | 用户提供的截图等只能作为上传内容进入任务；执行文件系统是临时 GitHub Actions 环境，任务结束后丢弃。 | 云端 agent session 官方目前提供 archive；并非所有界面都提供硬删除。上传内容还受 GitHub issue/PR 自身的保留和删除规则约束。 |
| **Cursor Agent / CLI** | **明确**：当前 session、显式 `@file` / `@folder` 与工具结果共同构成上下文；CLI 可恢复 session，也可压缩上下文。 | Agent 的 Read File、List Directory 和 codebase 工具拥有独立的 workspace 范围；文件与文件夹引用是分开的，单文件引用不暗含父目录授权。 | 请求会经过 Cursor 后端；Privacy Mode 下官方说明文件内容只作请求期临时缓存。聊天历史另存于本地 SQLite。官方没有保证历史中的附件始终保留完整原始字节，因此长期形态为**未公开**；工作区文件可另行 live re-read。 | 可删除整条本地 chat。未找到已发送后单独撤销附件的公开合同；删除或移出工作区只影响之后的 live read，不会可靠地抹去已经进入历史或 summary 的内容。 |
| **Aider（开源对照）** | **明确**：`/add` 后文件持续属于当前 chat file set，每次请求都加入 prompt，直到 `/drop` 或 `/reset`。 | `/add` 是显式文件集；传入目录时会加入匹配文件。read-only file set 与 editable file set 分开。 | **明确**：实现每次构造 prompt 都重新从绝对路径读取文件；文件消失时会从集合中移除。因此源文件变化会反映到后续轮次。 | `/drop` 从后续上下文移除指定文件；`/reset` 清空文件集合和聊天历史。这是样本中最完整的单文件主动撤销模型。 |

## 产品证据与边界

### OpenAI Codex

Codex 的公开产品文档把三类上下文分得很清楚：CLI 会话记录 cwd，但文件内容来自当前 working tree；IDE 的当前选区和打开文件只为当前 turn 提供上下文；Codex app 可把文件/图像直接附到单个 chat，也可把文件放进跨 chat 的 project Sources。[Codex projects](https://learn.chatgpt.com/docs/projects)、[permission modes](https://learn.chatgpt.com/docs/permission-modes)

当前官方仓库的 `UserInput` 只有 text、image、audio、skill、mention 等类型，没有通用本地文档附件。[公开输入类型](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/protocol/src/user_input.rs#L9-L46) 本地图像和音频会在协议入口被读为 data URL；这直接证明模型得到的是发送时快照。[快照实现](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/protocol/src/local_media.rs#L17-L45) 历史 UI 可保留原始路径以支持用户编辑旧消息并重新附加，但源码注释明确区分了本地路径和可发送给 API 的 URL。[历史路径字段](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/protocol/src/protocol.rs#L2510-L2541)

app-server 将 thread item 持久化并用于后续模型请求，支持恢复和硬删除整个 thread；公开接口没有单附件删除。[app-server thread 合同](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/app-server/README.md#L73-L82)、[删除线程](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/app-server/README.md#L968-L985)

### Claude Code

Claude Code 的 IDE 集成支持 `@file` / `@folder` 和拖入附件；附件旁的移除按钮描述的是发送前的 composer context。[IDE context](https://code.claude.com/docs/en/ide-integrations#reference-files-and-folders) Session 文档则明确区分 conversation history 与 filesystem：恢复会话可带回历史，压缩会丢弃未进入 summary 的细节；额外目录必须重新以 `--add-dir` 传入或放入持久配置。[sessions](https://code.claude.com/docs/en/sessions)、[permissions](https://code.claude.com/docs/en/permissions#additional-working-directories)

Agent SDK 对这一边界表述得最直接：session 持久化的是对话，不是文件系统状态；恢复后读取文件得到的是当前磁盘内容。[SDK sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) 因此，“历史里还能谈论附件”和“仍可读原文件”不能合并成一项权限。

### Gemini CLI

Gemini CLI 的 `@path` 由 `read_many_files` 实现，并把结果插入当前 prompt；传目录时会递归读取且受 ignore、大小和二进制过滤影响。[`@` command](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/docs/reference/commands.md#L520-L564) Session 保存完整对话和工具执行/输出，并支持恢复与删除。[session management](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/docs/cli/session-management.md) 文件系统范围由 workspace 和 sandbox mounts 决定。[sandbox mounts](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/docs/cli/sandbox.md)

官方没有把 `@file` 定义为以后每轮自动重读的持久 file set。因此“后续轮次可通过历史继续使用当时内容”有依据；“后续自动跟踪源文件变化”没有依据。

### GitHub Copilot

VS Code 官方上下文模型明确将 explicit context 归入一次 request，同时又把 conversation history 用作后续 request；上下文过长时会压缩或省略旧细节。[context engineering](https://code.visualstudio.com/docs/agents/concepts/context)、[chat context](https://code.visualstudio.com/docs/chat/copilot-chat-context) Copilot CLI 分别提供 `@path` 和 `/add-dir`，cwd 外目录还要单独批准。[Copilot CLI overview](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/overview)、[CLI context management](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/context-management)

官方 SDK 的图像输入实现会读取本地绝对路径并转成 base64，可作为“输入快照”的直接证据；它不能证明所有 VS Code 文件附件都采用完全相同的内部存储。[SDK image input](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/image-input)

云端 coding agent 与本地 agent mode 需要分开：前者运行在临时 GitHub Actions 环境的仓库 checkout 中，任务结束即丢弃该执行文件系统；它不会获得用户电脑附件所在目录的路径能力。[cloud agent environment](https://docs.github.com/en/copilot/reference/hooks-reference#environment-details) 云端 session 当前可归档，本地 session 则可删除。[manage agent sessions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/manage-and-track-agents)

### Cursor

Cursor 将文件和文件夹都作为显式 context 引用，允许拖入文件；folder 引用可以是目录概览，也可以选择完整目录内容。[files and folders](https://docs.cursor.com/context/%40-symbols/%40-files-and-folders) Agent 同时拥有独立的 Read File、List Directory 与 codebase 工具，[agent tools](https://docs.cursor.com/en/agent/tools) CLI 可恢复或压缩会话。[Cursor CLI](https://docs.cursor.com/en/cli/using)

Cursor 的隐私说明称，请求会经其后端；Privacy Mode 下文件内容使用请求期密钥作临时缓存，不永久保存在服务端。聊天历史本身保存在本地 SQLite，并可按 chat 删除。[data use](https://cursor.com/data-use)、[chat history](https://docs.cursor.com/en/agent/chat/history) 这些资料没有公开一个可审计的“已发送附件单独删除”或“历史必定保留完整文件字节”合同。

### Aider

Aider 的用户合同直接提供 `/add`、`/read-only`、`/drop` 和 `/reset`。[commands](https://aider.chat/docs/usage/commands.html) 官方源码显示，每次构造 files content 时都会遍历当前 file set 并从磁盘重新读取；不存在的文件会被移出集合。[重新读取实现](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L598-L671) `/drop` 则直接从 editable/read-only 集合删除匹配文件。[add/drop 实现](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/commands.py#L799-L974)

这证明持续 live-file 模型完全可行，但其产品语义也明显更重：用户管理的是会话级 file set，而不是某条消息的一次性附件。

## 对当前设计的直接启示

建议把三个状态拆开，避免再用一个模糊的“附件可访问”表示全部含义：

| 状态 | 建议语义 |
| --- | --- |
| 消息附件 | 发送时物化为受大小/类型限制的会话副本；后续轮次可作为 history context 使用。 |
| 原始 Zotero / 本地资源 | 不因附件自动建立持续路径权限，也不扩展到父目录；若需要最新内容，重新选择并再次物化。 |
| navigation / workspace 能力 | 独立工具和 exposure policy；不得从“用户曾附加过文件”反推授权。 |

删除也应分两层：发送前可以移除 composer 中的待发附件；发送后，最简单且与多数 harness 一致的 v1 合同是随 conversation 删除附件副本。若未来要支持“保留消息但抹掉其中一个附件”，必须同时定义历史项替换、已生成 summary、缓存和审计记录如何处理；当前主流产品没有提供可直接照搬的统一答案。

## 未能核实、不得外推

- 未找到 Codex app 通用文档附件、Claude Code IDE 拖入附件、Cursor 通用文件附件的公开物理存储格式；不能仅凭 UI 推断它们一定复制到本地、永久上传或持续引用原路径。
- “后续轮次可使用历史内容”不等于模型每次都收到完整原文件。各产品都会受 token window、compaction、summary、截断及大型文件过滤影响。
- 删除 session/chat 的公开合同不一定覆盖供应商备份、遥测、组织审计或法规保留；本文只讨论用户可见的 agent session 行为。
- 本文没有把 hosted ChatGPT / Claude.ai 当作 coding harness 证据。它们的会话上传保留政策不能替代本地 agent 对 workspace、路径和 sandbox 的权限合同。

## 补充核查：附件数量、字节与上下文上限

这一轮核查仍以本地 coding-agent harness 为主。Claude.ai、Gemini Apps 等托管上传产品只作为数量和存储尺度的对照，不能把它们的上传配额写成 Pi Conversation 或本地工具合同。

需要先分清三种上限：**快照接纳上限**约束插件复制和持久化多少原始字节；**工具读取上限**约束 Agent 每次实际读取或返回多少内容；**模型上下文上限**约束最终可送入模型多少 token。市面产品普遍将这三层分开，单靠“最多几个文件”无法控制内存、磁盘或上下文消耗。

### 本地 harness

| 产品 | 已公开的数量、字节与类型限制 | 截断及超限表现 | 未公开项 |
| --- | --- | --- | --- |
| **OpenAI Codex CLI / app-server** | CLI 的 `-i/--image` 可重复并接受多个路径，公开参数和 `Vec<PathBuf>` 实现没有固定数量上限。当前输入协议支持本地图像和音频，没有通用文档附件类型；图像支持 PNG、JPEG、GIF、WebP，其他可解码格式会转为 PNG。[CLI 参数](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/utils/cli/src/shared_options.rs#L22-L35)、[图像处理](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/protocol/src/models.rs#L1720-L1775) | 源码有 1 GiB 图像读取防护，但注释明确说明它只是 sanity guard，并非协议要求或目标上传大小，不能当产品配额引用；默认图像最长边会缩到 2048。模型窗口约用到 90% 时可自动压缩。[实现防护](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/utils/image/src/lib.rs#L25-L65)、[压缩阈值](https://github.com/openai/codex/blob/459a79eb85400af759e9220c7bafb4429ae07516/codex-rs/protocol/src/openai_models.rs#L300-L320) | 通用 `@file`、单图服务端字节、单请求合计字节、session/project 存储配额均未公开。ChatGPT 文件上传限制也被官方明确排除于 Codex 之外。[产品边界](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) |
| **Claude Code** | `@file` / `@folder` 可一次引用多个文件，但没有公布引用数量。Read 工具支持文本、图片、PDF 和 notebook；大 PDF 要按页读取，一次最多 20 页。Claude Code 的原始 HTTP 请求总上限为 30 MB；附件 PDF 另有 100 页、32 MB 限制。[文件引用](https://code.claude.com/docs/en/ide-integrations#reference-files-and-folders)、[Read 工具](https://code.claude.com/docs/en/tools-reference#read-tool-behavior)、[错误合同](https://code.claude.com/docs/en/errors#request-too-large) | 大文本由 Read 分页；附件令 prompt 超出上下文时显示 `Prompt is too long` 并建议 `/compact` 或 `/clear`。超出原始请求、图片或 PDF 限制会给明确错误，并允许用户退回到原消息移除或缩小附件。[错误合同](https://code.claude.com/docs/en/errors#request-errors) | 没有公开 per-message/session/project 文件数量或单个普通文本文件的固定字节上限；Read 的文本 token 阈值可配置，但默认数值未公开。 |
| **Gemini CLI** | `@file` / `@dir` 走 `read_many_files`，目录可递归展开，未见固定文件数上限。每个文件先受 20 MB 原始大小限制，SVG 另限 1 MB；普通二进制跳过，显式图片、PDF、音频和视频按 MIME 处理。[`@` 命令](https://google-gemini.github.io/gemini-cli/docs/cli/commands.html)、[限制常量](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/packages/core/src/utils/constants.ts#L10-L12) | 文本默认取前 2,000 行，每行最多 2,000 字符，截断处有标记；超过 20 MB 显示 `File size exceeds the 20MB limit`。多文件读取会列出截断和跳过项，而不是假装全部内容已进入上下文。[读取实现](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/packages/core/src/utils/fileUtils.ts#L500-L600)、[用户可见结果](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/packages/core/src/tools/read-many-files.ts#L340-L480) | 没有公开单 prompt 合计字节、session/project 存储或 `@` 引用数量上限；最终仍受模型上下文和 `/compress` 约束。 |
| **GitHub Copilot CLI / VS Code agent mode** | CLI 的 `--attachment` 可重复，`@path` 会加入文件内容；图片/PDF支持 JPEG、PNG、GIF、WebP、PDF、HEIC、HEIF。官方没有公布本地文件数量或字节上限。[CLI 用法](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/overview)、[命令参考](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) | CLI 在上下文接近 80% 时开始压缩；大于 20 KiB 的**工具输出**会改为预览加临时文件路径，这不是用户附件上限。[上下文管理](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/context-management) 云端 coding agent 另有 3.00 MiB 单图限制，超出会从请求中移除；这是云端任务限制，且静默遗漏的体验不宜照搬。[云端限制](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/troubleshoot-cloud-agent#copilot-is-not-picking-up-attached-screenshots) | 本地 CLI / VS Code 的 per-message、per-file、aggregate、session/project 数值未公开。Copilot SDK 会从模型能力读取图片数量与字节限制，说明媒体上限可能因模型而异。[SDK 图像能力](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/image-input) |
| **Cursor Agent / CLI** | 本地 Agent 和 CLI 支持 `@file` / `@folder`，但没有公布文件数量、单文件字节或累计存储上限；图像可拖放或粘贴。[Agent prompting](https://prod.cursor.com/docs/agent/prompting)、[CLI](https://prod.cursor.com/docs/cli/using) | 每个 chat 使用固定上下文窗口，接近满时压缩旧内容；大文件或目录会被 condensed，过大时可能只保留名称或不纳入，并在界面提示。[上下文管理](https://prod.cursor.com/docs/agent/prompting)、[Files & Folders](https://docs.cursor.com/context/%40-symbols/%40-files-and-folders) | 本地阈值未公开。独立的 Cursor Cloud Agents API 最多 5 张图、每张 15 MB，仅 PNG/JPEG/GIF/WebP；这不能外推为本地 Agent 限制。[Cloud Agents API](https://prod.cursor.com/docs/cloud-agent/api/endpoints) |
| **Aider** | Aider 没有“本消息附件”配额；`/add` 可把文件或目录中的多个文件持续加入 chat file set。官方没有固定数量或字节上限，文本按配置编码整文件读取；图像/PDF集合为 PNG、JPG/JPEG、GIF、BMP、TIFF、WebP、PDF。[添加文件](https://aider.chat/docs/usage.html#adding-files)、[类型实现](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/utils.py#L10-L15) | Aider 不自行硬卡 token 上限，而是报告 provider 的错误并建议 `/drop`、`/clear` 或拆分文件；历史总结另有软阈值。[token limits](https://aider.chat/docs/troubleshooting/token-limits.html)、[配置](https://aider.chat/docs/config/options.html#--max-chat-history-tokens-value) | 文件数量、单文件/累计字节及 session/project 存储配额均未公开。能否发送图像/PDF还取决于所选模型能力。 |

### 托管上传产品仅作尺度对照

- Claude.ai 当前允许每个 chat 最多 20 个上传文件、每个文件 500 MB；Project 单文件限 30 MB，文件数不设固定值，但提取内容总量必须装入上下文。文档支持 PDF、DOCX、CSV、TXT、HTML、ODT、RTF、EPUB、JSON、XLSX，图像支持 JPEG、PNG、GIF、WebP；PDF 另限 1,000 页，超过时明确报错。[Claude 文件上传](https://support.claude.com/en/articles/8241126-upload-files-to-claude)
- Gemini Apps 当前每个 prompt 最多 10 个文件；非视频文件每个 100 MB、视频每个 2 GB。一个代码目录或 GitHub repository 可到 5,000 个文件、合计 100 MB；上传存储满时会要求删除数据，过大内容还会提示分析质量可能下降。[Gemini 文件上传](https://support.google.com/gemini/answer/14903178?hl=en)
- OpenAI API 的通用 file input 允许一次请求多个文件，单个文件和请求合计均为 50 MB。这是 API 请求合同，不是 Codex 或 ChatGPT 的本地附件合同，但可作为“必须同时有单件和合计字节上限”的直接先例。[OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs#file-inputs)

### 对“每条消息合计 20 个资源”的判断

**可以保留。** 20 不是本地 harness 的行业标准——多数本地产品根本不公布文件数上限，而是依靠分段读取、压缩和模型窗口——但它处在托管产品已采用的尺度内：Gemini Apps 为 10，Claude.ai 为 20；Cursor Cloud 的图片上限更低。对混合的 Zotero item 与用户文件而言，20 是容易解释、不会鼓励无边界批量输入的产品边界。

这个上限不能承诺任一 backend 一定能同时接收 20 张图片或 20 份完整文档。实际 Provider、模型或 transport 的更小媒体限制仍须在发送前检查；超限应阻止本次发送并指出具体资源，不能静默删除后继续。

### Pi Conversation 的两档字节方案

这里的数值只约束 **C16 将用户文件复制为 conversation-owned snapshot 时的原始字节接纳**。Agent 随后通过 native `read` 等能力访问内容时，继续使用 #19/C08 已有的路径、类型、读取、输出和截断合同；C06 继续拥有模型上下文预算与压缩。不要在 C16 再声明一套 2,000 行、50 KiB 或 token 限制。

1. **方案 A（建议用于 v0.9.0）**：每个用户文件最多 **20 MiB**，同一消息全部用户文件快照合计最多 **50 MiB**。20 MiB 有 Gemini CLI 本地读取实现作直接参照；50 MiB 与 OpenAI 多文件请求的合计边界同量级，也避免“20 个文件各自顶满单件上限”造成一次写入 400 MiB。Zotero item ref 计入 20 个资源，但不计入用户文件快照字节。
2. **方案 B（偏向大型 PDF）**：每个用户文件最多 **50 MiB**，同一消息合计最多 **100 MiB**。它更宽松，但明显高于 Claude Code 30 MB 请求和 Gemini CLI 20 MB 单文件的本地尺度，会增加复制延迟、磁盘占用和对话清理压力；只有确认 20 MiB 会挡住常见用户文献后再选。

两档都应先 `stat` 做整批预检，实际复制再用有界读取防止源文件在检查后变化；任何单件或合计超限都应保持草稿和前 20 个资源不变，并给出结构化原因。Conversation 的累计存储配额若以后需要，应由持久化/retention owner 单独定义，不能通过静默淘汰仍被 transcript 引用的快照来实现。

若 #19/C08 后续把原始 blob 接纳上限也纳入统一 Agent Capability Envelope，则 C16 应按常量/策略标识引用该唯一事实源，并删除这里的本地数值声明；本节当前建议解决的是“复制进 conversation storage 前”的资源边界，而非重复定义 Agent 的读取能力。

## 补充核查：消息没有文字、只有附件时是否发送

这里要区分两种“空消息”：

- **真正为空**：既没有文字，也没有附件或文件引用。所核查的 coding harness 不会把它作为一次模型请求。
- **只有附件**：文字为空，但消息仍含 image、document、file 或显式 `@file` 内容块。对主流多模态 API 来说，这不是空请求；附件本身就是 user message content。

### 核查结果

| 产品面 | 只有附件能否发送 | 是否补默认请求 | 证据边界 |
| --- | --- | --- | --- |
| **ChatGPT** | **未公开**。官方帮助说明可以先上传图片或文件，再就其提问；没有公开 send button 在文字为空时的启用条件。 | **未发现**官方资料声明会补入“分析这个文件”等可见或隐藏请求。 | 官方示例一贯包含用户问题；这只能说明推荐用法，不能证明 UI 拒绝纯附件。[图片输入](https://help.openai.com/en/articles/8400551-chatgpt-image-inputs-faq)、[macOS Chat Bar](https://help.openai.com/en/articles/9295241) |
| **Claude.ai** | **未公开**。官方只说明如何把文件附到 chat，没有说明文字为空时能否点击发送。 | **未发现**默认请求合同。 | 上传说明止于文件被 attach；不能据此推断发送校验。[Claude 文件上传](https://support.claude.com/en/articles/8241126-upload-files-to-claude) |
| **Gemini Apps** | 官方操作说明要求先“输入问题或 prompt”、再添加文件并提交；实际 UI 是否硬性禁止纯附件仍属**未公开**。 | **未发现**默认请求合同。 | 这是明确的推荐流程，不是公开的表单校验规范。[Gemini Apps 文件上传](https://support.google.com/gemini/answer/14903178?hl=en) |
| **Claude Code / Desktop** | **未公开**。官方把“添加图像”和“询问 Claude”写成连续两步，Desktop 也把附件称为 prompt 的 context；闭源 UI 的空文字校验未公开。 | **未发现**默认请求合同。 | 官方用法要求用户说明任务，但不足以断言附件 chip 是否可独立提交。[Claude Code 图片工作流](https://code.claude.com/docs/en/tutorials#work-with-images)、[Desktop prompt box](https://code.claude.com/docs/en/desktop#add-files-and-context-to-prompts) |
| **Gemini CLI** | **明确**：真正空白的输入不会提交。`@file` 是 prompt 内的显式内容，因此只写一个 `@file` 并不属于空白输入；文件内容会由 `read_many_files` 注入 query。 | **没有**通用默认请求；发送的是用户写下的 `@file` 及其展开结果。 | Enter 路径只在 `buffer.text.trim()` 非空时调用 submit，并有相应测试。[提交判断](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/packages/cli/src/ui/components/InputPrompt.tsx#L1258-L1282)、[空输入测试](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/packages/cli/src/ui/components/InputPrompt.test.tsx#L1256-L1273)、[`@` 文件语义](https://github.com/google-gemini/gemini-cli/blob/85aca163f6c73ac6ce380b5447359146b8adcae4/docs/reference/commands.md#L520-L564) |
| **Aider** | **明确**：文件集合可以已经存在，但本轮输入为空时不会调用模型。Aider 没有与消息分离的单次 attachment chip；文件是会话级 context。 | 不补默认请求。 | `preproc_user_input()` 对空输入直接返回，`run_one()` 只在 `message` 为真时调用 `send_message()`。[空输入路径](https://github.com/Aider-AI/aider/blob/5dc9490bb35f9729ef2c95d00a19ccd30c26339c/aider/coders/base_coder.py#L912-L935) |
| **Cursor Agent** | **未公开**。官方定义是用 text prompt 指挥 Agent，并可给 prompt 附加 context/image；没有公开空文字校验。 | **未发现**默认请求合同。 | 文档强调每条 message 是一个新 job，附件提供 context，因此推荐写清任务；不能外推出 UI 一定拒绝纯附件。[Agent prompting](https://prod.cursor.com/docs/agent/prompting) |
| **GitHub Copilot app** | **未公开**。官方说明 `/attach-files` 把文件附到 message，但未说明没有文字时能否发送。 | **未发现**默认请求合同。 | 公开 slash-command 合同只覆盖选择附件。[Copilot app slash commands](https://docs.github.com/en/copilot/reference/github-copilot-app-reference/slash-commands) |

### API 层并不普遍要求 text block

- OpenAI Responses API 把 `input` 定义为 text、image 或 file input；user message 的内容列表可以由 `input_file` / `input_image` 等内容项构成，并未规定必须再有 `input_text`。[Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)、[官方 TypeScript 类型](https://github.com/openai/openai-node/blob/main/src/resources/responses/responses.ts)
- Anthropic Messages API 允许 message `content` 使用内容块数组，成员可以是 text、image 或 document。其合同是“text and/or image content”，不是“每条 user message 必须有 text block”。[Messages API](https://platform.claude.com/docs/en/api/http/messages/create)、[PDF/document content](https://platform.claude.com/docs/en/build-with-claude/pdf-support)
- Gemini GenerateContent 的 `Part` 是联合类型，`text`、`inlineData` 和 `fileData` 都是独立的数据分支；官方 SDK 也允许把 `Part` 或 `Part[]` 直接包装为 user content。因此 file/image part 本身可以构成输入，类型合同没有要求同时存在文字。[GenerateContent Part](https://ai.google.dev/api/generate-content#Part)、[官方 JS SDK 输入结构](https://github.com/googleapis/js-genai#how-to-structure-contents-argument-for-generatecontent)

这些 API 只说明“可以表达附件-only user message”，不承诺模型会猜中用户意图。所查官方资料也都没有定义应由客户端暗中注入哪一句默认任务。

### 对 Q176 的直接建议

最简单且与 API 内容模型一致的规则是：

> 有文字或有附件即可发送；两者都没有才禁用发送。只有附件时，按原样提交附件内容块，不生成、保存或隐藏注入“分析附件”等默认文字。

这样不会把附件误判为空消息，也不会替用户编造意图。Agent 若无法从对话上下文判断任务，可以正常追问。相比强制用户补一句文字，这更接近多模态 message 的实际结构；相比注入默认 prompt，它没有隐藏语义和额外协议分支。
