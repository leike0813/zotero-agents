# 知网授权 PDF 接入契约

状态：wayfinder 决策结论，供 OpenSpec 承接。源码基线 `a991d608188795e5123702179d608fc6c0e43e13`。本文记录用户已确认的产品边界和推荐架构，不表示生产实现获批或验收通过。

## 用户明确的目标

将保存本机机构登录会话、访问论文页面并取得 PDF 的能力，以 Host 接口形式提供给运行 `literature-search-ingest` Skill 的 Agent。Agent 不依赖外部浏览器工具，直接发起、观察、控制获取过程，并知道最终附件结果。

Agent 在整个取全文过程保持编排权。原生浏览器、机构认证及文件字节由 Zotero 本机持有。PDF 留本机不等于把获取过程放到 Agent 完成后的 apply hook。

## 已确定的产品边界

既有产品决定：

- Linux／Zotero 10 试点，兰州交通大学 CARSI 为首个验收样本，PDF-only；CAJ-only 保留缺全文。
- 用户批准后先保存／复用文献条目，再补全文；下载失败不撤销入库。
- 机构登录由用户在本机完成，登录后 Agent 可以继续获取。
- 本次 PDF 只保存本机，不自动传给远程 Agent；其他阅读／分析 workflow 的传输方式单独适用。
- 用户批准一批论文后，Agent 可在该任务内直接复用机构登录访问及下载这些论文，不为每次导航、下载或任务首次复用再增加确认；附件写入继续遵循现有 Zotero 审批。
- 关闭登录窗口结束本轮等待，保留条目，不立即重新弹窗；后续用户主动重试。
- 原生路径无法稳定完成验收或必须新增外部下载运行时，则延期自动功能，保持现有流程。

用户已同意跨 Zotero 重启保留本机机构登录上下文，作为正式能力；跨论文、跨 Agent 任务复用同一登录配置。任务完成只释放页面与下载资源，不自动退出机构登录。保留上下文不保证机构授权永久有效；持久状态按网站原生规则保留，失效时仍由用户重新认证，不能擅自延长网站授予的有效期。

用户已确认等待与恢复规则：需要重新登录时打开窗口，最多等待 10 分钟；关闭、取消或超时后结束等待，不连续重弹；下载目标失效时刷新同篇论文页面后重试一次，仍失败则记录原因并继续其他论文；Zotero 重启后保留登录配置，由用户重新发起任务，不自动重放下载或写入。登录超时不清除机构登录配置。

机构授权使用由本批论文范围批准覆盖，不增加任务首次复用或逐动作确认。试点可用性和设置呈现由后续 OpenSpec 明确，不把此前未获采纳的「默认关闭」建议视为产品决定，也不以此再增加使用机构登录的确认步骤。

## 所有权

| 所有者 | 职责 |
| --- | --- |
| literature-search-ingest Skill／运行它的 Agent | 知网站点策略、选择论文、识别来源与正文、调用 Host 导航／观察／下载、处理认证等待、提交附件、检查 receipts、更新 ledger 和最终输出。 |
| Broker 的原生浏览器 owner | 本机窗口／页面、会话上下文、有界页面事实和动作、同会话请求、下载任务与取消、临时文件所有权。通用核心不包含知网／学校选择器。 |
| Host Bridge capability registry | 将 Broker 能力显式投影给 CLI／MCP；校验 scope、会话／页面／文件引用，移除本地路径和授权信息。 |
| canonical mutation authority | metadata 与附件写入的审批、身份／revision 检查、幂等、replay、终态证据。 |
| workflow applyResult | 依 Agent 已确认结果更新现有状态投影；不在 Agent 结束后另行登录或下载。 |

已有 `literature.ingest` 和附件能力仍为 Zotero 写入入口。浏览器获取阶段不直接创建条目或附件，不能绕过 canonical mutation。

## 最小接口及输入输出约束

