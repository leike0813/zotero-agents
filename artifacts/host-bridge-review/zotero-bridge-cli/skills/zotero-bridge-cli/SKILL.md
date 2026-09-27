---
name: zotero-bridge-cli
description: 操作 Zotero Bridge CLI 以实现精确的 Zotero 库、workflow 与 Synthesis 访问。当 agent 需要底层 Zotero operation、命令发现或结构化恢复时使用。
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

## 目标

安全且确定性地使用已安装的 `zotero-bridge` CLI 进行 Zotero 库、workflow、file、run 与 Synthesis operations。本 Skill 是完整的机制契约：它拥有可执行文件选择、连接设置、命令发现、精确调用、effects 与 approval 解释、类型化句柄、输出证据与恢复。它不选择或组合研究目标。

## 输入

- 请求的 CLI 操作或已选择的规范命令。
- run 本地 CLI shim、已安装的 `zotero-bridge` 可执行文件，或两者皆无时用捆绑安装程序。
- 活动发布 envelope 与连接 profile，包括提供的端点、范围、模式与机密环境值。
- 所选规范命令的输入，包括 JSON payloads、对象 refs、不透明句柄、cursors、provider profiles、workflow 选项与输出目的地。

## 工作流

1. 按下列规则选择一个可执行文件与一个连接 profile。让 binary、内嵌契约、profile 与 release envelope 属于同一个 release set。
2. 运行 `zotero-bridge surface identity`。把 `protocol`、`cliSchema`、`version`、`buildFingerprint` 与 `commandCatalogChecksum` 同活跃 release envelope 比较；任何失配即停止。
3. 若规范 operation 未知，读取 command catalog，选择最接近的任务族，并仅用 `surface search --intent '<operational terms>'` 收窄候选。执行前运行 `surface describe '<canonical command>'`，只读取拥有该命令首个 token 的生成命令面引用。
4. 由外向内解析实时身份与就绪状态：service 健康、经过认证的 manifest/profile、相关时的 backend 就绪，然后是域对象或 workflow 契约。
5. 只准备命令描述符声明的输入。将 workflow 选项、provider profile、selection、payload、不透明 handle 与输出路径保留在各自独立的绑定中。
6. 调用前检查效果、approval 时机、类型化句柄转换、分页、目标与恢复。在有效输入不能当作授权的情况下展示任何被请求的 Zotero 侧 approval。
7. 执行一条规范命令。将 stdout 视为一个 JSON 信封，并保留其标识符、cursor、校验和、receipt、路径与结构化错误字段。
8. 使用返回的契约完成任何分页、文件投递、workflow 控制或 receipt 检查。请求的更改后验证实时 Zotero 状态，而非仅从提交或终态执行推断成功。
9. 返回有效结果及其证据，或将失败分类并仅采取声明的安全下一步。

## 可执行文件与 profile 选择

优先使用当前 workspace 随附的 run 本地 shim。否则使用已安装的可执行文件。两者都不存在时才使用捆绑安装器。绝不组合来自不同 release sets 的 binary、profile、内嵌 descriptor、asset 或 release envelope；匹配的版本字符串不是充分的身份证据。

保留提供的 `ZOTERO_BRIDGE_PROFILE`、`ZOTERO_BRIDGE_ENDPOINT`、`ZOTERO_BRIDGE_SCOPE` 与 `ZOTERO_BRIDGE_CONNECTION_MODE`。仅当打包安装程序需要选择 Zotero 侧连接 profile 时使用 `ZOTERO_BRIDGE_HOST_PROFILE` 或 `ZOTERO_BRIDGE_HOST_HOME`。`ZOTERO_BRIDGE_TOKEN` 是机密输入：绝不打印、持久化、放入 argv 或包含进证据。

离线 `surface` 命令描述内嵌契约。它们不证明 Zotero、Zotero Bridge 服务或已配置 backend 可达。对实时失败，按此顺序诊断：

1. `bridge status` 检查服务健康；
2. `bridge profile inspect` 与 `bridge profile diagnose` 获取脱敏连接事实；
- 3. 认证服务契约用 `bridge manifest`；
4. `bridge backend list` 或 `bridge backend status` 检查 provider 就绪；
5. 所选域读取、workflow 描述、run 状态或持久 operation receipt。

## 参数语义与位置

只有 `--endpoint`、`--profile`、`--operation-id` 与 `--schema` 是全局 CLI 选项。它们可以出现在规范叶命令之前或之后。所有其他选项都是叶本地的，使用前必须出现在该命令的 `surface describe` 结果或生成的命令卡片中。

在这些边界使用全局选项：

- `--endpoint` 为本次调用选择 Zotero Bridge 服务端点。显式值覆盖 `ZOTERO_BRIDGE_ENDPOINT`，后者覆盖所选 profile 端点。这些来源都无法解析端点时，不要猜测端口。
- `--profile` 选择 connection-profile JSON 文件。显式值或 `ZOTERO_BRIDGE_PROFILE` 覆盖 well-known profile。保持连接 profile 与 workflow provider profile 分离。
- `--operation-id` 为一次改变状态的请求提供幂等身份。当同一不确定操作可能需要持久恢复时使用稳定值；不要把它当作 workflow、run、Product 或 receipt 句柄。普通读取不需要 agent 提供的 operation id。
- `--schema` 为一条规范叶命令执行离线的结构化输入 schema 查找。仅在所选命令声明至少一个结构化 JSON 输入时使用它。没有结构化输入的叶命令返回 `command_input_schema_unavailable`；改用命令帮助或 `surface describe`。

