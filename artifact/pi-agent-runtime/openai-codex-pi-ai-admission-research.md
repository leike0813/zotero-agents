# OpenAI Codex / `@earendil-works/pi-ai@0.84.4` 准入研究

核查日期：2026-09-03
范围：C05 concrete auth、C04 native stream、Zotero 7/9 browser runtime。
证据规则：`supported` 只表示一手来源明确支持或公开定义了该合同；`unsupported` 表示与目标运行时/公开合同直接冲突；`unknown` 表示源码或技术行为可观察，但没有一手来源给出授权或稳定性承诺。源码可见、能发出请求、npm 包为 MIT，均不自动等于 OpenAI 授权。

## 结论

### 准入判定

| 目标 | 判定 | 原因 |
| --- | --- | --- |
| `pi-ai@0.84.4` 的 OpenAI Codex OAuth 直接作为 C05 auth | **不准入（授权 unknown，工程形态 unsupported）** | 包复用 Codex OAuth client ID，保存并刷新 ChatGPT token，再由自身 adapter 直连 ChatGPT `backend-api`。没有 OpenAI 一手文档授权第三方插件复用该 client identity、ChatGPT token 或内部 backend 合同。 |
| `pi-ai@0.84.4` 的 Codex OAuth login 直接进入 Zotero browser | **unsupported** | login 模块使用 `node:crypto`、`node:http` 和本地 callback server，并明确写明仅 Node/CLI。 |
| `pi-ai@0.84.4` 的 Codex stream 直接作为 C04 native stream | **不准入（合同 unknown）** | stream 本身可注入 `fetch`，但直连 ChatGPT `backend-api`，并依赖 account header、originator 与实验性 header。技术上能发出请求不能弥补第三方公开合同的缺失。 |
| OpenAI 官方 Codex app-server/SDK 作为 subscription runtime | **supported integration shape; native-process required** | 官方 app-server README 定义 `account/login/start` 的 `chatgpt`/`chatgptDeviceCode`、token 持有/刷新和 `turn/*` 流程；官方 TypeScript SDK 包装并 spawn `@openai/codex` CLI，要求 Node。Zotero 只能通过 Host Bridge/native sidecar 承载。 |
| OpenAI API key + public Responses API | **supported** | OpenAI API 文档定义 API key、Bearer auth 和 `api.openai.com/v1` public API；API key 不应暴露在 browser/plugin 前端，应由受控 host/backend 使用。 |

### 最小架构建议

1. **C05：移除 `pi-ai` 的 Codex subscription OAuth adapter 作为可执行路径。** 不复制 `CLIENT_ID`、authorize/token/device-auth endpoint、ChatGPT account header 或 `backend-api` 请求合同。
2. **若 MVP 必须保留 ChatGPT/Codex subscription：另开 C05 runtime 方案，运行官方 `codex app-server`（优先 stdio；官方 README 将 websocket 标为 experimental/unsupported），由 Host Bridge/native sidecar 持有 auth.json/keyring、OAuth callback、refresh 和上游请求；插件只消费 JSON-RPC account/turn 事件。** 不把 refresh/access token 进入 Zotero JS 或 `CredentialStore`。
3. **若 MVP 不承载 official Codex runtime：从 MVP 执行清单移除 C05。** OpenAI API key 已由 C03 加密凭据存储与 C04 public Responses stream 覆盖，无需一个空的认证 change。

## 一手来源与本地包证据

### 锁定版本

- 本仓库的兼容性原型锁定 `@earendil-works/pi-ai` 为 `0.84.4`：[`artifact/pi-agent-runtime/omp-zotero-compatibility/package.json:9-14`](../omp-zotero-compatibility/package.json)。
- npm registry 对精确版本报告：`gitHead=b79e4cc834970cca69daebffab7df1da7d1e52c4`，tarball 为 [`@earendil-works/pi-ai@0.84.4`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4)，integrity 为 `sha512-AClAZxf5+c4RRu44NJPS6wyQy+Nmq+Mzyyrdvm4ZVMNuixelO02RZX4G4Aq1F145Yzp43wnM5S+hLlSI7ypfVw==`，package `engines.node` 为 `>=22.19.0`。本次从精确 tarball 解包到临时本地目录 `/tmp/tmp.CEFmy1BfBj/package`；以下本地行号对应该精确 tarball，GitHub 链接使用同一 `gitHead` 的源码版本。
- package manifest 声明 MIT；这只许可 `pi-ai` 软件代码的复制/修改，不授予 OpenAI ChatGPT 服务、OAuth client identity、access/refresh token 或非公开 backend 的使用权：[`/tmp/tmp.CEFmy1BfBj/package/package.json:68-91`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4)。