以下为交给 OpenSpec 的能力粒度，具体命令拼写及 JSON 字段在同一正式合同中冻结，不能当成现有 CLI／MCP 命令：

| 能力 | Agent 需要的输入／观察结果 |
| --- | --- |
| 打开／复用本机会话 | 返回 opaque sessionRef 和可操作页面引用；需要用户登录时窗口可见，立即返回。 |
| 导航与观察 | Agent 提供公开论文／入口地址，或激活当前观察中的目标；返回有界页面标题、论文身份、可见下载控件及页面状态。 |
| 激活页面目标 | 使用本页观察所得的 opaque targetRef，绑定 session／page revision，避免旧页面目标被错误执行。用户自行填写认证表单。 |
| 发起同会话下载 | 针对观察到的下载目标发起请求，使用本机真实会话；返回受控任务引用或已完成文件结果。 |
| 观察／取消下载 | 短调用返回 pending、已完成、失败或取消；完成结果含本机文件引用、PDF 检查事实和必要来源事实。 |
| 释放资源／退出会话 | 释放该任务的页面及文件，与清除机构认证分别处理；会话清理只影响本功能拥有的上下文。 |

接口只围绕三组对象展开：持久登录配置，任务内页面与页面目标，任务内下载与导入文件。会话 owner 统一负责后台请求和生命周期；不增加一个只转发方法的远程 browser manager 或通用 job queue。

每次页面观察返回有限条数／字节的可见事实、当前页面版本及目标引用；长页面需要有界后续读取，不能返回整站或整个 profile。导航／激活／下载结果说明已接受、已完成或失败，不能用 accepted 代表 effect 成功。下载 start 接受调用幂等键，在同一任务下重复启动同一请求必须返回已有 downloadRef，不能因响应丢失自动重复下载。

短观察返回当前状态及建议下次观察间隔；可选有界等待也必须显著低于 CLI 30 秒传输上限。任务引用只标识获取过程，不是 canonical mutation operationId；附件提交保持独立操作身份。Agent 可在同一任务中完成下载、结果核对及提交，不通过扩大单次工具超时来等待用户登录。

浏览器 owner 不向 Agent 返回原生 window／DOM、userContextId、cookie、令牌、密码、完整认证表单或下载签名参数。Agent 可观察论文标题与可操作目标；下载凭据和目标的实际请求地址留在 Host 内，由目标引用解析。

网站内容是外部资料，不是 Agent 的执行指令。Skill 依据用户批准的论文范围操作；不会因为页面文字要求而扩大任务或调用其他写入。

## 一篇论文的完整流程

1. Agent 搜索并完成候选确认，沿现有 canonical ingest 创建或复用条目，取得 parentRef。
2. Agent 查询当前可用 PDF；已有可读文件时跳过获取，保留 curated metadata。
3. 缺 PDF 时，Agent 打开／复用本机会话并导航到已观察的知网来源页。用户必要时完成机构认证。
4. Agent 用短调用观察页面并选择真实 PDF 入口。页面可见或 translator 识别成功不代表获得正文。
5. Agent 发起 Host 下载并观察结果。Host 在本机检查 MIME／文件头／可读性；Skill 结合论文身份事实确认匹配。
6. Host 返回本机受控文件引用。Agent 不下载这些字节到远程工作区。
7. Agent 使用文件引用调用 canonical `attachments.create`，child placement 指向已确认 parentRef，沿用现有写入审批。
8. Agent 检查附件 mutation receipt；只有 canonical 提交并确认附件后才写 `pdfStatus: attached`，否则记录缺全文或真实失败／不确定结果。
9. Agent 保存获取与附件 receipts，更新 ledger，形成包含实际全文结论的最终 JSON。applyResult 据此维护状态标签。

先取到文件与最终附件提交是两个独立事实。Agent 必须知道二者，不得把 file ready 或浏览器完成当成 attached。

## 长等待与生命周期

