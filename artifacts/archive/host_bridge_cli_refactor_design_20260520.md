# Host Bridge + Rust CLI 重构设计

日期：2026-05-20

## 背景

当前面向 agent 的 Zotero host 能力访问路径依赖 MCP descriptor 注入。在 ACP agent 需要通过 MCP 发现 host 工具的阶段，这种方式是合理的；但 MCP 的 transport/session 行为不够稳定，不适合作为 Zotero host 访问的核心通信机制。

本项目已经具备合适的底层基础：

- `zoteroHostCapabilityBroker` 负责 JSON 安全的 Zotero host DTO 和能力方法。
- `zoteroMcpProtocol` 将 broker 能力适配为 MCP tools。
- `zoteroMcpServer` 提供本地 HTTP transport、bearer auth、队列、超时、诊断和权限 hook。
- workflow 执行链已经具备 preparation、dispatch、apply、task state 和 dashboard history 等 seam。

本次重构应将 broker 提升为主要的 host 能力面，并将 MCP 降级为可选兼容 adapter。

## 目标

- 增加插件侧 Host Bridge HTTP JSON API，供 agent 和 CLI 访问。
- 增加 Rust `zotero-bridge` CLI，由它调用 Host Bridge。
- v1 支持本机和局域网访问，局域网访问默认关闭。
- 所有 Host Bridge 请求使用 bearer-token authentication。
- 通过 `POST /bridge/v1/call` 暴露现有 Zotero broker 能力。
- 增加 workflow 控制能力：列出 workflows、提交 workflow runs、查询 task/run 状态。
- 仅通过 broker 签发的 file handle 提供远程安全的文件下载。
- 保留 MCP 作为兼容 adapter，而不是主要的 host 通信机制。

## 非目标

- v1 不在 Zotero 插件中实现 gRPC。
- 不暴露任意本地文件系统路径。
- 远程或 CLI workflow 提交不依赖 Zotero 当前 UI 选择。
- 第一阶段迁移不移除现有 MCP 行为。
- v1 不增加公网暴露、relay service 或 tunnel 管理。

## 架构

```text
Agent / Automation
  |
  | executes
  v
Rust CLI: zotero-bridge
  |
  | HTTP JSON + Bearer token
  v
Plugin Host Bridge
  |
  +-- Host Capability Broker
  |     +-- context/library/note/mutation capabilities
  |
  +-- Workflow Control Broker
  |     +-- workflow registry
  |     +-- workflow preparation/execution/apply seams
  |     +-- task runtime/history
  |
  +-- File Handle Registry
        +-- Zotero attachments
        +-- workflow artifacts
        +-- host bridge exports

Compatibility:

ACP/MCP adapter
  |
  v
Host Capability Broker
```

Host Bridge 是主要 transport 边界。MCP 和 CLI 等 adapter 必须调用 broker API，而不是直接访问 Zotero native objects。

## Host Bridge 服务形态

Host Bridge 应作为独立于 MCP server 的插件级服务实现。建议新增 `hostBridgeServer.ts`，而不是继续扩展 `zoteroMcpServer.ts`。MCP server 保持 MCP 专用，Host Bridge 拥有自己的协议、状态、诊断和路由。

可以复用 `zoteroMcpServer.ts` 中已经验证过的工程思路，例如本地 HTTP server socket、随机端口选择、bearer token redaction、request log、body size limit、method/path validation、queue/timeout 策略和 status snapshot，但不应把 MCP JSON-RPC、MCP tool schema 或 descriptor/session 语义混入 Host Bridge。

服务生命周期采用插件级单例：

```text
startup
  └─ lazy 或显式 ensureHostBridgeServer()

shutdown
  └─ shutdownHostBridgeServer()

settings changed
  └─ bind mode / port policy 改变时 restart
```

默认策略是 lazy start，同时允许用户配置启动时启用 Host Bridge。这样默认更安全，也避免给 Zotero 启动增加不必要的服务暴露和初始化成本。

bind mode v1 只定义两种：

```ts
type HostBridgeBindMode = "loopback" | "lan";
```

默认监听 `127.0.0.1`，局域网访问默认关闭。启用 LAN 时可监听 `0.0.0.0`，但所有非 health endpoint 仍必须要求 bearer token。

鉴权策略 v1 使用单一 bridge token：

```text
bridgeToken
tokenMasked
createdAt
rotatedAt
```

暂不实现多 client pairing。CLI 获取 token 的方式可以在后续实现中通过 connection profile、环境变量或插件设置页导出实现；manifest 不得打印 token。

插件设置页中 Host Bridge 相关配置保持克制，v1 只暴露：

- enable LAN：显式允许从 loopback 切换为 LAN bind。
- token rotate：重新生成 bridge token，并使旧 token 失效。
- show endpoint：展示当前 endpoint，方便用户配置远程/LAN client。
- install CLI：把当前平台 `zotero-bridge` 安装到用户终端可用位置。

插件设置页不暴露 Host Bridge 的细粒度协议开关，也不暴露自定义 CLI path。开发和诊断需要覆盖 CLI 路径时，应使用环境变量或 run/profile/runtime 显式配置。

endpoint 鉴权规则：

- `GET /bridge/v1/health` 免鉴权，但只返回极简状态，例如 protocol、status 和 `authRequired`。
- `GET /bridge/v1/manifest` 必须鉴权，因为它会暴露能力面、workflow 支持和文件下载支持。
- 其他 endpoint 全部必须鉴权。

路由采用显式表驱动，不做过早抽象：

```text
GET  /bridge/v1/health
GET  /bridge/v1/manifest
POST /bridge/v1/call
POST /bridge/v1/workflows/submit
GET  /bridge/v1/workflows/runs/{runId}
GET  /bridge/v1/tasks
GET  /bridge/v1/files/{fileId}
```

普通 JSON endpoint 使用统一响应 envelope：

```ts
type HostBridgeResponse =
  | { status: "ok"; id?: string; result: unknown }
  | {
      status: "error";
      id?: string;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };
```

文件下载 endpoint 是例外：成功时返回文件 bytes，不通过 JSON body 承载；失败时仍返回结构化 JSON 错误。

建议模块边界：

```text
src/modules/hostBridgeServer.ts
src/modules/hostBridgeProtocol.ts
src/modules/hostBridgeAuth.ts
src/modules/hostBridgeCapabilityRegistry.ts
src/modules/hostBridgeWorkflowControl.ts
src/modules/hostBridgeFileRegistry.ts
```

其中 `hostBridgeServer.ts` 只负责 HTTP、auth、routing、response 和服务生命周期；具体业务能力交给 capability registry、workflow control 和 file registry。route handler 不应直接调用 Zotero native API。

## Capability Registry

`POST /bridge/v1/call` 应通过显式 capability registry 调用 host 能力，而不是自动递归映射 `createZoteroHostCapabilityBrokerApis()` 的对象树。显式注册表让外部 API 名称保持稳定，不受 broker 内部对象结构重构影响，也便于生成 manifest、声明权限、校验输入和标记文件下载能力。