每个成功命令与每个结构化失败都已向 stdout 写入恰好一个 JSON envelope。`--json` 不得添加到 `bridge status`、workflow 命令或其他普通叶命令。`--json` 是仅由 `surface identity`、`surface describe` 与 `surface search` 接受的叶本地选项，而在这些命令上它对于获取 JSON envelope 并非必需。

`--query` 与 `--input` 都传输 JSON，但表达不同的命令契约：

- `--query` 是只读查询、selector、筛选器或分页对象的规范绑定。描述符将其标为可选时，省略即 `{}`。某些查询解析器接受 `--input` 作为别名，但请用 `--query` 构造并记录调用。
- `--input` 是命令自有输入 payload 的规范绑定，包括原始 capability 调用以及许多 mutation、maintenance 或 debug operation。仅凭名称不能证明 operation 改变状态；效果与 approval 仍来自描述符。

对于任一绑定，短的已审阅值使用内联 JSON，有意的 JSON 文件使用 `@file`，stdin 使用 `-`。裸的现有路径也会被当作 JSON 文件读取，因此在文件解释很重要时优先用 `@file`。不要仅仅因为传输语法相同就把 payload 从 `--query` 移到 `--input`，或反向移动。

参数失败使用 `details.schema: host-bridge.argument-error.v1`，并在 `details.phase` 中标明失败的边界。将 `argv`、`json_source`、`json_syntax`、`command_input`、`payload_composition`、`payload_contract` 与 `command_result` 视为不同的失败。对于 `argv`，仅依据命令帮助或 `surface describe` 修正所指名的缺失、未知、冲突或无效参数。对于 `json_source` 与 `json_syntax`，先修复所选的 stdin、文件或内联 JSON 源，再查阅领域 schema。对于 `command_input`，检查 `argumentId` 与有界的 violations，然后用 `--schema` 运行同一叶命令；未声明的属性不是重命名或改写它的许可。对于 `payload_composition`，当违规指明可转换的值（如对象 ref 或 file id）时，仅修正所指名的 CLI 参数；若声明的组合本身缺失或不兼容，停下来报告 command-contract 漂移。`payload_contract` 失败表示组合出的 payload 与 capability 契约在网络 I/O 前不一致。`command_result` 失败表示本地结果或 Host 响应未通过其可执行契约，不得作为成功接受。失败被证明为本地时，三者都报告 `stateChange: "unchanged"`；否则保留返回的状态。违规条目经脱敏并有上限；当 `truncated` 为 true 时，修正所报告集合并重新校验，而不是要求披露原始 payload。

不存在全局的结果输出选项。`file download --output`、`product download --output-dir` 及其本地别名、`workflow agent-run --output-dir` 的目标与覆盖契约各不相同。仅当所选叶命令描述符声明输出选项时才使用它。

Workflow 外部资源使用不透明的 bridge 句柄，而非 picker 或路径参数。准备调用前，从实时 workflow 发现中读取 `supportedInvocationModes` 与 `resourceRequirements`。对每个声明的输入槽位，对 agent 可访问的字节运行 `file upload`，保留返回的 `fileId`，并按上传顺序以可重复的 `--input-resource <slot>=<fileId>` 标志绑定它。对调用方需要的每个输出槽位，传入 `--output-resource <slot>=bridge-download`。对 `workflow validate` 与 `workflow submit` 使用相同的绑定；不要替换上传源路径、臆造 Host 路径，也不要以 GUI picker 命名这些绑定。

## 命令发现与调用

使用 `surface search` 发现 operation，而不是用它决定研究任务。`surface describe` 对 argv 绑定、invocation 与 payload schema、结果形态、分页、效果、approval 范围、handle 转换、恢复与目标具有权威性。只对没有规范语义命令的高级诊断 capability 使用原始 `call`。

## 输出边界与续接纪律

每个规范命令在其描述符中声明恰好一个 `outputBoundary.strategy`：`fixed`、`cursor`、`offset`、`limit`、`file` 或 `raw`。执行前读取该对象，并将其 default、maximum、section、continuation、truncation 与 file 字段视为结果契约的一部分。不要从简短的首个响应、capability 类别或较旧的命令示例推断有界性。

对于 `cursor` 结果，保留原始规范命令与所有规范化选择器及筛选。读取声明的域数组，记录 `returned`、`total`、`limit`、`hasMore` 与 `nextCursor`，并且只通过将该不透明 cursor 以相同条件传回同一命令来继续。cursor 不是 item id、时间戳、数组偏移或可跨命令复用的 token。绝不解码它来构造新 cursor、替换来自另一部分的 cursor，或在续接失败时静默重启。

当 `hasMore` 为 true 而 `nextCursor` 缺失时，这是一个不完整响应，会阻塞完成。当 `hasMore` 为 false 时，要求 continuation 为空并停止。对于基于身份的列表，按稳定域身份合并各页并拒绝重复项；当该 total 描述同一过滤集合时，将最终唯一行数与可用的 `total` 比较。对于含多个分页数组的响应，只跟随 `pagination.<section>` 下拥有正在消费数组的 cursor，不要隐式推进无关 section。

