# Pi core 在 Zotero 中的无 Node 兼容性原型报告

## 结论

这条路线可行，插件不需要打包 Node.js 运行时。

固定版本的 `pi-agent-core` 根入口与 `pi-ai` 根入口可以直接打成 `firefox115` IIFE，运行
Agent 流式循环、工具调用、取消和清理。选择性加入官方 OpenAI provider 后，同一个 bundle
也能在 Zotero 7.0.32 与 9.0.4 中运行，并通过宿主注入的 `fetch` 完成 Responses API 的
请求与 SSE 解析。

OpenAI 路径有一个必须正视的条件：`pi-ai` 的 `provider-env.js` 包含 Bun 专用
`require("node:fs")`。该分支在 Zotero 中不会执行，但 esbuild 会在消除死代码前解析它。
原型使用一条精确到文件和模块名的浏览器 guard 处理这一个分支；其它 Node builtin 仍会让
构建失败。生产集成应把这条规则集中在 Pi runtime 的 bundle boundary，或推动上游提供无
该分支的 browser export，不能放宽成通用 Node polyfill。

## 原型边界

- `@earendil-works/pi-agent-core@0.84.3`
- `@earendil-works/pi-ai@0.84.3`
- `@earendil-works/pi-telemetry@0.84.3`
- `esbuild@0.25.12`
- `platform: browser`
- `format: iife`
- `target: firefox115`
- 不导入 `pi-agent-core/node`、`pi-agent-core/session/testing`、`providers/all`、`compat`、
  OAuth 或 Bedrock
- 依赖只安装在工作区外的临时目录；项目根 `package.json` 与 lockfile 未修改

原型公开一个稳定观察面：

```ts
runPiCompatibilityProbe(options): Promise<PiCompatibilityReport>
```

测试只观察结构化报告和 Agent 公开事件，不依赖 Pi 内部方法、私有状态或调用顺序。

## 已验证行为

### Agent core

faux provider 的第一轮响应同时产生文本和 `echo` 工具调用。工具收到
`{ text: "probe" }`，返回 `echo:probe`；Agent 随后发起第二轮请求并得到最终文本
`tool complete`。事件记录包含 `message_update`、`tool_execution_start` 和
`tool_execution_end`，运行结束后 `isStreaming` 为 false。

### 取消与清理

第二个 faux provider 以受控速率流式输出。在第一个 `text_delta` 后调用 `agent.abort()`，
最终消息保留 partial text，`stopReason` 为 `aborted`，Agent 回到 idle。取消订阅后再执行
一轮，原 listener 没有收到新事件；`reset()` 后消息数为 0，provider collection 随后清空。

### 官方 OpenAI provider

`openaiProvider()` 收到显式 API key 和自定义 fetch。fixture fetch 观察到：

- 方法为 `POST`
- URL 为 `https://api.openai.com/v1/responses`
- `AbortSignal` 已转发
- OpenAI SDK 与 pi-ai adapter 解析出一个 `text_delta`
- 最终文本为 `provider fixture`
- 最终 `stopReason` 为 `stop`

测试没有发送外部网络请求，也没有使用真实 API key。

## 构建结果

| Bundle               |         Raw |      gzip | 可达外部 Node builtin | 浏览器 guard                   |
| -------------------- | ----------: | --------: | --------------------: | ------------------------------ |
| core + faux          |   670,855 B | 110,290 B |                     0 | 无                             |
| core + faux + OpenAI | 1,210,816 B | 194,907 B |                     0 | `provider-env.js` 的 `node:fs` |

OpenAI provider 增加 539,961 B raw、84,617 B gzip。由于原型输出单文件且未做 code
splitting，这个数字代表选择 OpenAI 后的完整初始包成本。生产设计可以把 provider adapter
按配置分包或延迟载入，但 Zotero 插件的资源加载和 CSP 方案需要另行验证。

构建插件只 allowlist 以下组合：

```text
importer: @earendil-works/pi-ai/dist/utils/provider-env.js
specifier: node:fs
```

它被解析为执行即抛错的浏览器哨兵。任何其它 Node builtin import/require 都会使构建失败；
metafile 中没有外部 Node builtin。

## 真实 Zotero 结果

