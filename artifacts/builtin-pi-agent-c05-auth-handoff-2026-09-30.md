# C05 OpenAI Codex 认证实机排查交接

- 日期：2026-09-30；源码基点：`54da70b7`；工作分支：`dev-agent-harness`。
- 状态：**C05 已完成并归档**。OpenSpec [归档 change](../openspec/changes/archive/2026-09-30-add-pi-openai-codex-auth/)，9/9 任务完成；真实登录、官方模型发现、`gpt-6-luna` 流、过期记录刷新、本地断开和重连均通过。本轮改动均未提交。
- 上轮最后反馈：浏览器授权成功后 Zotero 仍显示 `auth_unavailable`，失败阶段未知。恢复后用户完成当前设备码授权，插件收到 poll 200、exchange 200 和请求终态 `complete`；上轮失败根因仍未定位。
- 本文件只记录脱敏现象与检查结果。没有保存设备码、账号、令牌、原始认证响应或用户浏览器内容。

## 已落地的实现

- [`piOpenAICodexAuth.ts`](../src/modules/piOpenAICodexAuth.ts) 实现设备码启动、轮询、授权码交换、刷新、取消与本地断开所需的凭据操作；凭据 revision 阻止登出/替换后迟到的刷新覆盖新状态。轮询中连续请求异常最多容忍两次，第三次返回结构化失败。
- [`piProviderExecution.ts`](../src/modules/piProviderExecution.ts) 统一 C04 API key 和 Codex 模型执行，使用原生 Pi Codex SSE；Provider 原始响应与凭据不得进入运行时终态、页面消息或日志。
- Backend Manager 的内置 Agent 页面加入连接、取消、测试与本地断开；设备码只在当前请求的暂态 UI 中显示。独立弹窗内原生 `<select>` 无法鼠标展开，Pi/MCP 选择项现使用 Preact 按钮列表。`src/utils/wait.ts` 支持从弹窗 window 取得原生 `AbortController`。
- 为排查真实认证，在默认认证传输上改用 `Zotero.HTTP.request`，保持匿名、禁缓存、禁跳转、禁请求体日志和可取消；注入式 `fetch` 保留用于测试。失败经 `PiCodexAuthFailure` 给出项目自有错误码及安全阶段 `start` / `poll` / `exchange` / `refresh`，页面仅显示这些字段。上轮改用 Zotero HTTP 后真实账号仍失败；本次成功不证明传输替换解释了上轮故障。

## 上轮实机经过与证据

| 顺序 | 观察或操作                                                                                                                                                                              | 结论与限制                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1    | 独立 Backend Manager 弹窗的认证下拉菜单无法用鼠标打开，初始只能看到 API key。改为 Preact 按钮列表后，鼠标检查和真实 Zotero UI 定向用例通过。                                            | 已修复明确的 UI 交互缺陷。                                                                                             |
| 2    | 首次点击 `Connect OpenAI Codex` 立即失败，尚未出现设备码。临时真实 Zotero UI 探针定位为插件模块 global 缺少 `AbortController`；从弹窗 window 取得构造器后，同一路径能显示设备码。       | 已修复启动前缺陷；临时探针已移除。                                                                                     |
| 3    | 用户看到设备码并在浏览器完成授权；Zotero 仍显示 `Cancel sign-in`，等待超过 30 秒。临时诊断 UI 曾显示重复 poll HTTP 403/404，最终 `auth_unavailable`。                                   | 浏览器授权成功由用户报告。不能仅凭 HTTP 403/404 断定它在授权后代表服务端仍 pending 或本地缓存。诊断 UI 已移除。        |
| 4    | 对未批准设备码的临时真实 Zotero core 探针记录到 pending 响应；Node 探针亦收到 403 JSON `deviceauth_authorization_pending`。另一真实 Zotero 探针中连续两次 poll 的 `x-request-id` 不同。 | 证明未授权时 403 可为正常 pending，且观察到的两次请求并非同一响应；不能解释已授权后的失败。临时探针已移除。            |
| 5    | 用户两次明确确认浏览器成功页属于当次提交，设备码与弹窗相同。官方 `codex-cli 0.158.0` 在隔离 `CODEX_HOME` 中经用户完成一次登录，终端显示成功。                                           | 账号与设备授权服务至少在 CLI 路径上可用；不等于 Zotero 路径成功。CLI 临时 `auth.json` 和日志已删除，未读取或打印令牌。 |
| 6    | 针对可能的偶发网络异常，轮询增加有界重试；Node 用例覆盖 403 → 请求异常 → 成功。真实 Zotero 仍报 `auth_unavailable`。                                                                    | 有界重试不是根因修复。                                                                                                 |
| 7    | 为验证插件 `fetch` 路径是否有宿主限制，默认传输改为 `Zotero.HTTP.request`；Node 定向用例和临时真实 Zotero 启动/取消探针通过。用户再次完成浏览器授权，仍报 `auth_unavailable`。          | 单纯替换传输未解决真实账号登录；不能把 CORS、缓存或 WAF 认定为根因。                                                   |
| 8    | 增加安全阶段字段并重启隔离 Zotero。最后一次用户只报告 `auth_unavailable`，明确要求停止。                                                                                                | 失败阶段、原生 HTTP 异常和成功/失败响应链仍未知；不得补写推测。                                                        |

