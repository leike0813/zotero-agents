# pi-core Zotero/Firefox 115 运行时兼容性

## 固定发布物

本原型固定使用：

```text
@earendil-works/pi-agent-core@0.84.3
@earendil-works/pi-ai@0.84.3
@earendil-works/pi-telemetry@0.84.3
```

Registry 发布时间为 2026-08-24 UTC；对应官方仓库 `v0.84.3` tag，release commit 为
`4e58f324fae8ebfa98a3d45181fb248072a2afac`。依赖应通过 lockfile 或 overrides 固定，
因为 core 对 pi-ai 与 pi-telemetry 使用 caret 范围。

## 包边界与导出

`pi-agent-core@0.84.3` 是 ESM（`type: module`），`engines.node` 为 `>=22.19.0`，
`module` 字段为空。导出为：

```text
.                 -> dist/index.js
./node            -> dist/node.js
./session/testing -> dist/harness/session/testing/index.js
./package.json
```

浏览器 bundle 只允许使用根入口 `.`。`./node` 和 `./session/testing` 不属于 Firefox
运行时路径。

`pi-agent-core` 的直接依赖为 `diff@8.0.4`、`ignore@7.0.5`、`typebox@1.3.7`、
`yaml@2.9.0`、`@earendil-works/pi-ai@^0.84.3` 与
`@earendil-works/pi-telemetry@^0.84.3`；没有 optionalDependencies。

`pi-ai@0.84.3` 同为 ESM，`engines.node` 为 `>=22.19.0`，`module` 字段为空。导出
根入口、`./api/*`、`./providers/*`、`./compat`、`./oauth`、`./bedrock-provider`、
`./bun-oauth` 与 `./package.json`。浏览器原型只选择根入口及明确的单一 provider。

## Node-only 触达路径

core 根入口没有静态 Node builtin import。以下路径必须排除：

```text
@earendil-works/pi-agent-core/node
  dist/harness/env/nodejs.js:
  node:child_process, node:crypto, node:fs, node:fs/promises,
  node:os, node:path, node:readline, node:url

@earendil-works/pi-agent-core/session/testing
  dist/harness/session/testing/conformance.js:
  node:assert/strict
```

pi-ai 根入口不导入 provider catalog 或 SDK，但其认证上下文包含受保护的运行时触达：

```text
dist/auth/context.js
  变量形式 import("node:fs/promises")、import("node:os")；
  仅 defaultProviderAuthContext().fileExists() 使用，浏览器失败时返回 false。

dist/env-api-keys.js
  变量形式 node:fs、node:os、node:path；仅 Node/Bun 分支使用。

dist/utils/provider-env.js
  require("node:fs")；仅 Bun /proc/self/environ fallback 使用。

dist/utils/pi-user-agent.js
  process.getBuiltinModule("node:os")；仅 Node/Bun 使用，浏览器返回 browser UA。

dist/api/openai-codex-responses.js
  process.getBuiltinModule("node:zlib")；浏览器回退到未压缩请求。

dist/auth/oauth/anthropic.js
  动态 node:http；OAuth callback server。
dist/auth/oauth/openai-codex.js
  动态 node:crypto、node:http；OAuth callback server。
dist/auth/oauth/radius.js
  动态 node:http；OAuth callback server。
dist/auth/oauth/openrouter.js
  静态 node:http；OAuth flow 使用。
dist/cli.js
  node:fs、node:readline；CLI 路径。
```

OAuth、Bedrock、CLI、core 的 `./node` 与 `./session/testing` 均不应进入 Zotero/Firefox
bundle。pi-ai 官方代码通过 lazy/变量 import 将 OAuth 和 Node-only 实现隔离；运行时仍
不得调用这些功能。

## 选择性 provider 与 tree-shaking

官方分层约束如下：

- `@earendil-works/pi-ai` 根入口不导入 built-in catalogs、provider factories 或 SDK。
- `@earendil-works/pi-ai/providers/<provider>` 只导入该 provider 的 catalog 与 lazy API wrapper。
- `@earendil-works/pi-ai/providers/all` 导入所有 provider 与 catalog，不能用于最小 bundle。
- `@earendil-works/pi-ai/compat` 保留完整旧 API surface，不能用于本原型。
- `@earendil-works/pi-ai/api/<api-id>` 会立即加载 API implementation 与 SDK。
- provider factory 的 SDK 在第一次请求时由 lazy wrapper 加载；无 code splitting 时会被合并
  到单 bundle。

本原型优先使用 `fauxProvider()` 验证 Agent 事件协议，再单独验证
`openaiProvider()`。不要导入 `providers/all`、`compat` 或 Bedrock provider。

## Agent 与流式接口

core 的 `StreamFn` 为：

```ts
type StreamFn = (
  model: Model<Api>,
  context: Context,
  options?: SimpleStreamOptions,
) => AssistantMessageEventStream | Promise<AssistantMessageEventStream>;
```

`StreamFn` 应将失败编码为 stream 的 `error` 事件与最终 `AssistantMessage`，不得把请求
失败作为 rejected promise 传播。`AssistantMessageEventStream` 是 `AsyncIterable`，提供
`push(event)`、`end(result?)` 与 `result()`。