对于 `library note payloads`，按源顺序保留每个候选，包括共享同一 payload 类型的候选。将 `scanned` 读作源进度，将 `returned` 读作匹配数；`total: null` 表示无法给出精确总数。带 `hasMore: true` 的空 payload 页仍必须沿返回的 cursor 继续推进。在声称不存在之前先穷尽扫描；当需要一个在所有候选中检查唯一性的完整值时，使用带显式 payload 类型的 `library note payload`。失败的候选会使整页失败；将先前已接受的证据保留为不完整，并使用结构化错误判断读取能否恢复。Payload 输入、解码值与 note HTML 各有 1 MiB 上限；通过将第一个可读候选声明为权威无法绕过资源限制。

普通库列表从省略 cursor 开始，默认 25 行，最多允许 100 行。其 cursor 绑定域、来源、选择器与排序位置，但没有生存期或快照保证。已保存搜索发现使用 `library saved-searches list`；保留返回的每个可移植 ref，因为相同的显示名称可能标识不同的搜索。对于 `invalid_library_cursor` 或 `basis_mismatch`，保留结构化原因与不完整证据，纠正输入或有意识地重新获取完整的逻辑读取，并让新获取与失败获取保持分离。仅凭列表计数未变并不能证明成员关系或内容未变。

`invalid_host_bridge_cursor` 表示 cursor 畸形、过期、属于另一命令、绑定到不同准则，或锚定到不再可用的行。保留结构化 `reason`。若预期读取仍然必需，有意识地用原始过滤器从第一页重新开始，重建结果，并报告快照已改变；不要将重开的第一页追加到失败 cursor 下收集的行之后。

`library snapshot` 是固定基础的 cursor operation，具有更严格的续接契约。使用已解析的 `libraryId` 与可选的 `batchSize`（1 到 1,000）启动；默认值为 500。只使用返回的不透明 `snapshotId` 与 `cursor`、相同的库身份与相同的批大小继续。随每个接受的页保留 `schema`、`scope`、`order`、`batchIndex`、`deliveredItems` 与 `deliveredBatches`。不要添加搜索筛选、解码任一 handle、替换为普通库列表 cursor，或合并来自不同快照身份的页。

只有带有匹配的 Host 签发 `outcome: completed` 的 `completionEvidence` 终态页才能证明捕获集中的每个 item 均已交付。`active` 页、缺失证据、会话过期、cursor 失配、资源限制失败、中断或 Host 重启都是不完整的，不能授权替换索引或删除缺席行。会话是进程本地的，30 分钟后过期；失效后丢弃不完整的采集，开始一次新的完整快照。快照身份不是变更 cursor、墓碑流、重放日志或跨进程恢复句柄。

对于 `offset` 结果，保留 selector 并请求 `offset=nextOffset`，直到 `hasMore` 为 false。按 offset 顺序保留各块，要求每块的 `offset` 等于前一 `nextOffset`，且只拼接一次。默认文本窗口为 8,000 字符，最大为 16,000，除非描述符声明更严格的值。超过末尾的 offset 是合法的空终止块，而不是从零重试的许可。当存在 `totalChars` 时，完成要求重建的字符数与之匹配。

对于 `limit` 结果，使用声明默认与硬上限，检查 `truncated`，并在所需证据放不下时收窄选择器。limit 有界的结果没有隐式续接：不要臆造 cursor。对于 `fixed`，在把一次响应视为完整前，核实结果属于 registry、singleton、aggregate 或其他硬有界契约。

对于 `file` 结果，stdout 只是交付控制面。保留属主对象或操作身份与返回的文件描述符，核实没有暴露来自 Zotero 计算机的私有文件系统路径，通过 `file download` 下载，并把字节数与 SHA-256 同描述符比对。若句柄过期，从属主语义命令重新获取，而不要重试任意路径。不要把成功的描述符响应当作字节已下载或已验证的证明。

对于 workflow 资源结果，在声明所请求交付物已完成之前，请阅读每个 `resourceOutputs` 描述符。保留其输出 slot 上下文、`fileId`、显示名称、内容类型、字节数、SHA-256 与过期时间；运行描述符的 `downloadCommand` 或等效的规范 `file download` 调用，然后验证下载的字节。workflow 输出 handles 既进程本地又短暂，因此要在服务重启或过期前下载它们。仅当该 workflow 在该响应边界未发布任何绑定输出时，空的 `resourceOutputs` 数组才有效。它并不允许在 Zotero 计算机上搜索猜测的输出路径。

`raw` 保留给 `call`。目标 capability 仍拥有自己的分页、limit、offset 或 file 边界；raw 调用绝不扩大它，也不是绕过规范语义命令的旁路。若语义命令存在，使用它，使 argv 验证、结果契约、恢复与生成的指导保持可执行。

### 从用户意图出发

Agent 常在知道任何 CLI 名称之前收到“给我看看关于这个 topic 的论文”、“下载分析结果”或“运行深度阅读 workflow”这类请求。不要让用户把请求翻译成命令。

使用此序列：

1. 阅读 [the command catalog](references/command-catalog.md)。
2. 识别所请求的 Zotero 对象、task 系列、新鲜度、交付物与状态变更边界。
3. 从 catalog 选择最小的候选命令或有序命令序列。
4. 仅当多个候选仍匹配时才使用 `surface search`。
5. 使用 `surface describe` 获取确切的实时契约。
6. 阅读拥有命令根的那一份详细参考。
7. 只有在输入、效果、approval、handle、完成证据与恢复都已明确后，才构造并执行调用。