### 上轮已确认与未确认

已确认的两个本地缺陷是弹窗选择控件和 `AbortController` owner；均有修复及对应定向验证。CLI 登录成功仅说明账号和服务端设备流能完成一次独立授权。真实 Zotero 后续失败的根因**未定位**。先前的跨源限制、响应缓存、网络挑战及 HTTP 传输差异都只是排查假设。某次未授权轮询确实返回 pending JSON；没有拿到本次已授权轮询到交换阶段的可信脱敏证据。最后错误虽为 `auth_unavailable`，不能确定发生于 poll 还是 exchange，更不能断言已写入凭据。真实 stream、刷新、断开、重连均无成功证据。

## 上轮验证范围与工作区

- 较早版本已通过：`runtime-provider-execution` Node 分片（11 文件）、`runtime-provider-registry`（6 文件）、Dashboard Node 套件（13 文件）、真实 Linux Zotero 10.0.2 core 定向 1 项和 UI 定向 2 项、TypeScript、lint、build、OpenSpec strict。详情见 [`verification.md`](../openspec/changes/archive/2026-09-30-add-pi-openai-codex-auth/verification.md)。这些完整门禁早于最后的 Zotero HTTP 传输与安全阶段改动。
- 最近定向通过：原生 Zotero HTTP 传输 Node 用例；`npm run test:node -- --shard runtime-provider-execution --grep 'reports the failed authorization phase'`；`npm run test:node -- --shard dashboard --grep 'shows only the current Codex device code'`；`npx tsc --noEmit`。临时真实 Zotero core 探针确认设备码启动与取消。最终代码的完整 lint/build/分片/strict 未重跑。
- 本轮未完成全量 Node、全量 Zotero 或其他 Zotero 版本的测试；真实账号 smoke 未通过。临时 `999-pi-codex-*-diagnostic.zotero.test.ts` 探针与 `[DEBUG-c05]` UI 标记已移除。
- 当前变更包含源码、测试、Backend Manager 样式与本地化、OpenSpec、组件文档及本交接；以 `git status --short` 核对。没有提交、切换分支、同步主规格或归档 change。
- 隔离测试使用 Zotero 10.0.2、显示 `:10`、profile/data `/tmp/zotero-agents-c05-manual.A1gD87/{profile,data}`、独立 HOME；通过已授权的 `npm run start:direct` 启动。本交接完成后停止临时 Zotero。临时 profile 保留在 `/tmp` 供后续自愿复现，不作为生产凭据来源。

## 早期恢复结果（目录接入前，2026-09-30）

- 通过已授权的 `npm run start:direct` 复用隔离 profile。只在隔离进程内暂时包裹 `Zotero.HTTP.request` 和页面结果监听，记录阶段、HTTP 状态、白名单响应类别及终态；设备码、令牌、账号、正文和原始响应头没有进入诊断输出。
- 首次启动请求返回 403；独立 Zotero/Node 启动探针随后均返回 200，未证明首次 403 的类别或原因。插件重载发生在发出用户授权提示后，导致设备码更换，打断用户流程。此操作错误已向用户说明；之后保持窗口与当前设备码不变，直到用户确认当前授权成功。
- 当前请求的脱敏链为 `start 200 -> poll 403 / deviceauth_authorization_pending -> poll 200 / authorized -> exchange 200 -> complete`。这是一次真实插件登录成功证据，不能解释或抹去上轮失败。
- 安装树路径标为 10.0.2，但实际 `application.ini` 与运行时 UA 均显示 **Zotero 10.0.3**；本轮宿主证据按 10.0.3 记录。没有修改宿主安装树或兼容性矩阵。
- 登录成功后修改模型并保存，复现了页面草稿未同步新凭据引用的问题：加密凭据仍在，配置引用被旧草稿清空。已用原有凭据重新关联隔离配置；源码修复按宿主快照更新未被用户编辑的凭据引用，同时保留其它草稿字段和显式凭据选择。现有 Dashboard 用例先以缺失引用失败，修复后通过；这是保存行为缺陷，与上轮 `auth_unavailable` 的关系未证实。
- 用户限定真实 Zotero 模型请求必须使用 `gpt-6-luna`。隔离配置已保存该模型；固定 `@oh-my-pi/pi-catalog` 的 `openai-codex` 目录没有此 ID，现有 overlay 不接受 Codex dialect。本轮没有发出真实模型请求，也没有用其它模型代替。真实流、过期刷新、断开和重连仍未完成，change 不得归档。
- 本轮 Provider execution（11 文件）、Provider registry（6 文件）、Dashboard（13 文件）、真实 Zotero UI（2 项）与 Codex core fixture（1 项）、生产构建及其 TypeScript 检查、受影响文件的 Prettier/ESLint、OpenSpec strict 均通过。全仓 lint 在表单修复前通过，修复后对受影响文件作定向检查。临时 HTTP 包裹和页面结果监听已移除；已登录窗口保留，不再重载或发起登录。详见最新 verification。