标准事件包括：

```text
start
text_start / text_delta / text_end
thinking_start / thinking_delta / thinking_end
toolcall_start / toolcall_delta / toolcall_end
done / error
```

`Agent` 暴露 `prompt()`、`continue()`、`subscribe()`、`abort()`、`signal`、
`waitForIdle()` 与 `reset()`；工具 `execute()` 接收 `AbortSignal` 和可选的 partial-result
回调。`subscribe()` 返回 unsubscribe 函数，`agent_end` listener settle 后 Agent 才进入
idle。

## OpenAI provider 与 custom fetch

本原型使用官方 `openaiProvider()`，并显式传入 key 与 fetch：

```ts
const models = createModels();
models.setProvider(openaiProvider());

const stream = models.stream(model, context, {
  apiKey: explicitApiKey,
  fetch: customFetch,
  signal: controller.signal,
});
```

官方 OpenAI adapter 将 `options.fetch` 传给 `openai@6.40.0`，并启用
`dangerouslyAllowBrowser`。fixture 验证了 `POST /responses`、`AbortSignal` 转发、SSE
文本增量和最终 `stopReason`。API key 暴露风险仍由宿主承担；生产部署应优先使用后端
proxy，或在插件内建立不持久化明文 key 的凭据边界。

## License 与大小风险

两个 pi 包为 MIT。0.84.3 core 发布物约 1.91 MB unpacked/202 files，pi-ai 约 4.12 MB
unpacked/746 files；这不是最终 bundle 大小，provider SDK 与 catalog 会改变实际结果。

传递依赖还包含：OpenAI、Google GenAI、AWS Bedrock SDK、Smithy 为 Apache-2.0；Anthropic
SDK、proxy agents、TypeBox、partial-json、ignore 为 MIT；diff 为 BSD-3-Clause；yaml 为
ISC。发布 bundle 应保留相应 LICENSE/NOTICE，并执行 license scanner。

## 运行测量

原型统一以 esbuild `platform: browser`、`format: iife`、`target: firefox115`、无 code
splitting 构建：

| Bundle               |         Raw |      gzip | 外部 Node builtin |
| -------------------- | ----------: | --------: | ----------------- |
| core + faux          |   670,855 B | 110,290 B | 0                 |
| core + faux + OpenAI | 1,210,816 B | 194,907 B | 0                 |

OpenAI bundle 比 core/faux 增加 539,961 B raw、84,617 B gzip。官方 provider 的
`provider-env.js` 含一个 Bun 专用 `require("node:fs")`。esbuild 在死代码消除前仍会解析
它，因此原型只对这一处应用“执行即抛错”的浏览器 guard，并在构建时把 `process` 固定为
`undefined`；其它 Node builtin 一律使构建失败。Zotero 7/9 中 guard 均未触发。

同一探针在 Zotero 7.0.32 与 9.0.4 中通过。两者都没有 `process` 或 `Buffer`；宿主提供的
`require` 不能加载 `node:fs`。faux 场景完成了文本增量、工具调用、工具结果和第二轮最终
文本；首个文本片段后 abort 得到 `stopReason: "aborted"`，并回到 idle；unsubscribe 与
reset 后没有残留 listener 或消息。官方 OpenAI provider 使用注入 fetch 请求
`https://api.openai.com/v1/responses`，转发 signal，并解析出 fixture 文本。

完整命令、结构化结果、限制与结论见 [report.md](./report.md)。

## Primary sources

- [npm Registry: pi-agent-core](https://registry.npmjs.org/@earendil-works%2Fpi-agent-core)
- [npm Registry: pi-ai](https://registry.npmjs.org/@earendil-works%2Fpi-ai)
- [pi-agent-core 0.84.3 tarball](https://registry.npmjs.org/@earendil-works/pi-agent-core/-/pi-agent-core-0.84.3.tgz)
- [pi-ai 0.84.3 tarball](https://registry.npmjs.org/@earendil-works/pi-ai/-/pi-ai-0.84.3.tgz)
- [Official `v0.84.3` tag](https://github.com/earendil-works/pi/tree/v0.84.3)
- [v0.84.3 release commit](https://github.com/earendil-works/pi/commit/4e58f324fae8ebfa98a3d45181fb248072a2afac)
- [pi-ai README: browser/tree-shaking/provider contracts](https://github.com/earendil-works/pi/blob/v0.84.3/packages/ai/README.md)
- [core Agent source](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/agent.ts)
- [core Agent types](https://github.com/earendil-works/pi/blob/v0.84.3/packages/agent/src/types.ts)
- [pi-ai types/EventStream source](https://github.com/earendil-works/pi/blob/v0.84.3/packages/ai/src/types.ts)
- [OpenAI API implementation](https://github.com/earendil-works/pi/blob/v0.84.3/packages/ai/src/api/openai-responses.ts)
- [OpenAI Node SDK 6.40.0 Registry metadata](https://registry.npmjs.org/openai/6.40.0)
