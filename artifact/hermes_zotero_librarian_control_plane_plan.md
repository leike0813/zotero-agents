# Hermes Agent / Zotero Librarian Profile 控制面补强计划草案

## 背景

`zotero-librarian-profile` 的目标是让 Hermes Agent 能通过 Host Bridge
稳定控制 Zotero 插件和 Zotero 本体。当前 Host Bridge 已经具备较完整的
library/topic/citation graph/workflow 读取能力，也新增了 workflow run 与
skill run 分级控制面。但对于真正的“图书馆助理”闭环，还缺少三类能力：

- 把用户和 Zotero UI 带到正确对象的导航能力。
- 经过预览和审批的 Zotero 写入能力。
- 将 agent 产出的 note、附件、报告等结果回写 Zotero 的能力。

下一轮补强应优先围绕这些闭环能力展开，而不是继续扩大 transcript/watch
等长期运行监控面。

## 优先级建议

### P0: Selection 与 UI 导航语义命令

当前 `context.get_selected_items` 仍是 raw-only。Hermes 需要稳定地读取当前
Zotero 上下文，也需要把用户带到某个 item、collection 或 note。

建议新增语义 CLI/API：

- `zotero-bridge context current`
- `zotero-bridge selection get`
- `zotero-bridge selection open <itemRef...>`
- `zotero-bridge item open <itemRef>`
- `zotero-bridge collection open <collectionKey>`
- `zotero-bridge note open <noteRef>`

设计要点：

- 读取上下文不需要审批。
- UI 导航原则上可免审批，但应限制为 Zotero 内部对象句柄。
- 不接受本地路径、任意 JS、任意 URI。
- 返回值保持 JSON 对象，包含是否找到对象、实际打开的对象引用、当前 Zotero 视图摘要。

### P0: 可预览、可审批的 Zotero 写操作

现有写入口偏窄，Hermes 需要以安全方式执行常见库内维护动作。建议统一到
mutation preview/apply 模型，而不是为每种写操作各自实现审批逻辑。

建议新增或语义化：

- `zotero-bridge mutation preview --input <JSON_OR_FILE>`
- `zotero-bridge mutation apply --input <JSON_OR_FILE>`
- `zotero-bridge tag add --items <refs> --tags <tags>`
- `zotero-bridge tag remove --items <refs> --tags <tags>`
- `zotero-bridge collection create --input ...`
- `zotero-bridge collection add-items --collection <key> --items <refs>`
- `zotero-bridge item update --item <ref> --patch <JSON_OR_FILE>`

设计要点：

- 所有写操作先生成 diff/plan。
- `apply` 必须走 Zotero UI 审批；同 scope 内可免重复审批。
- preview 响应必须包含可读摘要、目标对象列表、风险等级、预计变更数。
- apply 响应必须包含 applied/failed/skipped 计数和每项稳定错误码。
- 禁止直接暴露任意 Zotero JS eval 作为正式语义命令。

### P0: Note 与 Annotation 生产能力

Hermes 的核心价值之一是把阅读、解释、综述和整理结果沉淀回 Zotero。

建议新增：

- `zotero-bridge note create --item <itemRef> --input <JSON_OR_FILE>`
- `zotero-bridge note append --note <noteRef> --input <JSON_OR_FILE>`
- `zotero-bridge note update --note <noteRef> --input <JSON_OR_FILE>`
- `zotero-bridge annotation list --item <itemRef>`
- `zotero-bridge annotation export --item <itemRef> [--format markdown|json]`

设计要点：

- note 写入走 mutation preview/apply。
- note body 建议支持 Markdown 输入，由插件侧转换或包装为 Zotero note 内容。
- 更新 note 时需要支持 optimistic guard，如 `expectedVersion` 或 `expectedUpdatedAt`。
- annotation 读取是只读能力，可免审批。

### P1: 附件与产物回写

Remote profile 下不能假定 Hermes 和 Zotero 共享本地路径。需要 bridge-managed
入站文件句柄。

建议新增：

- `zotero-bridge file upload --input <path-or-stream-envelope>`
- `zotero-bridge item attach-file --item <itemRef> --file <fileHandle>`
- `zotero-bridge artifact register --input <JSON_OR_FILE>`
- `zotero-bridge artifact attach --item <itemRef> --artifact <artifactId>`

