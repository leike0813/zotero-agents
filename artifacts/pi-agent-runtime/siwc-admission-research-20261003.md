# 官方 Sign in with ChatGPT 接入调研（开源本地应用 preview）

调研日期：2026-10-03。研究票 [官方 Sign in with ChatGPT 接入调研](https://github.com/leike0813/zotero-agents/issues/60)。本轮只读：未登录真实账户、未安装依赖、未启动服务、未修改生产代码与 Git 状态，仅修订本报告。

一手依据：官方 `developers.openai.com` SIWC 文档、官方 cookbook 文章、官方 [Sign in with ChatGPT 条款](https://openai.com/policies/sign-in-with-chatgpt-terms/)（页面标注 2026-09-29，由父代理经浏览工具读取；本机 `curl` 被边缘拦截 403，但该页正文已取得，不构成证据缺口）、`auth.openai.com` 的公开 OIDC/JWKS 元数据（本轮 `curl` 观察），以及固定 Pi `1.0.0` 源码副本 `/tmp/pi-alignment-20261003.tWJwnS/pi-1.0.0`（`packages/ai/package.json` 版本为 `1.0.0`；该副本不是 git 仓库，本轮未能用 `git rev-parse` 自行核对 `a13d35a7…`，commit 与上游 tag 的对应关系沿用父代理给定的固定基线）。

## 结论

官方 Sign in with ChatGPT（SIWC）当前处于 preview。**ChatGPT 计划用量（ChatGPT plan usage）面向开源项目与本地运行的个人项目开放**：不需要 client secret、不需要 partner API key，官方文档也**未列出任何额外的逐应用申请或审批要求**（interest form 只针对付费或远程托管形态，以及商业伙伴的 identity-only 通道）；首次登录用 `client_id=dynamic_agent_client` 走动态注册，回调签发 `client_id`（形如 `oaiapp_…`）后由应用保存并在后续再授权时复用。这不等于「只有一个动作要做」——PKCE、state/nonce、JWKS 验签、账户身份、granted scopes 与条款约束都是强制合同（见 §3、§4、§1.1）。真实账户下的实际准入结果本轮未验证。

对 Zotero Agents 而言，准入的核心不是“能不能拿到 token”，而是**宿主能力与条款符合性**：官方唯一被文档化的回调方式是 `127.0.0.1` HTTP loopback（scheme/host/path 固定、仅端口可变、禁止 `localhost`），ID token 必须按 OpenAI JWKS 验签并校验 iss/aud/exp/nonce，模型发现必须用 `GET https://api.openai.com/v1/models` 按账户取，推理必须打公开 `POST https://api.openai.com/v1/responses` 且 `store:false` + `stream:true`、以 `response.completed` 为唯一成功证据。Pi `1.0.0` 的实现**只满足其中一部分**（不做 ID token 验签、不保存/复用 issued client ID、无撤销、用静态模型目录而非账户发现），其执行器直接依赖 `node:crypto` / `node:http`。因此 Pi 源码可以作为参数构造与端点选择的**参考**，但**不能代官方合同、也不能把它的 Node 执行器直接搬进插件**。

置信度：官方文档、条款与端点观察为**高**；项目侧能力盘点为**高**（源码可查），宿主运行时可行性为**中**（未实测）；“动态注册在真实账户上是否对任意开源应用放行”**未验证**。

## 调研发现

### 1. 官方当前允许谁接入（资格与审批）

| 通道 | 可用对象 | 是否需要审批 | 证据 |
| --- | --- | --- | --- |
| ChatGPT 计划用量（开源） | open-source projects、personal projects that run locally、selected private apps | 官方文档**未列出任何额外申请或审批步骤**；靠 `dynamic_agent_client` 动态注册（真实账户下的实际放行未验证） | [cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)（2026-09-28，OpenAI）、[overview](https://developers.openai.com/siwc/token-sharing-open-source) |
| Identity-only（网站 / ChatGPT 插件） | “a select group of commercial partners”，limited trial | 需要 interest form / waitlist | [quickstart](https://developers.openai.com/siwc/quickstart)、[Request a client ID](https://developers.openai.com/siwc/request-client-id) |
| 付费或远程托管应用 | 需提交 interest form | 需要 | cookbook 结尾 “Usage policy and terms”、overview 首段 |

对 Zotero Agents 的直接含义：项目是公开仓库的 Zotero 插件，SIWC 的授权与推理请求从用户本机的 Zotero 进程发出，符合文档所述的“开源 + 本地运行”形态，**官方文档未对该形态列出额外申请要求**。项目内的 MCP、WebDAV、sidecar 等其它能力与 SIWC 路径无因果关系，不构成把 SIWC 资格变成未知的理由；这些能力是否被用于**承载 SIWC token 或 SIWC 推理请求**，才是条款相关的问题，属于后续设计边界（见 §1.1 与 §冲突与不确定性第 4 条）。

### 1.1 官方条款对 SIWC 路径的约束（Terms，页面标注 2026-09-29）

以下均限定在 SIWC 这条路径本身，逐条对应到工程约束：

| 条款要点 | 对工程的含义 |
| --- | --- |
| 必须以应用自己的名称集成 | `agent_name_hint` 与 UI 文案要反映真实产品名，不能冒用其他应用身份 |
| token 只能通过受支持的 sign-in flow 并经用户授权获得 | 不接受任何非授权路径取得凭据；`dynamic_agent_client` + 用户在浏览器批准是唯一入口 |
| 持久 token 存储必须**同时**满足「在本地」与「在用户控制之下」，不得位于远程或托管环境 | 这是两个并列条件，不是二选一：把凭据搬到**用户自己控制的远程机器**并不因此合规。SIWC 凭据只能留在本机、由用户控制的位置；与项目既有本地加密凭据存储方向一致（见 §4） |
| 请求须来自本地运行时，或仅由该用户控制的远程运行时 | 推理请求的发出位置必须是用户自己的机器或用户独占控制的运行时；不能把 SIWC 推理转发到项目方或第三方管理的服务 |
| 仅用于已认证用户的活动，或用户明确授权的自动化/后台运行；后台使用须先取得明确同意 | Skill Run、Workflow 后台任务、定时/automation 路径在启用 SIWC 前必须先取得**明确同意**。条款只要求 express consent，**未规定必须提供开关**；是否额外加一个可展示的启停开关属于本项目可自行决定的设计选项，不是官方要求 |
| 仅供已连接的应用自身使用；不提供把访问权转供其它工具或无关请求的通用 API | SIWC 凭据不得作为可分发的通用推理后端；也不得为插件内与该连接无关的请求复用同一 token |
| 不得就 SIWC 用量向用户收费或要求付费升级 | UI 与文案不得把 SIWC 用量包装成付费档位或诱导升级 |
| 不得轮换账号、拆分用量以规避限额，也不得汇集或共享 token | 禁止以轮换账号或拆分用量的方式绕过限额；禁止多用户共用一份凭据。**但条款明示这些限制不影响 separately authorized API use**——用户在知情前提下显式改用自己的 API key 属于独立授权的 API 使用，不在禁止之列；被禁的是把这种切换当作规避 SIWC 限额的暗手 |

与官方 [Self-hosted VMs](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms) 一页的**真实冲突**：VM 页描述把持久凭据文件转移到远程 VM 的自助做法（并说明转出 session 的 host 级用量归属与撤销尚不可用），而条款要求 Authentication Token 的持久存储**必须在本地且在用户控制之下、不得位于远程或托管环境**。请注意两条条款的位置不同：**存储**要求是「本地 AND 用户控制」；**请求来源**才允许「本地，或仅由该用户控制的远程运行时」。因此“把 token 存在用户自控的远程 VM 上”满足不了存储条款，而“请求由用户自控的远程运行时发出”在请求来源条款下本身是允许的——两条要求叠加后的可行动作空间，官方文档没有给出答案。这属于真实冲突，需要在设计阶段明确边界与取舍；本报告不据此引入任何未经授权的远程 SIWC 形态，也不为该形态预设方案。

### 2. 应用身份与安装身份合同

- **client（注册）**：动态注册流程中，每个签发的 `client_id` 绑定“已认证用户 + 授权时选中的 workspace”，它标识该注册的安全边界与 ChatGPT 计划用量设置。同一用户同一 workspace 的**多个 host 可以共用一个 issued client_id**。（[overview](https://developers.openai.com/siwc/token-sharing-open-source)）
- **agent host（安装）**：`ext_agent_host_id` 是“工具实例运行所在环境”的稳定不透明标识，**每个 host 必须各不相同**，且必须在首次登录前生成并持久化；重启或重新登录本身不构成新 host。host ID 不是凭据，OpenAI 不校验私钥持有。（同上）
- 官方推荐 host ID 用 RFC 9278 的 JWK thumbprint URI（`urn:ietf:params:oauth:jwk-thumbprint:…`），也支持 `urn:uuid:…`（UUIDv4）与 `did:key:<key>`；cookbook 示例用的是 `urn:uuid:…`。（同上 + [cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)）
- `agent_name_hint` 必须是**应用真实名称**、跨安装保持一致，**只在首次动态注册时发送**，用户可在批准前改名；它是展示元数据，不是身份。（[sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)）

### 3. 授权请求与回调合同（精确参数）

授权端点 `https://auth.openai.com/api/accounts/authorize`，参数与约束（均来自 sign-in 页表格）：

| 参数 | 官方要求 |
| --- | --- |
| `client_id` | 首次 `dynamic_agent_client`；再授权用**已签发并保存的 client ID** |
| `agent_name_hint` | 仅首次动态注册发送 |
| `ext_agent_host_id` | 必填，每 host 唯一稳定 |
| `id_token_hint` | 再授权时使用上次成功登录保留的 ID token；可已过期，仅用于识别账户；登出后省略 |
| `login_hint` | 可选邮箱；与 `id_token_hint` 必须同属一个已选账户 |
| `response_type` | `code` |
| `redirect_uri` | **必须**是 `127.0.0.1` 的 HTTP loopback，例如 `http://127.0.0.1:1455/auth/callback`；**只有端口可变**，scheme/host/path 必须不变（`/callback` 不等于 `/auth/callback`）；同一次尝试内授权请求与 code 交换必须用完全相同的 URI；**不得替换成 `localhost`** |
| `scope` | `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct` |
| `resource` | `https://api.openai.com/v1` |
| `state` / `nonce` / PKCE | 每次尝试全新随机；`code_challenge_method=S256`，challenge 为 SHA-256 摘要的 base64url（无 padding） |

回调与换码：

- 回调可能返回 `code`、`state`、`scope`，**新注册还会返回 `client_id`**；再授权时可能不带 `client_id`，此时必须沿用挂起请求已选定的 client ID，**若回调给出不同的 client ID 必须拒绝，不得替换该账户的注册**。
- `error=access_denied` 时校验 state 后终止，不换码。
- 新注册回调若**没有** issued client ID，视为注册未完成。**不能把 `dynamic_agent_client` 当作签发 ID 保存。**
- 换码：`POST https://auth.openai.com/api/accounts/oauth/token`，form：`grant_type=authorization_code` + issued `client_id` + `code` + `code_verifier` + 相同 `redirect_uri` + 相同 `resource`。**无需 client secret。** `invalid_grant` 时丢弃该 code，用已保留的 issued client ID 重新发起授权。

**未被文档化的回调方式**：官方只写 loopback HTTP。Pi 的“监听失败时让用户粘贴完整回调 URL”是 CLI 变通（见 §5），**不能当作 Zotero 的天然可用路径**。

### 4. ID token 验证、凭据保存、账户与撤销

- **必须**验证 ID token：对 OpenAI 发布的 **JWKS 验签**，并检查 issuer、audience（对 issued client ID）、expiration、本次尝试保存的 nonce；用验证后的 `sub` 作为账户身份。email 与 sub **都不是 workspace 标识**。该 OSS 流程是 public client，无 secret。（sign-in 页）
- 返回账户时，必须确认新 ID token 的已验证身份与所选账户一致，再替换凭据。
- **只有合法 ID token 不等于有权使用计划**：必须检查 token 响应的 granted scopes 是否含 `chatgpt.tokens.use.direct`；缺失时应保留登录但标记“计划用量未启用”，并给用户另一条付费路径（例如自带 API key）。（errors 页）这条由官方文档直接给出，且 Terms 明示这类 **separately authorized API use 不受其限制约束**——即“显式改用 API key”是官方认可的用户选择，不是被 Terms 禁止的行为。
- 凭据记录按 **issued client ID 与已验证身份**分条保存：email、issuer、subject、client_id、ext_agent_host_id、id_token、access_token、refresh_token、token_type、expires_in、scopes、saved_at；文件原子写入、Unix 下 `0600`，不提交不入日志；刷新成功后**整体替换** access token、expiry、scopes 与轮换后的 refresh token。Terms 对存储的额外要求是**「在本地」AND「在用户控制之下」**（不得位于远程或托管环境），与「请求来源可来自用户自控远程运行时」是两条不同的要求，不要混用。
- **撤销/登出**：从 `https://auth.openai.com/.well-known/openid-configuration` 取 `revocation_endpoint`，form POST `token=<refresh_token>`、`token_type_hint=refresh_token`、issued `client_id`；**空 HTTP 200 即成功**（含 token 已失效的情况）。网络失败或 5xx 退避重试；未确认撤销也要清本地 token 并告知用户远程撤销未确认。**撤销 session 不删除已注册 client。**
- **断开不会通知**：OpenAI 目前不会在用户于 ChatGPT 设置中断开应用时通知应用；由请求或刷新报错确认后，停止使用该 token 组并要求重新登录；**不得仅因临时网络/基础设施故障就抹掉凭据**。（errors 页）
- **刷新**：`grant_type=refresh_token` + **保存的 issued client_id（不是 `dynamic_agent_client`）** + refresh_token + resource，**省略 scope** 以保留原授权；**同一 session 的刷新必须串行化**，避免轮换 token 竞态。（accounts 页）
- **生命周期**（[token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)）：access token 1 小时（`expires_in:3600`）；refresh token 30 天，每次刷新返回**替换的** refresh token 与新的 30 天，替换次数无固定上限。token 响应含 `earliest_refresh_at`。
- 凭据安全：access/refresh/保留的 ID token 不得进入浏览器存储、源码库、日志、分析与支持记录；**不得放进 URL**；ID token 只作为 `id_token_hint` 发往 OpenAI 授权端点，含该 hint 的授权 URL 需在日志与诊断中脱敏；host ID 不是 token。

### 5. Pi v1.0.0 源码与官方合同的差距（源码观察）

Pi 的登录实现是**有用的源码参考**——它给出了端点、参数名、scope 集合、错误分类与 usage-limit 处理的具体形态，这些与官方文档一致，可以直接对照。但它**不是官方合同的替代表述**：下表中的差距必须以官方文档为准去补齐，它的 `node:crypto` / `node:http` 执行器也只是 Node/CLI 形态的实现样本，不能直接搬进插件。

固定副本 `packages/ai/src/auth/oauth/openai-chatgpt.ts`（310 行）：

| 合同项 | Pi 1.0.0 行为 | 差距性质 |
| --- | --- | --- |
| 宿主依赖 | 顶部直接 `import { randomBytes } from "node:crypto"`、`import { createServer } from "node:http"` | 逻辑可参考，**执行器不可入插件**（插件运行时无 Node） |
| 回调 | 自建 `node:http` server，硬编码 `127.0.0.1:1455/auth/callback`；listener 失败时降级为**让用户粘贴完整回调 URL** | 粘贴路径非官方合同；固定端口有占用风险 |
| 复用 issued client ID | 每次登录都发 `client_id=dynamic_agent_client`；不保存也不复用已签发 ID | 与“保存并复用”不符 |
| `id_token_hint` / `login_hint` | 完全不发送 | 无法走 returning sign-in 路径 |
| ID token 验证 | 只检查 `id_token` 是否为非空字符串（源码注释明说“Pi does not use the ID token to identify the user”）；**不验签、不校验 iss/aud/exp/nonce** | **与官方强制要求不符** |
| 保留 id_token | 不保存 | 断不了 `id_token_hint` 链路 |
| scope 检查 | 缺 `chatgpt.tokens.use.direct` 直接抛错（比官方更严格，等于强制要计划用量） | 行为差异，需产品决定 |
| 撤销 | 全仓库无 revocation 调用；登出仅本地删除 | 与官方登出合同不符 |
| 并发/清理 | `finally` 里 `server.close()` + `closeAllConnections()`，注释说明浏览器预建连接会导致“旧 server 吃掉新登录的 callback → state mismatch” | 官方未描述；本地并发问题已被上游自证 |

`packages/ai/src/api/openai-responses.ts`：

- 判定 ChatGPT 登录的 `isChatGPTSignIn()` 是**启发式**：`provider === "openai" && baseUrl === "https://api.openai.com/v1" && apiKey 不以 `sk-` 开头`。
- `buildParams` 固定 `stream: true`、`store: false`；对 ChatGPT 登录省略 `prompt_cache_retention`、`prompt_cache_options`、`max_output_tokens`、`temperature`（与官方 unsupported 列表一致的部分）。**仍会发送** `service_tier`、`reasoning`、`include`、`prompt_cache_key`、`tool_choice`——这些不在官方 unsupported 清单里，但**未经真实账户验证**。
- `openai-responses-shared.ts` 中 `instructionRole` 仅当 `model.reasoning` 为真时用 `role: "developer"`，否则用 `role: "system"`；官方 preview 明确 **“explicit `{type: "message", role: "system"}` items are rejected”**。对非 reasoning 的可见模型，这是一条**潜在不兼容**（未实测）。
- `openai-responses-shared.ts` 同时处理 `response.completed` 与 `response.incomplete`；其中 `incomplete.max_output_tokens` 会映射为 `stopReason: "length"`，执行器随后可发出 `done`。因此 SDK 的 `done` 不足以证明官方要求的 `response.completed`，项目必须依据实际 Responses 终态判断成功；其它 incomplete、failed 和无终态断流分别处理。
- `utils/retry.ts` 对 `subscription_sharing_usage_limit_exceeded` 不重试并链接 `https://chatgpt.com/settings/usage`，对 `subscription_sharing_usage_unavailable` / `subscription_sharing_user_unavailable` 做重试；`openai-responses.ts` 在 usage limit 错误消息中附带 ChatGPT usage 链接。

`packages/ai/src/providers/openai.ts`：`baseUrl: "https://api.openai.com/v1"`，同时保留 `envApiKeyAuth("OPENAI_API_KEY")` 与 `lazyOAuth(Sign in with ChatGPT)` 两条凭据路径——**API key 与 SIWC 在 Pi 中是同一 provider 的两条 auth 分支**，凭据靠 `sk-` 前缀区分。

**模型发现是明确的合同偏差**：官方要求用 `GET https://api.openai.com/v1/models` 并按 `visibility == "list"` 过滤、保持服务端顺序、切换账户时刷新；Pi 的 `openai` provider 使用**静态生成的 `providers/data/openai.json` 目录**（`openai.models.ts` 头部注明 auto-generated），全仓库无 `api.openai.com/v1/models` 调用。后果是：账户可见但静态目录没有的模型无法选；静态目录有但账户无权的模型会在请求时报错。

### 6. 推理合同与 preview 限制

模型发现（[models-and-inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)）：

```
GET https://api.openai.com/v1/models
Authorization: Bearer <ACCESS_TOKEN>
→ 过滤 .models[] 中 visibility == "list"，UI 显示 display_name，请求时传 slug
```

文档同时提醒：若用 Codex app-server，其 `model/list` RPC 可能使用 bundled/cached 目录，**UI 需要当前账户专属选项时应改用上面的请求**。

推理：`POST https://api.openai.com/v1/responses`，`Authorization: Bearer <access_token>`，**只能用公开 Responses 端点，不得指向 ChatGPT 的 `backend-api` 端点**；每次请求 `store:false`、`stream:true`；**只有收到 `response.completed` 才算成功**；`response.incomplete`、显式错误与中断流必须分别处理；开流后仍可能收到 `response.failed`，其 `error.code` 可能是 `subscription_sharing_usage_limit_exceeded`（429）或 `subscription_sharing_usage_unavailable`（503）。

preview 限制（[preview-limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)，适用于直接 HTTP 与 Codex app-server 两条路径）：

- 必设：`store:false`、`stream:true`；每次请求自带所需上下文。
- 必须省略的字段：`background`、`conversation`、`max_output_tokens`、`max_tool_calls`、`metadata`、`moderation`、`multi_agent`、`prompt`、`prompt_cache_retention`、`safety_identifier`、`temperature`、`top_logprobs`、`top_p`、`truncation`、`user`。
- 会话状态：HTTP 下不用 `previous_response_id`，历史必须放进 `input`；WebSocket 续接只能引用同一认证连接内的 response，不提供持久会话存储。
- System 指令：用 `instructions` 或 developer 消息，**显式 system message item 被拒**。
- 工具：function/custom 工具可放在 namespace 里或通过 `additional_tools` 输入项提供；web search 仍受模型与账户/workspace 策略约束。
- 不支持的工具：图像生成、file search、Code Interpreter、native computer use、hosted MCP/connectors、Responses `tool_search`（**客户端自行执行也不会让 `tool_search` 变为受支持**）；`programmatic_tool_calling` 不能出现在本路由的顶层 `tools`。
- 输入：文本、图像、文件（模型接受时）；不支持音频/视频输入、Files upload API、transcription API。

### 7. 账户权限、速率与成本：官方能说明什么、不能说明什么

官方**明确说明**的：

- ChatGPT **Plus** 用户的**五小时用量限额在所有使用其计划的应用之间共享**（含私有与开源客户端），一个应用的消耗计入同一总额，没有任何应用拿到独立配额；**五小时限额不适用于 Pro 用户**。
- 还可能存在**应用级限额**（用户可在 ChatGPT 设置 → Usage 中为每个应用调整）。
- `subscription_sharing_usage_limit_exceeded` 只表示“暂停使用计划并引导到设置页”，**不能据此推断整个计划已耗尽或推算重置时间**。
- `subscription_sharing_user_not_eligible` 表示该用户/workspace/策略不可用；`subscription_sharing_unsupported_capability` 需按 `error.param` 去掉不支持的输入/工具/模型/service-tier 覆盖，且**不得原样重试**。
- `force_reconsent=true` **只有在 OpenAI 确认已为你的集成部署之后**才可用；在此之前仍用既有 `prompt=consent` 机制。**这意味着“用户此前拒绝过计划用量、现在想再开启”这条路径存在官方尚未开放的一般化手段**，属于真实缺口。

官方文档**没有**给出、因而本轮无法判断的：具体速率数值、workspace/账户间模型可见性差异、Pro 用户与 Plus 用户的实际用量差异、单位成本或计费换算、app 级 limit 的语义边界。Access token 只暴露 `sub / aud / client_id / scope / iss / iat / exp / jti / nbf` 与一个不透明的 `https://api.openai.com/auth` 对象（内含 `per_user_salt`、`encrypted_auth_metadata`），官方明确说**不需要解释它**。

### 8. 本轮对官方端点的只读观察

`GET https://auth.openai.com/.well-known/openid-configuration` → HTTP 200，字段与文档一致：

```
issuer                    = https://auth.openai.com
authorization_endpoint    = https://auth.openai.com/api/accounts/authorize
token_endpoint            = https://auth.openai.com/api/accounts/oauth/token
revocation_endpoint       = https://auth.openai.com/api/accounts/oauth/revoke
jwks_uri                  = https://auth.openai.com/.well-known/jwks.json
id_token_signing_alg_values_supported = [RS256]
response_types_supported  = [code]
grant_types_supported     = [authorization_code, refresh_token]
code_challenge_methods_supported = [S256]
scopes_supported          = [openid, profile, email, offline_access]
```

两点需要单独标注：

1. 文档要求的 `revocation_endpoint` 确实是 `.../api/accounts/oauth/revoke`（文档只说“从 discovery 取”，未给字面量）——本轮观察补齐了这个字面量。
2. **discovery 的 `scopes_supported` 只列了四个 identity scope，不含文档要求的 `resource.invoke` 与 `chatgpt.tokens.use.direct`。** 这是当次观察，**不能推断这两个 scope 会被拒绝**（文档与 cookbook 都明确要求它们，且 Pi 与官方示例都依赖它们）；但它意味着**不能把 discovery 元数据当作 scope 白名单**来做前置校验。

`GET https://auth.openai.com/.well-known/jwks.json` → HTTP 200，当次返回 4 把公钥，均为 `kty=RSA, alg=RS256, use=sig`，各自带 `kid`。**单 kid 命中 + 未知 kid 时的重新拉取策略、缓存有效期与轮换行为，官方文档未说明**，需自行设计并实测。

**官方条款已取得**：条款页（页面标注 2026-09-29）正文由父代理经浏览工具读取，本机 `curl` 被边缘拦截只是取用方式差异，不影响证据成立。其对 SIWC 路径的约束已在 §1.1 逐条转写为工程约束。本轮未逐句复制条款原文；条款若有更新，以官方页面当前文本为准。

### 9. 与 API key、既有 Codex backend flow 的关系（本项目源码事实）

本项目 `src/modules/piOpenAICodexAuth.ts` 的现状：

- 使用 **device flow**（`/deviceauth` 系列），`redirect_uri` 是 `${AUTH}/deviceauth/callback`，**不是**官方文档的 `/api/accounts/authorize` + loopback。
- `client_id` 是**硬编码常量** `app_EMoamEEZ73f0CkXaXp7hrann`（`piOpenAICodexAuth.ts:13`）。
- token endpoint 是 `${AUTH}/oauth/token`（`piOpenAICodexAuth.ts:275`），**不是**官方文档的 `/api/accounts/oauth/token`。
- 模型目录是 `https://chatgpt.com/backend-api/codex/models?client_version=0.158.0`（`piModelCatalog.ts:368`），**不是**官方要求的 `GET https://api.openai.com/v1/models`，且官方明确要求**不得**把推理指向 `backend-api` 端点。
- 账户标识取自 access token 的 `https://api.openai.com/auth` claim（`ACCOUNT_CLAIM`）。

因此三者必须当作**不同合同**看待：

| 路径 | 凭据来源 | 端点 | 官方文档地位 |
| --- | --- | --- | --- |
| API key | 用户自备 `sk-…` | 公开 `api.openai.com/v1` | 常规公开 API，本轮未改动其地位 |
| 官方 SIWC（开源） | `dynamic_agent_client` 动态注册 + issued client ID + ChatGPT access token | 公开 `api.openai.com/v1` + `auth.openai.com/api/accounts/*` | **有正式文档，当前 preview** |
| 既有 Codex backend flow | 硬编码 client ID 的 device flow | `chatgpt.com/backend-api/codex/*` | **不在本轮所查官方 SIWC 文档范围内** |

必须区分「已证伪」与「未被证明」：两条路径的 token 端点、scope 集合与 client 身份都不同，因此**不能从这份合同差异推断旧 Codex 凭据可以被直接复用或静默迁移到 SIWC**；反过来，官方也没有任何材料证明这种转换在技术上绝对不可能——本轮没有做过、也不应在无授权与无实证的情况下尝试。因此正确的表述是「不可假定可迁移，须由用户显式决定并走各自的官方流程」，而不是「技术上不可转换」。(b) 官方**没有**对旧 Codex backend flow 作出「已被等价授权」或「已停用」的任何表述——本轮未找到此类官方声明。是否淘汰或并存由用户决定，本报告不代为决策。

### 10. Zotero 宿主能力与证据缺口

项目内可查到的相关事实：

| 所需能力 | 项目现状（源码事实） | 缺口 |
| --- | --- | --- |
| 随机数 / SHA-256 | `src/platform/hash.ts` 用 `runtime.crypto.subtle.digest("SHA-256", …)`；多处使用 `getRandomValues` | 无。PKCE 的 verifier/challenge 可由现有 WebCrypto 路径覆盖（**未在 Zotero 实机验证**） |
| ID token 验签（RS256 JWS） | 全项目**没有任何** `crypto.subtle.verify` 用例；`package.json` 无 `jose`/`jsonwebtoken`/`jws` 等 JOSE 依赖 | **需新增能力**：JWK 导入、`RSASSA-PKCS1-v1_5` 验签、JWKS 拉取/缓存/kid 轮换、iss/aud/exp/nonce 校验。WebCrypto 规范上支持，但项目零先例，且 Zotero 运行时 `crypto` 完整性需实机确认 |
| 127.0.0.1 loopback 监听 | 插件沙箱无 `node:http`/`node:net`，但 **Host Bridge 已有基于 Mozilla `nsIServerSocket` 的服务端 socket**，`createServerSocket()` 用 `socket.init(port, bindMode === "loopback", …)` 支持 loopback 绑定（[hostBridgeServer.ts:438](../../src/modules/hostBridge/server/hostBridgeServer.ts)） | **不是从零开始**：项目内已有可绑 loopback 的服务端能力。OAuth 回调能否复用它（独立端口、与 Host Bridge 生命周期/鉴权的隔离、端口占用时按官方规则换端口但 scheme/host/path 不变）**本轮未核实，留给设计阶段判定**；本报告不虚构「需新建 HTTP 监听器」这一结论 |
| 打开系统浏览器 | 本轮 `rg` 未在 `src/utils/` 与 `piOpenAICodexAuth.ts` 中定位到现成的 `launchURL`/`openURL` 封装 | 需核对 Zotero 侧可用 API（`Zotero.launchURL` / `Zotero.Utilities.Internal.openURL` 等）并实机验证；官方要求用**系统浏览器**，不是插件内嵌窗口 |
| 凭据原子写 + 0600 | 有 `src/modules/runtimePersistence.ts` 写入路径 | 需实机核对原子替换与 Unix `0600` 语义（Windows 上语义不同） |
| SSE 流式推理 | `src/modules/piProviderExecution.ts` 注入 fetch 包装，Codex 路径已用 `transport: "sse"` | 可参考，但 `/v1/responses` 事件形态与 Codex SSE 不同，**需真实账户确认** |
| 模型发现 | 现为 OMP 静态目录 `18.0.11` + Codex `backend-api` 发现 | 若走 SIWC，需新增 `GET /v1/models` 的按账户发现路径 |

三处**不能靠文档或源码推断、需要在真实宿主上取得证据**的事项：loopback 回调的实际可达性与端口占用行为；系统浏览器完成授权后回调能命中监听器且 `state` 校验、并发/占用行为正确（Pi 源码注释已自证浏览器预建连接会串号）；Zotero 运行时 WebCrypto 能否完成 RS256 JWS 验签与 JWKS 轮换。

**证据范围按项目既有矩阵确定，不在本报告新增门禁**：`tests/zotero/compatibility-matrix.json` 中 Linux（Zotero 7/9/10 x64）与 Windows（Zotero 7/9/10 x64）为 `blocking: true`，macOS（Zotero 10 x64 / arm64）为 `blocking: false`。因此上述证据的**必需范围是六个 blocking 单元格**，macOS 两个 nonblocking 单元格按矩阵既有政策处理（可作补充证据，不作为放行前提）。具体到哪一格需要哪类 receipt，仍由设计阶段按矩阵既有机制绑定。

## 适用条件

- 官方文档状态：SIWC 处于 **preview**；`developers.openai.com` 页面与 `auth.openai.com` 元数据于 **2026-10-03** 取得（cookbook 发布日 2026-09-28）。preview 限制随时可能变化，正式发布前需重新核对。
- 适用对象：开源项目、本地运行的个人项目、被选中的私有应用；付费/远程托管需 interest form。identity-only 商业伙伴通道是另一条受限路径。
- 账户资格：可用的 **ChatGPT Plus 与 Pro** 用户；Plus 的五小时限额跨所有应用共享。
- 端点：`https://auth.openai.com/api/accounts/authorize`、`https://auth.openai.com/api/accounts/oauth/token`、`https://auth.openai.com/api/accounts/oauth/revoke`、`https://auth.openai.com/.well-known/jwks.json`、`https://api.openai.com/v1/models`、`https://api.openai.com/v1/responses`。
- Pi 侧：`@earendil-works/pi-ai@1.0.0` 固定源码副本；`pi-1.0.0` 上游 tag 为 `a13d35a7…`（本轮未独立核对）。
- 本项目：dev-agent-harness 工作树；`core/ai 0.84.4`、OMP 静态目录 `18.0.11`；Codex 认证实现见 `src/modules/piOpenAICodexAuth.ts`，模型发现见 `src/modules/piModelCatalog.ts`。

## 冲突与不确定性

1. **Pi 实现与官方合同存在多处不一致**（不做 ID token 验签、不复用 issued client ID、无撤销、静态模型目录、`role:"system"` 风险）。Pi 源码可作端点与错误分类的参考，但不能代官方合同；本报告以官方文档与条款为准。
2. **OIDC discovery 的 `scopes_supported` 与文档要求的 scope 集合不一致**。已记录为观察，结论未定：需要真实授权请求才能确认（超出本轮“不登录”边界）。
3. **Terms 与 Self-hosted VM 页存在需要设计消解的真实冲突**：条款要求 Authentication Token 的持久存储**在本地且在用户控制之下**（不得位于远程或托管环境），VM 页却描述把凭据文件转移到远程 VM。两者叠加后的可行动作空间官方没有给出答案。请求来源条款本身允许「本地，或仅由该用户控制的远程运行时」，但这不能用来豁免存储条款。本报告不据此预设任何远程 SIWC 形态。
4. **存储边界的落地方式**需在设计阶段确认：条款的存储条件是「本地 AND 用户控制」两个并列条件，项目应据此核对既有本地加密凭据存储是否已满足，并排查是否存在会把 SIWC 凭据带离本机的同步/远端通路；本轮未核实后者。
5. **“不换 key”的归属需要分清**：Terms 禁止的是轮换账号、拆分用量以规避限额，并明示这些限制不影响 separately authorized API use；官方 errors 页也把“改用用户自带 API key”列为合法的另一条计费路径。因此「失败即静默切换到 API key」是**本项目**应当禁止的行为（项目侧合同问题），不是 Terms 对显式 API key 使用的禁止。
6. **速率、usage、成本的具体数值与语义**无法从官方文档判断；`subscription_sharing_usage_limit_exceeded` 明确不能用于推算重置时间。
7. **JWKS 轮换、缓存与未知 kid 行为**官方未说明，属需自行设计 + 实测项。
8. **Pi `isChatGPTSignIn()` 的 `sk-` 前缀启发式**是否会在 Zotero 侧误判（例如用户配置了非 `sk-` 开头的 OpenAI 兼容 key），本轮未验证。
9. 本轮所有官方端点结论均来自**未认证的公开 GET**；`/api/accounts/authorize` 与 `/api/accounts/oauth/token` 的实际行为（尤其是 `dynamic_agent_client` 是否对任意开源应用放行）**未经真实账户验证**。

## 后续设计与原型问题（供用户决策，本报告不代为决定）

1. **条款落点**：把 §1.1 的约束映射到项目现有边界——SIWC 凭据是否可能经由任何同步/远端通路离开本机（存储须本地 AND 用户控制）；后台 Skill Run / Workflow automation 在启用 SIWC 前的明确同意如何取得与留存（是否额外做开关是设计选项，非官方要求）。
2. **认证变体建模**：SIWC 应作为现有 `openai-codex` 变体与 API key 变体之外的**并列变体**，还是别的形态？既有 Codex 入口保留、并存还是给出用户迁移路径？**不静默搬用旧 token** 这一条应写进合同。
3. **身份与凭据生命周期**：issued client ID 存放在哪个 owner？是否保留 `id_token` 以支持 `id_token_hint`？host ID 用 `urn:uuid:` 还是 RFC 9278 JWK thumbprint？跨 host 复用同一 issued client ID 的规则如何表达？
4. **回调实现**：评估复用 Host Bridge 现有 loopback server socket（`nsIServerSocket`，`bindMode:"loopback"`）的可行性、隔离方式与端口占用/并发登录处理（Pi 已有串号先例）；手动粘贴兜底是否纳入设计（官方未文档化）。
5. **模型发现**：是否改为 `GET /v1/models` 按账户发现，并与 OMP 静态目录 18.0.11 合并？删除/降级/未知上限如何处理？
6. **payload 与终态**：`store:false`/`stream:true` 强制、unsupported 字段裁剪、`instructions`/developer 角色选择、`response.completed` 作为唯一成功证据、`incomplete`/`failed`/429 usage limit 的项目自有错误码映射。其中「模型调用失败不得静默切到另一账号或 API key」是**本项目**拟采用的合同（Terms 禁止的是轮换账号规避限额，同时明确不影响 separately authorized API use），两者的依据不同，不应混引。
7. **合规 UI**：Continue with ChatGPT 按钮、首次登录后的一次性确认、`Using ChatGPT plan` 指示、Manage usage 链接（指向 ChatGPT 设置 → Usage）、五小时共享限额的提示文案。
8. **原型验证清单**（真实宿主；证据范围按 `tests/zotero/compatibility-matrix.json` 的六个 blocking 单元格，macOS 两格按既有 nonblocking 政策处理）：loopback 回调可达性、PKCE/nonce/state、JWKS 验签与轮换、刷新轮换与串行化、撤销、账户隔离与切换、模型发现、终态与 usage limit 行为。

## 引用来源

官方文档（一手）：

- [Integrating Sign in with ChatGPT in your Opensource App（cookbook，2026-09-28）](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
- [SIWC 概览 / 文档首页](https://developers.openai.com/siwc)、[Quickstart](https://developers.openai.com/siwc/quickstart)、[Request a client ID](https://developers.openai.com/siwc/request-client-id)
- [Overview（A client vs. an agent host）](https://developers.openai.com/siwc/token-sharing-open-source)、[UI/UX guidelines](https://developers.openai.com/siwc/ui-ux-guidelines)
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)、[Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)、[Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)、[Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)、[Errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery)、[Token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference)、[Self-hosted VMs](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms)、[Codex app-server](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- `GET https://auth.openai.com/.well-known/openid-configuration`、`GET https://auth.openai.com/.well-known/jwks.json`（2026-10-03 只读观察）
- [Sign in with ChatGPT 条款](https://openai.com/policies/sign-in-with-chatgpt-terms/)（页面标注 2026-09-29；父代理经浏览工具读取，本机 curl 被边缘拦截）。要点概述：须以应用自身名称集成；token 只能经受支持的 sign-in flow 并由用户授权获得；**Authentication Token 的持久存储必须在本地且在用户控制之下，不得位于远程或托管环境**（两个并列条件）；请求须来自本地运行时，或仅由该用户控制的远程运行时；仅用于已认证用户的活动，或用户明确授权的自动化/后台运行，后台使用须先取得明确同意（未要求提供开关）；仅供已连接应用自身使用，不作为可供其它工具或无关请求使用的通用 API；不得就 SIWC 用量向用户收费或要求付费升级；不得轮换账号、拆分用量以规避限额，也不得汇集或共享 token；**这些限制不影响 separately authorized API use**。本报告 §1.1 已把这些要点转写为工程约束，未逐句引用原文。

源码（一手，固定副本）：

- Pi：`packages/ai/src/auth/oauth/openai-chatgpt.ts`、`packages/ai/src/auth/oauth/pkce.ts`、`packages/ai/src/auth/credential-store.ts`、`packages/ai/src/providers/openai.ts`、`packages/ai/src/providers/openai.models.ts`、`packages/ai/src/api/openai-responses.ts`、`packages/ai/src/api/openai-responses-shared.ts`、`packages/ai/src/utils/retry.ts`、`packages/ai/CHANGELOG.md`（0.99.0 条目）、`packages/ai/test/openai-chatgpt-oauth.test.ts`
- 本项目：[piOpenAICodexAuth.ts](../../src/modules/piOpenAICodexAuth.ts)、[piModelCatalog.ts](../../src/modules/piModelCatalog.ts)、[piProviderExecution.ts](../../src/modules/piProviderExecution.ts)、[platform/hash.ts](../../src/platform/hash.ts)、[hostBridgeServer.ts](../../src/modules/hostBridge/server/hostBridgeServer.ts)（loopback server socket）、[compatibility-matrix.json](../../tests/zotero/compatibility-matrix.json)
- 上游讨论：[upstream-alignment-research-20261003.md](./upstream-alignment-research-20261003.md)（Pi 版本对齐评估；本报告在其“官方 Sign in with ChatGPT”一节基础上展开，不重复 Pi 版本对齐调研）

## 对父任务的意义

SIWC 在官方侧已经是**有正式文档、官方未列额外申请步骤的开源本地通道**；真正的约束来自协议本身（PKCE、loopback 回调、JWKS 验签、账户身份、granted scopes）与 Terms 的使用边界。要点分清两组：**token 持久存储必须「在本地」且「在用户控制之下」**（不得位于远程或托管环境，用户自控的远程机器并不因此合规），而**请求来源**才允许「本地，或仅由该用户控制的远程运行时」；后台使用只要求先取得明确同意，官方并未规定必须提供开关。此外 Terms 明示这些限制**不影响 separately authorized API use**，所以「显式改用用户自带 API key」是官方认可的选项，被禁的是拿轮换账号/拆分用量去规避限额。项目侧最有利的两点是：已有本地加密凭据存储与**可绑 loopback 的服务端 socket**，因此不是从零开始；最缺的是 ID token 验签（JOSE 验签能力项目内零先例）。Pi 的登录源码可用来对照端点与错误分类，但其跳过验签、不复用 issued client ID、无撤销、依赖 Node 执行器，不能直接搬用。官方 preview 限制（unsupported 字段、禁 `tool_search`、禁 system message item、禁 `max_output_tokens`）会直接冲击现有 Responses payload 与预算投影，应在设计阶段当硬约束处理。