目录刻意精简。它按用户意图拥有发现，命令参考拥有可执行细节。不要从目录表构造 argv，也不要仅因其摘要与用户请求共享关键词就复制命令。

### 翻译常见请求形态

- “This paper”、“these items”与“the current collection”首先需要 `context` 命令解析实时选择。
- 对所选 items，消费确切的选择页，并将每个不透明的 `nextCursor` 原样传递直到 `hasMore` 为 false；默认页大小为 25，最大为 100。跨页保留对象 refs 与顺序，并将当前视图树源与 item 选择分开。`basis_mismatch` 失败使整个获取无效：丢弃其已收集页，停止该次调用，并在开始另一次获取前获得明确的新的范围。绝不要把部分页集合提交为用户完整的选择。
- Workflow `items` 输入要求完整 `{libraryId,key}` refs；`none` 表示显式空输入。让已审阅的 refs 贯穿校验、提交与 agent-run apply。没有完整 refs 的已存记录无法执行；保留该记录并报告无效输入，而不要从活动面板填身份或假定某个 library。
- “我的 library 里有什么？”与“我有关于 X 的论文吗？”要求 `library` 读取与完整的有界分页决策。
- "Change these tags"（更改这些标签）或 "put this in a collection"（把这个放进 collection）需要实时 identity 读取、经审阅的 mutation、当前权限与写后验证。
- “获取生成的报告”可能需要读取 Product 或 workflow artifact 后再交付文件；它不是自动的附件读取。
- "Run workflow X"（运行 workflow X）需要 workflow 发现、描述、选择验证、声明时的 provider-profile 验证与提交。
- “用此文件运行 workflow X” 额外要求非交互调用模式、匹配的已声明输入资源槽位、`file upload`，以及在校验与提交期间相同的 opaque 资源绑定。若 workflow 缺少该模式或槽位，返回实时资格错误，而不是触发 GUI picker。
- “workflow 进行得如何？”从提交返回的类型化句柄开始。对于直接准入，保留返回的 `workflowRunId` 并使用 `run`，而不是 workflow 发现。对于 host 队列准入，保留 `submissionId`、检查 `workflow submission get`，并且只在队列级观察或待处理取消时使用 `workflow queue list` 或 `workflow queue cancel`；在已准入 task 暴露一个 `workflowRunId` 之前不要臆造它。
- "Refresh the synthesis graph"（刷新 synthesis graph）在任何写入前需要诊断确切的派生模型与 maintenance 范围。
- “bridge 为什么失败？”从语义健康与 profile 诊断开始；原始 `call` 是最后手段。

当请求跨越多个命令族时，保留每个结果与下一输入之间的边界。上下文读取不授权 mutation，workflow 验证不授权提交，run 终止不证明 Product 投递，维护 receipt 不证明无关模型为最新。

### Provider profile 权限

按此顺序解析 provider profiles：显式 `--provider-profile`，然后
`ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`，然后是 Host 保存的 workflow 候选，
然后无 profile。显式标志始终胜出，包括显式 `{}`。
环境值已是配置好的默认：验证它并采用
规范化的结果，而不要求 operator 确认同一 profile。
环境值可为内联 JSON 或 `@absolute-file`；绝不使用 stdin，
其中的相对路径、凭证、端点或本地路径。

当不存在环境默认时，读取 `workflow defaults --workflow <id>`
在实时 workflow 要求与选择/选项契约之后。已保存的
Host 值只是候选。呈现 workflow、backend id/label/type，
plugin provider、ACP 模型 provider 与模型、模式、推理力度、
`autoApproveAcpPermissions`、目录源/修订/新鲜度与
profile 指纹。“run this workflow”式的请求、沉默、拒绝或
“随便挑一个”不是对未知 profile 的确认。停止，直到
操作者确认显示的候选或提供显式 profile。

确认后，运行 workflow 验证与 provider-profile 验证
再次执行，然后提交验证返回的确切规范化 profile。保持
provider-profile 验证、环境默认授权、Zotero UI
workflow approval 与 ACP 工具权限 approval 是分开的边界。
若 backend 需要的 workflow 没有可用 profile，请停在
`provider_profile_required` 并遵循其声明的安全下一步。

对于 ACP backends，当 profile 缺失时使用 `workflow profile refresh --backend <id>`
descriptor 报告缺失、过期或不一致的 catalog。模型选择
按 `acpModelProvider` 分组；不要将一个 provider 的模型展平进
全局列表或臆造缺失模型。`workflow profile validate` 只返回
规范化的 profile、非敏感来源、目录诊断与
fingerprint；它绝不返回环境变量文本或文件路径。

### 确认所选命令

执行前，从实时描述符与详细参考回答以下所有问题：

- 将运行哪条规范命令？
- 哪些值是位置参数、flags、内联 JSON、stdin 还是文件？
- 需要什么对象或类型化 handle 身份？
- 该操作是只读、导航性、变更性、maintenance 还是诊断性？
- approval 可能在哪里发生，它覆盖的确切范围是什么？
- 结果页、再签发句柄、或要求后续 receipt？
- 什么实时证据证明请求的成果？
- 若调用被中断，重试前必须检查什么状态或 handle？

若任何答案缺失，不要猜测。继续发现、解析实时 identity，或将缺失的输入或权限作为当前阻塞返回。

