# Host Bridge CLI 说明书

本文档描述当前实现中的 Host Bridge 与 `zotero-bridge` CLI。它面向
开发者、workflow 作者以及需要理解 ACP run workspace 行为的维护者。

本文档以 `artifact/host_bridge_cli_refactor_design_20260520.md` 为背景，
但只记录当前代码中已经实现的行为。若设计文档与本文档不一致，以当前
实现和本文档为准。

## 1. 定位

Host Bridge CLI 是 ACP agent 访问 Zotero host 能力的默认路径。ACP run
启动时，插件会准备 Host Bridge server、连接 profile、运行时环境变量和
`zotero-bridge` CLI 可执行文件路径，使 agent 能通过普通命令行访问
Zotero 的只读能力、workflow 控制、task 状态和已登记文件下载。

MCP server/protocol 作为面向第三方 Agent 的另一种 Host capability broker
保留并默认启动。它使用与 Host Bridge CLI 相同的 bearer token 鉴权方式，
并暴露与 Host Bridge capabilities 对等的工具语义。ACP skill run 内部的
默认 host access 路径仍是 Host Bridge CLI；CLI 不可用时，默认记录诊断并
继续当前 run 流程，不自动切换到显式 MCP 兼容路径。

### 1.1 Generated Host Bridge Surface

<!-- host-bridge-surface:doc-surface:start -->
This section is generated from the Host Bridge capability registry and Rust CLI mappings. Edit the registry or CLI source, then run `npm run render:host-bridge-surface`.

#### Public capabilities

| Capability | Category | Approval | Input | CLI exposure | Flags |
| --- | --- | --- | --- | --- | --- |
| `context.get_current_view` | context | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `context.get_selected_items` | context | `none` | `none` | `raw call only` | raw-only, mcp-mirror |
| `library.get_item_attachments` | library | `none` | `item-ref required` | `item attachments` | mcp-mirror |
| `library.get_item_detail` | library | `none` | `item-ref required` | `item get` | mcp-mirror |
| `library.get_item_notes` | library | `none` | `object required` | `item notes` | mcp-mirror |
| `library.get_note_detail` | library | `none` | `object required` | `note get` | mcp-mirror |
| `library.get_note_payload` | library | `none` | `object required` | `note payload` | mcp-mirror |
| `library.list_items` | library | `none` | `object` | `raw call only` | raw-only, mcp-mirror |
| `library.list_note_payloads` | library | `none` | `item-ref required` | `note payloads` | mcp-mirror |
| `library.search_items` | library | `none` | `object required` | `item search` | mcp-mirror |
| `topics.find_by_paper_ref` | topics | `none` | `object` | `topics find-by-paper-ref` | mcp-mirror |
| `topics.get_context` | topics | `none` | `object` | `topics get-context` | mcp-mirror |
| `topics.get_report` | topics | `none` | `object` | `topics get-report` | mcp-mirror |
| `topics.get_review_input` | topics | `none` | `object` | `topics get-review-input` | mcp-mirror |
| `topics.list` | topics | `none` | `object` | `topics list` | mcp-mirror |
| `schemas.get` | schemas | `none` | `object` | `schemas get` | mcp-mirror |
| `concepts.query` | concepts | `none` | `object` | `concepts query` | mcp-mirror |
| `citation_graph.get_layout` | citation_graph | `none` | `object` | `citation-graph get-layout` | cache-view, mcp-mirror |
| `citation_graph.get_metrics` | citation_graph | `none` | `object` | `citation-graph get-metrics` | cache-view, mcp-mirror |
| `citation_graph.get_overview` | citation_graph | `none` | `object` | `citation-graph overview` | cache-view, mcp-mirror |
| `citation_graph.get_slice` | citation_graph | `none` | `object` | `citation-graph get-slice` | cache-view, mcp-mirror |
| `citation_graph.query_cluster` | citation_graph | `none` | `object` | `citation-graph query-cluster` | cache-view, mcp-mirror |
| `citation_graph.rank_external_references` | citation_graph | `none` | `object` | `citation-graph rank-external-references` | cache-view, mcp-mirror |
| `citation_graph.rank_library_papers` | citation_graph | `none` | `object` | `citation-graph rank-library-papers` | cache-view, mcp-mirror |
| `citation_graph.refresh_metrics` | citation_graph | `zotero-ui-required` | `object` | `citation-graph refresh-metrics` | dangerous, mcp-mirror |
| `library_index.get` | library_index | `none` | `object` | `library-index get` | cache-view, mcp-mirror |
| `resolvers.resolve` | resolvers | `none` | `object` | `resolvers resolve` | mcp-mirror |
| `reference_index.get` | reference_index | `none` | `object` | `reference-index get` | cache-view, mcp-mirror |
| `paper_artifacts.export_filtered` | paper_artifacts | `none` | `object` | `paper-artifacts export-filtered` | mcp-mirror |
| `paper_artifacts.get_manifest` | paper_artifacts | `none` | `object` | `paper-artifacts manifest` | mcp-mirror |
| `paper_artifacts.read` | paper_artifacts | `none` | `object` | `paper-artifacts read` | mcp-mirror |
| `paper_artifacts.resolve_topic_digest` | paper_artifacts | `none` | `object` | `paper-artifacts resolve-topic-digest` | mcp-mirror |
| `insights.get_attention_queue` | insights | `none` | `object` | `insights attention-queue` | mcp-mirror |
| `mutation.execute` | mutation | `zotero-ui-required` | `mutation-preview required` | `literature ingest` | raw-only, mcp-mirror |
| `mutation.preview` | mutation | `none` | `mutation-preview required` | `raw call only` | raw-only, mcp-mirror |
| `diagnostic.get_status` | diagnostic | `none` | `none` | `raw call only` | raw-only, mcp-mirror |

#### CLI mappings

| CLI command | Target | Kind | Flags |
| --- | --- | --- | --- |
| `status` | `GET /bridge/v1/health` | endpoint | - |
| `manifest` | `GET /bridge/v1/manifest` | endpoint | - |
| `item attachments` | `library.get_item_attachments` | capability | - |
| `item get` | `library.get_item_detail` | capability | - |
| `item notes` | `library.get_item_notes` | capability | - |
| `item search` | `library.search_items` | capability | - |
| `note get` | `library.get_note_detail` | capability | - |
| `note payload` | `library.get_note_payload` | capability | - |
| `note payloads` | `library.list_note_payloads` | capability | - |
| `topics find-by-paper-ref` | `topics.find_by_paper_ref` | capability | - |
| `topics get-context` | `topics.get_context` | capability | - |
| `topics get-report` | `topics.get_report` | capability | - |
| `topics get-review-input` | `topics.get_review_input` | capability | - |
| `topics list` | `topics.list` | capability | - |
| `schemas get` | `schemas.get` | capability | - |
| `concepts query` | `concepts.query` | capability | - |
| `citation-graph get-layout` | `citation_graph.get_layout` | capability | cache-view |
| `citation-graph get-metrics` | `citation_graph.get_metrics` | capability | cache-view |
| `citation-graph get-slice` | `citation_graph.get_slice` | capability | cache-view |
| `citation-graph overview` | `citation_graph.get_overview` | capability | cache-view |
| `citation-graph query-cluster` | `citation_graph.query_cluster` | capability | cache-view |
| `citation-graph rank-external-references` | `citation_graph.rank_external_references` | capability | cache-view |
| `citation-graph rank-library-papers` | `citation_graph.rank_library_papers` | capability | cache-view |
| `citation-graph refresh-metrics` | `citation_graph.refresh_metrics` | capability | dangerous |
| `library-index get` | `library_index.get` | capability | cache-view |
| `resolvers resolve` | `resolvers.resolve` | capability | - |
| `reference-index get` | `reference_index.get` | capability | cache-view |
| `paper-artifacts export-filtered` | `paper_artifacts.export_filtered` | capability | - |
| `paper-artifacts manifest` | `paper_artifacts.get_manifest` | capability | - |
| `paper-artifacts read` | `paper_artifacts.read` | capability | - |
| `paper-artifacts resolve-topic-digest` | `paper_artifacts.resolve_topic_digest` | capability | - |
| `insights attention-queue` | `insights.get_attention_queue` | capability | - |
| `literature ingest` | `mutation.execute` | capability | - |
| `workflow list` | `GET /bridge/v1/workflows` | endpoint | - |
| `workflow run` | `GET /bridge/v1/workflows/runs/{runId}` | endpoint | - |
| `workflow submit` | `POST /bridge/v1/workflows/submit` | endpoint | - |
| `task list` | `GET /bridge/v1/tasks` | endpoint | - |
| `file download` | `GET /bridge/v1/files/{fileId}` | endpoint | - |
| `debug acp-skill-run reapply-result` | `debug.acpSkillRun.reapplyResult` | capability | - |
| `debug persistence` | `debug.persistence.snapshot` | capability | - |
| `debug status` | `debug.status` | capability | - |
| `debug synthesis diff` | `debug.synthesis.diff` | capability | - |
| `debug tasks` | `debug.tasks.snapshot` | capability | - |