MCP 单次工具有 45 秒 watchdog，CLI 传输另有 30 秒读取超时；这些限制一次调用，不限制本机会话存在的总时长。打开窗口／启动下载应快速返回，观察和取消分别调用，每个服务器调用都应在较短预算内收敛。不能把一次工具调用挂到用户认证结束，也不需要为此修改总体 watchdog。

浏览器会话负责存续；单次观察调用完成不能销毁会话。页面／下载任务与认证会话分别结束，避免 Agent 结束一次请求就注销机构登录。

区分三个对象及寿命：

| 对象 | 寿命与外部引用 |
| --- | --- |
| 机构登录配置 | 持久保存在当前 Zotero profile；含用户可识别的名称及 Host 私有原生上下文绑定。Agent 仅得到 opaque authProfileRef，不得到底层 cookie／存储路径。 |
| 浏览页面 | 当前调用任务持有的 sessionRef／pageRef，关联一份机构登录配置。释放页面不清登录；Zotero 重启后页面引用失效。 |
| 下载任务／文件 | 由当前任务持有的 downloadRef／fileId，供观察、取消和附件导入；按终态／lease 清理，不作为持久登录的一部分。 |

重启后重新取得登录配置引用并打开新页面，尝试使用仍有效的本机原生状态；不重放旧页面动作或活动下载。相同登录配置可共享认证上下文，各 Agent 任务拥有自己的页面；重新登录／切换机构时需避免并发任务互相改写页面或错误归属结果。

用户可显式退出一份登录配置；Host 清理该配置拥有的认证状态。关闭页面、取消下载和退出机构登录是三个不同操作。插件更新／正常退出不得因常规资源清理而删除持久配置；其他用途的 Zotero 默认上下文也不应被本功能清理。

源码观察：实际 10.0.5 安装包的 `chrome/content/zotero/xpcom/http.js:147-175` 中，newCookieContext 使用随机起始的递增 userContextId，dispose 仅按该 ID 删除 cookie；它没有命名持久配置合同。平台 `modules/ContextualIdentityService.sys.mjs:246-300` 有配置保存与 create 路径，`:364-384` 的 remove 清理对应 origin attributes 下的数据，`:730-734` 指向 profile 内 containers.json。平台能力可作为持久化设计的候选，不能据此声称 Zotero 中已验证完整跨重启登录；未读取、导出或修改用户的认证存储。

耗时下载若不能在工具预算内完成，应由同一浏览器 owner 持有受控任务并供短调用观察；不占用原生写入槽或数据库事务。首版不新增通用后台调度队列，也不借用 Synthesis maintenance、canonical mutation store 来保存浏览器状态。

失效的 sessionRef／targetRef／fileRef 明确失败，不静默选择环境中的其他窗口或会话。Host／Zotero 重启后旧活动任务不可假定仍存续；只按持久登录配置打开新页面及检查当前授权事实。

关闭登录窗口结束本轮等待的结果必须返回 Agent。取消或超时保留 metadata，清理当前任务；不能在同一等待结束后自动反复弹窗。真实无权限、CAJ-only、无 PDF、登录 HTML 和网络失败分别记录，不混成「授权到期」。

登录等待的 10 分钟从本轮需要用户认证并打开窗口时计算；状态观察不重置时限。关窗、主动取消或超时后，该批次不再自动请求登录；其余论文仍可完成不需要新认证的步骤。已经有效的登录不因等待结束而主动清除。

已确认的下载恢复只针对失效目标：重新观察同篇论文得到新目标后重试一次；不能因此重复附件写入或无休止地重新认证。普通单篇失败继续其余论文；全任务取消停止后续工作，已提交条目／附件及其 receipts 保留。未处理论文与已失败论文必须可区分。

## Skill 调用权限

现有 navigation.* 不能直接作为本能力的调用通道：MCP 将 acp-skill-run、acp-run、skillrunner-run scope 归 automated，导航能力拒绝这些 scope；HTTP navigationScopeAllowed 只接受 global／acp-chat。不能把 Skill 的调用伪装成 acp-chat，也不能为取全文放开所有现有导航。