## 官方模型发现与收尾

### 官方模型发现核对（2026-09-30）

用户指出 Codex 模型目录应走官方发现接口。在保留的已授权 Zotero 10.0.3 中执行只读查询，`GET https://chatgpt.com/backend-api/codex/models?client_version=0.158.0` 返回 200、9 个描述符，包含 `gpt-6-luna`：可见性 `list`、默认上下文 272000、text/image 输入和 low/medium/high/xhigh/max 推理。返回的该描述符没有 `max_output_tokens`。没有模型调用、凭据写入、重启或重新鉴权；查询只输出白名单元数据，临时窗口字段已清除。

用户以“继续”批准官方发现方案，现已接入 `refreshPiCodexModelCatalog` 和 Backend Manager 登录后/显式刷新动作。目录与选择按凭据隔离；配置加载保持离线，发现失败保留先前目录，登出和 revision 变化拒绝迟到结果。缺失 Codex 输出上限保留未知，由已知上下文窗口约束输出预留，工具能力不推断。相应目录、配置与 preparation 用例均先失败后通过。

### 官方目录和完整 smoke 结果

- 当前生产包在先前授权完成后才重载，复用已保存凭据。页面刷新官方模型后，`gpt-6-luna` 配置的推理设为发现支持的 `low`，状态成为 `Configured`。
- 真实 UI 连接测试发送一次 `gpt-6-luna` 请求：HTTP 200、1 个文本增量共 2 字符、`response.completed`，页面关联结果成功。临时观察器只记录计数和状态，不保存文本或令牌。
- 隔离凭据本地 expiry 设为零，生产 resolver 经真实刷新端点取得并提交新令牌：revision 改变、refresh 轮换、expiry 在未来、账号不变、返回 access 与提交记录一致。不声称服务器令牌自然过期。JSON 刷新和缺失 expiry/refresh 字段的规则已由定向用例覆盖。
- 页面本地断开后显示需要凭据；再次测试在本地失败，真实模型请求计数仍为 1。
- 第一次重连启动 200，轮询 pending；用户随后点击 Reconnect，报告 `auth_unavailable:start`。之后多次启动返回 403。最小原生探针确认 403 为 JSON、无 HTML challenge；Node 同端点请求 200，稍后的同一原生请求也恢复 200。暂不能确定拒绝原因。重连按钮在授权中可再次点击、主动取消现有码的缺陷已复现并补充防重入修复；这不能解释服务端 403。
- 独立审阅后修复了断开目录 revision、响应流式限额和 token/envelope 一致性；目录边界和授权防重入用例均先失败后通过。
- 最终完整执行分片 11 文件、目录分片 6 文件、Dashboard 13 文件、真实 core 1 项/UI 2 项、生产 build 和 TypeScript 均通过。全仓 lint 在独立审阅修复前通过；修复后的全部受影响文件通过定向 Prettier/ESLint。四份主规格已同步并通过 strict。真实重连已完成，四份主规格同步后归档，9/9 任务全部完成。
- 用户完成重试授权后，观察到 `poll 200 -> exchange 200 -> complete`，自动官方目录准入使状态成为 `Configured`。随后修复同 revision 宿主快照清空页面模型候选的问题，现有 Dashboard 用例锁定候选保留、凭据切换清空和旧结果拒绝；完整 Dashboard、真实 UI、最终生产 build 与 TypeScript、定向 lint 均通过。
- 鉴权完成后才加载最终生产包，保留重连凭据；实机连续官方刷新显示 7 个可见候选，所选模型仍为 `gpt-6-luna`。所有临时观察器及 helper 字段已移除。没有再发起设备授权或真实模型请求。

完整证据见 [归档 verification](../openspec/changes/archive/2026-09-30-add-pi-openai-codex-auth/verification.md)。C05 到此完成；后续工作为 C16 Conversation 接线。若再次出现认证失败，按阶段、状态与白名单类别取证，不能把曾经的 JSON 403 归因于未经证明的网络或浏览器原因。

相关规格和任务：[C05 change](../openspec/changes/archive/2026-09-30-add-pi-openai-codex-auth/)、[Pi Runtime 总交接](builtin-pi-agent-runtime-handoff.md)、[执行计划 #26](https://github.com/leike0813/zotero-agents/issues/26)。