建议 registry entry 结构：

```ts
type HostBridgeCapability = {
  name: string;
  title: string;
  description: string;
  category: "context" | "library" | "mutation" | "diagnostic";
  access: "read" | "write";
  inputSchema: JsonSchema;
  handler: (
    input: unknown,
    ctx: HostBridgeCallContext,
  ) => Promise<unknown>;
};
```

调用流程：

```text
HTTP request
  -> route /bridge/v1/call
  -> lookup capability registry
  -> validate input
  -> auth / permission policy
  -> call broker method
  -> return JSON-safe result
```

capability 命名采用 dot-separated、lower_snake_case：

```text
context.get_current_view
context.get_selected_items

library.list_items
library.search_items
library.get_item_detail
library.get_item_notes
library.get_note_detail
library.list_note_payloads
library.get_note_payload
library.get_item_attachments

mutation.preview
mutation.execute

diagnostic.get_status
```

v1 不将 mutation 拆成大量细粒度 capability。现有 broker mutation DSL 已通过 `request.operation` 表达具体写操作，因此 Host Bridge 先保留 `mutation.preview` 和 `mutation.execute` 两个入口。这样可以避免在建立 bridge 的同时重构 mutation 合同。

capability handler 负责将 bridge input 适配到 broker method。例如：

```text
library.get_item_detail:
  input.ref -> broker.library.getItemDetail(input.ref)

library.search_items:
  input -> broker.library.searchItems(input)

mutation.preview:
  input -> broker.mutations.preview(input)

mutation.execute:
  input -> broker.mutations.execute(input)
```

输入校验使用 JSON Schema + Ajv：

- top-level bridge call request 严格校验 `id`、`capability` 和 `input`。
- 默认拒绝未知顶层字段。
- 每个 capability 拥有自己的 `inputSchema`。
- capability input 是否允许未知字段由具体 schema 决定。
- mutation request 可以相对宽一些，因为它内部已有 `operation` DSL 和 permission gate。

Host Bridge registry 应作为 Host Bridge capability 的 SSOT。MCP adapter 后续可以向该 registry 靠拢，例如复用 capability schema、handler 或 manifest metadata；但 MCP 的 JSON-RPC framing 和 tool response formatting 仍属于 MCP adapter 自己的职责。

`GET /bridge/v1/manifest` 的 capability 部分由 registry 生成，只暴露调用契约，不暴露 handler、token、内部路径或真实本地文件路径：

```json
{
  "capabilities": [
    {
      "name": "library.get_item_detail",
      "title": "Get item detail",
      "category": "library",
      "access": "read",
      "inputSchema": {}
    }
  ]
}
```

## Host Bridge HTTP API

所有 endpoint 都位于 `/bridge/v1` 下。除 health 以外，每个 endpoint 都要求携带 `Authorization: Bearer <token>` header。

### `GET /bridge/v1/health`

返回 bridge 状态、host identity、版本、bind mode，以及是否启用局域网访问。该响应不得暴露 bearer token 或本地文件系统路径。

### `GET /bridge/v1/manifest`

返回：

- bridge protocol version；
- available capabilities；
- workflow control support；
- file download support；
- CLI compatibility hints；
- 不含 secret 的 auth 和 bind mode metadata。

### `POST /bridge/v1/call`

调用一个具名 broker capability。

请求形状：

```json
{
  "id": "request-id",
  "capability": "library.get_item_detail",
  "input": {
    "ref": { "key": "ABCD1234", "libraryId": 1 }
  }
}
```

响应形状：

```json
{
  "id": "request-id",
  "status": "ok",
  "result": {}
}
```

错误使用结构化 JSON，包含稳定的 `code`、`message` 和可选诊断 metadata。响应中绝不能出现 host native objects。

### `POST /bridge/v1/workflows/submit`

仅使用显式输入提交 workflow。

请求形状：

```json
{
  "workflowId": "workflow-id",
  "input": {
    "items": [{ "key": "ABCD1234", "libraryId": 1 }]
  },
  "executionOptions": {
    "backendId": "backend-profile-id",
    "workflowParams": {},
    "providerOptions": {}
  }
}
```

bridge 必须拒绝缺少显式 input units 的请求。它不得使用当前 Zotero selection 作为 fallback。

### `GET /bridge/v1/workflows/runs/{runId}`

返回 run summary 和 job/task state；这些状态来自 workflow execution state、`taskRuntime` 和 `taskDashboardHistory`。

### `GET /bridge/v1/tasks`

返回 active 和 recent task summaries。Query filters 可以包含 `workflowId`、`backendId`、`requestId`，以及是否包含 terminal state。

### `GET /bridge/v1/files/{fileId}`

下载一个 broker-registered file。调用方不能传入 path。响应在 stream bytes 之前，必须校验 file handle ownership、expiry、source policy 和当前文件 availability。

## File Handle Model

File Handle Registry 的核心目标是把“本地文件可下载”转换成短期、可审计、可撤销的能力句柄。远程端永远不能直接传 path，Host Bridge 也不能把本地真实 path 当公共 API 返回。

建议新增 `hostBridgeFileRegistry.ts`：

```ts
type HostBridgeFileSourceKind =
  | "zotero-attachment"
  | "workflow-artifact"
  | "bridge-export";

type HostBridgeFileHandle = {
  fileId: string;
  sourceKind: HostBridgeFileSourceKind;
  displayName: string;
  contentType: string;
  size?: number;
  sha256?: string;
  createdAt: string;
  expiresAt: string;
  owner?: {
    capability?: string;
    workflowId?: string;
    runId?: string;
    requestId?: string;
    itemKey?: string;
    libraryId?: number;
  };
  localPath: string; // internal only
};
```

对外 descriptor 必须移除 `localPath`：

```ts
type HostBridgeFileDescriptor = Omit<HostBridgeFileHandle, "localPath">;
```

`fileId` 应使用不可预测的 opaque id：

```text
fileId = "file-" + timestamp + "-" + secureRandom
```

不要用 path hash、item key 或 request id 直接生成 `fileId`，避免泄露来源或产生可预测 handle。

v1 使用内存 registry，不持久化：

- 插件重启后所有 file handle 失效。
- 默认 TTL 为 30 分钟。
- workflow artifact handle 可以延长到 2 小时。
- Zotero attachment handle 每次 manifest/capability call 重新签发。
- registry 支持清理过期 handle。

下载 endpoint：

```text
GET /bridge/v1/files/{fileId}
```

处理流程：

```text
auth
  -> lookup fileId
  -> check expiresAt
  -> check localPath still exists
  -> check source policy
  -> stream bytes
```

错误仍返回结构化 JSON：

```json
{
  "status": "error",
  "error": {
    "code": "file_handle_expired",
    "message": "File handle has expired"
  }
}
```

v1 不支持 HTTP Range。先支持完整文件下载和 streaming/chunked bytes，避免一次性把文件读进 JSON body 或内存。断点续传和 `Accept-Ranges` 可在大文件下载需求明确后再增加。