| Host          | Build          | 结果     |  用时 | `process` | `Buffer`  | `require("node:fs")` |
| ------------- | -------------- | -------- | ----: | --------- | --------- | -------------------- |
| Zotero 7.0.32 | 20260114201030 | 1 passed | 29 ms | undefined | undefined | 不可加载             |
| Zotero 9.0.4  | 20260522150903 | 1 passed | 47 ms | undefined | undefined | 不可加载             |

两版宿主都提供一个 Zotero 自身的 `require` 函数，因此“全局名 `require` 必须不存在”不是
有效的 Node 检测方法。探针改为检查 `process.versions.node`，并实际尝试加载 `node:fs`；
两版都确认没有可用 Node runtime。

两版的结构化行为结果一致：

```json
{
  "core": {
    "finalText": "tool complete",
    "idleAfterRun": true,
    "toolArguments": { "text": "probe" },
    "toolResult": "echo:probe"
  },
  "cancellation": {
    "partialText": "this",
    "stopReason": "aborted",
    "idleAfterAbort": true
  },
  "cleanup": {
    "listenerDetached": true,
    "messagesAfterReset": 0
  },
  "openaiFetch": {
    "called": true,
    "requestMethod": "POST",
    "requestUrl": "https://api.openai.com/v1/responses",
    "signalForwarded": true,
    "finalText": "provider fixture",
    "stopReason": "stop",
    "textDeltaCount": 1
  }
}
```

## 验证命令

依赖目录和输出目录均位于 `/tmp`。可复现流程为：

```bash
PI_PROTOTYPE_DEPS=/tmp/<exact-dependencies> \
PI_PROTOTYPE_OUTPUT=/tmp/<build-output> \
npm run build

PI_PROTOTYPE_OUTPUT=/tmp/<build-output> npm test
```

真实宿主测试由 build script 临时生成一个 self-contained test bundle，然后通过项目既有
scaffold runner 执行：

```bash
ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/usr/lib/zotero/zotero \
xvfb-run -a node_modules/.bin/tsx scripts/run-zotero-test-with-mock.ts \
  test:zotero:cli lite core --exit-on-finish

ZOTERO_PLUGIN_ZOTERO_BIN_PATH=/tmp/<zotero-7>/Zotero_linux-x86_64/zotero \
xvfb-run -a node_modules/.bin/tsx scripts/run-zotero-test-with-mock.ts \
  test:zotero:cli lite core --exit-on-finish
```

生成的 test bundle、scaffold 输出和临时 `node_modules` 链接均未纳入版本控制；正式
core-lite 聚合入口在验证后已恢复。

## 未覆盖范围与后续约束

- 没有验证真实 OpenAI 网络请求、Zotero 权限下的 CORS、proxy、重试、超时或限流。
- 没有验证 API key 的存储、脱敏和日志边界。生产设计不能把明文 key 写入 transcript、
  runtime log 或普通 prefs。
- 只验证了 OpenAI provider。Anthropic、Google、OpenRouter 等必须逐个选择、逐个打包和
  逐个审计，不能导入 `providers/all`。
- npm 包声明 `engines.node >=22.19.0`。实测证明所选浏览器入口能运行，但这不是上游正式的
  Zotero 支持承诺；升级 Pi 版本时必须重跑本探针。
- 未验证插件卸载/禁用、窗口关闭和多 Agent 并发时的长期资源释放。
- 未实现 shell、文件、网络沙箱、权限审批或 Zotero hostApi 工具。这些属于后续架构票据，
  本原型只证明 agent/provider runtime 的宿主兼容性。
- 未设计生产 provider 分包、LICENSE/NOTICE 物化或 bundle size budget。

## 对 MVP 的含义

内置 Pi runtime 可以继续按“纯插件内运行”设计，不应为它打包 Node.js。生产实现需要一个
单一、可审计的 browser runtime build boundary，负责固定 Pi 版本、选择 provider、拒绝
Node builtin、记录唯一的 Bun fallback guard，并输出体积与 metafile 证据。Agent 上层、
权限系统和 Zotero 原生工具只依赖该边界提供的深层接口，不直接接触 provider SDK 或构建
兼容细节。