用户已确认权限语义：入库范围批准后，该任务的 Agent 可复用机构登录访问与下载已批准论文，不逐次询问导航、下载，也不另设任务首次复用确认。附件写入仍按既有审批处理。

新增浏览器能力须为真实 Skill run scope 定义独立的 exposure／permission 合同。Host 可验证的任务授权绑定调用 run、批准的论文范围和对应页面／下载资源；跨域的学校 IdP、CARSI 与出版社跳转属于获取该论文所需的认证链，不能机械地用「域名始终相同」判断是否越界。Agent 不能仅传入一个 approved 布尔值获得权限，也不能将既有写入 auto-approval grant 顺带解释为浏览器会话权限。

Skill 阶段 30 的用户范围决定目前发生在 Agent 对话，Host 尚无对应浏览器授权记录。推荐在现有任务／scope admission 内绑定该命名任务的 acquisition 使用权，并以同一 run 的 canonical ingest 已确认条目、来源事实和任务拥有的页面／文件限制目标；阶段 30 的准确范围仍由 Skill 执行，不假装 Host 能从客户端 approved 字段验证对话。既有任务提交／批准摘要应明确包含机构授权获取用途，不新增逐动作弹窗；浏览器使用权独立于写入 auto-approval。

OpenSpec 需把这项任务授权纳入现有 admission 的明确数据流，覆盖真实 SkillRunner／ACP 两条调用路径及终态撤销。权限随任务结束／取消失效，但认证配置继续保留；后续任务在自己的批准范围内重新取得使用权。未建立可信 run 使用权时 fail closed，不回退为 global scope。

页面、下载和临时文件归具体任务所有；会话配置跨任务复用不等于另一任务能操作这些页面或消费这些文件。退出机构登录、删除配置、切换账号不属于本次论文导航／下载的自动授权，必须由用户明确发起，避免 Agent 在任务结束时注销其他任务仍在使用的认证。

## 本机文件到附件

现有 Bridge 附件 ingress 接收 `source: {kind: stored_file, fileId}`，adapter 再变成私有 prepared-file。公共 canonical 附件 DTO 本身不接收路径或会话 ID。

当前 `stageBridgeStoredAttachmentIngress` 通过 `acquireHostBridgeUploadedFileLease` 解析 fileId，针对上传源；不能假定浏览器下载得到的普通文件句柄已能直接复用。

应扩展受控文件 ingress／lease，使本机浏览器取得的文件能作为附件源，保留现有 prepared-file、审批后的重新准备、mutation replay 与清理规则。实现可复用 registry，但须明确 acquisition 来源与可用用途，不能伪称 Agent 已上传文件，也不能给 Agent 任意路径写入权。

本次只需返回「本机挂附件」所需引用，不自动生成远程文件下载交付。现有通用 fileId 若同时可用于远程 GET，则需明确该获取结果的用途限制；不能因复用文件 registry 顺带授权正文传输。

跨调用期间文件由 Host 持有。附件准备／审批等待期间须保留适当 lease；提交或失败后按所有权清理。已提交附件不随临时下载资源释放而删除。

## 结果、恢复与幂等

- Agent 的最终 pdfStatus 和 ledger 覆盖本次授权获取及附件提交后的事实，不是授权补齐之前的快照。
- 成功记录 parentRef、attachmentRef 和必要的结构化获取证据；不输出凭证、下载签名链接或本地路径。
- 已有可用 PDF 则跳过；首版不自动替换／删除用户旧附件或 landing 链接。
- 旧下载目标失效时刷新同一论文页面，取得新目标后重试一次；仍失败则记录原因并继续，不无限重放旧 URL。
- 先查询已有 canonical mutation 终态，再重新准备附件资源。提交状态为 unknown／repair_required 时，不能作为普通缺全文直接重放写入。
- 保留 metadata 入库 receipt，补附件使用其自己的操作身份。不同 add／remove 标签语义不能复用一个固定 operationId。
- applyResult 可读取最终 Host 事实校准标签，但不得向 Agent 隐瞒后续获取阶段。只在实际 PDF 可用时移除 need-fulltext。
- 重新认证和再次尝试由 Agent 按上述 10 分钟等待、结束后不重弹、失效链接重试一次的规则编排。

