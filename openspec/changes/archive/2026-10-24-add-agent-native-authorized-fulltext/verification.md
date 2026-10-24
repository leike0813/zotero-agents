# 实施与验收记录

日期：2026-10-24。固定 baseline：`a991d608188795e5123702179d608fc6c0e43e13`。当前工作区未提交；未归档、预构建发布或正式发布。

## 实现范围与证据

| 任务／delta | 实现与验证 | 边界 |
| --- | --- | --- |
| 1.1–1.4；native browser 的持久认证前置验证 | `native-validation.md` 记录真实 Linux/Zotero 10.0.5、命名上下文、正常重启复用、原生文件传输与显式退出负对照 | 原生机制验证，不替代生产接口验收 |
| 2.1–2.5；native browser acquisition | Broker owner、DTO/schema、命名认证配置、九项操作、有界观察、十分钟等待、幂等下载、取消与清理；321 owner 测试 11 项通过，真实 native assembly 和 AF-01 通过 | 64 MiB 是源文件／输入缓冲上限，不是 PDF 解压后的进程内存上限 |
| 3.1–3.4；access prompt injection、MCP catalog | workflow 声明独立 intent；ACP 与 SkillRunner 按可信 live task 发行／撤销 grant；registry、CLI、MCP 共用契约；107、108、48、159 覆盖权限、提交失败、生命周期与导航兼容 | 不把请求头中的 runId 或 approved 当授权；短期断线不终止后台 live run |
| 4.1–4.3；file downloads、workflow control | 共享 `runtimeFileRegistry.ts`；acquisition handle 只允许同任务、同 parent 的子附件 ingress；138 覆盖租约、审批期失效、读取前拒绝远程 GET，以及文件消耗／grant 撤销后的 canonical replay；AF-01 实机通过 | 已提交附件不受临时文件清理影响；unknown/repair_required 仍由 canonical operation 观察恢复 |
| 5.1、5.3；authorized fulltext、workbench package/output | `ingest_gate.py` 分开 core/acquisition/attachment/PDF-read/prepared 事实；固定 ledger schema、candidate/operation/payload 绑定；192 的 24 项通过 | ready 文件不能单独产生 attached；取消区分失败与尚未处理 |
| 5.4；workbench workflows/status | apply hook 只读当前 PDF 和投影状态；137 的 29 项通过；AF-01 在取消后保留附件并清除 need-fulltext | 测试的是产出 canceled 业务 JSON 后的 apply；后台进程被强制终止而未产出 JSON 时，不声称 apply 已运行 |
| 5.2 | 真实后端主 Agent 已通过已有 PDF 跳过；受控故障场景中真实 Host 返回两次 stale_target，主 Agent 只刷新重试一次并继续完成第二篇，ledger 与本机事实一致 | 失效由现有合成页面上的显式导航制造，属于受控故障验收，不声称知网站点自然发生过相同竞态 |
| 5.5；三层 agent-facing surface | additive semantic sources、九项命令卡、渲染合同与本地 materialized 内容；固定 baseline 比较和逐项语义审阅 | 见 `artifacts/authorized-fulltext-wayfinder/surface-review.md`；四类计数均为 0，27 项既有 advisory warning 有明确接受理由 |
| 6.1 | 类型、lint、构建、相关单元测试、统一 System E2E 均通过 | 未运行完整仓库测试、跨平台兼容性矩阵或发布流水线 |
| 6.2 | 真实 MiniMax ACP 主 Agent 已通过生产接口取得机构 PDF、提交附件；正常重启后独立任务无需再登录取得匹配 PDF；显式退出后同进程重新认证及获取也已通过 | 真实自然到期仍待验收 |
| 6.3 | 对照八个 delta 的 owner、投影、文件入口、Skill 输出与恢复要求，更新 Broker 文档、E2E 文档及 AGENTS 约束；OpenSpec 严格校验通过 | 未通过的场景留在任务清单，没有把合成证据等同于真实认证 |