仅当描述符允许时才选择输入通道：

- 短标量值与类型化 refs 使用直接标志与位置参数；
- 只对简短、已审阅的 payloads 使用内联 JSON；
- 较大 payloads 使用文档化路径、`@file` 或 '-' 表示 stdin；`-`
- 将 workflow 选择、workflow 选项与 provider profile 保持为独立值；
- 当命令或 profile helper 要求时使用绝对输出路径。

不要从名称相似的命令重新解释 CLI 选项。生成的命令 surface 参考暴露所有绑定，但当加载的 artifact 与可执行文件不同时，活动二进制的 `surface describe` 结果胜出。

## 身份、分页与新鲜度

标题、引文字符串、缓存的 index 行、生成的报告或搜索候选都不是 Zotero 对象身份。为指代性请求解析当前上下文，保留返回的库 ID 与 item key，仅当下一契约要求父级 item 时才将子 note 或附件规范化为其顶层父级，并在报告详细状态或写入前获取所选对象。

对 cursor 或 offset 分页，保留已接受页与最后返回的 cursor 或 offset。继续直到响应报告完成或有界请求已满足。中断后从最后接受的位置续读，绝不两次合并已接受的页。空首页或截断搜索不是缺席的证明。

本地索引、快照、workflow 目录、通知与生成的 Synthesis artifacts 有明确的新鲜度限制。每当所请求的结论或写入依赖当前状态时，重新读取实时对象、选择、权限、run、Product、operation 或 workflow 描述。

## 受管 notes 与文献 artifacts

在选择读续接或写入前，检查 `kind` 返回的 `library note get`。普通 note 暴露所请求的文本或 HTML 以及命令的 offset 续接。受管 note 暴露完整的语义 `payload`、其 `noteKind`、来源、派生视图以及 UTF-8 `payloadBytes` 与 `detailBytes` 事实。offset 与字符限制不分割该 payload。在另一操作中使用它时，把其源标识符与证据放在一起。

受管理的写入请使用专用语义 mutation 命令，需要无效果预览时加上 `--dry-run`：`managed_note.write_custom` 与 `managed_note.write_conversation` 接受标题和 Markdown，并带显式的 create-parent 或 update-note 目标；`literature_artifact.upsert_digest`、`literature_artifact.upsert_references`、`literature_artifact.upsert_citation_analysis` 与 `literature_artifact.upsert_score` 指向一个父对象及相应的语义输入。读取当前命令描述符以获取确切的封闭输入 schema。普通 note 创建无法提供保留的受管理标记，普通内容替换无法编辑受管理的 note。不要用原始 HTML 替换加独立 payload 附加调用来拼装受管理写入。

Digest、References、Citation Analysis 与 Literature Score 每个父级各有一个槽位。没有候选时创建槽位；恰好一个候选时更新它。多个候选是冲突，需要检查返回的 refs。保留全部候选并报告冲突，而不是选择第一条 note、移除重复项或提供 note ref 覆盖单例选择。自定义或对话更新必须保留其父级与精确的受管类型。

将 References 作为完整的 `source_reference_artifact.v1` 对象传递，并保留每个 `sourceReferenceId`、提取事实、书目字段与匹配字段。将 Citation Analysis 作为其完整的规范 artifact 传递，保持源 ID、提及、未解决证据、范围决策与时间线完整。引文功能与自由文本角色是不同的事实。渲染的标签、报告 Markdown、源快照与 `referencesBasis` 是派生的或运行时拥有的证据；它们不是语义输入的可写替代品。仅 References 的更新保留 Citation note，但可能使其基础过期，因此在声称二者为最新前重新读取依赖的 artifact。

Broker 的受管详情上限为 1 MiB。下游工具较小的结果预算是一个单独的交付边界，而不是要求截断或重新分页该 artifact。遇到 `resource_limited` 时，保留目标与字节事实，并报告不可用的完整结果；不要用原始 HTML 读取、猜测的文件路径、部分 artifact 或隐藏附件扫描来代替。遇到 `invalid_artifact` 或 `legacy_artifact_requires_migration` 时，保持原始 note 与源文件完好，报告该类型化失败，并引导操作员查看 Dashboard Migrations 中已注册的 Literature Artifacts 条目或显式的文件导入预览。任何 CLI 变更都不接受迁移映射或调用方提供的写授权。

在托管写入后，验证其持久的规范 operation 证据并重新读取托管细节。检查确切的 parent 与类型、承诺的语义 payload，以及与请求相关的任何依赖或图像证据。一个 artifact 的 receipt 不能证明分别写入的兄弟项已提交；当结果需要原子 parent 集时，使用声明的 Workflow 或 import operation，并保留其单一权威 receipt。

## Effects、approval 与 handles

命令卡片区分 read、navigation、write、maintenance 与 debug 操作。Navigation 可在不修改书目数据的情况下改变可见的 Zotero UI 状态。临时输出或 workflow 控制并不自动等于库 mutation。Maintenance 与 debug 修复需要其自身经诊断的范围，不得用作绕过失败语义命令的捷径。

### 导航授权与证据

仅对请求的交互式 UI 操作使用导航。七个项目拥有的导航 capability 允许操作者范围（缺席或 `global`）与 `acp-chat` 而无需逐次 approval；自动化 `acp-skill-run`、`acp-run` 与 `skillrunner-run` 范围被拒绝。非空但畸形或未知的范围无效。拒绝时保持所提供的范围不变，并将该边界返回给调用者；提示或原始 capability 调用不能提升自动化调用。