v1 注册 file handle 的来源包括：

1. `library.get_item_attachments`
   - 原本返回 attachment manifest。
   - 新增可选 `bridge-download` descriptor：

```json
{
  "access": {
    "mode": "bridge-download",
    "file": {
      "fileId": "file-...",
      "displayName": "paper.pdf",
      "contentType": "application/pdf",
      "expiresAt": "..."
    }
  }
}
```

2. workflow artifact
   - run 产物、bundle、导出文件。
   - 在 run status 或 artifact listing 中返回 file handles。

3. bridge export
   - 例如 synthesis export filtered artifacts。
   - broker 写入临时 export 后登记 handle。

本机 CLI 默认也不显示真实路径，以保持 API 一致。后续可以考虑 diagnostics-only 命令，例如：

```text
zotero-bridge file inspect <fileId> --local-path
```

但 v1 可以不实现，避免 agent 形成对本地真实 path 的依赖。

必须遵守的安全规则：

- client 只能传 `fileId`，不能传 path。
- HTTP API 不提供“register file by path”的入口。
- registry 只接受内部 broker 注册。
- `fileId` 未知、过期、文件不存在都返回结构化错误。
- manifest/descriptor 不包含 `localPath`。
- `displayName` 必须 sanitize，不能包含路径分隔符。
- download response 的 filename 使用 sanitized `displayName`。
- mutation/workflow 产生的 file handle 应记录 owner metadata，便于诊断和审计。

## Workflow Control

workflow 提交应复用现有 execution seams，但 input source 从“当前 Zotero selection”改为远程/CLI 请求中显式给出的 refs。Host Bridge 不应创建绕过 provider resolution、queueing、task state 或 apply behavior 的独立 workflow execution path。

现有执行链大致为：

```text
executeWorkflowFromCurrentSelection()
  -> runWorkflowPreparationSeam()
      -> buildSelectionContext(selectedItems)
      -> executeBuildRequests()
      -> resolveWorkflowExecutionContext()
  -> duplicate guard
  -> runWorkflowExecutionSeam()
  -> runWorkflowApplySeam()
  -> taskRuntime / dashboardHistory
```

Host Bridge submit 应新增 bridge 专用 workflow control seam，而不是让 HTTP route handler 直接拼接执行流程：

```text
hostBridgeWorkflowControl.submitWorkflow()
  -> resolve workflow
  -> parse explicit input
  -> resolve Zotero item refs
  -> call shared workflow preparation with selectedItems override
  -> duplicate guard
  -> runWorkflowExecutionSeam()
  -> runWorkflowApplySeam()
  -> return runId/jobIds/status
```

为复用现有 preparation seam，建议给 `runWorkflowPreparationSeam()` 增加可选参数：

```ts
runWorkflowPreparationSeam({
  win,
  workflow,
  messageFormatter,
  executionOptionsOverride,
  selectedItemsOverride?: Zotero.Item[],
  suppressUiFeedback?: boolean,
})
```

菜单触发仍使用当前 Zotero selection；bridge 触发传入 `selectedItemsOverride`，并设置 `suppressUiFeedback`，避免远程自动化触发 alert、toast 或其他 UI feedback。

v1 workflow submit 只支持两类显式输入：

```json
{
  "workflowId": "topic-synthesis",
  "input": {
    "items": [
      { "key": "ABCD1234", "libraryId": 1 },
      { "id": 413 }
    ]
  },
  "executionOptions": {
    "backendId": "acp-main",
    "workflowParams": {},
    "providerOptions": {}
  }
}
```

以及无选择 workflow 的显式空输入：

```json
{
  "workflowId": "some-global-workflow",
  "input": {
    "kind": "none"
  }
}
```

输入规则：

- `input.items` 非空：解析成 Zotero items，构造 selection context。
- `input.kind = "none"`：只允许 manifest 本身允许无选择运行。
- 缺少 `input`：拒绝。
- `input.items = []` 且没有 `kind = "none"`：拒绝。
- v1 不支持任意 custom input units；如果未来需要非 Zotero item workflow 输入，再引入 `input.kind = "custom"` 和 `input.units`。

submit endpoint 不应等待整个 workflow 完成，而应立即返回初始 run 信息：

```json
{
  "status": "ok",
  "result": {
    "runId": "run-...",
    "workflowId": "topic-synthesis",
    "jobIds": ["job-1", "job-2"],
    "tasks": [
      {
        "id": "run-...:job-1",
        "state": "queued",
        "requestId": null
      }
    ]
  }
}
```

后续状态通过以下 endpoint 查询：

```text
GET /bridge/v1/workflows/runs/{runId}
GET /bridge/v1/tasks?runId=...
```

Bridge submit 默认不弹 UI、不 toast、不打开 workspace。后续可以在请求中加入显式 presentation 选项：

```json
{
  "presentation": {
    "notify": false,
    "openWorkspace": false
  }
}
```

v1 默认值：

```text
notify = false
openWorkspace = false
```

本地 CLI 如果需要观察 UI，应通过显式参数开启，而不是由 bridge submit 默认触发。

## Rust CLI

CLI 是后续实现变更中引入的独立 Rust 子项目。它通过 HTTP JSON 与 Host Bridge 通信，但不应只是 Host Bridge `call capability` 的通用 RPC 外壳。CLI 的主界面应是 agent-first、同时人类可用的语义化命令树。

Host Bridge 底层仍可保留 `/bridge/v1/call` 和 capability registry；Rust CLI 则将常用 host 能力包装成简单、清晰、语义明确的命令：

```text
zotero-bridge status
zotero-bridge manifest

zotero-bridge item search
zotero-bridge item get
zotero-bridge item notes
zotero-bridge item attachments

zotero-bridge note get
zotero-bridge note payloads
zotero-bridge note payload

zotero-bridge workflow list
zotero-bridge workflow submit
zotero-bridge workflow run

zotero-bridge task list

zotero-bridge file download

zotero-bridge call <capability>
```

`call <capability>` 可以保留为高级/诊断命令，但不作为推荐入口。普通使用和 agent 自探索应优先使用语义命令。

语义命令到底层 capability 的映射示例：

```text
CLI command                         Host Bridge capability
-----------------------------------------------------------
item search                         library.search_items
item get                            library.get_item_detail
item notes                          library.get_item_notes
item attachments                    library.get_item_attachments
note get                            library.get_note_detail
note payloads                       library.list_note_payloads
note payload                        library.get_note_payload
```

CLI 各级命令必须支持详细 `--help`，便于 agent 自探索，也便于人类使用：

```text
zotero-bridge --help
zotero-bridge item --help
zotero-bridge item search --help
zotero-bridge workflow submit --help
```

每一级 help 至少包含：

- command purpose；
- usage；
- options；
- input JSON schema 或字段说明；
- output JSON shape；
- examples；
- related commands；
- error codes 摘要。

示例：