## 自动化验证

- `tsc --noEmit` 通过，包括新原生 E2E 和 fixture。
- 变更源文件 ESLint 通过；最后的 owner、测试与 scaffold 配置通过 Prettier 检查。受治理 Markdown 保留既有指令结构，由语义审阅及生成检查验证。
- 核心组合：Host Bridge capabilities、workflow control、MCP mirror、file ingress、acquisition owner、workflow execution seams 共 248 项通过。随后扩展取消／释放场景，321 全部 11 项再次通过。
- Skill gate 与 workflow apply：192 + 137 共 53 项通过。
- 159 run stores：24 项通过；ACP materialization 定向场景：4 项通过。
- Rust CLI acquisition schema 测试通过；`render-host-mutation-contract.ts --check`、`render-host-bridge-surfaces.ts --content-only --check` 及 materialized package gate 通过。
- `npm run build` 通过；最终 E2E 又从当前源码构建插件、CLI 和本地 Synthesis sidecar。
- `openspec validate add-agent-native-authorized-fulltext --strict`、`git diff --check` 通过。

最终 System E2E 命令：

```sh
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=<本机 Zotero 可执行文件> \
ZOTERO_TEST_ENTRY=tests/zotero/e2e/full/304-authorized-fulltext.zotero.test.ts \
ZOTERO_TEST_GREP='System E2E runner foundation|AF-01' \
ZOTERO_E2E_FIXTURE=seed npm run test:zotero:e2e
```

结果：2 selected、2 passed、0 failed、0 skipped、0 incomplete；两组 cleanup 和 health 均 passed。Manifest：`artifacts/test-diagnostics/system-e2e/d5c166a5-49c1-43e3-8aa3-3ffb2178ca0d/run-manifest.json`。foundation 记录实际宿主为 Linux/Zotero 10.0.5；安装目录名不是版本证据。

AF-01 经真实原生窗口、Actor、Downloads、解析 Worker 和 canonical mutation 验证：HTTP 200 登录 HTML 不产生文件；匹配 PDF 可导入；跨任务页面访问及远程文件 GET 被拒绝；消耗文件后重放同操作不重复附件；释放清理未导入文件；关窗终止等待且抑制重弹；取消业务结果仍保留已提交附件，并依据当前 PDF 清除缺全文状态。

## 本轮定位并修复的问题

1. 平台默认 contextual identity 可以没有 `name`，改为仅过滤有字符串名称的插件自有身份，并以混合身份列表验证。
2. 工作区中的临时扩展不能让 Gecko 内容沙箱读取 Actor。统一 E2E scaffold hook 在构建后复制当前插件到隔离 profile 的扩展目录，再正常安装；没有关闭沙箱或另建 runner。
3. release 原先等待整个传输清理，可能超过短调用预算。现在立即撤销引用与 ingress，后台清理继续持有资源槽；显式 sign-out 和 shutdown 仍等待清理。测试用尚未完成的传输证明 release 可返回、认证清理不能抢跑。
4. ledger 示例和 Skill 摘要曾保留旧字段，现按实际 schema 与 gate 校准；文档示例通过 schema 校验。
5. 真实 ACP 验收发现，带 operation header 的只读 `mutation.get_operation` 被通用幂等缓存保留第一次 `unavailable` 结果，后续写入成功仍读到旧状态。无 header 的同一生产请求返回 settled，确认 canonical 写入证据正常。公共 HTTP 准入现仅对 `generic-operation` 使用通用 operation store，read、canonical mutation 和 task acquisition 各自保留所属语义。新增行为回归先复现失败，再通过修复；106 + 107 + 108 workflow control + 182 共 187 项通过，ESLint、Prettier、完整 `npm run build`（含各 TypeScript 检查）和 OpenSpec 严格校验通过。修复随后部署至隔离实例，相同 CLI 查询已返回 settled/committed。
6. 真实下载返回时暴露插件主脚本 global 没有 `structuredClone`，而 Node 与先前测试装载环境提供了该函数。下载 owner 的四个返回位置改为共享的显式 DTO 复制，只复制下载状态及嵌套文件事实。321 现有套件在移除该 global 的环境下先复现失败，修复后全部 11 项通过；同时检查调用方修改返回的 fileId 不影响内部事实。ESLint、Prettier、完整构建通过。将当前生成的生产 bundle 部署至隔离扩展后，真实 download/get-download 与附件提交已通过，未通过注入 polyfill 绕过该错误。