设计要点：

- remote 模式下，文件上传不应暴露调用方本地路径给 Zotero。
- 上传后返回短期 file handle，attach 时消费该 handle。
- 大文件需要大小上限、MIME 检测、校验和。
- attach 操作走 Zotero UI 审批。

### P1: Backend / Workflow 环境诊断

Hermes 在执行 workflow 前需要知道环境是否可用，而不是提交后才失败。

建议新增：

- `zotero-bridge backend list`
- `zotero-bridge backend status <backendId>`
- `zotero-bridge workflow validate --workflow <id> ...`
- `zotero-bridge workflow requirements --workflow <id>`
- `zotero-bridge profile diagnose`

设计要点：

- 返回 backend 可用性、认证状态、支持的 provider schema、最后错误摘要。
- 不返回 token、base URL 中的敏感凭据或本地私有路径。
- workflow validate 只做输入/选区/配置兼容性检查，不启动任务。

### P1: 轻量运行事件摘要

本轮已决定暂不做 watch/cursor。可以先补一个更轻的事件摘要接口：

- `zotero-bridge skill-run events <skillRunId> --since-updated-at <iso>`
- `GET /bridge/v1/skill-runs/{skillRunId}/events`

设计要点：

- 只返回结构化 progress events，不返回 transcript。
- 用于判断任务是否有进展、是否进入 waiting、是否失败可恢复。
- 不提供无限流，不做长期连接。

### P1: Notification Inbox 与可恢复通知

Hermes 需要知道 Zotero 侧 workflow、skill run、权限审批、文件产物等异步状态
变化。直接让 Zotero HTTP callback 到 agent 有可达性、安全和丢事件问题，因此
建议先建立 Host Bridge notification inbox，再在后续版本上叠加可选 webhook
delivery。

建议新增：

- `zotero-bridge notification list`
- `zotero-bridge notification wait --workflow-run-id <id> --timeout <ms>`
- `zotero-bridge notification wait --skill-run-id <id> --timeout <ms>`
- `zotero-bridge notification ack --event <eventId>`
- `GET /bridge/v1/notifications`
- `POST /bridge/v1/notifications/ack`

推荐事件类型：

- `workflow.run.started`
- `workflow.run.completed`
- `workflow.run.failed`
- `workflow.run.canceled`
- `workflow.run.waiting`
- `skill_run.started`
- `skill_run.waiting_user`
- `skill_run.waiting_auth`
- `skill_run.failed_retriable`
- `skill_run.completed`
- `permission.pending`
- `mutation.apply.completed`
- `file.ready`

事件 DTO：

```json
{
  "eventId": "opaque-event-id",
  "createdAt": "2026-07-01T00:00:00.000Z",
  "type": "workflow.run.completed",
  "workflowRunId": "workflow-run-id",
  "skillRunId": "skill-run-id",
  "workflowId": "workflow-id",
  "taskName": "Task name",
  "state": "succeeded",
  "liveness": "terminal",
  "summary": "Workflow run completed.",
  "actions": {
    "canReply": false,
    "canConnect": false,
    "canCancelWorkflow": false,
    "isFailedRetriable": false
  },
  "relatedHandles": {
    "workflowRunId": "workflow-run-id",
    "skillRunId": "skill-run-id"
  },
  "acknowledgedAt": null
}
```

设计要点：

- notification inbox 是主状态源；外部 callback 只是可选 delivery。
- 事件必须持久化或至少在插件会话内可恢复，避免 callback 失败导致丢事件。
- 事件 payload 只包含轻量状态和句柄。
- 不返回 transcript、workspace path、完整错误文本、provider private payload。
- 支持按 `workflowRunId`、`skillRunId`、`type`、`sinceEventId`、`acknowledged`
  过滤。
- `wait` 命令可以用短轮询实现，不需要引入 watch/cursor/SSE。
- ack 是消费标记，不删除事件；事件清理由 retention 策略处理。

后续可选 webhook delivery：

- `POST /bridge/v1/notifications/subscriptions`
- 默认仅允许 loopback callback URL。
- LAN/remote callback 必须 Zotero UI 审批。
- subscription 必须有 TTL。
- delivery payload 与 inbox event DTO 保持一致。
- delivery 请求带 HMAC 签名和 eventId。
- delivery 失败有限重试，最终仍保留 inbox 未 ack 事件。