```text
zotero-bridge item get --help

Get one Zotero item by id or key/libraryId.

USAGE:
  zotero-bridge item get --key <KEY> --library-id <ID>
  zotero-bridge item get --id <ID>

OPTIONS:
  --id <ID>                Zotero numeric item id
  --key <KEY>              Zotero item key
  --library-id <ID>        Zotero library id
  --pretty                 Pretty-print JSON

OUTPUT:
  {
    "status": "ok",
    "result": {
      "id": 413,
      "key": "...",
      "libraryId": 1,
      "title": "..."
    }
  }

EXAMPLES:
  zotero-bridge item get --key ABCD1234 --library-id 1
  zotero-bridge item get --id 413
```

常用 Zotero read 命令应提供显式 flags，避免强迫用户或 agent 手写 JSON：

```text
zotero-bridge item get --key ABCD1234 --library-id 1
zotero-bridge item search --query "transformer tracking" --limit 10
zotero-bridge item attachments --key ABCD1234 --library-id 1
zotero-bridge note get --key NOTEKEY --library-id 1 --format text
```

复杂操作继续使用 JSON 文件，例如 workflow submit：

```text
zotero-bridge workflow submit --workflow topic-synthesis --input submit.json
```

`submit.json`：

```json
{
  "input": {
    "items": [{ "key": "ABCD1234", "libraryId": 1 }]
  },
  "executionOptions": {
    "backendId": "acp-main"
  }
}
```

配置来源优先级：

```text
1. 命令行参数
2. 环境变量
3. connection profile 文件
```

示例：

```text
--endpoint http://127.0.0.1:26380
--token ...
--profile ~/.config/zotero-bridge/profile.json
```

环境变量：

```text
ZOTERO_BRIDGE_ENDPOINT
ZOTERO_BRIDGE_TOKEN
ZOTERO_BRIDGE_PROFILE
```

profile 文件：

```json
{
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26380",
  "token": "secret-token",
  "createdAt": "2026-05-20T00:00:00.000Z",
  "source": "zotero-skills"
}
```

profile 应由插件显式导出。CLI v1 不自动扫描 Zotero runtime 目录寻找 token，避免跨平台路径、多 Zotero profile、多实例运行带来的不透明行为。

### CLI 错误模型

CLI 的输出契约应面向 agent 稳定解析，同时保留人类可读诊断。核心原则：

- `stdout` 永远只输出一个最终 JSON 对象。
- `stderr` 只输出非结构化的人类提示，例如等待审批、下载进度、简短诊断。
- exit code 只做粗粒度分类；agent 应优先解析 `stdout` JSON。
- Token 永远不得打印，错误 `details` 也必须 redaction。

成功输出：

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "command": "workflow.submit",
    "bridgeProtocol": "host-bridge.v1"
  }
}
```

失败输出：

```json
{
  "ok": false,
  "error": {
    "code": "permission_denied",
    "message": "Permission request was denied by the user.",
    "category": "permission",
    "details": {
      "requestId": "perm-...",
      "operation": "mutation.execute"
    }
  },
  "meta": {
    "command": "item.update",
    "bridgeProtocol": "host-bridge.v1"
  }
}
```

`message` 面向人类阅读，不作为 agent 的稳定判断依据。稳定契约是 `error.code`、`error.category`、`error.details` 和 exit code。

建议 exit code：

```text
0   success
1   general_error
2   invalid_cli_usage
3   config_error
4   bridge_unavailable
5   auth_error
6   permission_error
7   validation_error
8   capability_or_workflow_error
9   download_error
10  incompatible_bridge_protocol
```

建议 `error.category`：

```text
usage
config
connection
auth
permission
validation
capability
workflow
task
download
protocol
internal
```

建议 `error.code`：

```text
invalid_argument
missing_required_input
invalid_input_json
profile_not_found
token_not_found
bridge_unavailable
request_timeout
unauthorized
forbidden
permission_required
permission_denied
permission_timeout
capability_not_found
capability_failed
workflow_not_found
workflow_submit_failed
run_not_found
task_not_found
file_not_found
file_expired
file_access_denied
download_interrupted
incompatible_bridge_protocol
internal_error
```

CLI 默认输出紧凑 JSON，满足 agent 可解析需求；`--pretty` 输出格式化 JSON，方便人类阅读；`--text` 可作为后续增强，但 v1 不要求实现。无论是否启用 `--pretty`，字段语义必须稳定。

文件下载命令：

```text
zotero-bridge file download <fileId> --output paper.pdf
```

规则：

- output 已存在时默认失败；
- 只有显式 `--force` 才允许覆盖；
- 下载先写入临时文件，再 rename，避免留下半文件；
- bridge error 输出结构化 JSON；
- 成功输出 JSON 摘要，例如：

```json
{
  "ok": true,
  "data": {
    "fileId": "file-abc",
    "outputPath": "paper.pdf",
    "bytesWritten": 123456,
    "contentType": "application/pdf"
  },
  "meta": {
    "command": "file.download",
    "bridgeProtocol": "host-bridge.v1"
  }
}
```

## 连接发现与 Profile

Host Bridge / CLI 的标准发现机制是 connection profile。它解决三个场景：

1. 人类在终端使用 CLI，需要知道 endpoint/token。
2. agent 在 ACP skill run workspace 中使用 CLI，不应猜测配置。
3. 远程/LAN client 使用 CLI，需要显式 profile，而不能自动扫描本地 Zotero 状态。

profile 分为两类：

```text
User profile
  长期 profile，由用户通过插件显式导出，用于普通 CLI 使用

Run profile
  写入 run workspace，随 run workspace 一起保留
  不设置 expiresAt
  用于恢复、审计和继续 run
```

user profile 可以包含 token，因为它由用户显式导出：

```json
{
  "schema": "zotero-bridge.connection-profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26380",
  "auth": {
    "mode": "inline-token",
    "token": "secret-token"
  },
  "bindMode": "loopback",
  "createdAt": "2026-05-20T00:00:00.000Z",
  "source": {
    "addon": "zotero-skills",
    "zoteroVersion": "7.x"
  }
}
```

run profile 不应设置过期时间，因为用户应能随时恢复 run。为了避免 workspace 文件泄露 bridge token，run profile 默认不写明文 token，而是使用 `token-ref`：

```json
{
  "schema": "zotero-bridge.connection-profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26380",
  "auth": {
    "mode": "token-ref",
    "tokenRef": "ZOTERO_BRIDGE_TOKEN"
  },
  "bindMode": "loopback",
  "createdAt": "2026-05-20T00:00:00.000Z",
  "scope": {
    "kind": "acp-skill-run",
    "runId": "run-..."
  }
}
```

ACP skill run setup 应写入：

```text
<runWorkspace>/.zotero-bridge/profile.json
```

并尽量给 agent 运行环境注入：

```text
ZOTERO_BRIDGE_PROFILE=<runWorkspace>/.zotero-bridge/profile.json
ZOTERO_BRIDGE_TOKEN=<actual token>
```

这样 agent 可以直接运行：

```text
zotero-bridge status
```

而无需猜测 endpoint 或 token。恢复 run 时，插件应重新 `ensureHostBridgeServer()`，并用当前 token 恢复 CLI 环境；run profile 本身仍然有效。

CLI 不自动扫描 Zotero 数据目录寻找 token，避免跨平台路径、多 Zotero profile、多实例运行带来的不透明行为。CLI 解析连接信息时支持组合来源，例如从 profile 读取 endpoint，从环境变量读取 token。

推荐解析优先级：

```text
1. CLI --endpoint / --token
2. ZOTERO_BRIDGE_ENDPOINT / ZOTERO_BRIDGE_TOKEN
3. --profile
4. ZOTERO_BRIDGE_PROFILE
5. 默认 user profile path（如果启用）
```

长期 user profile 的默认建议路径可以是：

```text
~/.config/zotero-bridge/profile.json
```

但该文件必须由用户或插件显式创建。CLI 不应从 Zotero 内部目录自动挖取配置。

后续如果确实需要完全自足的 run workspace，可以增加显式 opt-in 的 `auth.mode = "inline-token"` run profile，但不作为 v1 默认。

## ACP 集成与迁移策略

Host Bridge CLI 应作为 ACP skill run 的首选 host access path。迁移期保留 MCP 作为 compatibility path，但不再把 MCP 作为核心通信机制。

ACP skill run workspace 初始化时应自动写入 run profile：

```text
createAcpSkillRunnerWorkspace()
  -> ensureHostBridgeServer()
  -> write .zotero-bridge/profile.json
  -> record bridge profile path in input manifest