#### Resolver payloads

- `resolvers resolve` accepts direct resolver fields in `--input`; do not wrap them in a top-level `resolver` object.
- Allowed selector fields are `tag`, `collection_key`, and `paper_refs`; at least one selector is required.
- `combine` is optional and defaults to `union`; use `intersection` when every provided selector type must match.
- `tag` accepts a tag string, a tag array, or an `{ and, or, not }` object. `collection_key` accepts a string or string array. `paper_refs` accepts canonical `libraryId:itemKey` refs.
- Examples: `zotero-bridge resolvers resolve --input '{"tag":{"and":["object-detection"],"not":["nlp-transformer"]}}'`; `zotero-bridge resolvers resolve --input '{"tag":"topic:vision","collection_key":["COLL_A"],"combine":"intersection"}'`.
- Legacy fields are rejected: `resolver`, `topic_resolver`, `mode`, `query`, `include`, and `exclude`.

#### Debug capabilities

| Capability | Category | Approval | Input | CLI exposure | Flags |
| --- | --- | --- | --- | --- | --- |
| `debug.acpSkillRun.reapplyResult` | debug | `none` | `object` | `debug acp-skill-run reapply-result` | debug-only, mcp-mirror |
| `debug.persistence.snapshot` | debug | `none` | `object` | `debug persistence` | debug-only, mcp-mirror |
| `debug.skillrunner.connections.snapshot` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.status` | debug | `none` | `object` | `debug status` | debug-only, mcp-mirror |
| `debug.synthesis.cache.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.cleanInstallReset` | debug | `zotero-ui-required` | `object` |  | debug-only, dangerous, mcp-mirror |
| `debug.synthesis.diff` | debug | `none` | `object` | `debug synthesis diff` | debug-only, mcp-mirror |
| `debug.synthesis.operations.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.paper.inspect` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.profiler.list` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.snapshot` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.synthesis.topic.inspect` | debug | `none` | `object` |  | debug-only, mcp-mirror |
| `debug.tasks.snapshot` | debug | `none` | `object` | `debug tasks` | debug-only, mcp-mirror |
| `debug.zotero.eval` | debug | `zotero-ui-required` | `object` | `raw call only` | debug-only, dangerous, raw-only, mcp-mirror |

MCP tools mirror Host Bridge capability names from the runtime registry and return structured content containing `{ capability, approval, data }`.
<!-- host-bridge-surface:doc-surface:end -->

## 2. 通信模型

CLI 通过本机 HTTP JSON 调用 Host Bridge：

```text
zotero-bridge
  -> HTTP JSON + Bearer token
  -> Host Bridge /bridge/v1
  -> Host capability broker / workflow control / file registry
```

Host Bridge 协议版本为：

```text
host-bridge.v1
```

CLI 输出 schema 为：

```text
zotero-bridge.cli.v1
```

除 `GET /bridge/v1/health` 以外，Host Bridge endpoint 都要求 bearer
token。token 由插件生成，不应写入 prompt、普通日志或 agent 可提交的
产物。

## 3. 连接配置

`zotero-bridge` 读取 endpoint、profile 和 token 的优先级如下。

Endpoint：

- 命令行参数：`--endpoint`
- 环境变量：`ZOTERO_BRIDGE_ENDPOINT`
- profile 字段：`endpoint`

Profile：

- 命令行参数：`--profile`
- 环境变量：`ZOTERO_BRIDGE_PROFILE`
- Zotero Skills well-known profile

Token：

- 环境变量：`ZOTERO_BRIDGE_TOKEN`
- profile 顶层字段：`tokenEnv`
- profile 字段：`auth.tokenEnv`
- profile 顶层字段：`token`
- profile 字段：`auth.token`

Endpoint 必须是 `http://`，并且路径必须包含 `/bridge/v1`。当前 CLI 不会
猜测随机端口；缺少 endpoint 时返回 `config_missing_endpoint`。

Scope：

- 环境变量：`ZOTERO_BRIDGE_SCOPE`
- profile 字段：`scope`

`ZOTERO_BRIDGE_SCOPE` 必须是 JSON 对象字符串，优先级高于 profile
`scope`。插件为 SkillRunner backend job 注入 `ZOTERO_BRIDGE_SCOPE`，用于把
该 task 发起的 Host Bridge 写库审批路由回 SkillRunner panel。

### 3.1 ACP run profile

ACP run workspace 中的 profile 由插件生成，路径通常由
`ZOTERO_BRIDGE_PROFILE` 指向 `.zotero-bridge/profile.json`。该文件不保存
token 明文，而是通过 `auth.tokenEnv` 引用 `ZOTERO_BRIDGE_TOKEN`：

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": {
    "type": "bearer",
    "tokenEnv": "ZOTERO_BRIDGE_TOKEN"
  },
  "scope": {
    "kind": "acp-skill-run",
    "requestId": "acp-run-request-id",
    "runId": "acp-run-request-id"
  }
}
```

`scope` 用于把需要审批的 Host Bridge CLI 请求关联回当前 ACP 上下文。
当 `scope.kind` 是 `acp-skill-run` 或 `acp-run`，且包含 `requestId` 或
`runId` 时，审批请求会进入 ACP Skills UI。当 `scope.kind` 是 `acp-chat`，
且包含当前 conversation id 时，审批请求会进入 ACP Chat panel。
当 `scope.kind` 是 `skillrunner-run`，且包含 `requestId` 或 `runId` 时，
审批请求会进入 SkillRunner panel 当前 task 的提示区。

部分 workflow 可以声明允许跳过写库审批。只有在 workflow 声明该能力、用户
在提交任务时勾选“自动批准写库”、且 ACP run profile 由插件注册后，scope
才会额外包含 `autoApproveWrites: true`。该标记只影响当前 run 内的 Host
Bridge 写库 mutation；workflow submit 仍需要原审批，手工伪造 scope 不会
绕过审批。

### 3.2 Well-known profile

普通终端中的 `zotero-bridge` 可以读取用户级 well-known profile。当前实现
会按平台写入 `bridge-profile.json`：

- Windows：`%LOCALAPPDATA%\Zotero-Skills\bridge-profile.json`
- macOS：`~/Library/Application Support/Zotero-Skills/bridge-profile.json`
- Linux：`${XDG_DATA_HOME:-~/.local/share}/Zotero-Skills/bridge-profile.json`

well-known profile 可直接保存 `auth.token`：

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "connectionMode": "local",
  "auth": {
    "type": "bearer",
    "token": "<redacted>"
  },
  "source": "well-known",
  "updatedAt": "2026-05-21T00:00:00.000Z"
}
```

文档和日志中只能使用占位符或 masked token，不应记录真实 token。

### 3.3 Remote LAN profile