### P1: 权限与审批队列可见性

Hermes 需要知道任务是否卡在用户审批。

建议新增：

- `zotero-bridge permission pending`
- `zotero-bridge permission get <permissionRequestId>`
- `zotero-bridge permission explain <permissionRequestId>`

设计要点：

- v1 不建议允许 CLI 直接 approve/reject。
- 返回审批动作、摘要、关联 workflowRunId/skillRunId、发起时间。
- 不返回 provider private payload 或完整 transcript。

### P2: 索引与缓存维护控制

当前部分能力存在于 debug 或 cache-view。应把常规维护变成正式语义命令。

建议新增：

- `zotero-bridge library-index refresh`
- `zotero-bridge citation-graph refresh`
- `zotero-bridge topic-index status`
- `zotero-bridge cache status`
- `zotero-bridge cache invalidate --scope ...`

设计要点：

- 常规 refresh 可作为正式命令。
- invalidate/clean/reset 类危险操作仍需审批或保持 debug-only。

### P2: 任务与运行历史查询

`task active` 解决当前活跃任务，但 Hermes 还需要复盘近期任务。

建议新增：

- `zotero-bridge task recent --limit N`
- `zotero-bridge workflow runs --workflow <id> --limit N`
- `zotero-bridge skill-run recent --limit N`

设计要点：

- 只返回 lightweight metadata。
- 不返回 transcript、workspace path、完整错误文本。
- 支持按 workflowId/backendId/state 过滤。

### P2: Profile 自描述能力

Hermes 不应依赖静态说明猜测当前 profile 能力。

建议新增：

- `zotero-bridge profile inspect`

返回内容：

- 当前 endpoint 与 connection mode。
- 可用 CLI 语义命令摘要。
- 安全规则摘要。
- local/remote path 行为。
- Host Bridge protocol/version/capability catalog fingerprint。

## 建议拆分的 OpenSpec Change

### Change 1: `add-host-bridge-navigation-and-context-commands`

范围：

- context/selection/item/collection/note open/get 语义命令。
- Host Bridge API 只读上下文和受限 UI 导航端点。
- wrapper/profile 文档同步。

价值：

- 让 Hermes 能从“知道对象”升级为“带用户定位对象”。
- 风险低，多数操作可免审批。

### Change 2: `add-host-bridge-safe-zotero-mutations`

范围：

- mutation preview/apply 一等语义接口。
- tag/collection/item update 的首批 mutation 类型。
- 统一审批、diff、稳定错误码。

价值：

- 建立 Zotero 写操作的安全底座。
- 后续 note/attachment 等能力可复用。

### Change 3: `add-host-bridge-note-and-artifact-writeback`

范围：

- note create/append/update。
- annotation list/export。
- file upload / artifact attach 的最小闭环。

价值：

- 让 Hermes 能把分析结果沉淀回 Zotero。
- 支持 remote profile，不依赖共享文件路径。

### Change 4: `add-host-bridge-diagnostics-and-history`

范围：

- backend/profile/workflow validate 诊断。
- permission pending/explain。
- skill-run events 摘要。
- task/workflow/skill-run recent。

价值：

- 提升 agent 自诊断能力。
- 减少“任务无响应但不知道卡在哪里”的情况。

### Change 5: `add-host-bridge-notification-inbox`

范围：

- 规范化 workflow/task/skill-run/permission/mutation/file-ready 关键事件。
- 新增 Host Bridge notification inbox。
- 新增 `notification list/wait/ack` CLI。
- 支持按 workflowRunId、skillRunId、type、sinceEventId、ack 状态过滤。
- 不实现 webhook，不实现 SSE/watch/cursor。

价值：

- Hermes 可以可靠等待 workflow 完成、失败、进入 waiting 或产生可下载文件。
- 事件不会因 agent 进程重启、callback 不可达或网络短暂失败而丢失。
- 为后续 webhook delivery 提供稳定事件源。

### Change 6: `add-host-bridge-notification-webhooks`

范围：

- 在 notification inbox 之上实现可选 callback delivery。
- 支持 loopback webhook subscription。
- 支持 TTL、HMAC 签名、有限重试、delivery 状态记录。
- LAN/remote webhook subscription 走 Zotero UI 审批。