```

profile 路径：

```text
<runWorkspace>/.zotero-bridge/profile.json
```

agent 运行环境应注入：

```text
PATH=<bundled-cli-dir>;<existing PATH>
ZOTERO_BRIDGE_PROFILE=<runWorkspace>/.zotero-bridge/profile.json
ZOTERO_BRIDGE_TOKEN=<actual token>
```

materialized skill instructions 和 ACP prompt guidance 应明确要求优先使用 `zotero-bridge` 语义命令：

```text
[Zotero Host Bridge usage]
Use the zotero-bridge CLI for Zotero interactions.
Run `zotero-bridge --help` or a subcommand `--help` to discover usage.
Use semantic commands such as:
- zotero-bridge item search ...
- zotero-bridge item get ...
- zotero-bridge item attachments ...
- zotero-bridge workflow submit ...
Do not read Zotero internal SQLite or storage paths directly.
Do not use MCP unless the prompt explicitly says MCP fallback is active.
[/Zotero Host Bridge usage]
```

不做 agent-side bridge CLI smoke。CLI 是本地可执行命令，profile 和 token 由插件写入或注入；再要求 agent 执行 smoke 会引入 transcript/file side-effect 判定复杂度，收益不足。

Host Bridge CLI preflight 只在插件侧做确定性检查：

```text
Host Bridge CLI preflight
  -> ensureHostBridgeServer()
  -> verify profile written
  -> verify token env available
  -> verify CLI binary resolvable（如果已安装/打包）
  -> optionally plugin-side HTTP health/manifest check