远程主机调用 Host Bridge 时，必须在 Zotero 偏好页启用 LAN 访问。LAN
访问会强制使用固定端口；如果固定端口不可用，Host Bridge 会报错而不是
切到随机端口。远程配置应使用手动复制的 master token，而不是自动轮换的
本机 token：

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://<zotero-host-ip>:26570/bridge/v1",
  "connectionMode": "remote",
  "auth": {
    "type": "bearer",
    "token": "<master-token>"
  },
  "source": "manual-remote"
}
```

master token 只通过偏好页手动创建/轮换，并以加密 envelope 存入 prefs。
该加密用于避免 prefs 明文暴露，不等同于 OS keychain。Host Bridge 同时
接受当前自动 token 和 master token；manifest/status 只显示 masked token。

文件下载同样支持远程 profile：`zotero-bridge file download <fileId>
--output <path>` 会调用远程 endpoint 的 `/files/{fileId}`，仍然只接受
broker-issued opaque file id，不接受本地路径。

当 profile 声明 `connectionMode: "remote"` 时，CLI 会在已认证请求中发送
`X-Zotero-Bridge-Connection-Mode: remote`。Host Bridge 会据此避免把导出
结果直接写到调用方文件系统。当前 remote 模式下，`topics.get_context`
带 `outputPath/output_path` 和 `paper_artifacts.export_filtered` 会返回
`delivery.mode: "bridge-download"`，调用方必须先执行响应里的
`delivery.downloadCommand` 下载 zip bundle，再按 `delivery.unpackHint` 解压。

### 3.4 SkillRunner 托管环境 template profile

SkillRunner 托管环境可以预置一个 well-known template profile，只保存稳定
结构，不保存每次运行的 endpoint 或 token。每次提交任务时，插件会把当前
Host Bridge 远程 LAN endpoint 和 token 翻译成通用环境变量注入到
`runtime_options.env`。如果偏好页没有填写“发送给远程主机的本机 IP”，插件会调用
SkillRunner backend 的 `GET /v1/runtime/network/client-address`，使用 backend 从当前 HTTP
请求看到的 `client_ip` 作为本机 LAN IP；偏好页中的
`hostBridgeAdvertisedHost` 仅作为手动 override，并优先于后端反射结果：

```json
{
  "ZOTERO_BRIDGE_ENDPOINT": "http://<advertisedHost>:<pinnedPort>/bridge/v1",
  "ZOTERO_BRIDGE_TOKEN": "<current-host-bridge-token>",
  "ZOTERO_BRIDGE_SCOPE": "{\"kind\":\"skillrunner-run\",\"requestId\":\"<request-id>\",\"runId\":\"<request-id>\"}"
}
```

CLI endpoint 解析顺序保持为 `--endpoint` > `ZOTERO_BRIDGE_ENDPOINT` >
`profile.endpoint`，token 解析优先使用 `ZOTERO_BRIDGE_TOKEN`。CLI 也支持
`ZOTERO_BRIDGE_CONNECTION_MODE=local|remote` 覆盖 `profile.connectionMode`，
并使用 `ZOTERO_BRIDGE_SCOPE` 覆盖 template profile 中的 `scope`。
因此发布包中的通用 template profile 可以默认声明 `connectionMode: "local"`，
再由远程 SkillRunner job 注入 `ZOTERO_BRIDGE_CONNECTION_MODE=remote`；也可以
直接保存 remote template profile，并通过 `auth.tokenEnv:
"ZOTERO_BRIDGE_TOKEN"` 读取每次运行注入的 token：

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:0/bridge/v1",
  "connectionMode": "local",
  "auth": {
    "type": "bearer",
    "tokenEnv": "ZOTERO_BRIDGE_TOKEN"
  },
  "source": "skillrunner-template"
}
```

v1 仅支持 LAN 远程调用。插件只会使用 Host Bridge status 中的
手动 advertised host，或 SkillRunner 后端反射得到的 client IP 与 pinned port
组成 remote endpoint；
若 LAN 未启用、固定端口不可用、手动 host 或反射 `client_ip` 不可用、loopback
或 `0.0.0.0`，任务会在准备阶段失败，不会提交带错误 endpoint 的 SkillRunner
job。

远程 SkillRunner 环境中的 agent 如果看到如下交付字段，应照命令下载并解压：

```json
{
  "delivery": {
    "mode": "bridge-download",
    "bundle": {
      "fileId": "file-...",
      "displayName": "topic-context-object-detection-semantic.zip",
      "contentType": "application/zip",
      "size": 1234,
      "expiresAt": "2026-06-16T00:30:00.000Z"
    },
    "downloadCommand": "zotero-bridge file download file-... --output topic-context-object-detection-semantic.zip",
    "unpackHint": "unzip topic-context-object-detection-semantic.zip -d ."
  }
}
```

## 4. ACP run workspace 注入

ACP skill run 准备阶段会生成 `.zotero-bridge` 目录：

- `.zotero-bridge/profile.json`：当前 run 的 Host Bridge profile。
- `.zotero-bridge/README.md`：写给 agent 的运行时使用提示。

该目录属于共享 run workspace 的 Host Bridge 注入面。ACP runner-owned
result/audit 文件由 provider 另行放在 `result/<skillId>.n/` 与
`.audit/<skillId>.n/` 子空间；这不改变 Host Bridge CLI 的 profile、token
或命令解析行为。

同时，插件会向 backend runtime 注入环境变量：

- `ZOTERO_BRIDGE_PROFILE`
- `ZOTERO_BRIDGE_TOKEN`
- `PATH`，当 CLI 可用时临时加入 bundled CLI 所在目录。

Agent 应直接调用裸命令 `zotero-bridge`，不要把插件内部 binary 路径写入
prompt、产物或脚本。run workspace profile 不保存 token 明文；token 只通过
环境变量传给 CLI。

如果 CLI binary、Host Bridge endpoint 或 token 不可用，本次 run 的诊断
会记录不可用原因。默认不会启用显式 MCP 兼容路径。

## 5. CLI 命令树

所有命令都支持顶层 `--endpoint` 和 `--profile`。

```text
zotero-bridge status
zotero-bridge manifest
zotero-bridge call <capability> [--input <JSON_OR_FILE>]
zotero-bridge item search --query <text> [--limit <n>] [--library-id <id>]
zotero-bridge item get (--key <key> | --id <id>) [--library-id <id>]
zotero-bridge item notes (--key <key> | --id <id>) [--limit <n>] [--cursor <n>] [--max-excerpt-chars <n>]
zotero-bridge item attachments (--key <key> | --id <id>) [--library-id <id>]
zotero-bridge note get (--key <key> | --id <id>) [--format text|html] [--offset <n>] [--max-chars <n>]
zotero-bridge note payloads (--key <key> | --id <id>)
zotero-bridge note payload (--key <key> | --id <id>) [--payload-type <type>] [--offset <n>] [--max-chars <n>]
zotero-bridge topics <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge citation-graph <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge paper-artifacts <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge insights <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge literature ingest --input <JSON_OR_FILE>
zotero-bridge workflow list
zotero-bridge workflow submit --workflow <id> --input <JSON_OR_FILE>
zotero-bridge workflow run <runId>
zotero-bridge task list [--workflow <id>] [--backend <id>] [--backend-type <type>] [--request <id>] [--run <runId>] [--state <state>] [--active-only]
zotero-bridge file download <fileId> --output <path> [--force]
```

`zotero-bridge --help` 和各级 subcommand `--help` 是 CLI 自探索入口。
逐命令的可复现实现规格见本文末尾“命令级实现参考”。

### 5.1 状态与 manifest

`status` 调用 `GET /bridge/v1/health`，不需要 token。它用于确认 bridge 是否
可达，以及协议版本是否兼容。

`manifest` 调用 `GET /bridge/v1/manifest`，需要 token。manifest 包含：

- `protocol`
- endpoint bind metadata
- masked auth metadata
- capabilities
- workflow control 支持状态
- file download 支持状态
- CLI metadata

当前 manifest 中 CLI metadata 固定为：

```json
{
  "supported": true,
  "schema": "zotero-bridge.cli.v1"
}
```

`cli.supported` 表示 Host Bridge 协议支持 `zotero-bridge` CLI 访问，不表示
当前 shell 的 `PATH` 一定已经配置。

### 5.2 语义命令

推荐 agent 优先使用语义命令，而不是 raw capability call：

- `item search` -> `library.search_items`
- `item get` -> `library.get_item_detail`
- `item notes` -> `library.get_item_notes`
- `item attachments` -> `library.get_item_attachments`
- `note get` -> `library.get_note_detail`
- `note payloads` -> `library.list_note_payloads`
- `note payload` -> `library.get_note_payload`
- `topics list` -> `topics.list`
- `topics get-context` -> `topics.get_context`
- `topics get-report` -> `topics.get_report`
- `topics get-review-input` -> `topics.get_review_input`
- `schemas get` -> `schemas.get`
- `concepts query` -> `concepts.query`
- `library-index get` -> `library_index.get`
  sidecar cache view, not synchronized Zotero Library truth
- `resolvers resolve` -> `resolvers.resolve`
- `citation-graph get-metrics` -> `citation_graph.get_metrics`
  sidecar cache view, not synchronized Zotero Library truth
- `citation-graph rank-external-references` ->
  `citation_graph.rank_external_references`