价值：

- 支持 Hermes 在具备本地 callback server 的运行模式下接收主动通知。
- 保持 inbox 作为权威状态源，避免 callback 失败造成任务状态丢失。

## 第一轮推荐落地顺序

1. 先做 `add-host-bridge-navigation-and-context-commands`。
2. 再做 `add-host-bridge-safe-zotero-mutations`。
3. 在 mutation 底座稳定后做 `add-host-bridge-note-and-artifact-writeback`。
4. 补 `add-host-bridge-notification-inbox`，让 Hermes 能可靠等待异步结果。
5. 最后补 `add-host-bridge-diagnostics-and-history`。
6. 如 Hermes 运行模式确实需要主动推送，再做 `add-host-bridge-notification-webhooks`。

理由：

- 导航/上下文能力风险最低，马上改善 Hermes 体验。
- 写操作必须先有统一 preview/apply，否则后续 note、tag、collection 会重复审批和错误处理逻辑。
- 结果回写依赖安全 mutation 和 remote file handle。
- notification inbox 比 webhook 更基础，也能覆盖大多数等待异步结果的需求。
- 诊断/历史有价值，但不应阻塞最关键的 Zotero 操作闭环。
- webhook 是 delivery 优化，不应早于 inbox。

## Host Bridge Capability 与 CLI 分组整理

当前 Host Bridge CLI 的顶层 namespace 基本按实现模块自然增长形成：

- `library`
- `item`
- `note`
- `topics`
- `schemas`
- `concepts`
- `citation-graph`
- `library-index`
- `resolvers`
- `reference-index`
- `paper-artifacts`
- `insights`
- `literature`
- `workflow`
- `task`
- `skill-run`
- `file`
- `debug`

这种拆法对实现者清楚，但对 Hermes 这类外部 agent 不够友好。更合理的
分组应按任务意图组织，而不是按内部表、缓存或服务名组织。

### 目标分组

| 建议组 | 职责 | 当前应归入的能力 |
| --- | --- | --- |
| `bridge` | Host Bridge 自身状态、profile、连接、manifest、诊断 | `status`, `manifest`, `diagnostic.get_status`，未来 `profile inspect/diagnose`, `backend list/status` |
| `context` | 当前 Zotero UI 上下文、选区、导航 | `context.get_current_view`, `context.get_selected_items`，未来 selection/item/note open |
| `library` | Zotero library 对象读写：items、notes、attachments、collections、tags | `library list/snapshot`, `item search/get/notes/attachments`, `note get/payload/payloads` |
| `mutation` | 可预览、可审批的 Zotero 写操作 | `mutation.preview`, `mutation.execute`, 当前 `literature ingest`，未来 tag/collection/note/item update |
| `synthesis` | Synthesis/知识库/图谱/主题上下文 | `topics`, `concepts`, `citation-graph`, `library-index`, `reference-index`, `resolvers`, `paper-artifacts`, `insights`, `schemas` |
| `workflow` | workflow 定义、describe、submit、agent-run | `workflow list/describe/submit/agent-run` |
| `run` | 运行期控制面：workflow run、skill run、task、notification、permission | `workflow run/cancel`, `task list/active`, `skill-run get/reply/connect`，未来 notification/permission |
| `file` | Host Bridge 文件传输句柄 | `file download`，未来 upload |
| `debug` | debug-only、危险或内部诊断 | 当前所有 `debug.*` |

### 应归并的能力

#### `item`、`note`、`library` 归并到 `library`

当前形态：

```text
zotero-bridge library list
zotero-bridge item get
zotero-bridge item notes
zotero-bridge item attachments
zotero-bridge note get
zotero-bridge note payloads
zotero-bridge note payload
```

建议 canonical 形态：

```text
zotero-bridge library items list
zotero-bridge library item search
zotero-bridge library item get
zotero-bridge library item notes
zotero-bridge library item attachments
zotero-bridge library note get
zotero-bridge library note payloads
zotero-bridge library note payload
zotero-bridge library snapshot
```

理由：

- item、note、attachment、collection、tag 都是 Zotero library 对象。
- 外部 agent 不需要知道这些能力在实现上分属哪个 CLI 顶层 namespace。
- `item`、`note` 可作为兼容别名保留，但文档主路径应放在 `library` 下。