## 真实主 Agent 成功记录

`run-mvm4bfov-hnckmzzl` / `acp-skill-mvm4bfoz-siea2y` 在 MiniMax Code ACP 的 `m:minimax:MiniMax-M3.1-Flash:v:thinking` 下运行。前段发现运行时复制错误；部署修复后通过公开 `run skill reply` 恢复同一任务，新注入连接与 grant 生效。重新确认 parent 后，主 Agent 创建新 acquisition 页面并复用原认证身份；未再次要求用户登录。

主 Agent 实际调用原生下载，`get-download` 返回 ready：649859 字节、6 页、可读、题名匹配。随后以该 ingress-only handle 提交附件，canonical receipt 为 committed，receipt ID `b89b8e90-9064-48db-93eb-1b0175c76a1e`。本机独立检查确认父条目下只有一个 PDF 附件，属于 stored attachment，文件存在且大小相同。Agent 自己生成的 ledger 为 core=existing、acquisition=ready、attachment=attached、finalPdfStatus=attached；生产 workflow 最终 succeeded，need-fulltext 标签已清除。

附件第一次提交在等待审批期间发生客户端超时，重复尝试被仍有效的文件租约拒绝；批准原请求后提交成功。这是待处理审批与重试的证据，不是多个附件成功或下载失败。没有把旧探针 PDF 直接导入，也没有把 PDF 字节传给远程 Agent。新文件由生产 Downloads 通道、解析 Worker、文件 registry 与 canonical attachment 路径完成。

## 真实主 Agent 已有 PDF 跳过

独立任务 `run-mvm64f2a-53yitrvg` / `acp-skill-mvm64f2e-wlzjnj` 使用相同 MiniMax 后端与模型，最终 workflow succeeded。主 Agent 读取当前附件事实，ledger 记录 acquisition=skipped、reason=existing_pdf_available，attachment 为空，finalPdfStatus=attached（该字段表示最终已有 PDF，不代表本次新建附件）。去重后的实际 tool-call 命令没有 acquisition open/download 调用。本机独立检查确认仍只有同一个 PDF 附件，文件可用，need-fulltext 为 false。

复用入库等待本机审批导致 CLI 超时；审批后通过公开 run skill reply 继续，任务读回 canonical receipt 并完成 gate。历史 core receipt 的 hasPdfAttachment=false 没有被冒充成当前附件事实；最终 PDF 状态由新的 attachment read 证据确定。

## 生产接口正常重启与独立任务复用

前述任务终态后，经原生 eAttemptQuit 正常退出隔离 Zotero，确认旧 PID 退出；在真实桌面以同一隔离 profile/data 启动新进程，实际版本仍为 10.0.5。同一命名认证身份保留，进程内探针不再存在。临时开发扩展按正常 AddonManager 路径重新装载，未读写、导出或恢复 cookie。

新生产任务 `run-mvm6rf4f-a6yojtot` / `acp-skill-mvm6rf4k-rl2fkm` 使用独立 grant、新 parent admission、新 pageRef 与下载引用。此次明确要求重复下载作会话验收，禁止新增附件，不改变普通 workflow 已有 PDF 时跳过的策略。Agent 的两次 get-download 原始回执均为 ready，649859 字节、6 页、readable=true、identityMatched=true；期间没有再次登录或验证码交互。随后 Agent 调用 release，生成 gate/ledger，workflow succeeded。本机复核仍只有原 PDF 附件且可用，need-fulltext=false。此证据同时覆盖跨独立任务获取和正常进程重启后的认证复用。