Agent 最终报告复用现有 pdfStatus，并在 ledger 中保存更细的获取原因及相应 Host receipt。仅文件已取得时仍不能标 attached；附件 canonical 成功后才确认。取消后的部分成功结果也须保留可观察的条目／附件证据，不能用一个无 outcomes 的取消输出抹去已完成工作；如现有 output schema 无法表达，OpenSpec 一并修订 schema 和产出脚本。

## 实际影响清单

| 文件／区域 | 预期变化 |
| --- | --- |
| `src/modules/zoteroHostCapabilityBroker.ts` 与新增原生浏览器 owner | 通用持久登录配置／页面／下载能力及 typed DTO，区分三种寿命、显式退出和重启恢复；业务选择器仍在 Skill。 |
| `src/modules/hostBridgeCapabilityRegistry.ts` | Broker 的显式投影、会话／任务／目标引用校验、获取结果到受控文件 ingress 的 adapter。 |
| `src/modules/hostBridge/permissions/`、任务 admission 与对应 CLI 调用路径 | 绑定命名任务 acquisition 使用权、真实 run scope 及终态撤销，保留现有 navigation.* 和附件写入权限语义。 |
| `src/modules/hostBridge/server/hostBridgeFileRegistry.ts` | 复用文件所有权／lease，并明确 acquisition 来源与用途；当前上传 ingress 不能直接假定支持。 |
| `contracts/host-bridge/capabilities.v2.json`、`cli-commands.v2.json` 及对应生成源码／脚本 | 新能力与 CLI 映射的正式契约；先定位各生成／源文件的 owner，再按既有流程更新。MCP 从 registry 派生，不另建工具表。 |
| `skills_builtin/literature-search-ingest/SKILL.md`、`references/pdf-probe.md`、`references/ingest-output-recovery.md` | Agent 直接操作 Host、认证等待、证据判定、附件写入及失败恢复；明确本机机构授权路线。 |
| 同 Skill 的结果／ledger schema 与产出脚本 | 按冻结后的语义报告授权获取与最终附件事实；优先复用现有 pdfStatus，不为本地路径／会话秘密增字段。 |
| `skills_src/zotero-bridge-cli` 及受影响的 Generic／Hermes 源 | 按 surface manifest 补充命令与操作指引；保留已有指令语义与厚度，不直接改生成目标。 |
| workflow `hooks/applyResult.mjs`／README | 更新最终状态投影与说明；不承担取全文。仅在标签重放语义确需调整时修改共享写入调用。 |
| Broker／registry／Skill 文档及 OpenSpec delta | 新 Host 接口、会话所有权、文件 ingress、权限、生命周期、真实验收。 |

此次不以新增 Workflow Host browser 投影或升级 v12 为前提；Agent 访问 Broker 经 Bridge／CLI／MCP，WorkflowHostApi 是另一独立投影。

此次也不要求重构 workflow hook 的全局锁、package runtime stack 或 bundle module cache。这些是旧接入位置带来的额外工作，当前无证据需要为 Agent 直接调用路径修改它们。

Host Bridge 三层 surface 后续语义变更须记录固定 baseline、materialized 指标与明确删除清单；当前删除清单为空，已有指令必须保留。此次仅改研究草案，不修改 governed Skill 源或发布任何组件。

## 验收与未证实范围