```

ACP skill run state 建议记录 host access path：

```ts
type AcpRunHostAccessState = {
  preferred: "bridge-cli";
  active: "bridge-cli" | "mcp" | "none";
  bridgeProfilePath?: string;
  preflightStatus: "not_run" | "passed" | "failed";
  fallbackReason?: string;
};
```

不需要 `bridgeSmokeStatus`。

迁移期 fallback 策略：

- bridge preflight passed：`active = "bridge-cli"`。
- bridge preflight failed 且 MCP 可用：`active = "mcp"`，并记录 compatibility mode diagnostics。
- `requiresHostBridgeCli = true` 时：bridge preflight failed 直接失败，不 fallback。
- fallback 发生时，prompt 应明确说明当前处于 MCP fallback，而不是让 agent 同时猜测两条路径。

## Agent Run Injection Bundle

Agent run 中的 CLI 可用性不只依赖环境变量。v1 采用三层注入，让 agent 能稳定发现、理解并使用 `zotero-bridge`：

1. 运行环境变量注入。
2. 系统提示词中的精简命令说明。
3. workspace 中的完整使用手册文档。

### 环境变量注入

ACP run 创建时，插件应向 agent runtime 注入：

```text
PATH=<bundled-cli-dir>;<existing PATH>
ZOTERO_BRIDGE_PROFILE=<runWorkspace>/.zotero-bridge/profile.json
ZOTERO_BRIDGE_TOKEN=<actual token>
```

要点：

- 注入 `PATH` 时只加入 CLI 所在目录，不在提示词或 workflow 中传完整二进制路径。
- agent 应通过 `zotero-bridge ...` 调用 CLI。
- token 只通过环境变量注入，不写入 prompt、README 或 profile 明文字段。
- run profile 通过 `token-ref` 引用 `ZOTERO_BRIDGE_TOKEN`，以便 CLI 连接 bridge 时读取 token。
- 临时 PATH 注入只影响当前 agent run，不依赖用户系统 PATH，也不修改用户系统环境。

### 系统提示词注入

ACP agent run 的系统提示词应包含一段简短、稳定的 Host Bridge 使用说明。示例：

```text
[Zotero Host Bridge]
You can access Zotero through the zotero-bridge CLI. Use semantic commands, not local Zotero files.
Run `zotero-bridge --help` and subcommand `--help` for exact options.
Common commands: `zotero-bridge status`, `zotero-bridge item search`, `zotero-bridge item get`,
`zotero-bridge note payload`, `zotero-bridge workflow list`, `zotero-bridge workflow submit`,
`zotero-bridge task list`, `zotero-bridge file download`.
For full usage, read `.zotero-bridge/README.md` in the workspace.
Workflow submit and write operations require approval in Zotero UI; wait for the CLI result.
[/Zotero Host Bridge]
```

提示词只提供精简索引，不承载完整手册，也不包含 endpoint/token 等敏感信息。

### Workspace 使用手册

ACP run workspace 中应生成：

```text
.zotero-bridge/profile.json
.zotero-bridge/README.md
```

`README.md` 是 agent 的完整自探索文档，建议覆盖：

- 当前 bridge 连接方式和 profile 使用方式。
- 推荐命令索引和每类命令的典型用法。
- JSON 输出约定、错误结构和退出码。
- workflow 提交输入文件格式。
- file handle 下载流程和禁止任意本地路径读取的边界。
- approval 行为：workflow submit 和写操作需要审批；只读、preview 和文件下载不需要审批；需要审批时 CLI 会等待 Zotero UI 中的审批结果。
- 禁止事项：不要直接读取 Zotero SQLite、storage 目录或插件内部文件来绕过 bridge。
- 常见错误：401、bridge unavailable、capability/workflow error、download error、permission denied。

后续可选生成 `.zotero-bridge/manifest.json`，把 manifest 快照落到 workspace，方便 agent 在不重复请求 bridge 的情况下查看能力摘要。但 v1 不强制需要该文件。

## CLI 构建、安装与跨平台分发

`zotero-bridge` 是插件分发的一部分。agent run 不应要求用户提前安装 CLI；插件应直接携带当前平台可用的二进制。

### 插件内置二进制

发布包建议携带以下平台二进制：

```text
addon/bin/win32-x64/zotero-bridge.exe
addon/bin/darwin-x64/zotero-bridge
addon/bin/darwin-arm64/zotero-bridge
addon/bin/linux-x64/zotero-bridge
```

Linux arm64 可作为后续补充。插件启动或 agent run preflight 时根据当前平台选择二进制；如果当前平台没有匹配二进制，应返回结构化错误 `cli_binary_unavailable`，并提示用户配置外部 CLI 路径或等待对应平台构建。

### Agent Run PATH 注入

ACP run 中优先使用插件内置 CLI。插件把内置 CLI 所在目录加入 agent runtime 的 `PATH`：

```text
PATH=<addon bundled cli dir>;<existing PATH>
```

prompt、workflow 和 skill 文档只写 `zotero-bridge`，不写完整路径。这样 agent 的使用方式与人类终端一致，也避免路径暴露和跨平台路径差异。

### 设置页一键安装

设置页应提供“一键安装 CLI 到终端 PATH”的能力，用于人类在普通 shell 中直接运行 `zotero-bridge`。安装逻辑与 agent run PATH 注入分离：

- agent run 使用临时 PATH 注入，不依赖用户安装。
- 人类终端使用一键安装，把当前平台二进制复制到用户级 bin 目录。
- 安装后检查目标目录是否在 PATH 中；如果不在，应提示用户并提供可选的自动添加 PATH 能力或手动命令说明。

推荐安装目录：

```text
Windows: %LOCALAPPDATA%\Zotero-Skills\bin\zotero-bridge.exe
macOS:   ~/Library/Application Support/Zotero-Skills/bin/zotero-bridge
Linux:   ~/.local/bin/zotero-bridge
```

Windows 下 `%LOCALAPPDATA%\Zotero-Skills\bin` 通常不在 PATH 中。因此一键安装应分两步：

1. 复制 `zotero-bridge.exe` 到该目录。
2. 检测用户 PATH；如果缺失，向用户明确确认后写入 HKCU 用户级 PATH，并提示需要重启终端或重新登录 shell 才能生效。

自动添加 PATH 时需要去重、保留已有 PATH 内容，并避免修改系统级 PATH。由于 agent run 使用临时 PATH 注入，这个用户 PATH 修改只服务于人类终端体验。

### 发布与构建

CLI 子项目建议放在：

```text
cli/zotero-bridge/Cargo.toml
cli/zotero-bridge/src/main.rs
```

本地构建命令：

```text
cargo build --release --manifest-path cli/zotero-bridge/Cargo.toml
```

发布二进制建议通过 GitHub Actions matrix 构建，而不是把开发机产物手工上传或长期提交到源码仓库。推荐 matrix：

- `windows-latest` -> `win32-x64`
- `macos-13` -> `darwin-x64`
- `macos-latest` -> `darwin-arm64`
- `ubuntu-latest` -> `linux-x64`

release pipeline 负责：

- 构建 Rust CLI。
- 生成校验和。
- 把各平台二进制放入插件包对应 `addon/bin/<platform>/` 目录。
- 运行 CLI 基础参数/帮助输出检查。
- 运行插件打包流程。

CLI 与 Host Bridge 应有协议版本握手。CLI 启动后可通过 profile 或 manifest 校验 `host-bridge.v1` 兼容性；不兼容时返回 `incompatible_bridge_protocol`，避免用户混用旧 CLI 与新插件。

### 外部 CLI 覆盖

为开发和诊断保留外部 CLI 覆盖能力。解析优先级：

1. ACP run/profile/runtime 显式 CLI 路径配置。
2. `ZOTERO_BRIDGE_CLI` 环境变量。
3. 插件内置 CLI。
4. 系统 PATH 中的 `zotero-bridge`。

生产默认路径仍应是插件内置 CLI。插件设置页不提供自定义 CLI path；外部覆盖主要用于开发版测试、临时修复和平台二进制不可用时的用户自助。

### Well-known Profile

安装到终端 PATH 的 `zotero-bridge` 不应要求用户每次 Zotero 重启后重新配置随机端口。因此插件需要自动维护本机 well-known profile，供 CLI 默认读取。

推荐路径：

```text
Windows: %LOCALAPPDATA%\Zotero-Skills\bridge-profile.json
macOS:   ~/Library/Application Support/Zotero-Skills/bridge-profile.json
Linux:   ~/.local/share/Zotero-Skills/bridge-profile.json
```

写入时机：

- Host Bridge 启动成功并确定 endpoint 后写入。
- Host Bridge 重启并切换端口后刷新。
- token rotate 后刷新。

profile 内容包含：

```json
{
  "schema": "zotero-bridge.profile.v1",
  "protocol": "host-bridge.v1",
  "endpoint": "http://127.0.0.1:26570/bridge/v1",
  "auth": {
    "type": "bearer",
    "token": "<bridge-token>"
  },
  "source": "well-known",
  "updatedAt": "..."
}
```

这是本机用户级连接凭据，目标是降低安装版 CLI 的使用心智负担。基本保护策略是将文件写入用户级数据目录，并在 macOS/Linux 上尽量设置 `0600` 权限；Windows 依赖 `%LOCALAPPDATA%` 的当前用户 ACL。v1 不承诺只有官方 CLI 能连接，也不实现 client pairing。

设置页不新增“导出连接 Profile”按钮，以保持配置面简单。设置页继续只暴露 enable LAN、token rotate、show endpoint 和 install CLI。

CLI profile 读取优先级：

1. `--profile`
2. `ZOTERO_BRIDGE_PROFILE`
3. well-known profile

endpoint 和 token 的字段优先级：

- endpoint 优先使用 `--endpoint` / `ZOTERO_BRIDGE_ENDPOINT`，否则使用 profile endpoint。
- token 优先使用 `ZOTERO_BRIDGE_TOKEN`，其次使用 profile 中的 `tokenEnv` 引用，最后使用 profile 中的 `auth.token`。

## CLI 权限审批与 ACP Skills UI

CLI 发起的 workflow 和写操作不应由 CLI 自己完成 approval。否则 agent 可能自己批准自己发起的 Zotero 写操作，权限门槛会失去意义。Host Bridge 应根据 profile scope 选择审批通道：

```text
1. Run-scoped approval
   用于 ACP skill run 内的 agent CLI 调用
   -> 显示在 ACP Skills UI

2. Global Host Bridge approval
   用于人类 CLI / LAN client / 无 run scope 的调用
   -> 显示插件级 Host Bridge permission UI