每个 Bridge、CLI 或 MCP 请求在准入时捕获一次当前的 Zotero 主窗口。之后的焦点变化不会重定向该请求。此捕获并不在多窗口 session 中确立发起方 ACP Chat Workspace 窗口。若该区别重要，请在调用前与操作者确认预期交互。缺失或已关闭的被捕获窗口会失败；不要替换为窗口标识符，也不要在变为活动的任意窗口上重试。

按预期的证据边界选择导航 operation。Focus 请求恢复/聚焦但不改变所选 tab 或 items，且不能证明 OS 已将 Zotero 置于前台。库选择 operations 确认精确的可移植目标；reveal 在其 receipt 中保留所请求的 item 顺序，并确认所选 ref 集合而不打开内容。普通 item 打开使用 Zotero 的原生 handler，报告的是派发（dispatch）而非已渲染的文档。精确的 Reader 位置派发则针对捕获窗口中的内置 Reader tab，等待初始化和归一化位置命令；它不证明像素级视口。请使用所选命令卡片上的封闭输入与结果 schema，而不是互相交换这些结果。

对于 reveal，从一个可共享视图的 library 中提供一到一百个唯一的 item、note 或 attachment ref；不要为了凑合请求而提升子项、去重、丢弃目标或混入活跃与已删除对象。内容导航会恢复/聚焦其自身捕获的窗口，因此额外的 focus 调用并无必要。首个 UI 效果之前的取消使 UI 保持不变；效果开始后的中断不能授权回滚或自动重放。保留导航失败的 code 与 reason，将不确定的 dispatch 如实报告为不确定，并在再次尝试前取得一次新的显式调用。导航回执是瞬时证据，不是规范 mutation 记录，`mutation get-operation` 不能判定其 UI 结果。

精确 Reader 定位调用复用捕获窗口中的内置 Reader 标签页，或初始化绑定到该窗口的标签页。冷调用可能在 Reader 初始化完成前创建一个可见的加载标签页。若该效果后初始化或窗口验证失败，保留标签页可能残留，且请求的位置未被确认；保留 attachment 或 annotation ref 及请求的位置，报告不确定的 UI 结果，并在请求再次调用前让操作者检查目标窗口。`location_unsupported` 失败不是使用其他目的地的许可。不得用普通 item 打开、其他窗口或无位置回退代替完成证据。

Zotero 管理的写入与 apply-back 仍受声明的 Zotero 侧 approval 路径约束。权限读取是观察性的，不能批准或拒绝请求。先前的 approval、有效 preview、本地验证、notification、缓存 proposal 或终态 run 绝不授权另一项 operation。

对于规范 mutation，为完整意图保留一个 operation ID。当输入与 `--operation-id` 都指向它时，二者必须一致。目标、预期效果或文件内容发生变化即新意图，需要其自身的审阅。Preview 报告安全的计划事实与 `domainPlanDigest`；execution 在 approval 等待后重新准备，若该 digest 变化则请求重新批准。保持已审阅范围明确，遇到过期计划冲突时停止，而不要试图提供修订或 token 权限。

用 `mutation get-operation` 读取规范写证据。运行中的观察指仍由本进程拥有的执行；已落定的观察包含持久 receipt 或尝试。已提交或未改变的 receipt 确认已记录的操作，而 failed、canceled、unknown 与 repair_required 尝试需要其声明的恢复。保留受影响与剩余 refs，并在提出另一更改前单独验证当前目标。

不可用的观察无法确定身份是新的还是其证据已过期。已知的普通终态证据保留 30 天，过期证据会留下身份绑定，阻止在该 ID 下执行。Unknown 与 repair_required 证据仍可用于对账。若重放报告 outcome_unavailable，保留该 ID 并报告缺失的历史证据；不要仅为找回丢失的结果而创建替代写入。Generic `operation get` 描述其自身的 HTTP 操作，无法了结规范 mutation。

将每个返回的标识符视为不透明的类型化句柄。把 Zotero refs、`submissionId`、`queueId`、`workflowRunId`、`skillRunId`、`agentRunId`、`agentRequestId`、`permissionRequestId`、`operationId`、`eventId`、`fileId` 与 Product 标识符保留在各自声明的命令族中。绝不合成、重铸或互换它们。一个 `submissionId` 标识一次不可变原生队列接纳，而 `queueId` 标识该 submission 内的一个待处理单元；两者都不是 workflow-run 身份。当 `handleConsumption` 为 `consumed` 或 `unknown` 时，若没有明确允许延续的领域回执，不要复用句柄。

## 文件、Products 与 artifacts

Zotero 侧路径并非自动对 agent 可读。当 attachment、Product、artifact 或 operation 返回 `fileId` 或投递指令时，使用声明的下载命令，并在将字节用作证据前验证校验和与字节数。从拥有对象处重新获取过期的访问，而非猜测存储路径。

保持这些 identity 相互分离：

- 本地路径指 agent 可访问的字节；
- `fileId` 是 bridge 签发的短效传输 handle；
- Product 身份指称 Dashboard 记录及其可下载资产；
- workflow artifact 属于其 workflow 或 item 契约；
- Zotero attachment 是实时库状态，必须通过 item 读取验证。