- Agent 通过 Host 接口完成打开／观察／导航／同会话下载／附件提交，整个过程不调用外部浏览器工具。
- 用户登录期间短调用可返回，Agent 能观察等待与完成，其他工具可继续运行。
- 在真实 acp-skill-run／skillrunner-run 调用范围内，已批准论文可直接导航／下载，无额外逐次确认；其他任务的页面／文件不可访问，已结束的任务不能继续使用授权，既有 navigation.* 权限不被放宽。
- 跨任务、跨 Zotero 正常重启可恢复仍有效的登录上下文，页面关闭不注销；显式退出清理配置拥有的认证状态。过期需重新认证，不能通过改 cookie 有效期制造持久授权。原型默认上下文成功不能代替新会话 owner 的真实 CARSI／重启／退出验收。
- Agent 能区分 PDF 获取、附件提交、关闭、取消、权限不足、CAJ-only、HTML 登录页、失效目标和文件过期。
- PDF 字节留本机，受控文件引用可完成挂附件；不错误地开放远程传输或任意路径写入。
- 同一附件 mutation replay 不重复创建，重启后的未知提交按 canonical 证据恢复。
- 继续使用统一 Zotero E2E／隔离 profile，不另建 runner；实测记录实际版本，当前证据仅 Linux／10.0.5。
- 官方 translator 在样本上可识别但提取为空，不能预设其完整入库能力可复用。

优先扩展现有测试：`tests/zotero-host/102-zotero-host-broker-capability-api.test.ts` 验证 canonical 挂附件与 replay；`tests/host-bridge/138-host-bridge-file-downloads.test.ts` 验证下载产物的文件用途／lease；`tests/host-bridge/108-mcp-host-bridge-mirror.test.ts` 验证共享 registry 投影；`tests/workflows/137-literature-search-ingest-workflow.test.ts` 与 `tests/runtime/192-literature-search-ingest-skill-runtime.test.ts` 验证结果／ledger／标签语义。浏览器 owner 的真实非平凡状态逻辑需补最小行为测试，覆盖启动幂等、跨任务隔离、关闭／取消、失效目标、持久配置恢复与不自动重放；不为指令文本增加静态测试。

最小验证层次为：schema／contract 与 owner 行为测试、相关类型／lint／构建检查、统一 Zotero E2E 路径中的无凭证合成场景，以及用户参与的真实 CARSI／PDF／正常重启／显式退出／到期后重新登录验收。当前只完成原生单篇可行性与本文格式检查，未将其余项目记为通过。独立 profile 的私有认证及原始 PDF 不作为提交 fixture。

## OpenSpec 交接范围

产品取舍已闭合，可据此创建一个正式 change；先把三组 Host 对象、短调用状态、run 授权数据流及 acquisition 文件用途冻结为 DTO／schema，再拆实施任务。具体命令名、owner 文件命名和原生持久化 adapter 选择属于这份规格的技术展开，不能改变 Agent 编排、跨重启登录、本机文件、权限及恢复行为。

实施前首先验证持久上下文在 Zotero 中的真实能力；若跨重启登录或用户认证后自动取匹配 PDF 无法满足验收，执行已选延期条件，不能悄悄降为每次任务重新登录或外部下载运行时。OpenSpec 的任务必须明确此风险与验收缺口，不能按本文选择直接宣称可用。

本阶段仅形成交接结论，不创建 OpenSpec change、不安装依赖、不修改生产实现、不提交或发布。后续规格和实现按项目流程推进。

## 跟踪

- [接入契约最终结论](https://github.com/leike0813/zotero-agents/issues/98#issuecomment-6345457526)
- [用户纠正与当前方向](https://github.com/leike0813/zotero-agents/issues/98#issuecomment-6344991942)
- [接入契约票](https://github.com/leike0813/zotero-agents/issues/98)
- [原生验证及限制](https://github.com/leike0813/zotero-agents/issues/96#issuecomment-6344329038)

接入契约票以以上决策和影响／验收清单完成；具体技术规格由后续 OpenSpec 承接。当前地图的终点为形成足以交接的边界，不把生产实现或真实验收完成作为本票已达到的结果。
