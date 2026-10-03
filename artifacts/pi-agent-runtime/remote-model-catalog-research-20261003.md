# Pi 官方远程模型目录能否作为本项目独立更新的上游来源

调研日期：2026-10-03。研究票：[Pi 官方独立模型目录能否作为上游来源 #59](https://github.com/leike0813/zotero-agents/issues/59)。本轮只新增本报告，未修改生产代码、依赖或 Git 状态，未安装任何候选包，也未运行上游生成器。

上游源码固定为 Pi `v1.0.0`，commit `a13d35a742c6ef8462812a28fbe1d8c8b7431c32`，路径 `/tmp/pi-alignment-20261003.tWJwnS/pi-1.0.0`（非 git checkout，为固定快照）。本项目事实基线：生产依赖 `@earendil-works/pi-*@0.84.4`，静态模型目录 `@oh-my-pi/pi-catalog@18.0.11`。本轮 HTTP 观察全部为 2026-10-03 约 03:27–03:45 UTC 的只读无认证 GET/HEAD/OPTIONS。

## 结论

可以作为**技术上可行**的独立上游：官方供给面与本项目当前的静态目录更新链路相互独立（发布 workflow、内容寻址 revision、公开只读端点都不依赖 npm 包版本），一次增量刷新可以在不升级 `@earendil-works/pi-ai` 的前提下把新的模型、新的 `api` 方言和新价格带进候选目录。但**不是开箱即用的来源**：线协议只有源码级定义、没有公开规范；载荷容器形状与本项目现有覆盖层形状不同；官方 13 种 `api` 方言中本项目已实现执行通路的有 5 种（`openai-responses`、`openai-completions`、`anthropic-messages`、`google-generative-ai` 走统一 streams 表，`openai-codex-responses` 走独立分支），其余 8 种尚无执行通路；网络可达性则需要宿主网络通路证明——本次只证明了标准 web origin 下 fetch 受 CORS 限制，**不足以**判定 Zotero 特权宿主能否直连。

置信度分层：供给面与线协议行为为**高**（源码 + 当次 HTTP 双向印证）；载荷字段清单为**高**（对完整 public payload 逐字段统计）；项目侧执行通路与配置差异为**高**（直接读本项目源码）；宿主网络可达性为**低**（仅取得 web 层响应头观察，未做宿主原型；且已实现执行通路的实机准入状态本报告未逐条核验）。

本报告只给依据，不替来源选择或更新政策下结论。

## 证据分级约定

- **文档保证**：`packages/coding-agent/docs/models.md`、`packages/ai/README.md` 等第一方文档的明文陈述。
- **源码行为**：`v1.0.0` 快照内的实现。
- **本次观察**：2026-10-03 对 `https://pi.dev` 的只读 HTTP 结果。
- **推断**：由上述证据推出、但没有直接观测或文档确认。
- **未知**：没有第一方证据，本文明确留空而不编造。

父代理已确认的三项（`scripts/model-catalog-protocol.ts` 的 schema1/版本选择/typed-legacy 语义、`publish-model-catalog.yml` 的独立 R2 发布、`remote-catalog-provider.ts` 的 4h freshness + `If-None-Match` + provider shard + 缓存覆盖层）在本轮只作引用，不重复论证；本轮补的是这些结论**没有覆盖**的供给、缓存、兼容与浏览器事实。

## 一、供给面：发布、存储与 revision 语义

### 已由源码确立的事实

存储布局写在协议文件头部注释里（[`scripts/model-catalog-protocol.ts`](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/model-catalog-protocol.ts)）：

```
models/v1/index.json                                   revision index
models/v1/revisions/<revision>/models.json             chat models, provider -> {id: model}
models/v1/revisions/<revision>/models.all.json         所有类型, provider -> model[]
models/v1/revisions/<revision>/providers.json          排序后的 provider id 数组
models/v1/revisions/<revision>/providers/<id>.json     单 provider chat 变体
models/v1/revisions/<revision>/providers/<id>.all.json 单 provider 全类型变体
```

**revision 是内容寻址的，且只哈希 typed 全量文件**。[`scripts/publish-model-catalog.mjs`](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/publish-model-catalog.mjs) 的 `validateBundle()` 明确注释：“The full catalog is a superset of the chat catalog, so hashing it alone changes the revision for chat-only and image-only updates alike”，随后 `sha256(models.all.json 字节)` 并加 `sha256-` 前缀。本次观察印证了这一点：typed 与 legacy 响应携带**同一个** `x-pi-model-catalog-revision: sha256-d28b6de…`，但 ETag 不同。

`buildIndex()` 是本轮最关键的新供给事实：它先 `filter(catalog => catalog.minimumPiVersion !== MINIMUM_PI_VERSION)` 再 concat 新条目。`MINIMUM_PI_VERSION` 是模块常量 `"0.80.7"`（脚本注释：只有当生成的模型元数据需要旧客户端不具备的行为时才提升）。

**源码行为**：新条目**只替换 `minimumPiVersion` 等于当前常量的那一条**；`minimumPiVersion` 不同的既有 entry 会被 filter 保留，并与新条目一起按版本序排序。因此该实现是**支持多档的**——当常量从 0.80.7 提升到 X 时，旧档 entry 仍在 index 中，低于 X 的客户端按 `selectModelCatalog()` 仍能命中旧档 revision；同时 `defaultRevision` 被设为新 revision，无版本请求取到最新的那一档。

**本次观察**：0.80.7 / 0.80.8 / 1.0.0 / 2.0.0 四个版本返回同一 revision，0.80.6 与 0.1.0 返回 404。这说明**本次查询的这几组版本命中了同一档**，与“index 只有一档”不是同一命题，也无法据此判断 index 的完整档位构成。

index entry 除协议字段外还写入发布元数据：`sourceCommit`、`publishedAt`、`providerCount`、`modelCount`（legacy chat 计数）、`chatModelCount`、`imageModelCount`、`classifierModelCount`、`totalModelCount`、`modelTypes`。协议侧的 `parseModelCatalogIndex()` 只读取 `minimumPiVersion` 与 `revision`，其余字段对消费方不可见。

发布节奏：[`.github/workflows/publish-model-catalog.yml`](https://github.com/earendil-works/pi/blob/v1.0.0/.github/workflows/publish-model-catalog.yml) 由 `workflow_run`（main 分支 CI 成功）、PR（仅生成 artifact）和 `cron: '17 8-13 * * 1-5'` 触发；`publish` job 只在 Europe/Vienna 周一至周五 10:00–15:00 内的 10:17/12:17/14:17 三个点上传 R2，手动 dispatch 可绕过窗口。发布前有硬门禁：必须包含 `anthropic`/`openai`/`openrouter`，chat 模型数 `< 500` 拒绝发布，legacy `models.json` 必须是 `models.all.json` 的 chat 投影的深度相等结果。

### 本次观察：发布侧设置的缓存头没有到达 API 响应

上传时 `models.all.json` 走 `IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"`，`index.json` 走 `"no-store"`。但 API 响应返回的是 `cache-control: public, max-age=60, s-maxage=60`。**推断**：pi.dev 的 Worker 层重新设置了缓存策略，R2 对象上的 immutable 属性不对 API 消费者生效。消费方不能依赖一年不可变缓存来安排刷新节奏。

## 二、服务端选择协议（源码 + 当次观察）

协议在源码里是纯函数：[`parseModelCatalogRequest()`](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/model-catalog-protocol.ts) 决定 `catalog` / `redirect` / `invalid`；[`selectModelCatalog()`](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/model-catalog-protocol.ts) 从 index 里选“`minimumPiVersion` 不超过请求版本的最高一档”，无版本则取 `defaultRevision`。

本次对 `https://pi.dev` 的完整观察（User-Agent `pi/1.0.0 (test-probe)`，除非注明）：

| 请求 | 状态 | 关键观察 |
| --- | --- | --- |
| `/api/models`（浏览器 UA） | 200 | 866952 字节，ETag `92df0b33…`，legacy 变体 |
| `/api/models?pi-version=1.0.0` | 200 | 与上完全同 ETag，即默认档 == 1.0.0 档 |
| `/api/models?pi-version=1.0.0&types=chat` | 200 | 856550 字节，ETag `6ffc484e…`，revision 同为 `sha256-d28b6de…` |
| `?pi-version=1.0.0&types=chat,image,classifier` | 200 | **与 `types=chat` 逐字节相同**（md5 均为 `6ffc484eea7a4e430329bcae5573637d`） |
| `?pi-version=1.0.0&types=image` | 200 | 同样 856550 字节、同一 ETag |
| `?pi-version=1.0.0&types=`（空值） | 400 | `{"ok":false,"error":"Invalid model types."}` |
| `?pi-version=abc` | 400 | `{"ok":false,"error":"Invalid Pi version."}`，`cache-control: no-store` |
| `?pi-version=0.80.6&types=chat` | 404 | `{"ok":false,"error":"No compatible model catalog is available for this Pi version."}` |
| `?pi-version=0.1.0&types=chat` | 404 | 同上 |
| `?pi-version=0.80.7` / `0.80.8` / `1.0.0` / `2.0.0` | 200 | 四者 revision **完全相同** |
| `/api/models?revision=sha256-d28b6de…` | 307 | `revision` 查询参数被忽略，仅重定向补 `pi-version` |
| `/api/models`（pi UA，无 `pi-version`） | 307 | `location: https://pi.dev/api/models?pi-version=1.0.0` |
| `/api/models/providers/openai?pi-version=1.0.0&types=…` | 200 | 27952 字节，typed 为 **array**；去掉 `types` 为 **object keyed by model id**（28575 字节） |
| `/api/models/providers/does-not-exist?…` | 404 | `{"ok":false,"error":"Model provider not found."}` |
| `HEAD /api/models?pi-version=1.0.0&types=chat` | 200 | 返回 ETag，无 body |
| `/api/models/index`、`/api/models/revisions`、`/api/models/<revision>`、`/api/catalog/models`、`/api/model-catalog` | 501 | `{"ok":false,"error":"API routes are reserved for future features."}` |
| `/models/v1/index.json` | 404 | 返回 HTML 404 页面，不是 JSON |

### 由此确立的协议事实

1. **`types` 只切 representation，不是服务端筛选。** 三种取值（`chat`、`image`、`chat,image,classifier`）返回逐字节相同的 856550 字节 typed 全量。这与协议注释“Clients that send `?types=` receive the typed `.all.json` variant”一致，也与 `remote-catalog-provider.ts` 里“A server that ignores the parameter still returns the chat-only shard”的容错注释一致。CHANGELOG 里“Added `types=chat,image,classifier` … so remote refreshes overlay every supported model type”的措辞容易被读成筛选，实际不是；客户端仍需自己按 `type` 过滤。
2. **版本选择的行为在源码与观察上要分开读。** 源码侧 `buildIndex()` 保留不同 `minimumPiVersion` 的 entry（多档兼容是设计意图）；观察侧只覆盖了 0.1.0 / 0.80.6（404）与 0.80.7 / 0.80.8 / 1.0.0 / 2.0.0（同 revision）这几个点。据此可以确定的是：**本项目无论声明 0.84.4 还是 1.0.0，本次都命中同一档**；**不能**据此断言“index 只有一档”，也**不能**断言“上游提升 minimum 后本项目会突然 404”——按源码实现，提升后低于新门槛的版本会继续命中被保留的旧档。真正未证实的是：index 当前实际有几档、以及 0.80.7 以下的客户端为何 404（可能是从未存在更早 entry，也可能是服务端或存储侧的其他原因）。
3. **错误响应在本次观察中形状一致**：4xx 均为 `{"ok":false,"error":"<英文短句>"}`，且 400 走 `no-store`。这是**单次观察**而非稳定合同：状态码语义（400 参数非法、404 无兼容目录 / provider 不存在、501 路由保留）有源码与本次观察双向支撑；错误文案与 `ok` 字段名无第一方规范支撑，不宜作为断言依据。
4. **UA 重定向路径只是省事路径，不是必需路径。** 显式 `pi-version` query 本就可用；`User-Agent` 受限只是意味着走不了 307 那条自动补版本的捷径，任何能设置该 header 的客户端都可以省掉它。
5. **没有 revision 选择能力**。`?revision=` 被忽略并 307 掉；`/api/models/<revision>` 是保留路由（501）。见第四节。

## 三、缓存与再验证

本次观察：

- `If-None-Match: "6ffc484e…"` 对 typed 整表返回 **304**（带 `cache-control` 与 `etag`，无 body）；对 provider shard 同样返回 **304**。
- `If-Modified-Since: Thu, 01 Oct 2026 12:50:47 GMT`（与 `last-modified` 完全一致）返回 **200 全量**，不是 304。**结论**：服务端只实现 ETag 再验证，`Last-Modified` 不参与条件请求判断。
- `Last-Modified` 在 typed 整表、legacy 整表、provider shard 上分别是 `12:50:47` / `12:50:45` / `12:51:46`（同一 revision 的不同对象），因此它标识的是**对象上传时间**，不是 revision 生成时间。
- ETag 形态为 32 位十六进制（MD5 风格），与 R2 单次 `aws s3 cp` 上传的对象一致；**跨 representation 不同**（typed `6ffc484e…` vs legacy `92df0b33…`）。**含义**：验证器宜按 URL/representation 分别保存，revision 不能当验证器用（HTTP 语义如此，且本次观察证实两者取值不同）。

`remote-catalog-provider.ts` 源码解释了 `Last-Modified` 的真实用途：`remoteModels()` 用它与**本地静态目录的生成时间**比较，`entry.lastModified <= localGeneratedAt` 时直接丢弃远端 overlay。也就是说官方把它当作“新于我本地目录”的粗粒度栅栏，而不是 HTTP 语义。对本项目的含义见第六、八节。

上游客户端的失败语义（源码）：404/501 时 persist 的对象是 `{ ...(stored ?? { models: [] }), checkedAt, lastModified: 0, etag: undefined }` —— 即**保留 `stored.models` 的缓存体**，只把 `lastModified` 置 0、丢弃 etag。副作用是 `remoteModels()` 判定 `entry.lastModified (0) <= localGeneratedAt` 时不采用该缓存体，因此当次发布的内存 overlay 为空；下一次刷新因为 `stored.models.length > 0` 仍会带上 etag（但该 etag 已被清空，实际退化为无条件请求）。所以准确表述是“**不再采用缓存体、但不清除它**”，而不是删除缓存或在任何情况下都清空 overlay。其他非 2xx → 保留缓存体与 etag、只推进 `checkedAt` 并抛错；只有当缓存体非空时才发 `If-None-Match`（源码注释的意图是 304 不能让 overlay 变空）；单次尝试超时 4s。这套语义对本项目同样成立是**推断**——它属于客户端策略，不是服务端契约。

## 四、公开旧 revision / index / 回滚协议的可见性

**未证实**。本轮没有找到公开可访问的入口，但这不等于已证明其不存在。

- 存储布局里的 `models/v1/index.json` 只经由 pi.dev 的**内部** R2 绑定被读取；协议文件说明该文件被逐字复制到私有仓库 `earendil-works/pi.dev` 的 `src/shared/models/protocol.ts`，用于服务请求，**不在本快照内**，其 Worker 路由表也无第一方文档。
- 本轮探测的 8 个候选路径中，5 个返回 501“reserved for future features”，`/api/models/providers` 与 `?revision=` 返回 307，`/models/v1/index.json` 返回 HTML 404。
- 在本快照与本次探测范围内，没有找到提到客户端可按 revision 拉取历史版本或请求回滚的文档、CHANGELOG 或源码注释；`publish-model-catalog.mjs` 的写入路径只做“上传 + 覆盖 index”，未见回滚命令。pi.dev 侧的路由表不在快照内，因此**不能排除**存在未公开或未文档化的入口。

可以确定的只有：`defaultRevision` 恒等于最新发布（源码）；旧 revision 对象在 R2 中不被主动删除（源码未见删除逻辑）。**外部能否枚举或选择它们，本次未证实**。`https://pi.dev/models` 是面向人的目录页（见第五节文档保证），其是否存在机器可读变体同样未证实。

**对本项目的含义（安全边界，不是方案）**：设计**不能依赖**未经证明存在的官方旧 revision 恢复能力——把它当既有依赖会在上游任何一次发布后静默失效。客户端侧采用 last-good 保留、历史留存还是不做回退，属于待决策项，本报告不代选。

## 五、文档保证的边界

第一方文档对这块的全部承诺是：Pi 以自带目录启动，可以用 pi.dev 的更新数据**叠加**在其上；已缓存的目录数据离线仍可用；`pi update --models` 强制刷新（[`packages/coding-agent/docs/models.md`](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/models.md)）。同页还指向 `https://pi.dev/models` 的人工目录页。`packages/ai/README.md` 只描述 provider 层 `refresh()` 语义（同步读 + 显式异步刷新、静态 provider 的 `refresh()` 是 no-op、Radius 同时静态与动态）。

注意这几句承诺的是**用户体验**（有覆盖层、能离线、能强制刷新），不是**线协议**：文档没有描述请求参数、representation、版本协商、缓存头或错误语义。

**没有**公开的 HTTP API 规范、OpenAPI/schema、版本化契约文档、ETag/缓存约定说明或错误码表。`/api/models` 的全部线协议只由“共享协议源文件 + 发布脚本 + 客户端实现”三方共同定义。

由此能确立的是**兼容承诺缺口**：消费方拿不到任何书面稳定性保证，也没有任何版本协商或弃用信号可依赖。这是设计约束（应当容错、应当自行留存必要事实），但**不等于**“任何字段或状态码都会随时改变”——现有证据只支持“官方没有承诺”，不支持“官方会随意变更”。变更风险是未知量，不是已发生的违约。

另有一条确定的结构事实：schema 版本（`MODEL_CATALOG_SCHEMA_VERSION = 1`）只体现在存储路径前缀 `models/v1/` 上，**不会出现在 HTTP 响应里**；消费方无法从响应自检自己拿到的是哪一代结构。

## 六、载荷事实（对 2026-10-03 完整 public payload 的逐字段统计）

样本：`/tmp/pi-catalog-probe-20261003.json`（typed 全量，856550 字节，42 providers，1601 models），并与当次 legacy 整表、`/api/models/providers/openai` shard 交叉比对。

### 形状

- typed 整表：`{ [providerId]: Model[] }`；typed shard：`Model[]`。
- legacy 整表：`{ [providerId]: { [modelId]: Model } }`；legacy shard：同样的 keyed object。
- **两种 representation 的 chat 模型对象内容逐字段完全相同**（对 1529 个 chat 模型做深比较，差异 0 个）；差别只在容器：typed 用数组，legacy 额外把 model id 重复为 key（这是 legacy 866952 字节反而大于 typed 856550 字节的原因）。
- 每个 model 都带 `provider` 字段，且与外层 key 一致（1601/1601）。

### 字段覆盖率（分母 1601）

| 字段 | 覆盖 | 说明 |
| --- | --- | --- |
| `id` `name` `api` `provider` `baseUrl` `input` `cost` `type` | 1601 / 1601 | 必备 |
| `contextWindow` | 1544 | 缺 57，正好是全部 image 模型 |
| `reasoning` `maxTokens` | 1529 | 缺 72 = 57 image + 15 classifier |
| `compat` | 1292 | 27 种键，见下 |
| `inputLimits` | 1115 | 含 `maxRequestBytes`、`images.{maxPerMessage,maxPerRequest,resize}` |
| `thinkingLevelMap` | 749 | 形如 `{"off":null,"low":"low","max":"max"}`，值可 null 表示该档不支持 |
| `output` | 57 | 仅 image 模型，形如 `["image"]` |
| `headers` | 53 | 静态请求头，见下 |
| `lab` / `enabled` / `providers` | 各 28 | 全部是 `radius` provider 的模型 |
| `promptCache` | 16 | 形如 `{"short":300,"long":3600}` |

类型分布：`chat` 1529、`image` 57、`classifier` 15。provider 42 家，最大为 `openrouter` 463、`vercel-ai-gateway` 254、`amazon-bedrock` 180、`opencode` 80、`huggingface` 76、`cloudflare-ai-gateway` 54。

`api` 取值共 13 种，与 provider 的对应关系（provider 家数/模型数）：`openai-completions` 26/714、`anthropic-messages` 11/348、`bedrock-converse-stream` 1/180、`openai-responses` 7/131、`openrouter-images` 1/57、`azure-openai-responses` 1/44、`mistral-conversations` 1/32、`google-generative-ai` 2/29、`pi-messages` 1/28、`google-vertex` 1/14、`typesafe-system-one` 4/14、`openai-codex-responses` 1/9、`cloudflare-workers-ai-system-one` 1/1。

`compat` 的 27 种键（计数）：`supportsStrictMode` 855、`supportsDeveloperRole` 578、`thinkingFormat` 525、`sendSessionAffinityHeaders` 474、`allowEmptySignature` 270、`supportsStore` 231、`supportsReasoningEffort` 158、`maxTokensField` 148、`supportsLongCacheRetention` 131、`supportsOpenAIGrammarTools` 111、`supportsMidConvoSystemMessages` 85、`forceAdaptiveThinking` 75、`requiresReasoningContentOnAssistantMessages` 45、`supportsAdditionalTools` 41、`sessionAffinityFormat` 36、`supportsTemperature` 32、`supportsUsageInStreaming` 22、`supportsToolSearch` 19、`cacheControlFormat` 18、`supportsStrictTools` 16、`supportsEagerToolInputStreaming` 15、`supportsCacheControlOnTools` 14、`zaiToolStream` 11、`chatTemplateArgs` 10（object）、`supportsExplicitPromptCacheMode` 9、`supportsMidConvoEffort` 7、`supportsMidConvoToolChanges` 6、`supportsMidConvoToolAdditions` 6、`allowedFallbackModels` 1（array，内嵌 cost）。

**判断**：这些 `compat` 键是 **pi-ai 运行时请求构造层**的开关（严格模式、thinking 格式、cacheControl 位置、session affinity 头、mid-convo 工具变更等）。本项目若不实现对应的请求构造差异，这些元数据即使全部收下也无法生效。

## 七、哪些字段不是纯数据，而是授权面或能力边界

按“消费它需要什么”分类，均为本次观察：

1. **`baseUrl` 缺失或带占位符 → 需用户侧配置，本项目无法自行补全。**
   - `azure-openai-responses` 全部 44 个模型 `baseUrl` 为**空字符串**（Azure 资源 endpoint 由部署方决定）。
   - Cloudflare 相关 73 个模型带字面占位符：`https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/…`（54 个）、`https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai…`（19 个）。
   - `google-vertex` 14 个为 `https://{location}-aiplatform.googleapis.com`。
   - 其余为可直接使用的公网 endpoint。载荷中**不含任何 `localhost` / 私网地址**，这点对本项目的 `requiresLocalNetwork` 判定友好（`classifyPiEndpoint` 不需要处理官方目录里的私网 endpoint）。
2. **`radius` provider 的 28 个模型是 Pi 自家网关**，字段形态与其它 provider 完全不同：带 `lab`（上游实验室名）、`enabled`（启用位）、`providers`（上游路由表，形如 `{"id":"anthropic","credential":"radius","source":"radius"}`），`api` 为 `pi-messages`，`baseUrl` 为 `https://radius.pi.dev/v1`。这些条目表达的是 Pi 账户权益，没有对应凭据就无法使用，`enabled: true` 也不代表对任意用户可用。
3. **`openai-codex` 的 9 个模型指向 ChatGPT 订阅**（`api: openai-codex-responses`）。本项目已有独立的 Codex 凭据与发现路径（`refreshPiCodexModelCatalog` 打 `https://chatgpt.com/backend-api/codex/models?client_version=…`，带所选凭据），与官方目录里的这 9 条**不是同一条数据通路**，不应合并。
4. **`headers` 是 provider 协议要求，不是凭据。** 全部 53 条只有两类：`{User-Agent: GitHubCopilotChat/0.35.0, Editor-Version: vscode/1.107.0, Editor-Plugin-Version: copilot-chat/0.35.0, Copilot-Integration-Id: vscode-chat}`（34 条，全在 `github-copilot`）与 `{NVCF-POLL-SECONDS: 3600}`（19 条，`nvidia`）。**没有** Authorization / api-key / token 字段——凭据一律由客户端侧解析，官方目录不携带任何秘密。这一条对本项目很重要：消费官方目录不需要新增凭据处理边界。
5. **`cost` / `thinkingLevelMap` / `inputLimits` / `promptCache` / `contextWindow` / `maxTokens` 是纯元数据**，无权限含义。`cost` 全 1601 条都有四元组（`input`/`output`/`cacheRead`/`cacheWrite`，免费模型为 0）。image 模型没有 `contextWindow`/`maxTokens`，classifier 只有 `contextWindow` 没有 `maxTokens`——**按类型消费时不能假设字段齐全**。

## 八、本项目现有消费面的事实对照

以下全部读自本项目当前工作区，未做任何修改。

| 维度 | 本项目现状 | 官方目录现状 |
| --- | --- | --- |
| 目录来源 | `@oh-my-pi/pi-catalog@18.0.11`（npm 静态包，upstream `can1357/oh-my-pi`，`CATALOG_VERSION = "18.0.11"` 硬编码于 `src/modules/piModelCatalog.ts`） | `earendil-works/pi` 生成的远端 JSON |
| 覆盖层形状 | `normalizePiModelOverlay()` 接受 `{ providers: { [id]: { api, baseUrl, models: [...] } } }`，来源是 `$HOME/.omp/agent/models.yml`（YAML）与 `cacheDir/pi-model-catalog.json` | provider→array（typed）或 provider→`{id:model}`（legacy），JSON |
| 覆盖层字段白名单 | `ALLOWED_MODEL_KEYS`：id, name, api, baseUrl, contextWindow, maxTokens, input, reasoning, supportsTools | 上述 + type, cost, compat, inputLimits, thinkingLevelMap, promptCache, headers, output, lab, enabled, providers |
| provider 白名单 | `ALLOWED_PROVIDER_KEYS`：api, baseUrl, models | 官方载荷没有 provider 级对象，api/baseUrl 在 model 级 |
| api 方言（配置类型） | `PiApiDialect = "openai-responses" | "openai-completions"`，仅用于**用户自定义端点**的声明（`normalizeConfiguration` 在存在自定义 `baseUrl` 时才要求它），不是整个执行支持面 | 13 种（见第六节） |
| api 方言（执行通路） | `piProviderExecution.ts` 的 `streams` 表有 `openai-responses`、`openai-completions`、`anthropic-messages`、`google-generative-ai` 四项，`openai-codex-responses` 另有独立 `streamCodex` 分支；`selection.api = config.api \|\| model.api`，即目录模型自身的 `api` 会直接进入执行分发 | 13 种中上述 5 种有执行通路 |
| revision 语义 | `revision()` = WebCrypto SHA-256 over `JSON.stringify({version: CATALOG_VERSION, overlay})`，即**本项目自己算的合成指纹**，无来源标注 | `sha256-` + `sha256(models.all.json 字节)`，随每次上游发布变化 |
| overlay 状态 | `overlayStatus: "none" | "cached" | "refreshed"`，只反映本地文件/缓存，**没有远端 freshness 概念** | 官方有 `Last-Modified`/`ETag`，4h 节奏是客户端常量 |
| 现有远端获取 | 只有 Codex 发现一条，打 `chatgpt.com/backend-api/codex/models`，带所选凭据 | 官方目录无需认证 |
| 已有网络客户端 | `Zotero.HTTP.request` 在 `piOpenAICodexAuth.ts` 用过一次（OAuth POST）；Codex 发现用 `globalThis.fetch` | — |
| 条件请求 / 自定义 UA | 全项目无 `If-None-Match`、无自定义 `User-Agent` | 两者都是官方协议的推荐用法 |

**结论性事实**：本项目目前**没有任何**代码消费过 `pi.dev` 的模型目录；本项目的静态目录上游是 OMP 而非 Pi。就两份目录的来源与覆盖而言：官方 Pi 目录本次样本为 42 provider / 1601 模型 / 13 种 `api` 方言，字段面宽（compat、inputLimits、thinkingLevelMap、cost 等）；本项目消费的 OMP 目录经 `ALLOWED_MODEL_KEYS` 白名单收敛为 9 个字段。两者的**字段子集明显不同、provider 覆盖面不同、生成与发布链路不同**。至于具体模型条目的重叠比例，本报告没有做过交集统计，不作断言。

**代码接入 ≠ 实机准入**：上述 5 条执行通路是**代码层已实现**的证据，不等于每条都已在本项目真实运行中验证过。本轮没有核验各自的实机准入状态，也未做真实模型调用；`piProviderExecution.ts` 里还能看到针对具体通路的额外门禁（例如 `google-generative-ai` 在带 `admission.fetch` 时直接判 `unsupported_provider`），说明“代码里有分支”不等于“该通路在当前运行场景可用”。

## 九、直接消费官方源 vs. 经本项目中转：各自需要哪些事实

### 直接消费（宿主发请求）

需要成立的事实：

1. 请求显式带 `pi-version` 即可，不依赖 `User-Agent`（本次已验证显式 query 可用）。取值应是本项目**真实运行时版本**；伪造一个更高的版本号来“求最新”在版本语义上是错的，且一旦上游按 `minimumPiVersion` 分档，声明与实际能力不符会命中不兼容的目录。因此本报告不给出具体取值——该由采用时的运行时版本决定。
2. 消费方需要能区分 400（参数非法）、404（无兼容目录 / provider 不存在）、501（路由未实现）并降级到本地目录。错误体在本次观察中为 `{ok:false,error}`，但无规范支撑，分类宜以状态码为准。
3. payload 与 ETag 宜按 representation 分别保存；revision 是内容指纹不是 HTTP 验证器（两者在本次观察中确实不同）。
4. freshness 策略属于消费方自选（官方 4h 是客户端常量，不是服务端承诺），取值待决策。
5. 若希望避免每次全量 856KB，需要消费方侧的条件请求能力（`If-None-Match`）。
6. chat/image/classifier 的筛选需消费方自行按 `type` 完成（服务端不做筛选）。

### 经本项目中转（写入既有 overlay）

在上述基础上额外需要：

1. 把 provider→array 重写成现有 `{providers: {…}}` 形状，或扩展 `normalizePiModelOverlay` 接受数组形态。
2. 处理字段降级：`type` 缺失即视为 chat（上游客户端 `isSupportedModelType` 就是这么容错的）。`contextWindow`/`maxTokens` 缺失时填 0 还是标记未知，是待决策项——本项目现有 overlay 路径用 0，而 Codex 发现路径刻意“保持未知”，两处语义已不一致。
3. `reasoning` 语义转换：官方 `reasoning: boolean` + `thinkingLevelMap: {level: string|null}`，本项目 `reasoning: readonly PiReasoningLevel[]`。`null` 表示该档不支持，映射规则需要显式定义才能落盘。
4. 官方 13 种 `api` 中，`bedrock-converse-stream`、`mistral-conversations`、`google-vertex`、`pi-messages`、`typesafe-system-one`、`openrouter-images`、`cloudflare-workers-ai-system-one` 这 8 种在本项目当前没有执行通路（`piProviderExecution.ts` 的 `streams` 表四项 + codex 独立分支之外）。它们若原样进入目录，运行时会在 `unsupported_provider` 处失败——是过滤、是标记为不可选、还是先补执行通路，属待决策项。（`anthropic-messages` 与 `google-generative-ai` 已有执行通路，不在此列。）
5. `baseUrl` 为空（44）或带 `{…}` 占位符（87）的 131 个模型需要被识别为待配置，否则会与 `classifyPiEndpoint` 的判定和连接逻辑冲突（`resolvePiSelection` 的 `baseUrl: config.baseUrl || model.baseUrl` 在 `model.baseUrl` 为空时会产生空值）。
6. `radius` 的 28 条需要单独识别（Pi 账户权益，非直连 provider），否则会被当成普通 OpenAI 兼容端点。

## 十、支持的数据更新（增量刷新能带来什么）

一次 typed 全量刷新可带来：新的 model id（含同一 id 的新价格/上下文/上限修订）、新 provider、新 `api` 方言、新 `compat` 能力位、新 `thinkingLevelMap` 档位映射、新 `inputLimits` 限制。本次样本即为例：`amazon-bedrock` 的 180 个模型横跨 us/eu/apac/au/ca/global/in/jp/us-gov 十个区域前缀与多套 `bedrock-runtime` endpoint，是纯粹的目录级供给，`@earendil-works/pi-ai@0.84.4` 的静态目录不可能包含 2026-10-01 之后的所有这些修订。

不能从刷新得到的：历史 revision、任何账号/凭据相关事实、服务可用性（目录列出某模型不代表该 provider 此刻可用）、以及任何本项目侧的能力判定。

## 十一、采用该来源会触及的适配面（若决定采用）

按“采用即刻会坏”的顺序：

1. **载荷容器形状**：typed 是数组，legacy 是 keyed object；两者都是官方支持的响应。adapter 至少要能读一种，并明确拒绝另一种时的行为。
2. **执行覆盖**：`PiCatalogModel.api` 会直接进入 `piProviderExecution.ts` 的分发，官方 13 种中 8 种当前会落到 `unsupported_provider`。可选应对包括收窄收录范围、引入“目录中存在但当前不可执行”的显式状态、或补执行通路——三者取舍属待决策。
3. **能力门禁**：`resolvePiSelection` 要求 `contextWindow >= 1`，`openPiProviderStream` 还要求 `maxTokens >= 1`（codex 通路例外）。image 模型没有 `contextWindow`、`maxTokens`，classifier 没有 `maxTokens`，因此不区分 `type` 会被现有门禁直接挡下或错误标注。
4. **`reasoning` 语义**：boolean + `thinkingLevelMap` → level 列表的映射规则需要成为项目自有事实源，而不是在读取时临时推断。
5. **`baseUrl` 空值/占位符**：现有 `classifyPiEndpoint` 假设有可用 URL。
6. **网络通路**：页面侧 fetch 受 CORS 限制（第十二节），宿主侧通路待证明。
7. **条件请求与自定义 UA**：本项目当前无这两项使用；宿主请求 API 是否支持需确认。

## 十二、网络合同：web 层已测，宿主层待证明

本次观察到的响应头（`GET https://pi.dev/api/models?pi-version=1.0.0&types=chat`，带 `Origin: https://example.org`）：

```
HTTP/2 200
cross-origin-opener-policy: same-origin
cross-origin-resource-policy: same-origin
（无 access-control-allow-origin）
```

OPTIONS 预检（`Access-Control-Request-Method: GET`，请求头 `if-none-match, user-agent, accept`）返回 **501**，同样无 `access-control-allow-*`。带 `If-None-Match` 且带 `Origin` 的 GET 返回 304，**同样无 `access-control-allow-origin`**。

以上只证明**标准 web origin 下的 `fetch` 受限**：

- **跨源 fetch 受阻**：既无 `Access-Control-Allow-Origin`，`Cross-Origin-Resource-Policy: same-origin` 也阻断 no-cors 通道。这是浏览器同源策略的结果，只适用于页面上下文。
- **条件请求在页面侧不可用**：`If-None-Match` 不是 CORS safelisted header，必然触发预检，而预检 501。
- **`User-Agent` 在页面侧不可设置**：因此走不了 307 那条自动补版本的捷径——但**这不是消费阻碍**，因为显式 `pi-version` query 本就可用且已被本次观察验证。

**不能**由此推出的结论：这些观察不适用于 Zotero 特权宿主上下文。特权宿主请求不受浏览器 CORS 机制约束，本项目也已有 `Zotero.HTTP.request` 先例（OAuth 用过）。因此正确表述是：**页面侧直连存在 CORS 障碍；宿主侧能否直连、需要走哪条请求 API、能否设置条件请求 header，属待证明项**，而不是“官方源不可直接消费”或“宿主直连一定必须绕开 CORS”。本轮未做宿主原型。

## 十三、待决定项（列出事实，不代选）

1. `pi-version` 声明值：应忠实反映本项目实际 Pi 运行时版本（当前 `0.84.4`）。把它抬到高于真实能力的版本以“求最新”属于版本语义造假，且与 `selectModelCatalog` 的分档语义相冲突；维持忠实值则未来门槛变化时行为取决于上游届时是否保留旧档（源码显示会保留，但未实测）。这两难的具体取舍待决策。
2. 取 typed 还是 legacy representation：typed 才有 image/classifier；legacy 更贴近现有 keyed 形状。
3. 消费范围：只取 `type: chat` 且 `api` 可执行的白名单，还是完整收下再在 UI 层过滤。
4. 与 OMP 静态目录的关系：并行叠加、还是替换——本项目当前静态上游不是 Pi，两者的 provider 集合差异极大。
5. 更新触发：用户手动、启动时、还是周期；以及新鲜度常量取值（官方 4h 是客户端值，不是服务端承诺）。
6. 历史留存策略：官方旧 revision 访问能力未证实，因此 last-good 保留、bounded 历史缓存、多源发布（自己再发布一份镜像）都是可选项；选哪一项、是否需要，属待决策。
7. `radius` 条目与 Codex 条目的处置：前者是 Pi 账户权益，后者与项目已有 Codex 通路重叠。
8. `revision` 字段语义：项目当前 revision 是本地合成指纹，与官方 `sha256-` 内容指纹不同源，是否要在 UI 上区分展示。

## 十四、仍需宿主原型验证的事项

1. Zotero 特权请求能否对 `pi.dev` 发起请求、能否设置 `If-None-Match` 并拿到 304（`User-Agent` 仅影响是否需要显式带 `pi-version`，不是能力前提）。
2. 特权请求的实际首字节延迟与 856KB 传输在插件进程内的表现（本次公网观察约 0.5–1.2s）。
3. 写盘路径容量：856KB JSON 解析后常驻内存的量级，与本项目 `cacheDir` 现有 `pi-model-catalog.json` 的合并方式。
4. 断网/超时/半截响应时，本地目录是否足以独立支撑运行时。
5. 多 provider shard 拉取（如按需只取本项目支持的 provider）相对一次全量的收益——单 provider shard 实测 28KB，但官方没有提供“provider 列表”端点（`/api/models/providers` 是 307 重定向，不是列表）。

## 十五、冲突与不确定

- **多档兼容只有代码证据，没有部署证据**：`buildIndex()` 的实现会保留 `minimumPiVersion` 不同的旧 entry，`selectModelCatalog()` 也有完整阶梯选择逻辑；但本次只观察到“0.80.7 及以上命中同一档、0.80.6 及以下 404”，无法据此确认 index 实际有几档，也无法解释 0.80.7 以下为何 404。当前只能说不存在“按 Pi 版本分发不同目录”的**已观察**证据。
- **“immutable 缓存” 与实际 60s 缓存矛盾**：发布脚本设一年 immutable，API 返回 60s。以实际响应为准。
- **`Last-Modified` 存在但不参与条件请求**：容易被误用为 freshness 信号；上游客户端只用它做“是否新于本地静态目录”的粗筛。
- **CHANGELOG 措辞易被误读**：`types=chat,image,classifier` 不是筛选条件（已用字节比对证伪）。
- **错误体形状是单次观察**：`{ok:false,error}` 在本次 5 个错误响应中一致，但无规范、无源码约束，不应被当作稳定合同使用。
- **pi.dev 仓库不在快照内**：`src/shared/models/protocol.ts` 与 Worker 路由/响应头构造逻辑无第一方源码可查，本报告对响应头、缓存策略、501 文案的判断均为**本次观察**而非源码保证，未来可能变化。
- **无版本化 schema 暴露**：`schemaVersion` 只在 R2 路径前缀里，响应中不可见；消费方无法自检结构代际。
- **未知**：`https://pi.dev/models` 页面是否有机器可读变体；历史 revision 是否存在可访问路径（本轮未找到，但未证明不存在）；index 的完整档位构成；宿主上下文能否直连；5 条已实现执行通路各自的实机准入状态。

## 引用

一手来源（Pi `v1.0.0`，`a13d35a742c6ef8462812a28fbe1d8c8b7431c32`）：

- [scripts/model-catalog-protocol.ts](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/model-catalog-protocol.ts) — 存储布局注释、schema 版本、`parseModelCatalogRequest`、`selectModelCatalog`、`parseModelCatalogIndex`、版本比较
- [scripts/publish-model-catalog.mjs](https://github.com/earendil-works/pi/blob/v1.0.0/scripts/publish-model-catalog.mjs) — `MINIMUM_PI_VERSION`、`buildIndex`、`validateBundle`、缓存常量、发布门禁
- [.github/workflows/publish-model-catalog.yml](https://github.com/earendil-works/pi/blob/v1.0.0/.github/workflows/publish-model-catalog.yml) — 触发条件、发布窗口、R2 endpoint
- [packages/coding-agent/src/core/remote-catalog-provider.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/src/core/remote-catalog-provider.ts) — 4h 常量、4s 超时、`If-None-Match`、`lastModified` 语义、404/501/非 2xx 处理、类型过滤
- [packages/ai/scripts/generate-models.ts](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/scripts/generate-models.ts) — typed/legacy 容器构造、序列化选项
- [packages/coding-agent/docs/models.md](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/models.md) — 唯一的用户级文档保证
- [packages/ai/README.md](https://github.com/earendil-works/pi/blob/v1.0.0/packages/ai/README.md) — provider 动态刷新语义
- [packages/coding-agent/CHANGELOG.md](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/CHANGELOG.md) — `types=chat,image,classifier` 与 `If-None-Match` 的变更记录

一手接口（本次只读观察，2026-10-03）：

- `https://pi.dev/api/models`、`/api/models?pi-version=…`、`/api/models?types=…`、`/api/models/providers/<id>` 的 200/304/307/400/404/501 响应与响应头
- 载荷样本 `/tmp/pi-catalog-probe-20261003.json` 与 `/tmp/pi-catalog-probe-20261003.headers`

本项目事实来源：

- [src/modules/piModelCatalog.ts](../../src/modules/piModelCatalog.ts)、[src/shared/piProviderContract.ts](../../src/shared/piProviderContract.ts)、[tests/runtime/243-pi-model-catalog.test.ts](../../tests/runtime/243-pi-model-catalog.test.ts)
- [package.json](../../package.json)（`@earendil-works/pi-*: 0.84.4`、`@oh-my-pi/pi-catalog: 18.0.11`）、`node_modules/@oh-my-pi/pi-catalog/package.json`
- [src/modules/piProviderExecution.ts](../../src/modules/piProviderExecution.ts)、`src/modules/piOpenAICodexAuth.ts`（`Zotero.HTTP.request` 先例）

关联报告：[Pi 上游更新与本项目增量对齐评估](upstream-alignment-research-20261003.md)（本轮不重复其 Pi 版本对比结论）