- `citation-graph rank-library-papers` ->
  `citation_graph.rank_library_papers`
- `insights attention-queue` -> `insights.get_attention_queue`
- `paper-artifacts export-filtered` -> `paper_artifacts.export_filtered`
- `literature ingest` -> `mutation.execute` with operation `literature.ingest`
- raw `call mutation.execute` with operation `note.upsertPayload` -> upsert one
  embedded workflow payload attachment on a Zotero note

这些命令不会直接读取 Zotero SQLite、storage 目录或本地文件路径。读命令只通过
Host Bridge capability 返回 JSON-safe DTO；`literature ingest` 只通过审批后的
Host Bridge mutation 写入 Zotero。完整语义命令映射以 1.1 的 generated
surface 为准。

Synthesis registry、library-index、citation-graph 相关读命令只暴露插件
sidecar cache 视图，可能滞后或为空。需要当前 Zotero 条目、笔记、附件、标签、
集合、related item 等事实时，应使用 `item` / `note` 命令直读 Zotero Library；
需要当前 digest/topic 生成物时，应使用 artifact-oriented synthesis 读命令。

### 5.3 Raw capability call

`call <capability>` 是高级诊断接口，用于直接调用 `POST /bridge/v1/call`。
常规读取场景应优先使用 `item`、`note`、`topics`、`citation-graph`、
`library-index`、`reference-index`、`paper-artifacts`、`resolvers`、
`schemas`、`concepts` 和 `insights` 语义命令，而不是手写 raw capability
name。

`--input` 支持：

- inline JSON，例如 `{"key":"ABCD1234","libraryId":1}`
- JSON 文件路径
- `@file` 语法
- `-`，从 stdin 读取 JSON

省略 `--input` 时使用 `{}`。

当前主要 capability 包括：

- `context.get_current_view`
- `context.get_selected_items`
- `library.search_items`
- `library.list_items`
- `library.get_item_detail`
- `library.get_item_notes`
- `library.get_note_detail`
- `library.list_note_payloads`
- `library.get_note_payload`
- `library.get_item_attachments`
- `mutation.preview`
- `mutation.execute`
- `diagnostic.get_status`

其中 `mutation.execute` 需要 Zotero-side approval。

### 5.4 Workflow 命令

`workflow list` 返回已加载 workflow 的摘要，包括 id、label、provider、
version、source kind、是否可配置、是否接受 no-selection 输入等。

`workflow submit` 需要显式 JSON input，不会使用 Zotero 当前 UI selection
作为 fallback。输入支持两类：

```json
{
  "items": [
    {
      "key": "ABCD1234",
      "libraryId": 1
    }
  ]
}
```

或 no-selection workflow 使用：

```json
{
  "kind": "none"
}
```

`workflow submit` 会请求 Zotero UI 审批。审批通过后，Host Bridge 复用现有
workflow preparation、duplicate guard、execution 和 apply seam。submit 不等待
完整 workflow 结束，而是返回 runId、jobIds、初始 task 状态和 permission
结果。

`workflow run <runId>` 查询单个 run 的当前/历史状态。

### 5.5 Task 命令

`task list` 查询 active 和 recent task summary。当前过滤项包括：

- `--workflow`
- `--backend`
- `--backend-type`
- `--request`
- `--run`
- `--state`
- `--active-only`

`--active-only` 会让请求带上 `includeHistory=false`，只返回 active runtime
rows。

### 5.6 File download

`file download` 只接受 broker 签发的 opaque `fileId`：

```text
zotero-bridge file download file-... --output paper.pdf
```