### `pi-ai` OAuth 行为

| 项目 | `pi-ai@0.84.4` 实际行为 | 证据 | 分类 |
| --- | --- | --- | --- |
| client ID | 硬编码 `app_EMoamEEZ73f0CkXaXp7hrann` | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/oauth/openai-codex.js:22-35`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L22-L35)；官方 Codex 当前源码也公开同一 ID：[`codex-rs/login/src/auth/manager.rs:1707-1715`](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/manager.rs#L1707-L1715)。 | **supported as observable fact; authorization unknown**。同一公开 ID 只说明实现复用了它，不说明第三方获准以该身份发起登录。 |
| authorize endpoint | `https://auth.openai.com/oauth/authorize`；redirect 固定 `http://localhost:1455/auth/callback`；scope 仅 `openid profile email offline_access`；附带 `id_token_add_organizations=true`、`codex_cli_simplified_flow=true`、`originator=pi` | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/oauth/openai-codex.js:22-35,229-243`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L22-L35)；[`...:245-317`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L245-L317)。官方 Codex login 动态绑定可用本地端口，并公开其 authorize 参数；当前源码 scope 还包含 `api.connectors.read api.connectors.invoke`，originator 来自官方实现：[`codex-rs/login/src/server.rs:159-187,576-612`](https://github.com/openai/codex/blob/main/codex-rs/login/src/server.rs#L159-L187)。 | **technically observable; contract stability/third-party authorization unknown**。scope、redirect 和 originator 已与当前官方实现不完全相同。 |
| token endpoint | authorization-code 与 refresh 均 POST `https://auth.openai.com/oauth/token`；发送 `client_id`，不使用 client secret；要求 `access_token`、`refresh_token`、`expires_in`；device flow 使用 `https://auth.openai.com/api/accounts/deviceauth/usercode` 与 `/token` | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/oauth/openai-codex.js:96-145,146-227`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L96-L145)。官方 Codex 也使用 `/oauth/token`、同一 client ID，并将 device routes 解析为 `/api/accounts/deviceauth/*`：[`codex-rs/login/src/auth/manager.rs:197-201,1581-1609`](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/manager.rs#L197-L201)；[`codex-rs/login/src/device_code_auth.rs:62-71,99-128,165-177`](https://github.com/openai/codex/blob/main/codex-rs/login/src/device_code_auth.rs#L62-L71)。 | **supported for official Codex flow; third-party reuse unknown**。endpoint 可观察但不是 OpenAI API public OAuth contract。 |
| token storage | `pi-ai` OAuth contract 由应用注入 `CredentialStore`；credential 保存 `access`、`refresh`、`expires` 和额外 `accountId`，`toAuth` 只返回 access token。包 README 说默认内存存储，应用可注入持久存储并自动 refresh。 | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/types.d.ts:11-68`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4)；[`/tmp/tmp.CEFmy1BfBj/package/README.md:384-394,1476-1490`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/README.md#L384-L394)。 | **package behavior supported; OpenAI storage authorization unknown**。官方 Codex 自己存 `$CODEX_HOME/auth.json`/keyring 并负责 refresh：[`codex-rs/login/src/auth/storage.rs:39-64,195-223`](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/storage.rs#L39-L64)。 |
| refresh semantics | `refreshOpenAICodexToken()` 以 refresh token 换新三元组，再由 `credentialsFromToken()` 从 access JWT 解出 `https://api.openai.com/auth.chatgpt_account_id`；没有 revoke flow | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/oauth/openai-codex.js:320-337,420-448`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L320-L337)。官方 Codex refresh 会持久化新 id/access/refresh token，且有 refresh lock、过期/重复使用/撤销分类：[`codex-rs/login/src/auth/manager.rs:3010-3028,1555-1613`](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/manager.rs#L3010-L3028)。 | **official behavior observable; direct third-party token handling unknown**。 |
| account header | `chatgpt-account-id` 从 access JWT 的 `https://api.openai.com/auth.chatgpt_account_id` 解出并随请求发送 | [`/tmp/tmp.CEFmy1BfBj/package/dist/api/openai-codex-responses.js:1244-1273`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/api/openai-codex-responses.ts#L1244-L1273)。官方 backend client 也将 account id 作为 `ChatGPT-Account-Id` header：[`codex-rs/backend-client/src/client.rs:208-216,242-264`](https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client.rs#L208-L216)。 | **supported inside official Codex backend flow; third-party authorization unknown**。 |
| inference endpoint | provider base URL `https://chatgpt.com/backend-api`；SSE URL 被规范化为 `/codex/responses`；默认同时尝试 WebSocket，失败后回退 SSE。请求 body 是 Responses-like payload，`store:false`、`stream:true`、`include:[reasoning.encrypted_content]`、Codex-specific tool/model fields。 | [`/tmp/tmp.CEFmy1BfBj/package/dist/providers/openai-codex.js:6-20`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/providers/openai-codex.ts#L6-L20)；[`/tmp/tmp.CEFmy1BfBj/package/dist/api/openai-codex-responses.js:245-279,371-427,455-470`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/api/openai-codex-responses.ts#L245-L279)。官方 Codex 当前 backend client 也明确区分 ChatGPT `/backend-api` 的 WHAM paths：[`codex-rs/backend-client/src/client.rs:118-132,184-205`](https://github.com/openai/codex/blob/main/codex-rs/backend-client/src/client.rs#L118-L132)。 | **not the public OpenAI API contract; stability/authorization unknown**。公开 OpenAI API 是 `api.openai.com/v1`，不是 ChatGPT `backend-api`。 |
| headers / identity | 强制覆盖 `Authorization: Bearer <access>`、`chatgpt-account-id`、`originator: pi`、`User-Agent: getPiUserAgent()`；SSE 另加 `OpenAI-Beta: responses=experimental`，WebSocket 另加 `responses_websockets=2026-02-06`、`session-id`、`x-client-request-id` | [`/tmp/tmp.CEFmy1BfBj/package/dist/api/openai-codex-responses.js:1259-1295`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/api/openai-codex-responses.ts#L1259-L1295)。官方 app-server 要求客户端用 `initialize.clientInfo` 标识自己，并说明该名字进入 OpenAI Compliance Logs；新企业 Codex integration 应联系 OpenAI 加入 known clients list：[`codex-rs/app-server/README.md:~190-225`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#initialization)。 | **headers are observable; `originator: pi` is not evidence of OpenAI approval**。本项目不能把 `pi` 当作官方 Codex client identity。 |
| Node/browser imports | OAuth 文件顶层以变量 guard 动态 import `node:crypto` 和 `node:http`；创建 state 依赖 Node randomBytes；OAuth callback 依赖 Node HTTP server。README 明确 OAuth login flows 是 Node-only，web app 应使用 server-side proxy/backend。 | [`/tmp/tmp.CEFmy1BfBj/package/dist/auth/oauth/openai-codex.js:1-17,39-43,245-247`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/src/auth/oauth/openai-codex.ts#L1-L17)；[`/tmp/tmp.CEFmy1BfBj/package/README.md:1374-1399`](https://github.com/earendil-works/pi/blob/b79e4cc834970cca69daebffab7df1da7d1e52c4/packages/ai/README.md#L1374-L1399)。 | **unsupported in Zotero browser OAuth**。lazy import 只避免 bundle 立即解析，不能让登录在 browser runtime 可用。 |

### 许可证与服务授权边界

- `pi-ai` npm manifest 的 `license: MIT` 仅覆盖该 npm package；官方 Codex repository 是 Apache-2.0，但 Codex repository license 同样是源码版权许可，不等于 OpenAI 服务合同或 ChatGPT subscription token 的转授权：[`@earendil-works/pi-ai/package.json`](https://registry.npmjs.org/@earendil-works/pi-ai/0.84.4)；[`openai/codex/LICENSE`](https://github.com/openai/codex/blob/main/LICENSE)。
- OpenAI API 官方文档定义 API key 认证为 `Authorization: Bearer OPENAI_API_KEY`，并警告不要在 client-side code/browser 暴露 key：[`platform.openai.com/docs/api-reference/authentication`](https://platform.openai.com/docs/api-reference/authentication)；quickstart 也要求先创建 API key：[`platform.openai.com/docs/quickstart/make-your-first-api-request`](https://platform.openai.com/docs/quickstart/make-your-first-api-request)。这套 public API 合同没有把 ChatGPT OAuth access token、`chatgpt-account-id`、`originator` 或 `chatgpt.com/backend-api` 列为第三方 API。
- 本次检索未找到 OpenAI 官方页面声明“第三方可复制官方 Codex OAuth client ID”“第三方可直接保存/刷新 ChatGPT subscription token”或“第三方可直连 ChatGPT `backend-api`”。因此这三项保持 **unknown authorization**，而非由源码推定为 permitted。

## 官方 Codex app-server / SDK 路径

### 官方合同

- `codex app-server` 是 Codex 为 VS Code 等 rich interface 提供的 interface；它支持 stdio JSONL，websocket 明确标为 experimental/unsupported。应用应在 `initialize.clientInfo` 标识自身；`clientInfo.name` 用于 OpenAI Compliance Logs，面向企业的新 integration 应联系 OpenAI 加入 known clients list：[`openai/codex/codex-rs/app-server/README.md:~190-225`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#initialization)。
- 官方 app-server auth surface 定义 `account/read`、`account/login/start`、`account/login/cancel`、`account/logout` 和 `account/updated`。其中 `chatgpt` browser flow 与 `chatgptDeviceCode` 由 Codex 管理 OAuth 与 refresh token；README 明确 Codex persists tokens to disk and refreshes them automatically：[`codex-rs/app-server/README.md:2146-2219`](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md#auth-endpoints)。
- 官方 Codex login server 使用动态 localhost callback、PKCE、官方 client id，并在 token exchange 处由 Codex 自己持有/写入 token：[`codex-rs/login/src/server.rs:159-187,576-612,803-845`](https://github.com/openai/codex/blob/main/codex-rs/login/src/server.rs#L159-L187)；[`codex-rs/login/src/auth/storage.rs:39-64,195-223`](https://github.com/openai/codex/blob/main/codex-rs/login/src/auth/storage.rs#L39-L64)。这支持“让官方 runtime 持有 auth”的架构，不支持插件自行复制该 flow。

### SDK 的运行时边界

- 官方 TypeScript SDK README 明确：它包装 `@openai/codex` CLI，spawn CLI，并通过 stdin/stdout 交换 JSONL；要求 Node.js 18+：[`openai/codex/sdk/typescript/README.md:198-208`](https://github.com/openai/codex/blob/main/sdk/typescript/README.md#codex-sdk)。当前 SDK package `@openai/codex-sdk@0.153.0` 依赖 `@openai/codex`，其实现使用 `node:child_process`、`node:fs`、`node:path`、`node:readline`、`node:module`；因此不能直接放进 Zotero browser bundle：[`@openai/codex-sdk@0.153.0/package.json`](https://registry.npmjs.org/@openai/codex-sdk/latest)；`dist/index.js` 同包 tarball 的 Node imports。
- 官方 Python SDK README 同样将认证描述为复用 existing Codex authentication，并提供 ChatGPT browser/device-code login 与 API-key login；其 `pyproject.toml` 依赖 `openai-codex-cli-bin`，即把官方 CLI runtime 作为执行承载：[`openai/codex/sdk/python/README.md:198-251`](https://github.com/openai/codex/blob/main/sdk/python/README.md)；[`openai/codex/sdk/python/pyproject.toml`](https://github.com/openai/codex/blob/main/sdk/python/pyproject.toml)。

## 三条路径比较

| 路径 | 认证所有权 | 推理/流所有权 | Zotero browser 可行性 | C05 结论 |
| --- | --- | --- | --- | --- |
| **A. 当前 `pi-ai` native adapter** | 插件或注入的 `CredentialStore` 保存 access/refresh；复制官方 client id/flow | 插件直接 fetch/WebSocket ChatGPT `backend-api` | OAuth login 明确 Node-only；直接 stream 依赖非 public ChatGPT backend 合同 | **不准入**。即使 Node 中技术可运行，也没有 OpenAI 一手授权证据；browser 还直接失败。 |
| **B. 官方 Codex app-server/SDK** | 官方 Codex runtime 持有 auth.json/keyring、OAuth callback、refresh | Codex app-server 持有上游请求，插件通过 stdio JSON-RPC 收事件；SDK 只是官方 CLI/app-server 的 Node/Python wrapper | browser 不能直接 spawn；经 Host Bridge/native sidecar 可行 | **首选 subscription 方案**。需要单独 runtime/发布/版本治理票，并遵循 clientInfo/compliance 与 stdio 合同。 |
| **C. MVP 仅 API key** | 项目 Host Bridge/backend 或用户本地安全存储；不把长期 key 放页面 | OpenAI public Responses API（`api.openai.com/v1`）或已有受控 proxy | browser 只使用短期/受控调用面；实际 key 仍应留在 host/backend | **最小 MVP**。移除 subscription OAuth，保留 API key + public API。 |

## 严格证据清单

### Supported

- 官方 Codex app-server 公开定义 ChatGPT managed auth、browser/device-code login、token persistence/refresh、logout 和 JSON-RPC turn streaming。
- 官方 TypeScript/Python SDK 公开存在，但均承载在 Node/CLI 或 Python/CLI runtime 上，不是 browser-native OAuth library。
- OpenAI API public contract 支持 API key Bearer auth；GPT-5-Codex 文档列出 public Responses endpoint 和 streaming/function calling 能力：[`developers.openai.com/api/docs/models/gpt-5-codex`](https://developers.openai.com/api/docs/models/gpt-5-codex)。
- `pi-ai@0.84.4` 包代码本身按 MIT 发布；这只证明软件代码许可证。

### Unsupported

- `pi-ai` OAuth login 在 Zotero browser runtime 中不可用：`node:crypto`/`node:http` 和本地 callback server 是硬运行时冲突。
- 官方 `@openai/codex-sdk` 不能直接放入插件 browser bundle：其公开 SDK 是 Node wrapper，spawn CLI 并使用 Node built-ins。
- OpenAI 当前公开的第三方产品路径是由 app-server 管理 ChatGPT auth。文档没有支持把 subscription access/refresh token 移入 Zotero JS 再直连 ChatGPT backend internals。

### Unknown（不得当作准入）

- OpenAI 是否允许非官方 Codex app-server 的第三方产品复制 `app_EMoamEEZ73f0CkXaXp7hrann`。
- OpenAI 是否允许第三方直接使用 `auth.openai.com/oauth/*`、`/api/accounts/deviceauth/*` 获得的 ChatGPT subscription tokens，并自行持久化/刷新。
- `chatgpt.com/backend-api/codex/responses`、`chatgpt-account-id`、`originator: pi`、`OpenAI-Beta: responses=experimental` 和 `responses_websockets=2026-02-06` 是否为对第三方公开承诺的稳定 API。
- `pi-ai` README 的“OpenAI Codex (ChatGPT Plus/Pro)”描述是否代表 OpenAI 对 `pi-ai` 或其下游应用的授权；没有 OpenAI 一手批准、注册或合同条款可据此推断。

## 最终建议

**C05 现在不应实现 `piOpenAICodexAuth.ts` 来复制 `pi-ai` flow。** 建议：

- subscription 目标：等待官方 Codex app-server/native Host Bridge 方案；由官方 runtime 负责 auth、refresh、上游 endpoint 和 identity，插件只做 JSON-RPC client/projection；
- MVP 目标：从执行计划删除 C05 subscription OAuth change，保留 C03/C04 的 API key 认证和 public OpenAI Responses stream；
- 任何恢复 direct subscription OAuth 的方案，必须先有 OpenAI 明确的第三方集成批准/known-client 或公开合同证据，并重新核查 client ID、scope、endpoint、header、token storage 和 revoke/refresh 语义。