本轮还暴露通用 operation get 返回了内部 runtimeInstanceId，导致 CLI 拒绝公开结果。既有 HTTP 回执测试加一条公开边界断言后复现失败；server 现在只在输出处去掉该内部字段，持久记录与重启判定保持原样。178 项 server/capability/workflow 测试及 9 项 socket 测试通过，ESLint、Prettier、完整构建通过。隔离实例装载修复后，相同 CLI operation get 返回 ok=true、state=completed，无内部字段，原始故障已复测通过。

## 生产本机退出与同进程再认证进度

跨重启任务成功且 release 完成后，通过插件原生偏好面板的“退出机构登录”按钮，选择唯一的生产 Institution 配置；原生对话框明确返回 Signed out。随后未重启 Zotero，在同一命名上下文打开 CARSI 入口并选择试点机构。用户确认重新登录后，窗口回到知网首页，宿主 PID 与退出前相同。

新任务 `run-mvm7up04-0kn4xp5y` / `acp-skill-mvm7up08-6qmvjv` 由同一真实 MiniMax 后端执行；复用入库等待本机审批后查询原 canonical receipt，未换操作身份重放。新的 acquisition get-download 原始回执为 ready，649859 字节、6 页、readable=true、identityMatched=true。Agent 释放资源并生成结果，workflow succeeded。本机独立检查原 PDF 仍只有一份、文件可用、need-fulltext=false。本轮证明退出后无需重启即可重新认证并获取；早期探针遇到的验证码控件异常未在本次生产路径复现，但不能据此宣称所有站点验证控件情形都已覆盖。此场景不代替自然到期，6.2 仍保留未勾选。

## 剩余验收

### 受控失效目标与逐篇继续已通过

`run-mvm885wd-7wxwtalr` / `acp-skill-mvm885wm-9m2ek0` 使用同一真实 MiniMax ACP 后端与模型。复用仓库 `npm run mock:skillrunner -- --port 0` 提供的既有合成论文页，只用其 loopback 网页 fixture；没有使用 mock Agent，没有新增 runner、修改生产实现或伪造 Host 错误。

批准的两篇材料按序处理：第一篇是明确的合成测试论文，第二篇是前述已有 PDF 的真实条目。本次测试特意让第一篇走 acquisition，并在每次下载前导航到同一落地页来使刚观察的目标失效；收到错误后的恢复次数与是否继续下一篇由主 Agent 按 Skill 决定。两份原始 download 回执均为 HTTP 409、code=conflict、details.reason=stale_target、stateChange=unchanged。两组 observe 回执均为 ready，但 revision 不同，证明第一次失败后重新观察取得了新目标。第二次失败后没有第三次下载，Agent release 第一篇的页面并继续第二篇。

最终 workflow succeeded、ledger completed：第一篇 core=created、acquisition=failed/stale_target、attachment 为空、finalPdfStatus=missing；第二篇 core=existing、acquisition=skipped/existing_local_pdf、attachment 为空、finalPdfStatus=attached。本机独立检查第一篇条目存在、无 PDF、保留 `status:need-fulltext`；第二篇只有原 PDF，文件可用且没有该状态标签。此场景覆盖失败不覆盖 core 成果、一次刷新重试的上限和单篇失败后继续。合成 fixture 服务在任务终态后正常关闭，测试条目保留在隔离库供复查。