`fileId` 不能是本地路径，不能包含 `/`、`\`、`..` 或 `:`。未知、过期或不可用
的 file handle 会返回结构化错误。

默认不覆盖已有输出文件；需要覆盖时显式传 `--force`。成功 payload 只返回
`outputName`，不会回显完整本地输出路径：

```json
{
  "command": "file.download",
  "fileId": "file-...",
  "outputName": "paper.pdf",
  "bytesWritten": 12345,
  "contentType": "application/pdf",
  "overwritten": false
}
```

下载不需要审批，但只能下载 Host Bridge file registry 已登记的文件。

## 6. 输出契约

CLI stdout 始终只输出一个最终 JSON 对象。成功格式：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

失败格式：

```json
{
  "ok": false,
  "error": {
    "code": "config_missing_endpoint",
    "category": "config",
    "message": "Bridge endpoint is required via --endpoint, ZOTERO_BRIDGE_ENDPOINT, or profile.endpoint"
  },
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

stderr 预留给非结构化的人类提示，例如等待 Zotero UI 审批时的提示。agent
解析时应只读取 stdout JSON 和进程 exit code。

## 7. 错误分类与 exit code

当前 CLI 按 error category 返回稳定 exit code：

| Category | Exit code | 说明 |
| --- | ---: | --- |
| `usage` | 2 | 命令行用法错误，由 clap 处理 |
| `config` | 3 | endpoint、profile、token 等配置缺失或无效 |
| `connection` | 4 | 无法连接 Host Bridge 或请求/响应失败 |
| `auth` | 5 | Bearer token 被拒绝 |
| `permission` | 6 | Zotero UI 审批被拒绝、超时或不可用 |
| `validation` | 7 | 输入 JSON、item ref、fileId 或 workflow input 无效 |
| `capability` | 8 | capability 不存在或执行失败 |
| `workflow` | 9 | workflow 不存在、run 不存在或提交失败 |
| `download` | 10 | file handle 或下载输出失败 |
| `protocol` | 11 | Host Bridge response envelope、JSON 或协议版本不兼容 |
| `internal` | 70 | CLI 内部错误 |

Host Bridge 返回的错误会被 CLI 映射到上述 category。错误 payload 的
`details` 可能包含 bridge envelope 的诊断信息，但不应包含 token。下载输出
相关错误只返回 `outputName`，不返回完整输出路径。

## 8. 审批行为

Host Bridge 根据 capability 或 operation metadata 决定是否需要审批，CLI
不能自批。

不需要审批：

- `status`
- `manifest`
- context/library 只读 capability
- `mutation.preview`
- `diagnostic.get_status`
- `workflow list`
- `workflow run`
- `task list`
- `file download`

需要 Zotero UI 审批：

- `workflow submit`
- `mutation.execute`
- `literature ingest`

当请求来自 ACP run scope 时，审批进入 ACP Skills UI。当请求来自 ACP Chat
scope 时，审批进入 ACP Chat panel。当请求来自 SkillRunner run scope 时，
审批进入 SkillRunner panel。没有有效 run/chat scope 时，Host Bridge 使用全局
Zotero approval UI。用户拒绝、等待超时或目标 UI 不可用时，CLI 返回
`ok: false`，category 为 `permission`。带有有效 scope 的请求不会 fallback
到全局 Zotero approval UI。

## 9. HTTP API reference

所有 endpoint 都位于 `/bridge/v1` 下。

### `GET /bridge/v1/health`

免鉴权。返回 Host Bridge service status、protocol、bind mode、LAN 状态和
`authRequired`。

### `GET /bridge/v1/manifest`

需要鉴权。返回 bridge protocol、endpoint metadata、masked auth metadata、
capabilities、workflow control、file download 和 CLI metadata。

### `POST /bridge/v1/call`

需要鉴权。请求体：

```json
{
  "capability": "library.get_item_detail",
  "input": {
    "key": "ABCD1234",
    "libraryId": 1
  }
}
```

响应通过 Host Bridge envelope 包装：

```json
{
  "status": "ok",
  "result": {
    "capability": "library.get_item_detail",
    "approval": "none",
    "data": {}
  }
}
```

### `GET /bridge/v1/workflows`

需要鉴权。返回 `{ "workflows": [...] }`。

### `POST /bridge/v1/workflows/submit`

需要鉴权和 Zotero UI 审批。请求体：

```json
{
  "workflowId": "workflow-id",
  "input": {
    "items": [
      {
        "key": "ABCD1234",
        "libraryId": 1
      }
    ]
  }
}
```

Host Bridge 要求显式 input。缺少 input、空 items、无效 item ref 或
不允许 no-selection 的 workflow 使用 `kind=none` 都会失败。

### `GET /bridge/v1/workflows/runs/{runId}`

需要鉴权。返回 run 是否存在、run summary 和 task state。

### `GET /bridge/v1/tasks`

需要鉴权。返回 active 与 recent task summaries。支持 query filters：

- `workflowId`
- `backendId`
- `backendType`
- `requestId`
- `runId`
- `state`
- `includeHistory=false`

### `GET /bridge/v1/files/{fileId}`

需要鉴权。成功时返回文件 bytes，不使用 JSON envelope。失败时返回结构化
Host Bridge JSON error。当前不支持任意 path 下载，也不支持由 client 注册
本地 path。

## 10. 安全边界

使用 Host Bridge CLI 时必须遵守以下边界：

- 不打印、不持久化、不提交真实 bearer token。
- 不读取 Zotero SQLite、storage 目录、插件内部文件或用户本地路径来绕过
  Host Bridge。
- 不把本地绝对路径作为公共 API 输入或输出。
- 不依赖 MCP 作为默认 fallback。
- MCP 工具名与 Host Bridge capability 名称保持对等，例如
  `library.get_item_detail`、`diagnostic.get_status` 和 `topics.list`。
- `file download` 只能使用 broker-issued `fileId`。
- workflow submit 必须使用显式 input，不能从当前 Zotero UI selection 推断。
- 写操作必须等待 Zotero UI 审批，CLI 不能自动批准自己发起的操作。

## 11. 安装与 PATH

ACP run 使用插件内置 CLI，并通过临时 `PATH` 注入让 agent 可以直接运行
`zotero-bridge`。这不依赖用户把 CLI 安装到普通终端 PATH。

插件设置页的一键安装用于人类终端。Windows 上如果自动写入用户 PATH 成功，
需要重启终端后裸 `zotero-bridge` 才会生效。安装状态中的
`cli.supported` 不表示当前 shell PATH 已经可用。

开发和诊断场景可用 `ZOTERO_BRIDGE_CLI` 指向外部 CLI binary。生产默认路径
仍应优先使用插件内置 CLI。

## 12. 命令级实现参考

本节按“可以据此复现 CLI”的粒度描述每个命令。除非特别说明，所有命令都
遵守以下通用规则：

- 程序启动后先解析 CLI 参数，再读取配置。
- 所有命令都需要可解析的 endpoint；`status` 不需要 token，但也不会猜测
  endpoint。
- 需要鉴权的命令必须取得 token，否则返回 `config_missing_token`。
- 请求使用 HTTP/1.1，`Accept: application/json`，`Connection: close`。
- 需要鉴权时设置 `Authorization: Bearer <token>`。
- 需要鉴权且 env 或 profile 含 `scope` 时，设置
  `X-Zotero-Bridge-Scope: <scope-json>`。
- JSON endpoint 的 Host Bridge 成功 envelope 必须是
  `{ "status": "ok", "result": ... }`。
- CLI stdout 只打印最终 CLI envelope，不打印原始 HTTP envelope。

### 12.1 CLI envelope

所有成功命令：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

所有失败命令：

```json
{
  "ok": false,
  "error": {
    "code": "error_code",
    "category": "config",
    "message": "Human-readable message",
    "details": {}
  },
  "meta": {
    "cli": "zotero-bridge",
    "schema": "zotero-bridge.cli.v1"
  }
}
```

`details` 可省略。实现时不要依赖字段顺序。

### 12.2 通用 JSON input 解析

以下参数类型使用 `JSON_OR_FILE`：

- domain semantic commands with `--input`, such as `topics get-context`,
  `citation-graph get-metrics`, `paper-artifacts read`, `schemas get`,
  `concepts query`, and `insights attention-queue`
- `literature ingest --input`
- `call --input`
- `workflow submit --input`

解析规则：

| 输入 | 行为 |
| --- | --- |
| 参数省略 | semantic command `--input` 与 `call --input` 可省略，解析为 `{}` |
| `-` | 从 stdin 读取完整 JSON 文本 |
| `@file` | 去掉 `@` 后按文件路径读取 |
| 已存在的路径 | 读取该文件 |
| 其他字符串 | 按 inline JSON 解析 |

读取 stdin 失败返回：

```json
{
  "code": "input_stdin_failed",
  "category": "validation"
}
```

读取文件失败返回：

```json
{
  "code": "input_file_unreadable",
  "category": "validation",
  "details": {
    "path": "<input>",
    "message": "<io-error>"
  }
}
```

JSON 解析失败返回：

```json
{
  "code": "input_json_invalid",
  "category": "validation"
}
```

### 12.3 item/note ref 参数

以下命令使用 item/note ref：

- `item get`
- `item notes`
- `item attachments`
- `note get`
- `note payloads`
- `note payload`

必须且只能提供一个：

```text
--key <itemKey>
--id <numericId>
```

可选：

```text
--library-id <libraryId>
```

CLI 映射到 Host Bridge input：

```json
{
  "key": "ABCD1234",
  "libraryId": 1
}
```

或：

```json
{
  "id": 123
}
```

缺少 ref 或同时提供 `--key` / `--id` 时返回：

```json
{
  "code": "missing_item_ref",
  "category": "validation"
}
```

### 12.4 `status`

调用格式：

```text
zotero-bridge status [--endpoint <url>] [--profile <path>]
```

配置要求：

- 需要 endpoint。
- 不需要 token。

HTTP 映射：

```text
GET <endpoint>/health
```

成功 `data`：

```json
{
  "status": "running",
  "protocol": "host-bridge.v1",
  "bindMode": "loopback",
  "lanEnabled": false,
  "authRequired": true
}
```

CLI 会检查 `data.protocol === "host-bridge.v1"`。不匹配时返回：

```json
{
  "code": "incompatible_bridge_protocol",
  "category": "protocol",
  "details": {
    "expected": "host-bridge.v1",
    "actual": "<protocol>"
  }
}
```

典型错误：

| Code | Category | Exit |
| --- | --- | ---: |
| `config_missing_endpoint` | `config` | 3 |
| `config_unsupported_endpoint` | `config` | 3 |
| `config_invalid_endpoint` | `config` | 3 |
| `bridge_unavailable` | `connection` | 4 |
| `invalid_bridge_json` | `protocol` | 11 |
| `invalid_bridge_envelope` | `protocol` | 11 |
| `incompatible_bridge_protocol` | `protocol` | 11 |

### 12.5 `manifest`

调用格式：

```text
zotero-bridge manifest [--endpoint <url>] [--profile <path>]
```

配置要求：

- 需要 endpoint。
- 需要 token。

HTTP 映射：

```text
GET <endpoint>/manifest
Authorization: Bearer <token>
```

成功 `data`：

```json
{
  "protocol": "host-bridge.v1",
  "endpoint": {
    "url": "http://127.0.0.1:<port>/bridge/v1",
    "bindMode": "loopback",
    "lanEnabled": false
  },
  "auth": {
    "type": "bearer",
    "tokenMasked": "tok..."
  },
  "capabilities": [
    {
      "name": "library.get_item_detail",
      "category": "library",
      "summary": "Return detailed JSON-safe metadata for one Zotero item.",
      "approval": "none",
      "input": {
        "type": "item-ref",
        "required": true
      }
    }
  ],
  "workflowControl": {
    "supported": true,
    "endpoints": [
      "GET /bridge/v1/workflows",
      "POST /bridge/v1/workflows/submit",
      "GET /bridge/v1/workflows/runs/{runId}",
      "GET /bridge/v1/tasks"
    ],
    "explicitInputRequired": true,
    "submitRequiresApproval": true
  },
  "fileDownloads": {
    "supported": true,
    "endpoint": "GET /bridge/v1/files/{fileId}",
    "arbitraryPathAllowed": false,
    "approvalRequired": false
  },
  "cli": {
    "supported": true,
    "schema": "zotero-bridge.cli.v1"
  }
}
```

`manifest` 同样检查 `protocol`。manifest 不包含 bearer token 明文。

典型错误：

| Code | Category | Exit |
| --- | --- | ---: |
| `config_missing_token` | `config` | 3 |
| `unauthorized` | `auth` | 5 |
| `bridge_unavailable` | `connection` | 4 |
| `incompatible_bridge_protocol` | `protocol` | 11 |

### 12.6 `call <capability>`

调用格式：

```text
zotero-bridge call <capability> [--input <JSON_OR_FILE>]
```

HTTP 映射：

```text
POST <endpoint>/call
Authorization: Bearer <token>
Content-Type: application/json

{
  "capability": "<capability>",
  "input": {}
}
```

成功 `data`：

```json
{
  "capability": "library.get_item_detail",
  "approval": "none",
  "data": {}
}
```

`approval` 为：

- `none`
- `zotero-ui-required`

Host Bridge capability 失败时，CLI 会把 bridge error 放入
`error.details.bridge`：

```json
{
  "ok": false,
  "error": {
    "code": "capability_not_found",
    "category": "capability",
    "message": "Host Bridge returned an error",
    "details": {
      "status": 404,
      "bridge": {
        "status": "error",
        "error": {
          "code": "capability_not_found",
          "message": "Host Bridge capability not found",
          "category": "capability"
        }
      }
    }
  }
}
```

典型错误：

| Code | Category | Exit |
| --- | --- | ---: |
| `capability_not_found` | `capability` | 8 |
| `capability_failed` | `capability` | 8 |
| `invalid_capability_input` | `validation` | 7 |
| `permission_denied` | `permission` | 6 |
| `permission_timeout` | `permission` | 6 |
| `permission_ui_unavailable` | `permission` | 6 |

### 12.7 Domain semantic commands

调用格式：

```text
zotero-bridge topics <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge schemas get [--input <JSON_OR_FILE>]
zotero-bridge concepts query [--input <JSON_OR_FILE>]
zotero-bridge citation-graph <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge library-index get [--input <JSON_OR_FILE>]
zotero-bridge resolvers resolve [--input <JSON_OR_FILE>]
zotero-bridge reference-index get [--input <JSON_OR_FILE>]
zotero-bridge paper-artifacts <subcommand> [--input <JSON_OR_FILE>]
zotero-bridge insights <subcommand> [--input <JSON_OR_FILE>]
```

这些领域语义命令都通过 `POST <endpoint>/call` 调用对应 Host Bridge
capability，但 agent-facing CLI 不需要写 raw capability name。
`--input` 复用通用 `JSON_OR_FILE` 规则；省略时 input 为 `{}`。

完整子命令映射以 1.1 的 generated surface 为准。该区块由 capability
registry 和 Rust CLI source 渲染，新增、删除或重命名 Host Bridge surface
时应先更新 SSOT，再运行 `npm run render:host-bridge-surface`。

典型调用：

```text
zotero-bridge topics list --input '{}'
zotero-bridge topics get-context --input '{"topicId":"topic-id"}'
zotero-bridge topics get-context --input '{"topicId":"topic-id","view":"digest"}'
zotero-bridge topics get-context --input '{"topicId":"topic-id","view":"semantic","outputPath":"runtime/topic-context.semantic.json"}'
zotero-bridge topics get-context --input '{"topicId":"topic-id","view":"audit","outputPath":"runtime/topic-context.audit.json","overwrite":true}'
zotero-bridge topics get-report --input '{"topicId":"topic-id"}'
zotero-bridge library-index get --input '{"cursor":0,"limit":50}'
zotero-bridge resolvers resolve --input @runtime/payloads/resolver-input.json
zotero-bridge citation-graph get-metrics --input @runtime/payloads/metrics-input.json
zotero-bridge citation-graph rank-external-references --input '{"limit":10}'
zotero-bridge insights attention-queue --input '{}'
zotero-bridge paper-artifacts export-filtered --input @runtime/payloads/export-input.json
```

`topics get-context` 未传 `view` 时保持 legacy flat 输出，供旧 workflow
继续使用。显式 `view` 使用 v2 topic context envelope：`digest` 返回基础信息
和语义摘要，`semantic` 返回完整语义内容，`audit` 返回 hashes、freshness、
discovery 和 diagnostics，`full` 返回上述三者的嵌套组合。大体量
`semantic` 或 `full` 读取应优先传 `outputPath`，此时 stdout 只返回包含
path、bytes、sha256 和 `omitted_inline_result: true` 的 compact envelope。
local profile 会直接写该文件；remote profile 会把该路径作为 zip entry
返回 `delivery.mode: "bridge-download"`，不会写调用方文件系统。

`paper-artifacts export-filtered` 在 local profile 下会在
`run_root/runtime/payloads/` 下写出 `paper-artifacts-manifest.json` 和
content 文件。remote profile 会在 host 侧临时目录生成相同相对结构并打包为
zip，响应里的 `manifest_file` 仍指向 zip 内的
`runtime/payloads/paper-artifacts-manifest.json`。

`resolvers resolve` 的输入是直接 resolver payload，不要再包一层
`resolver`：

```json
{
  "tag": { "and": ["object-detection"], "not": ["nlp-transformer"] },
  "collection_key": ["COLL_A", "COLL_B"],
  "paper_refs": ["1:DETR2020", "1:DINO2022"],
  "combine": "union"
}
```

至少需要 `tag`、`collection_key`、`paper_refs` 之一。多 selector 默认
`combine:"union"`，任一 selector 类型命中即返回；传
`combine:"intersection"` 时，必须命中所有已提供的 selector 类型才返回。
旧字段 `resolver`、`topic_resolver`、`mode`、`query`、`include` 和
`exclude` 都会被拒绝。

`library-index get`、`reference-index get` 和 citation-graph cache-view
子命令返回 Synthesis 持久缓存视图。它们不保证已经与 Zotero Library 同步，也
不会为了读取而启动 refresh。Agent 需要当前 Zotero 事实时必须走 `item` /
`note` 命令；需要生成物事实时走 topic context、topic report、manifest 或
paper artifact 读命令。

`reference-index get` 默认返回 source paper registry rows。需要读取当前
source paper 的逐条 references 及其库内绑定信息时，传
`includeReferences:true` 和 `referenceSourceRefs:["<paper_ref>"]`；需要按
raw reference 精确过滤时，可同时传 `rawReferenceIds`。

成功 `data` 仍是 Host Bridge capability envelope：

```json
{
  "capability": "topics.list",
  "approval": "none",
  "data": {}
}
```

典型错误与 raw `call` 相同，包括：

| Code | Category | Exit |
| --- | --- | ---: |
| `capability_not_found` | `capability` | 8 |
| `capability_failed` | `capability` | 8 |
| `invalid_capability_input` | `validation` | 7 |
| `input_file_unreadable` | `validation` | 7 |
| `input_json_invalid` | `validation` | 7 |

### 12.7.1 `literature ingest`

调用格式：

```text
zotero-bridge literature ingest --input <JSON_OR_FILE>
```

输入必须是 JSON object，包含单个 `paper` 和可选 `collection`。CLI 会将它包装为
canonical mutation operation：

```json
{
  "operation": "literature.ingest",
  "paper": {
    "title": "Paper title",
    "authors": ["Author One"],
    "year": 2026,
    "doi": "10.1000/example",
    "arxiv": "2601.00001",
    "pmid": "12345678",
    "isbn": "9780000000000",
    "landingUrl": "https://example.org/paper",
    "pdfUrl": "https://example.org/paper.pdf",
    "abstract": "Optional abstract",
    "venue": "Journal"
  },
  "collection": {
    "key": "COLLKEY",
    "libraryId": 1
  }
}
```

HTTP 映射：

```text
POST <endpoint>/call
Authorization: Bearer <token>
Content-Type: application/json

{
  "capability": "mutation.execute",
  "input": {
    "operation": "literature.ingest",
    "paper": {},
    "collection": {}
  }
}
```

`literature.ingest` 是文献入库的 canonical mutation operation，只接受单篇
`paper`。旧 `paper.ingest` operation 和 `papers` 批量 payload 不再支持；多篇
候选必须由调用方逐篇调用。

`note.upsertPayload` 是 Zotero note workflow payload 的正式写入边界。
它通过 v2 embedded image attachment 写入或替换同 note 下同 `payloadType`
的 payload，并同步维护 note HTML 中的
`img[data-attachment-key][data-zs-payload-anchor]` 保活 anchor。它不会写旧式
`data-zs-payload` hidden block。示例：

```json
{
  "operation": "note.upsertPayload",
  "note": { "libraryId": 1, "key": "NOTEKEY" },
  "noteKind": "digest",
  "payloadType": "literature-matching-metadata-json",
  "payload": {
    "schema": "literature_matching_metadata.v1",
    "key_terms": [],
    "methods": [],
    "problems": [],
    "datasets": [],
    "exclude_terms": []
  }
}
```

成功 `data` 是 Host Bridge capability envelope，内部包含
`mutation.execute` 结果：

```json
{
  "capability": "mutation.execute",
  "approval": "zotero-ui-required",
  "data": {
    "ok": true,
    "operation": "literature.ingest",
    "summary": "Ingest one paper with best-effort PDF attachment.",
    "warnings": [],
    "requiresConfirmation": true,
    "result": {
      "items": [],
      "ingest": {
        "index": 1,
        "status": "created",
        "title": "Paper title",
        "identifiers": { "doi": "10.1000/example" },
        "attachmentStatus": "attached"
      }
    }
  }
}
```

入库会触发 Zotero UI approval。用户拒绝、超时或 UI 不可用时返回
`permission` category。PDF 附件是 best-effort：附件失败不会自动把已创建或
已复用的 bibliographic item 变成失败。

典型错误：

| Code | Category | Exit |
| --- | --- | ---: |
| `input_file_unreadable` | `validation` | 7 |
| `input_json_invalid` | `validation` | 7 |
| `invalid_literature_ingest_input` | `validation` | 7 |
| `capability_failed` | `capability` | 8 |
| `permission_denied` | `permission` | 6 |
| `permission_timeout` | `permission` | 6 |
| `permission_ui_unavailable` | `permission` | 6 |

### 12.8 `item search`

调用格式：

```text
zotero-bridge item search --query <text> [--limit <n>] [--library-id <id>]
```

Capability 映射：

```text
library.search_items
```

Capability input：

```json
{
  "query": "graph neural network",
  "limit": 10,
  "libraryId": 1
}
```

成功 `data`：

```json
{
  "capability": "library.search_items",
  "approval": "none",
  "data": [
    {
      "id": 123,
      "key": "ABCD1234",
      "libraryId": 1,
      "itemType": "journalArticle",
      "title": "Paper title",
      "creators": ["Author One"],
      "year": "2026",
      "date": "2026-05-21",
      "publicationTitle": "Journal",
      "tags": ["tag"],
      "collections": [1]
    }
  ]
}
```

`query` 不能为空。空 query 会由 Host Bridge capability 返回
`capability_failed`。

### 12.9 `item get`

调用格式：

```text
zotero-bridge item get (--key <key> | --id <id>) [--library-id <id>]
```

Capability 映射：

```text
library.get_item_detail
```

Capability input 见“item/note ref 参数”。

成功 `data.data` 为 item detail，字段形状：

```json
{
  "id": 123,
  "key": "ABCD1234",
  "libraryId": 1,
  "itemType": "journalArticle",
  "title": "Paper title",
  "creators": ["Author One"],
  "year": "2026",
  "date": "2026-05-21",
  "publicationTitle": "Journal",
  "tags": ["tag"],
  "collections": [1],
  "fields": {
    "title": "Paper title"
  },
  "noteCount": 1,
  "attachmentCount": 1,
  "relatedItemKeys": []
}
```

未找到 item 时，当前 broker 返回 `null`，仍是成功 envelope。

### 12.10 `item notes`

调用格式：

```text
zotero-bridge item notes (--key <key> | --id <id>) [--library-id <id>] [--limit <n>] [--cursor <n>] [--max-excerpt-chars <n>]
```

Capability 映射：

```text
library.get_item_notes
```

Capability input：

```json
{
  "key": "ABCD1234",
  "libraryId": 1,
  "limit": 20,
  "cursor": 0,
  "maxExcerptChars": 500
}
```

成功 `data.data`：

```json
[
  {
    "id": 456,
    "key": "NOTE1234",
    "libraryId": 1,
    "title": "Note title",
    "textExcerpt": "Excerpt",
    "textLength": 1200,
    "htmlLength": 1800,
    "parent": {
      "id": 123,
      "key": "ABCD1234",
      "title": "Paper title"
    }
  }
]
```

如果 child note 解析失败，数组中对应条目可能包含 `errors`。

### 12.11 `item attachments`

调用格式：

```text
zotero-bridge item attachments (--key <key> | --id <id>) [--library-id <id>]
```

Capability 映射：

```text
library.get_item_attachments
```

成功 `data.data`：

```json
[
  {
    "id": 789,
    "key": "ATTACH12",
    "libraryId": 1,
    "title": "paper.pdf",
    "contentType": "application/pdf",
    "filename": "paper.pdf",
    "parent": {
      "id": 123,
      "key": "ABCD1234",
      "title": "Paper title"
    },
    "access": {
      "mode": "bridge-download",
      "file": {
        "fileId": "file-...",
        "sourceKind": "zotero-attachment",
        "displayName": "paper.pdf",
        "contentType": "application/pdf",
        "size": 12345,
        "createdAt": "2026-05-21T00:00:00.000Z",
        "expiresAt": "2026-05-21T00:30:00.000Z",
        "owner": {
          "capability": "library.get_item_attachments",
          "itemKey": "ABCD1234",
          "libraryId": 1
        }
      }
    }
  }
]
```

若附件无可用本地文件或存在附件错误：

```json
{
  "access": {
    "mode": "unavailable",
    "file": null
  }
}
```

返回中不得包含 `path` 或本地绝对路径。下载只能使用 `file.fileId`。

### 12.12 `note get`

调用格式：

```text
zotero-bridge note get (--key <key> | --id <id>) [--library-id <id>] [--format text|html] [--offset <n>] [--max-chars <n>]
```

Capability 映射：

```text
library.get_note_detail
```

Capability input：

```json
{
  "key": "NOTE1234",
  "libraryId": 1,
  "format": "text",
  "offset": 0,
  "maxChars": 4000
}
```

成功 `data.data`：

```json
{
  "id": 456,
  "key": "NOTE1234",
  "libraryId": 1,
  "title": "Note title",
  "format": "text",
  "content": "Note content chunk",
  "offset": 0,
  "nextOffset": 4000,
  "hasMore": true,
  "totalChars": 9000,
  "truncated": true,
  "parent": {
    "id": 123,
    "key": "ABCD1234",
    "title": "Paper title"
  }
}
```

分页读取时使用下一次请求的 `--offset <nextOffset>`。

### 12.13 `note payloads`

调用格式：

```text
zotero-bridge note payloads (--key <key> | --id <id>) [--library-id <id>]
```

Capability 映射：

```text
library.list_note_payloads
```

成功 `data.data` 是 payload summary 数组。该数组不包含 encoded value、
decoded text、完整 payload 或 markdown 正文。具体字段由 note payload codec
产生，调用方应以 manifest 中的 payload metadata 和后续 `note payload` 读取为准。

### 12.14 `note payload`

调用格式：

```text
zotero-bridge note payload (--key <key> | --id <id>) [--library-id <id>] [--payload-type <type>] [--offset <n>] [--max-chars <n>]
```

Capability 映射：

```text
library.get_note_payload
```

Capability input：

```json
{
  "key": "NOTE1234",
  "libraryId": 1,
  "payloadType": "workflow-result",
  "offset": 0,
  "maxChars": 4000
}
```

成功 `data.data` 为一个 decoded payload detail，不包含原始 encoded value。
大 payload 可通过 `offset` / `maxChars` 分块读取。具体字段由
`notePayloadCodec` 的 detail DTO 决定，调用方应保持向后兼容：识别
`payloadType`、正文 chunk、offset/hasMore 类字段，忽略未知字段。

### 12.15 `workflow list`

调用格式：

```text
zotero-bridge workflow list
```

HTTP 映射：

```text
GET <endpoint>/workflows
```

成功 `data`：

```json
{
  "workflows": [
    {
      "id": "workflow-id",
      "label": "Workflow Label",
      "provider": "skillrunner",
      "version": "1.0.0",
      "sourceKind": "builtin",
      "packageId": "package-id",
      "configurable": true,
      "acceptsNoSelection": false,
      "inputUnit": "item",
      "parameters": ["language"]
    }
  ]
}
```

实现必须避免返回 workflow hook 路径、插件内部路径或源码路径。

### 12.16 `workflow submit`

调用格式：

```text
zotero-bridge workflow submit --workflow <id> --input <JSON_OR_FILE>
```

HTTP 映射：

```text
POST <endpoint>/workflows/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "workflowId": "<id>",
  "input": {}
}
```

CLI 只发送 `workflowId` 和 `input`。当前 CLI 没有暴露
`executionOptions` 或 `presentation` 参数。

有效 input：

```json
{
  "items": [
    {
      "key": "ABCD1234",
      "libraryId": 1
    }
  ]
}
```

或：

```json
{
  "kind": "none"
}
```

Host Bridge 内部 submit request 还支持 `executionOptions` 字段，但当前 CLI
不会生成该字段。

成功 `data`：

```json
{
  "workflowId": "workflow-id",
  "workflowLabel": "Workflow Label",
  "runId": "run-...",
  "jobIds": ["job-1"],
  "totalJobs": 1,
  "tasks": [
    {
      "id": "task-id",
      "runId": "run-...",
      "jobId": "job-1",
      "workflowId": "workflow-id",
      "workflowLabel": "Workflow Label",
      "taskName": "Task",
      "state": "queued",
      "createdAt": "2026-05-21T00:00:00.000Z",
      "updatedAt": "2026-05-21T00:00:00.000Z",
      "source": "active"
    }
  ],
  "permission": {
    "outcome": "approved",
    "requestId": "host-bridge-permission-...",
    "channel": "acp-skill-run"
  }
}
```

`permission.channel` 可能是：

- `acp-chat`
- `acp-skill-run`
- `global`

拒绝、超时或 UI 不可用时：

```json
{
  "code": "permission_denied",
  "category": "permission"
}
```

或：

```json
{
  "code": "permission_ui_unavailable",
  "category": "permission"
}
```

典型错误：

| Code | Category | Exit |
| --- | --- | ---: |
| `missing_workflow_id` | `validation` | 7 |
| `input_json_invalid` | `validation` | 7 |
| `invalid_workflow_input` | `validation` | 7 |
| `workflow_not_found` | `workflow` | 9 |
| `workflow_submit_failed` | `workflow` | 9 |
| `permission_denied` | `permission` | 6 |
| `permission_timeout` | `permission` | 6 |
| `permission_ui_unavailable` | `permission` | 6 |

### 12.17 `workflow run`

调用格式：

```text
zotero-bridge workflow run <runId>
```

HTTP 映射：

```text
GET <endpoint>/workflows/runs/<percent-encoded-runId>
```

空 run id 返回：

```json
{
  "code": "missing_run_id",
  "category": "validation"
}
```

成功 `data`：

```json
{
  "runId": "run-...",
  "found": true,
  "state": "running",
  "workflowId": "workflow-id",
  "workflowLabel": "Workflow Label",
  "tasks": [],
  "summary": {
    "total": 1,
    "queued": 0,
    "running": 1,
    "waiting_user": 0,
    "waiting_auth": 0,
    "succeeded": 0,
    "failed": 0,
    "canceled": 0
  },
  "updatedAt": "2026-05-21T00:00:00.000Z"
}
```

`state` 取值：

```text
queued | running | waiting | succeeded | failed | canceled | unknown
```

未找到 run：

```json
{
  "code": "workflow_run_not_found",
  "category": "workflow"
}
```

### 12.18 `task list`

调用格式：

```text
zotero-bridge task list [--workflow <id>] [--backend <id>] [--backend-type <type>] [--request <id>] [--run <runId>] [--state <state>] [--active-only]
```

Query 映射：

| CLI 参数 | Query key |
| --- | --- |
| `--workflow` | `workflowId` |
| `--backend` | `backendId` |
| `--backend-type` | `backendType` |
| `--request` | `requestId` |
| `--run` | `runId` |
| `--state` | `state` |
| `--active-only` | `includeHistory=false` |

HTTP 映射示例：

```text
GET <endpoint>/tasks?workflowId=workflow-id&runId=run-1&includeHistory=false
```

成功 `data`：

```json
{
  "tasks": [
    {
      "id": "task-id",
      "runId": "run-...",
      "jobId": "job-1",
      "requestId": "request-1",
      "engine": "engine",
      "targetParentID": 123,
      "workflowId": "workflow-id",
      "workflowLabel": "Workflow Label",
      "taskName": "Task",
      "inputUnitIdentity": "safe-id",
      "inputUnitLabel": "paper.md",
      "providerId": "acp",
      "requestKind": "acp",
      "backendId": "backend-1",
      "backendType": "acp",
      "backendBaseUrl": "http://127.0.0.1:<port>",
      "state": "running",
      "error": "[redacted-path]",
      "createdAt": "2026-05-21T00:00:00.000Z",
      "updatedAt": "2026-05-21T00:00:00.000Z",
      "source": "active",
      "archivedAt": "2026-05-21T00:00:00.000Z"
    }
  ]
}
```

可选字段不存在时省略。Host Bridge 会省略 path-like
`inputUnitIdentity`，并把 task `error` 中的本地绝对路径替换为
`[redacted-path]`。

### 12.19 `file download`

调用格式：

```text
zotero-bridge file download <fileId> --output <path> [--force]
```

参数规则：

- `fileId` 必须是 opaque file handle。
- `fileId` 不能为空。
- `fileId` 不能包含 `/`、`\`、`..` 或 `:`。
- `--output` 是本地写入目标，只用于本机文件写入，不会回显完整路径。
- 默认不覆盖已存在文件。

HTTP 映射：

```text
GET <endpoint>/files/<fileId>
Authorization: Bearer <token>
```

成功时 Host Bridge 返回 bytes，CLI 写入 `--output`。CLI 成功 `data`：

```json
{
  "command": "file.download",
  "fileId": "file-...",
  "outputName": "paper.pdf",
  "bytesWritten": 12345,
  "contentType": "application/pdf",
  "overwritten": false
}
```

本地输出已存在且未传 `--force`：

```json
{
  "code": "output_exists",
  "category": "download",
  "details": {
    "outputName": "paper.pdf"
  }
}
```

fileId 像路径：

```json
{
  "code": "invalid_file_id",
  "category": "validation",
  "message": "file download requires an opaque fileId, not a path"
}
```

创建目录、写临时文件、替换文件或 rename 失败：

```json
{
  "code": "download_output_unwritable",
  "category": "download",
  "details": {
    "outputName": "paper.pdf",
    "message": "<io-error>"
  }
}
```

Host Bridge download 错误映射：

| Bridge code | CLI category | Exit |
| --- | --- | ---: |
| `invalid_file_id` | `validation` | 7 |
| `file_not_found` | `download` | 10 |
| `file_handle_expired` | `download` | 10 |
| `file_unavailable` | `download` | 10 |
| `download_failed` | `download` | 10 |

### 12.20 HTTP bridge envelope 与 CLI error 映射

Host Bridge JSON endpoint 错误 envelope：

```json
{
  "status": "error",
  "error": {
    "code": "workflow_not_found",
    "message": "Workflow not found",
    "category": "workflow",
    "details": {}
  }
}
```

CLI 映射规则：

| Bridge code | CLI category |
| --- | --- |
| `capability_not_found`, `capability_failed` | `capability` |
| `workflow_not_found`, `workflow_run_not_found`, `workflow_submit_failed` | `workflow` |
| `workflow_submit_requires_approval`, `approval_required`, `permission_denied`, `permission_timeout`, `permission_ui_unavailable` | `permission` |
| `file_not_found`, `file_handle_expired`, `file_unavailable`, `download_failed` | `download` |
| `invalid_capability_input`, `invalid_workflow_input`, `invalid_file_id`, `bad_request` | `validation` |
| 其他 bridge code | `protocol` |

HTTP 401 特例固定映射为：

```json
{
  "code": "unauthorized",
  "category": "auth",
  "message": "Host Bridge rejected the bearer token"
}
```

### 12.21 复现 CLI 的最小模块划分

一个兼容实现至少需要以下模块：

- args parser：实现本文档中的命令树和全局 `--endpoint` / `--profile`。
- config loader：实现 endpoint/profile/token/scope 优先级。
- JSON input reader：实现 inline/file/@file/stdin 解析。
- HTTP client：实现 endpoint 解析、bearer auth、scope header、JSON envelope
  校验和 file bytes 下载。
- command mapper：把语义命令映射为 capability 或 endpoint。
- output printer：stdout 只输出 CLI envelope，失败时按 category 设置 exit
  code。
- download writer：拒绝 path-like fileId，默认不覆盖，成功/失败只回显
  `outputName`。

兼容实现不得增加以下行为作为默认路径：

- 自动扫描 Zotero profile 或 SQLite。
- 读取 Zotero storage 路径。
- 打印 bearer token。
- 在 Host Bridge CLI 不可用时自动启用 MCP。
- 让 CLI 自己批准写操作或 workflow submit。