```

选择逻辑：

```ts
if (scope.kind === "acp-skill-run" && scope.requestId) {
  setAcpSkillRunPermissionRequest(scope.requestId, request);
} else {
  requestGlobalHostBridgePermission(request);
}
```

CLI 永远不自批，也不创建 synthetic ACP run。

审批粒度：

- 只读命令不需要审批，例如 item search/get、note get/payload、task list、manifest/status。
- 文件下载不需要审批，但只能下载 broker 明确登记的 file handle，不能读取任意路径。
- mutation preview 不需要审批，因为它只返回预览，不执行写入。
- mutation execute 需要审批。
- workflow submit 需要审批，因为它可能触发后续写入、外部执行或长期任务。
- workflow run/task 状态查询不需要审批。

审批判断应由 Host Bridge 根据 capability/command metadata 完成，而不是让 CLI 自行决定。CLI 只负责把最终 approval result 反映为稳定 JSON 和 exit code。

### Run-scoped approval

ACP skill run 内的 CLI 调用应复用现有 ACP Skills permission 管线：Host Bridge 创建 permission request，ACP Skills UI 展示和 resolve，CLI 等待最终结果。

现有 ACP Skills permission 管线大致为：

```text
setAcpSkillRunPermissionRequest(runRequestId, request)
  -> 写入 run.pendingPermission
  -> transcript 加 permission item
  -> Assistant panel 渲染 permission card / drawer
  -> 用户点 approve/deny
  -> resolve-permission action
  -> resolveAcpSkillRunPermissionRequest(...)
  -> resolver promise 被唤醒
```

CLI 写操作审批链路：

```text
agent
  -> zotero-bridge mutation execute ...
  -> Host Bridge /bridge/v1/...
  -> Host Bridge 判断需要 approval
  -> setAcpSkillRunPermissionRequest(runRequestId, permissionRequest)
  -> ACP Skills UI 显示权限请求
  -> 用户 approve / deny
  -> resolveAcpSkillRunPermissionRequest()
  -> Host Bridge 继续执行或拒绝
  -> CLI 返回最终 JSON
```

为了让 Host Bridge 能把 CLI 请求关联到 ACP run，run profile 的 scope 除了 `runId`，还应记录 ACP skill run 的 `requestId`：

```json
{
  "scope": {
    "kind": "acp-skill-run",
    "runId": "run-...",
    "requestId": "acp-run-request-id"
  }
}
```

Host Bridge 收到需要审批的 CLI 请求时，从 profile/env 解析 scope，找到 `scope.requestId`，然后注册 permission request：

```ts
setAcpSkillRunPermissionRequest(scope.requestId, {
  requestId: "host-bridge-permission-...",
  toolTitle: "Zotero write approval",
  source: "host-bridge-cli",
  summary: "...",
  detail: "...",
  options: [
    { optionId: "approve_once", name: "Approve once", kind: "allow_once" },
    { optionId: "deny", name: "Deny", kind: "reject" }
  ],
  resolve,
});
```

CLI 默认同步等待 approval 结果。等待期间可以向 stderr 输出人类提示：

```text
Waiting for approval in Zotero ACP Skills UI...
```

stdout 必须保持最终结构化 JSON，避免污染 agent 解析。批准后：

```json
{
  "status": "ok",
  "result": {
    "permission": { "outcome": "approved" },
    "executed": true
  }
}
```

拒绝后：

```json
{
  "status": "error",
  "error": {
    "code": "permission_denied",
    "message": "User denied the requested Zotero write operation"
  }
}
```

v1 不提供 `zotero-bridge permission approve <id>` 这类 CLI approval 命令。approval 必须在 Zotero UI 中完成。

permission source 应标记为 `host-bridge-cli` 或 `zotero-bridge-cli`。UI 可以将其显示为 “Zotero write approval”，并复用现有 permission card、drawer 和 `resolve-permission` action。

### Global Host Bridge approval

人类直接使用 CLI、LAN client 调用、或 profile 没有 ACP run scope 时，不应依赖 ACP Skills UI，因为这类调用不对应任何 ACP skill run。此时 Host Bridge 应使用插件级全局审批 UI。

建议新增：

```text
hostBridgePermissionManager.ts
  -> requestPermission(request): Promise<decision>
  -> resolvePermission(requestId, decision)
  -> listPendingPermissions()
  -> subscribePermissionSnapshot()
```

v1 的 global approval UI 可以是一个简单的 Zotero 主窗口 modal/dialog。后续如果需要更完整的体验，再迁移到 Dashboard / Assistant shell 的全局 Host Bridge 面板。

人类 CLI 写操作链路：

```text
zotero-bridge mutation execute ...
  -> Host Bridge 创建 global permission request
  -> Zotero 主窗口弹出 Host Bridge Approval dialog
  -> 用户 approve / deny
  -> CLI 等待并返回最终 JSON