#### Synthesis 相关能力归并到 `synthesis`

当前形态：

```text
zotero-bridge topics ...
zotero-bridge concepts ...
zotero-bridge citation-graph ...
zotero-bridge library-index ...
zotero-bridge reference-index ...
zotero-bridge resolvers ...
zotero-bridge paper-artifacts ...
zotero-bridge insights ...
zotero-bridge schemas ...
```

建议 canonical 形态：

```text
zotero-bridge synthesis topic list
zotero-bridge synthesis topic find-by-paper-ref
zotero-bridge synthesis topic get-context
zotero-bridge synthesis topic get-report
zotero-bridge synthesis topic get-review-input
zotero-bridge synthesis concept query
zotero-bridge synthesis graph overview
zotero-bridge synthesis graph get-slice
zotero-bridge synthesis graph get-layout
zotero-bridge synthesis graph get-metrics
zotero-bridge synthesis graph query-cluster
zotero-bridge synthesis graph rank-external-references
zotero-bridge synthesis graph rank-library-papers
zotero-bridge synthesis graph refresh-metrics
zotero-bridge synthesis index library get
zotero-bridge synthesis index reference get
zotero-bridge synthesis resolver resolve
zotero-bridge synthesis artifact manifest
zotero-bridge synthesis artifact read
zotero-bridge synthesis artifact export-filtered
zotero-bridge synthesis artifact resolve-topic-digest
zotero-bridge synthesis insight attention-queue
zotero-bridge synthesis schema get
```

理由：

- 这些能力都围绕 Synthesis/研究知识上下文，而不是普通 Zotero library。
- 当前多个一级命令对 agent 来说噪声太大。
- `synthesis` 比 `research` 更贴近当前代码和 artifact 语义；如果未来要弱化内部品牌，可再提供 `research` alias。

#### `workflow run`、`task`、`skill-run` 归并到 `run`

当前形态：

```text
zotero-bridge workflow run <workflowRunId>
zotero-bridge workflow cancel <workflowRunId>
zotero-bridge task list
zotero-bridge task active
zotero-bridge skill-run get <skillRunId>
zotero-bridge skill-run reply <skillRunId>
zotero-bridge skill-run connect <skillRunId>
```

建议 canonical 形态：

```text
zotero-bridge run get <workflowRunId>
zotero-bridge run cancel <workflowRunId>
zotero-bridge run list --workflow <workflowId>
zotero-bridge run active
zotero-bridge run skill get <skillRunId>
zotero-bridge run skill reply <skillRunId> --message ...
zotero-bridge run skill connect <skillRunId>
zotero-bridge run notification list
zotero-bridge run notification wait ...
zotero-bridge run notification ack ...
zotero-bridge run permission pending
zotero-bridge run permission get <permissionRequestId>
```

理由：

- `workflow` 应表达 workflow 定义、describe、submit、agent-run。
- `run` 应表达运行期状态、取消、等待、交互、通知、审批。
- `workflowRunId` 与 `skillRunId` 的层级关系在 `run skill ...` 下更清晰。

#### `literature ingest` 归并到 `mutation` 或 `library`

当前 `literature ingest` 映射到 `mutation.execute`，本质是 Zotero 写操作。

建议 canonical 形态：

```text
zotero-bridge mutation preview
zotero-bridge mutation apply
zotero-bridge mutation literature-ingest
```

或者面向用户任务：

```text
zotero-bridge library literature ingest
```

短期建议：

- 保留 `literature ingest` 作为兼容快捷命令。
- 文档主路径迁移到 `mutation literature-ingest`。
- 等 tag/note/collection 写操作加入后，统一让写能力进入 `mutation` 组。

#### `schemas get` 归并到 `synthesis schema get`

`schemas.get` 当前返回的是 Synthesis Layer schema metadata，不应作为普通一级组。

建议 canonical 形态：

```text
zotero-bridge synthesis schema get
```

### 推荐最终 CLI 主路径