2026-10-24 已在原有隔离 Linux/Zotero 10.0.5 实例安装当前源码插件，并通过生产 `workflow submit` 启动 MiniMax Code ACP 真实任务。后端握手返回并选中 `m:minimax:MiniMax-M3.1-Flash:v:thinking`；使用当前源码 CLI 的开发覆盖，未改发布二进制。运行记录为 `run-mvlrze5r-4mp7s9k1` / `acp-skill-mvlrze5u-ive7n5`。任务注入 profile 已确认具有 `acp-skill-run` scope 与独立 acquisition grant，凭据通过 tokenEnv 提供。提交期间等待本机审批导致 CLI 超时，批准后从 active run 读回确认同一任务已启动，未重新提交。该记录只证明生产派发与授权注入；下载、附件和恢复场景须以后续实际结果为准。

首轮样本只提供题名与会话详情链接，实际属于尚未充分索引的近期网络首发稿；Agent 停留在元数据检索，未进入 acquisition。经生产 cancel 确认该 run 已 canceled，隔离 collection 的条目数仍为 0。随后从前轮已获授权的本机 PDF 首页提取书目信息与官方稳定链接，补充到第二轮输入；未把 PDF 或正文传给 Agent。第二轮为 `run-mvlsd4dg-xsqzxss4` / `acp-skill-mvlsd4dj-8lwxv4`，提交返回成功。首轮不计为全文接口成功或失败，也不以旧文件替代本轮下载证据。

第二轮主 Agent 已自行完成公开路线探查，通过 canonical ingest 创建一个条目，写入超时后以相同 operation ID 读回原成功 receipt；随后通过注入的 acquisition grant 执行 profiles/open/observe/navigate，真实生产窗口进入 `https://login.cnki.net` 并返回 `awaiting_user`。等待时 observation 保持短调用，用户认证表单未交给 Agent。该轮最终以 `authentication_timeout` 结束获取，ledger 保留 created core、missing PDF 与空 attachment；未形成本轮下载证据。

用户随后反馈未见登录窗口。检查时任务已清理窗口，不能由先前 `focus()` 成功推断用户实际看到窗口。重新打开同一生产认证身份的独立原生窗口，经 X11 在实际桌面 `:0` 检查到 `IsViewable`、窗口位置在屏幕内且 active window ID 匹配，并通过窗口截图确认知网登录页；随后从“校外访问”选择试点机构，已到达机构身份认证页面。该窗口用于人工预先登录，独立于已结束任务；不冒充新一轮 Agent 获取或延长原任务 deadline。桌面工具缺少 AT-SPI 依赖，未安装依赖，使用已有 X11 工具完成可见性检查。

用户再次要求刷新过期登录页后，已重新打开同一认证配置，并由用户确认登录完成；本机窗口回到知网首页。此时部署经过完整构建的状态查询修复，保留原隔离扩展内的本地 sidecar，未改认证身份。重载后相同 CLI `mutation get-operation` 返回 settled/committed，证明不再重放旧 unavailable。随后通过生产 workflow submit 启动补件重试 `run-mvm4bfov-hnckmzzl` / `acp-skill-mvm4bfoz-siea2y`，复用现有条目和认证配置，要求创建本轮新页面及操作身份。用户对登录页过期的反馈单独保留，不据此声称已完成授权会话自然到期场景。

5.2 的三个运行时场景已通过。6.2 的真实 CARSI 下载及附件、跨独立任务获取、正常进程重启复用和显式退出后同进程再认证已通过，仅真实自然到期后的恢复尚待验收。保留隔离认证配置，等待站点按自身规则失效；不修改 cookie 到期时间、不以注销或清空会话代替。验证码仍由用户在本机操作。

首版 PDF 匹配依赖前两页的可提取文本及规范化题名；扫描 PDF 或文字层差异可能返回 identity_mismatch，保留已入库条目。CAJ-only 保持缺全文。本功能尚未获得完整生产试点验收。

本轮 E2E 使用当前源码构建的 CLI；普通生产构建仍遵循仓库已有的受治理二进制身份。未执行七平台 CLI 预构建、更新发布锁或发布，因此普通构建成功不能作为正式包已包含新 acquisition CLI 命令的证据。后续真实主 Agent 验收须核对其实际注入的 CLI 能力版本。