```

审批 UI 应展示：

- 来源：CLI / LAN client；
- capability，例如 `mutation.execute`；
- operation，例如 `note.update`；
- summary / preview；
- risk，例如 `write/high`；
- client host；
- request id；
- 操作按钮：Approve once / Deny。

CLI 等待期间可以向 stderr 输出：

```text
Waiting for approval in Zotero Host Bridge UI...
```

stdout 仍必须只输出最终结构化 JSON。

如果 Zotero 当前无法显示审批 UI，应返回结构化错误：

```json
{
  "status": "error",
  "error": {
    "code": "permission_ui_unavailable",
    "message": "This operation requires approval in Zotero UI"
  }
}
```

## 安全

- LAN bind 默认关闭。
- 所有非 health 请求都要求 Bearer token。
- Token 由插件生成，且绝不在 manifest 响应中打印。
- 请求必须拒绝不可信 method、超大 body、格式错误的 JSON 和 path traversal attempts。
- Mutation capabilities 保留现有 permission gates。
- 文件下载使用 opaque handles，而不是 paths。
- 远程 workflow 提交要求显式输入，且不得从 Zotero UI 推断状态。

## 实现 Roadmap

实现应按“可运行闭环”分期，而不是按模块一次性铺开。优先做出 Host Bridge + CLI 的只读闭环，再逐步扩展 workflow、approval、download、packaging 和 MCP deprecation。

### Phase 0：准备与边界确认

目标：让后续实现不散。

- 确认 OpenSpec change 作为实现准绳。
- 确认 Rust CLI 子项目目录为 `cli/zotero-bridge/`。
- 确认 Host Bridge 模块边界：
  - `hostBridgeServer.ts`
  - `hostBridgeProtocol.ts`
  - `hostBridgeAuth.ts`
  - `hostBridgeCapabilityRegistry.ts`
  - `hostBridgeWorkflowControl.ts`
  - `hostBridgeFileRegistry.ts`
  - `hostBridgePermissionManager.ts`

验收：建立目录、类型契约和最小模块骨架，不急于写大量业务逻辑。

### Phase 1：Host Bridge 最小服务闭环

目标：插件内能启动一个可靠的 HTTP JSON bridge。

- `/bridge/v1/health`
- `/bridge/v1/manifest`
- Bearer token
- loopback 默认监听
- LAN 配置默认关闭
- token redaction
- 结构化错误 envelope
- 设置页暴露 enable LAN、token rotate、show endpoint、install CLI

验收：

- health 不需要 auth。
- manifest 需要 auth。
- manifest 不泄露 token、本地路径。
- LAN 不开启时只监听 loopback。

### Phase 2：Capability Registry + 只读能力

目标：先打通 agent 最常用的 Zotero 读取路径。

- 显式 capability registry。
- 接入 broker 只读能力：
  - current view
  - selected items
  - library search/list/get
  - notes
  - attachments metadata
  - note payload
- `POST /bridge/v1/call` 可用。
- 暂不实现 mutation execute。
- 只读能力不走 approval。

验收：

- 返回 JSON-safe DTO。
- 不暴露 Zotero native object。
- MCP adapter 暂时仍可共存。

### Phase 3：Rust CLI Skeleton + 语义读命令

目标：尽早验证 agent 调 CLI 的实际体验。

- Rust CLI 项目。
- profile/env/endpoint/token 加载。
- `status`
- `manifest`
- `item search`
- `item get`
- `item notes`
- `item attachments`
- `note get`
- `note payloads`
- `note payload`
- `call <capability>` 作为 advanced diagnostic。
- 全命令层级 `--help`。
- stdout/stderr/exit code 错误模型。

验收：

- stdout 永远只有最终 JSON。
- token 不出现在 stdout/stderr。
- `--help` 足够 agent 自探索。
- CLI 可对本地 Host Bridge 完成只读查询。

### Phase 4：ACP Agent Run 注入闭环

目标：让 ACP skill run 默认能用 `zotero-bridge`。

- agent run 注入：
  - `PATH`
  - `ZOTERO_BRIDGE_PROFILE`
  - `ZOTERO_BRIDGE_TOKEN`
- 写入：
  - `.zotero-bridge/profile.json`
  - `.zotero-bridge/README.md`
- prompt 注入精简命令说明。
- 插件侧 deterministic preflight。
- 不做 agent-side smoke。
- run state 记录 Host Bridge CLI 可用性。

验收：

- agent 不需要完整路径即可执行 `zotero-bridge`。
- prompt 不泄露 token。
- README 包含完整 CLI 使用说明。
- MCP 仍可作为迁移期 fallback，但 Host Bridge CLI 是首选。

### Phase 5：Workflow Control

目标：远程/CLI 可以提交 workflow 并查询状态。

- workflow list
- workflow submit
- workflow run status
- task list
- 显式 input only
- 不使用 Zotero 当前 selection fallback
- submit 立即返回 runId/job/task 初始状态
- workflow submit 需要 approval
- status/list 不需要 approval

验收：

- 缺少显式 input 时失败。
- submit 走现有 preparation/execution/apply seam。
- task/run 状态可查询。
- CLI 支持 workflow list、workflow submit、workflow run、task list。

### Phase 6：Approval UI 集成

目标：把 CLI 写操作安全接到 Zotero UI。

- run-scoped approval 复用 ACP Skills permission UI。
- global approval 使用 Host Bridge 全局审批 UI。
- read、preview、download 不审批。
- workflow submit、mutation execute 审批。

验收：

- CLI 不自批。
- CLI 等待审批时只写 stderr。
- stdout 仍是最终 JSON。
- deny/timeout/UI unavailable 都返回结构化错误。

### Phase 7：File Downloads

目标：大文件通过 file handle 安全下载。

- file registry
- attachment handle
- workflow artifact handle
- bridge export handle
- `/bridge/v1/files/{fileId}`
- CLI `file download`
- no arbitrary path
- no approval
- 默认不覆盖，`--force` 才覆盖

验收：

- unknown/expired/unauthorized fileId 失败。
- descriptor 不泄露真实路径。
- 文件 bytes 不通过 JSON body。
- CLI 下载成功输出 JSON 摘要。

### Phase 8：CLI Packaging / Install

目标：让 agent 和人类都能稳定拿到 CLI。

- bundled platform binaries：
  - win32-x64
  - darwin-x64
  - darwin-arm64
  - linux-x64
- GitHub Actions matrix。
- 插件打包时放入 `addon/bin/<platform>/`。
- 设置页 install CLI。
- Windows 用户 PATH 显式确认。

验收：

- agent run 使用 bundled CLI，不依赖用户安装。
- 人类可一键安装到终端 PATH。
- 平台缺失返回 `cli_binary_unavailable`。

### Phase 9：MCP Deprecation

目标：完成默认路径切换。

前提：Host Bridge CLI 已覆盖 ACP host access 主路径并稳定。

- MCP 代码和能力保留。
- 默认不启动 MCP。
- 默认不注入 MCP descriptor。
- 移除 MCP preflight。
- ACP 面板移除 MCP 指示灯。
- MCP 诊断入口保留为开发/兼容工具。
- ACP session 默认 prompt 只接收 Host Bridge CLI guidance；MCP guidance 仅在内部显式 compatibility mode 中注入。
- Host Bridge CLI 不可用时只记录诊断，不再暗示或触发 MCP fallback。
- `workflow_mcp.required_tools` 和 runner `mcp.required_tools` 在默认路径下只作为兼容诊断数据保留，不阻塞 run 启动。

验收：

- 新 ACP run 默认只走 Host Bridge CLI。
- MCP 不再是 fallback。
- 老代码能力仍可维护或手动诊断。

## 迁移策略

1. 文档化 bridge 和 CLI contract。
2. 在现有 broker capabilities 之上引入 Host Bridge service。
3. 增加 workflow control 和 task state APIs。
4. 增加 file handle registry 和 download endpoint。
5. 增加 Rust CLI。
6. 在 ACP skill run workspace 中写入 run profile，并给 agent 环境注入 `PATH`、`ZOTERO_BRIDGE_PROFILE` 和 `ZOTERO_BRIDGE_TOKEN`。
7. 更新 ACP skill-run prompt/materialization，使其优先使用 CLI 语义命令和 `--help` 自探索。
8. 用插件侧 deterministic preflight 判断 Host Bridge CLI 是否可用，不做 agent-side CLI smoke。
9. 迁移期保留 MCP descriptor injection 作为 compatibility path。
10. 当 Host Bridge CLI 完整实现并稳定后，MCP 进入 deprecated 状态：保留能力和代码，但默认不启动、不向 agent 注入、不作为 ACP host access fallback。
11. MCP deprecated 后移除 ACP 面板上的 MCP 指示灯，移除 MCP preflight；诊断入口可以保留为开发/兼容工具，而不是默认运行链路的一部分。

## 测试策略

- Host Bridge auth 和 manifest redaction tests。
- Capability call tests，证明 broker DTOs 始终保持 JSON-safe。
- Mutation permission-gate tests。
- Workflow submit tests，覆盖显式输入、缺少输入拒绝和 task state visibility。
- File handle tests，覆盖 unknown、expired 和 registered downloads。
- CLI request mapping 和 error-code tests。
- Approval policy tests，覆盖只读/preview/download 免审批，workflow submit 和 mutation execute 需要审批。
- Migration tests，证明迁移期 MCP adapter 和 Host Bridge 可以共存，并证明 deprecated 状态下 MCP 默认不启动、不注入、无 preflight。