```text
zotero-bridge bridge status
zotero-bridge bridge manifest
zotero-bridge bridge profile inspect
zotero-bridge bridge backend list
zotero-bridge bridge backend status <backendId>

zotero-bridge context current
zotero-bridge context selection get
zotero-bridge context selection open <itemRef...>

zotero-bridge library items list
zotero-bridge library item search
zotero-bridge library item get
zotero-bridge library item notes
zotero-bridge library item attachments
zotero-bridge library note get
zotero-bridge library note payloads
zotero-bridge library note payload
zotero-bridge library snapshot

zotero-bridge mutation preview
zotero-bridge mutation apply
zotero-bridge mutation literature-ingest

zotero-bridge synthesis topic ...
zotero-bridge synthesis concept ...
zotero-bridge synthesis graph ...
zotero-bridge synthesis index ...
zotero-bridge synthesis resolver ...
zotero-bridge synthesis artifact ...
zotero-bridge synthesis insight ...
zotero-bridge synthesis schema ...

zotero-bridge workflow list
zotero-bridge workflow describe
zotero-bridge workflow submit
zotero-bridge workflow agent-run

zotero-bridge run get
zotero-bridge run cancel
zotero-bridge run list
zotero-bridge run active
zotero-bridge run skill get
zotero-bridge run skill reply
zotero-bridge run skill connect
zotero-bridge run notification list
zotero-bridge run notification wait
zotero-bridge run permission pending

zotero-bridge file download
zotero-bridge file upload

zotero-bridge debug ...
```

### Capability namespace 策略

短期不建议大规模改 capability name。现有 capability 名称已经是 Host Bridge API
契约，例如：

- `library.get_item_detail`
- `topics.get_context`
- `citation_graph.get_metrics`
- `paper_artifacts.read`

更稳妥的方式：

- capability registry 保持现状。
- CLI 引入 canonical command group。
- surface catalog 支持一个 capability 映射多个 CLI aliases。
- wrapper skill 只推荐 canonical command。
- 旧命令保留为兼容路径，但在文档里降级为 legacy alias。

### Surface Catalog 整理要求

后续做 CLI 分组变更时，应同步修复当前 generated surface 的漂移：

- `workflow cancel` 应映射到 `POST /bridge/v1/workflows/runs/{runId}/cancel`。
- `task active` 应映射到 `GET /bridge/v1/tasks/active`。
- `skill-run get` 应映射到 `GET /bridge/v1/skill-runs/{skillRunId}`。
- `skill-run reply` 应映射到 `POST /bridge/v1/skill-runs/{skillRunId}/reply`。
- `skill-run connect` 应映射到 `POST /bridge/v1/skill-runs/{skillRunId}/connect`。

引入 canonical namespace 后，surface catalog 需要区分：

- canonical CLI command。
- legacy alias。
- raw-only capability。
- debug-only capability。
- dangerous command。
- cache-view command。

wrapper skill 生成时应只在主路径中展示 canonical command，legacy alias 可放到
兼容性附录或不主动展示。

### 建议整改顺序

1. 修复 surface catalog 漂移，把新增 run-control 命令纳入 generated reference。
2. 引入 `run` 组，把 workflow/task/skill-run runtime 控制面统一起来。
3. 引入 `synthesis` 组，把当前分散的 Synthesis/研究上下文能力收束。
4. 引入 `library` 子命令层级，把 item/note/attachment 收束。
5. 引入 `mutation` 组，作为 Zotero 写操作主入口。
6. 将旧顶层命令标记为 legacy alias，但保持兼容。

## 非目标

- 不把 `debug.zotero.eval` 变成正式控制面。
- 不在第一轮实现 transcript/watch/cursor。
- 不把 webhook callback 作为唯一通知状态源。
- 不允许未经审批的 Zotero 写入。
- 不在语义 API 中暴露本地私有路径、token、backend private payload。
- 不让 `workflowRunId` 隐式承担 skill-run 交互目标；交互仍以 `skillRunId` 为准。

## 安全与协议约束

- 所有 stdout 继续保持单一 JSON 对象契约。
- 所有写入命令必须有 preview 或可读审批摘要。
- 所有对象句柄使用 `libraryId:itemKey`、collection key、note key 等稳定引用。
- remote profile 下禁止要求调用方和 Zotero 共享绝对路径。
- 错误码必须稳定，避免 agent 解析自然语言错误文案。
- generated Host Bridge surface、wrapper skill、profile 必须由 catalog 渲染同步。