对于本地文件写回，先验证 artifact，上传它，保留返回的校验和与 `fileId`，执行已批准的 attachment mutation，并重新读取 parent item 的 attachments。已完成的 workflow run 不能证明 Product 或预期 artifact 存在；请单独检查并下载所请求的输出。

## Workflow 与 run 控制

对于 Zotero 管理的执行，先发现当前 workflow，阅读其描述或要求，校验选择与 workflow options，独立校验 backend provider profile，然后通过声明的接入点提交它们。在选择监控系列之前，先读取返回的 `admission` 分支。直接准入返回 `workflowRunId`；保留它，并使用 run 命令进行状态、取消、skill 交互、权限观察、通知、历史与事件操作。直接 run 的取消请求只是一个意图，直到后续的 run 读取确认终止状态。

当 workflow 声明外部资源时，上传前先确认 `nonInteractiveSupported`、slot 方向、种类、基数、必填性、可接受的扩展名/内容类型、大小/数量限制以及输出交付方式。校验会读取上传 handles 但不消耗它们；已接受的提交拥有其租约，直到其直接 run 或原生提交在当前活动的驻留服务进程内到达终止状态。租约期间，不要把某个输入 `fileId` 复用于另一提交。资源 `fileId` 值与租约都是进程本地的：服务重启后，先检查分别持久化的已准入 runs，再上传新输入、校验新绑定，并在创建任何替代提交前取得当前授权。在重启或过期前下载每个返回的 workflow artifact 并验证其完整性。若校验报告 `workflow_resource_missing`、`workflow_resource_mismatch`、`invalid_workflow_resource_bindings` 或 `workflow_resource_ineligible`，只修正所指的 slot、handle 或调用边界，然后重新校验。若执行报告 `workflow_interaction_required` 或 `workflow_conflict_requires_policy`，不要等待或自动化 Zotero UI；提供已声明的非交互选项（如该 workflow 的冲突策略），或将交互边界作为阻塞原因返回。

Host 队列接纳返回 `submissionId`、单元计数与队列链接，而不是捏造一个已开始的 run。保留该 submission 句柄，并检查 `workflow submission get` 以获取不可变单元投影与当前聚合状态。使用 `workflow queue list` 观察活跃队列单元，仅在单元仍待处理时用 `workflow queue cancel <queueId>` 取消，并用 `run list --submission <submissionId>` 发现已接纳的 Zotero 托管任务，而不要把任务谱系与队列成员关系混淆。单元一旦被接纳或运行，队列取消必须失败关闭；对执行取消或交互请使用返回的 `workflowRunId` 与常规 run 控制面。

原生队列拥有有界准入，并让每个已准入槽位保持占用直至终态执行与 apply-back。队列位置或聚合提交状态不是 workflow 结果、Product receipt，也不是所请求 Zotero 更改存在的证明。独立检查每个已准入任务及其预期输出，将失败与取消单元作为不同结果保留，且不要仅因初始响应中没有 `workflowRunId` 就重新提交不确定的提交。

活动提交与队列投影是进程本地的。若 Host 重启使原始 `submissionId` 不可用，使用按提交过滤的 task 发现与实时 run 读取来恢复已被准入的单元；不要根据标签或成员数量重建待处理单元。将未准入单元报告为不再活动，在队列内部结构之外保留其原始源范围，并在提交替代有界请求之前要求当前授权。

对于自有 agent 执行，确认 workflow 支持该模式，准备 handoff，保留 `agentRunId`、每个 `agentRequestId`、bundle 位置与校验和，然后检查每个请求契约。在 apply-back 前于本地验证每个已完成的结果。通过 `workflow agent-apply` 应用完整的请求到结果映射，并使用 `workflow agent-apply-status` 获取持久 receipt。apply 响应只是有界的聚合；用同一个 `workflow agent-apply-status` 翻页 `agentRunId`，直至收齐每个 receipt 结果，并将其状态改变与 handle 消耗证据与各结果行分开保留。绝不通过 Zotero 托管的 run 平面监视 `agentRunId`。

`workflow agent-bundle inspect` 与 `workflow agent-result validate` 是本地预检命令。它们接受目录或 ZIP，不联系服务、不应用数据、不续租，也不消耗 handle。不安全路径、符号链接、重复条目、过多条目数、超大 JSON、畸形归档与不支持的压缩返回结构化的本地输入失败。本地成功仅证明结构有效；它不证明语义正确，也不授权 apply-back。

通知是生命周期信号，不是 transcripts、交互目标或授权。用 `skillRunId` 进行回复/连接，用 `permissionRequestId` 检查权限，用 `eventId` 确认。仅在其关联操作已处理后确认事件。

## Synthesis 操作边界

将 topic、graph、index、resolver、artifact、概念、schema 与 attention queue 视为不同的派生模型。派生的关联不自动等于学术或因果主张，生成的 artifact 也不是当前 Zotero 写入的证据。

提出维护前先做 cache 与 index 状态读取。Reference-sidecar 刷新、citation-graph 更新、graph-metric 刷新与 cache 失效是独立操作，各有作用域、approvals、operation IDs 与 receipts。需要处保留已提交的 basis 哈希；不要把一次操作的完成当作另一派生模型为当前状态的证据。

## 硬性约束

- 仅使用文档化的规范 CLI 命令及 `surface describe` 或命令参考确认的 argv。不要猜测标志，也不要用原始 `call` 替代可用的语义命令。
- 绝不直接读取或修改 Zotero 数据库、存储或应用内部。所有库写入与 apply-back operation 都保持在 Zotero 侧 approval 路径上。
- 将每个返回的标识符视为不透明的类型化句柄。不要互换 handle 种类、重用已消耗或未知的 handle，也不要在需要 bridge 签发 handle 的地方发送本地路径。
- 绝不将 agent 本地或 Zotero 本地路径传入 workflow 资源绑定。输入只消耗 `fileId` 签发的 `file upload` 值；输出只声明 `bridge-download` 并返回可下载描述符。
- 将 bearer token 与其他凭据挡在命令参数、JSON 结果、diagnostics 与任务证据之外。
- 将 stdout 视为一个 JSON envelope。按原样保留分页 cursor、文件校验和、operation receipt 与输出位置。
- 本地校验成功不授权后续 `workflow agent-apply`；Zotero 侧预检与 approval 仍是权威。
- 从同一 release set 使用 CLI 二进制、profile、嵌入契约与发布信封。仅匹配的版本字符串不是充分的身份证据。
- 不要从缓存投影、workflow 终态状态、通知、本地 artifact 或生成的分析推断当前 Zotero 状态。
- 在其持久状态与 handle 消耗已知前，不要重试改变状态的调用。
- 不要在 `workflow submit` 周围实现 agent 侧 workflow queue、计划项注册表、预留循环、重放循环或后台批处理层。有界并发与待处理 unit 所有权属于 Zotero 的原生 workflow queue。
- 不要将 `submissionId`、`queueId` 与 `workflowRunId` 视为可互换。队列取消只适用于待处理的 `queueId`；已准入工作通过其真实 run handle 控制。

## LLM 与工具职责

- Agent 拥有操作选择、语义解读、approval 感知决策、证据使用与恢复选择。
- CLI 拥有精确 argv 解析、Zotero Bridge 服务请求、类型化句柄传输、结构化错误与本地 bundle/result 校验。
- renderer 拥有命令 surface 引用与内嵌 Agent Surface；不要手工拼装那些 artifacts，也不要捏造 handle、receipt、checksum 或结果信封。

## 完成

当请求的 operation 返回了有效 JSON envelope、已取得所有必需页或交付字节、相关 handle 与 receipt 均已保留、且任何请求的状态改变都已实时验证时，该 Skill 即完成。当结构化失败已按下一个安全动作分类且未发生不安全的重复时，该 Skill 同样完成。

将证据匹配到操作：

- 对于有界读取，保留稳定对象 ref 与回答请求所需的字段；
- 对分页结果，保留已完成的边界或最后接受的 cursor；
- 对交付的字节，保留校验和、字节数与属主对象；
- 对 mutation，保留 approval 结果、operation receipt 与实时事后读取；
- 对异步 run，保留终态状态并单独核实所请求的交付物；
- 对于 host-queue 提交，保留 `submissionId`、每个 unit 的 `queueId`（存在时）与已接纳任务 identity、聚合终态投影，以及每个请求 unit 的独立验证结果或失败；
- 对本地验证器，只报告结构有效性，不暗示远程 authority。

## 失败处理

1. 保留命令、脱敏输入、结构化错误代码、相关 handles、接受的页面，以及任何 operation 或输出标识符。
2. 从信封读取 `retryable`、`stateChange`、`handleConsumption`、`safeNextActions` 与 `nextCommand`。
3. 当 `stateChange` 为 `changed` 或 `unknown` 时，在再次变更前读取持久 operation、apply-back receipt、workflow/run 状态或受影响的实时对象。
4. 当 `handleConsumption` 为 `consumed` 或 `unknown` 时，除非域 receipt 声明可恢复动作，否则不要重用 handle。
5. 仅当 `retryable` 为 true、当前状态允许且重试不会重复已接受的页、提交、mutation、上传或 apply-back 时重试。
6. 对部分 apply-back，从 receipt 报告每个已应用、失败与未尝试的请求；绝不要将结果折叠为成功或重放完整映射。
7. 对于文件或分页失败，保留已验证的字节/页，并只通过返回的 cursor、文件所有者或安全的下一条命令恢复。
8. 若权限、输入、身份、profile 就绪度或 approval 缺失，返回结构化失败与所需决定，而非绕过 CLI 或 Zotero 侧边界。
9. 对于不确定的 host-queue 提交，检查原始 `submissionId`，然后用 `run list --submission` 关联已准入任务；在首次准入结果已知前绝不创建第二个提交。
10. 当待处理取消与接纳竞争时，把 queue 端点的冲突视为所有权已移交到 run 平面的证据，重新读取 submission projection，并仅以暴露出的 task 或 run handle 继续。
11. 对于 workflow 资源失败，保留 slot id、绑定、上传描述符与提交/run handle。仅在原始 `fileId` 过期、不可用或已被服务重启作废时重新上传；不要在其他提交中重试处于租约的 handle，也不要用本地路径替换它。

## 参考

当规范命令未知时，先阅读 [the command catalog](references/command-catalog.md)。该 catalog 为每条规范叶命令恰好链接一张生成的卡片。选择命令后只加载该卡片；它对继承的 globals、本地 argv、结构化输入、schemas、示例、effects、approval、handles、目标与恢复都是独立完整的。活动可执行文件的 `surface describe` 结果在实时 operation 之前优先。
