---
name: zotero-bridge-cli
description: Operate Zotero Bridge CLI for exact Zotero library, workflow, and Synthesis access. Use when an agent needs low-level Zotero operations, command discovery, or structured recovery.
license: AGPL-3.0-or-later
---

# Zotero Bridge CLI

## Goal

Use the installed `zotero-bridge` CLI safely and deterministically for Zotero library, workflow, file, run, and Synthesis operations. This Skill is the complete mechanism contract: it owns executable selection, connection setup, command discovery, exact invocation, effects and approval interpretation, typed handles, output evidence, and recovery. It does not choose or compose research goals.

## Inputs

- A requested CLI operation or an already selected canonical command.
- A run-local CLI shim, an installed `zotero-bridge` executable, or the bundled installer when neither is available.
- The active release envelope and connection profile, including supplied endpoint, scope, mode, and secret environment values.
- The selected canonical command's inputs, including JSON payloads, object refs, opaque handles, cursors, provider profiles, workflow options, and output destinations.

## Workflow

1. Select one executable and one connection profile using the rules below. Keep the binary, embedded contract, profile, and release envelope in one release set.
2. 运行 `zotero-bridge surface identity`。将 `protocol`、`cliSchema`、`version`、`buildFingerprint` 和 `commandCatalogChecksum` 与当前 release envelope 比较；任何一项不一致都应停止。
3. 如果尚不知道 canonical operation，先读取 command catalog 并选择最接近的任务族；`surface search --intent '<operational terms>'` 只用于缩小候选范围。执行前运行 `surface describe '<canonical command>'`，并且只读取拥有该命令首个 token 的生成式 command-surface reference。
4. Resolve live identity and readiness from the outside in: service health, authenticated manifest/profile, backend readiness when relevant, then the domain object or workflow contract.
5. Prepare only the inputs declared by the command descriptor. Keep workflow options, provider profile, selection, payload, opaque handles, and output path in their distinct bindings.
6. Inspect effects, approval timing, typed handle transitions, pagination, targets, and recovery before the call. Present any requested Zotero-side approval without treating valid input as authorization.
7. Execute one canonical command. Treat stdout as one JSON envelope and preserve its identifiers, cursors, checksums, receipts, paths, and structured error fields.
8. Complete any paging, file delivery, workflow control, or receipt check using the returned contract. Verify live Zotero state after a requested change rather than inferring success from submission or terminal execution alone.
9. Return the valid result and its evidence, or classify the failure and take only a declared safe next action.

## Executable and profile selection

Prefer a run-local shim supplied with the current workspace. Otherwise use the installed executable. Use the bundled installer only when neither exists. Never combine a binary, profile, embedded descriptor, asset, or release envelope from different release sets; a matching version string is insufficient identity evidence.

Preserve supplied `ZOTERO_BRIDGE_PROFILE`, `ZOTERO_BRIDGE_ENDPOINT`, `ZOTERO_BRIDGE_SCOPE`, and `ZOTERO_BRIDGE_CONNECTION_MODE`. Use `ZOTERO_BRIDGE_HOST_PROFILE` or `ZOTERO_BRIDGE_HOST_HOME` only when the packaged installer needs to select the Zotero-side connection profile. `ZOTERO_BRIDGE_TOKEN` is secret input: never print, persist, place in argv, or include it in evidence.

Offline `surface` commands describe the embedded contract. They do not prove that Zotero, the Zotero Bridge service, or a configured backend is reachable. For live failures, diagnose in this order:

1. `bridge status` for service health;
2. `bridge profile inspect` and `bridge profile diagnose` for redacted connection facts;
3. `bridge manifest` for the authenticated service contract;
4. `bridge backend list` or `bridge backend status` for provider readiness;
5. the selected domain read, workflow description, run status, or durable operation receipt.

## 参数语义与放置位置

只有 `--endpoint`、`--profile`、`--operation-id` 和 `--schema` 是 CLI 全局选项。它们可以放在 canonical leaf command 之前或之后。其他所有选项都属于具体 leaf；使用前必须确认它出现在该命令的 `surface describe` 结果或生成式 command card 中。

在以下边界使用这些全局选项：

- `--endpoint` 为本次调用选择 Zotero Bridge service endpoint。显式值优先于 `ZOTERO_BRIDGE_ENDPOINT`，后者又优先于所选 profile 中的 endpoint。如果这些来源都无法解析 endpoint，不得猜测端口。
- `--profile` 选择 connection-profile JSON 文件。显式值或 `ZOTERO_BRIDGE_PROFILE` 优先于 well-known profile。connection profile 与 workflow provider profile 必须保持独立。
- `--operation-id` 为一次改变状态的请求提供幂等 identity。当同一项不确定操作可能需要 durable recovery 时使用稳定值；不得将其当作 workflow、run、Product 或 receipt handle。普通读取无需由 Agent 提供 operation id。
- `--schema` 对一个 canonical leaf 执行离线 structured-input schema 查询。只有所选命令声明了至少一个结构化 JSON 输入时才能使用。没有结构化输入的 leaf 会返回 `command_input_schema_unavailable`；此时应改用 command help 或 `surface describe`。

每个成功命令和每个结构化失败本来就会向 stdout 写入且只写入一个 JSON envelope。不得把 `--json` 添加到 `bridge status`、workflow 命令或其他普通 leaf。`--json` 只是 `surface identity`、`surface describe` 和 `surface search` 接受的 leaf-local 选项，而取得 JSON envelope 并不需要它。

`--query` 与 `--input` 都可传输 JSON，但表达的是不同的命令契约：

- `--query` 是只读 query、selector、filter 或 pagination object 的 canonical binding。当 descriptor 将其标记为可选时，省略表示 `{}`。部分 query parser 接受 `--input` alias，但构造和记录调用时必须使用 `--query`。
- `--input` 是 command-owned input payload 的 canonical binding，包括 raw capability call 以及许多 mutation、maintenance 或 debug operation。参数名本身不能证明操作会改变状态；effects 与 approval 仍以 descriptor 为准。

无论使用哪一种 binding，短小且已审阅的值可用 inline JSON，有意读取 JSON 文件时使用 `@file`，stdin 使用 `-`。已存在的裸路径也会被当作 JSON 文件读取，因此文件解释很重要时应优先使用 `@file`。不得仅因传输语法相同，就把 payload 从 `--query` 移到 `--input`，或反向移动。

参数失败使用 `details.schema: host-bridge.argument-error.v1`，并在 `details.phase` 中标明失败边界。应把 `argv`、`json_source`、`json_syntax`、`command_input`、`payload_composition`、`payload_contract` 与 `command_result` 视为不同故障。遇到 `argv` 时，只能依据 command help 或 `surface describe` 修正已点名的缺失、未知、冲突或无效参数。遇到 `json_source` 与 `json_syntax` 时，先修复选定的 stdin、文件或 inline JSON 源，再查阅领域 schema。遇到 `command_input` 时，检查 `argumentId` 和有界 violations，并对同一叶命令运行 `--schema`；未声明属性不构成重命名或转换字段的许可。遇到 `payload_composition` 时，如果 violation 指向 object ref 或 file id 等可转换值，只修正已点名的 CLI argument；如果声明的 composition 本身缺失或不兼容，应停止并报告 command-contract drift。`payload_contract` 表示 composed payload 与 capability contract 在网络 I/O 前不一致；`command_result` 则表示本地结果或 Host 响应未通过可执行合同，不能当作成功接受。当故障已证明发生在本地时，这三种 phase 都会报告 `stateChange: "unchanged"`；否则应保留返回的 state。violation 条目已经脱敏并设有数量上限；当 `truncated` 为 true 时，应先修正已报告的问题并重新验证，不得要求披露原始 payload。

CLI 没有全局结果输出选项。`file download --output`、`product download --output-dir` 及其 local alias、`workflow agent-run --output-dir` 的 destination 与 overwrite contract 各不相同。只有 selected leaf descriptor 明确声明时，才能使用对应输出选项。

## Command discovery and invocation

Use `surface search` to discover operations, not to decide a research task. `surface describe` is authoritative for argv bindings, invocation and payload schemas, result shape, pagination, effects, approval scope, handle transitions, recovery, and targets. Use raw `call` only for an advanced diagnostic capability that has no canonical semantic command.

## 输出边界与续传纪律

每个规范命令都在 descriptor 中声明且仅声明一种 `outputBoundary.strategy`：`fixed`、`cursor`、`offset`、`limit`、`file` 或 `raw`。执行前必须读取该对象，并将其中的默认值、最大值、section、continuation、truncation 与 file 字段视为结果契约的一部分。不得因为首个响应很短、capability 类别或旧命令示例而自行推断输出已有界。

对于 `cursor` 结果，保留原始规范命令以及全部规范化 selector 和 filter。读取声明的领域数组，记录 `returned`、`total`、`limit`、`hasMore` 与 `nextCursor`，并且只能在相同 criteria 下把 opaque cursor 传回同一命令继续读取。cursor 不是 item id、timestamp、array offset，也不是可以跨命令复用的 token。不得解码 cursor 来构造新 cursor，不得替换成其他 section 的 cursor，也不得在续传失败时静默从第一页重启。

当 `hasMore` 为 true 时，缺失 `nextCursor` 表示响应不完整，必须阻止完成。当 `hasMore` 为 false 时，continuation 必须为空并停止读取。按稳定领域 identity 合并分页结果，拒绝重复项；当 `total` 描述的是同一过滤集合时，将最终唯一行数与它比较。若响应包含多个分页数组，只跟随拥有目标数组的 `pagination.<section>` 下的 cursor；不得隐式推进无关 section。

`invalid_host_bridge_cursor` 表示 cursor 格式错误、已过期、属于另一命令、绑定了不同 criteria，或其锚点行已不可用。保留结构化 `reason`。如果仍需完成预期读取，应有意识地使用原始 filter 从第一页重启、重新构建结果，并报告 snapshot 已变化；不得把重启后的第一页追加到失败 cursor 已收集的行之后。

对于 `offset` 结果，保留 selector，并持续请求 `offset=nextOffset`，直至 `hasMore` 为 false。按 offset 顺序保存 chunk，要求每个 chunk 的 `offset` 等于前一个 `nextOffset`，且每段只拼接一次。除非 descriptor 声明更严格的值，默认文本窗口为 8,000 字符，最大为 16,000 字符。越过文本末尾的 offset 是合法的空 terminal chunk，不允许因此从零重试。若返回 `totalChars`，完成条件包括重建后的字符数与其一致。

对于 `limit` 结果，使用声明的默认值和硬上限，检查 `truncated`；若所需证据无法容纳，应缩小 selector。limit-bounded 结果没有隐式 continuation：不得虚构 cursor。对于 `fixed`，只有确认结果属于 registry、singleton、aggregate 或其他具有硬上限的契约后，才能把一次响应视为完整。

对于 `file` 结果，stdout 仅是 delivery control plane。保留所属 object 或 operation identity 以及返回的 file descriptor，确认未暴露 Zotero 计算机上的私有文件系统路径，通过 `file download` 下载，并把 byte count 与 SHA-256 同 descriptor 比较。handle 过期时，应从所属 semantic command 重新获取，不得重试任意路径。descriptor 响应成功不等于 bytes 已下载并校验。

`raw` 仅保留给 `call`。目标 capability 仍拥有自己的 paging、limit、offset 或 file boundary；raw invocation 不会放宽这些边界，也不能绕过已有的规范 semantic command。若存在 semantic command，必须使用它，以保持 argv validation、result contract、recovery 与生成式指导可执行。

### Start from user intent

An agent often receives a request such as “show me the papers about this topic,” “download the analysis result,” or “run the deep-reading workflow” before it knows any CLI names. Do not make the user translate that request into a command.

Use this sequence:

1. Read [the command catalog](references/command-catalog.md).
2. Identify the requested Zotero object, task family, freshness, deliverable, and state-change boundary.
3. Select the smallest candidate command or ordered command sequence from the catalog.
4. Use `surface search` only when multiple candidates still match.
5. Use `surface describe` to obtain the exact live contract.
6. Read the one detailed reference that owns the command root.
7. Construct and execute the invocation only after inputs, effects, approval, handles, completion evidence, and recovery are known.

The catalog is intentionally compact. It owns discovery by user intent, while the command references own executable detail. Do not construct argv from the catalog table or copy a command merely because its summary shares a keyword with the user's request.

### Translate common request shapes

- “This paper,” “these items,” and “the current collection” first require `context` commands to resolve the live selection.
- “What is in my library?” and “do I have papers about X?” require `library` reads and a complete bounded paging decision.
- “Change these tags” or “put this in a collection” requires a live identity read, a reviewed mutation, current authority, and post-write verification.
- “Get the generated report” may require a Product or workflow artifact read followed by file delivery; it is not automatically an attachment read.
- “Run workflow X” requires workflow discovery, description, selection validation, provider-profile validation when declared, and submission.
- “How is the workflow going?” begins from the typed handle returned by submission. For direct admission, retain the returned `workflowRunId` and use `run`, not workflow discovery. For host-queue admission, retain `submissionId`, inspect `workflow submission get`, and use `workflow queue list` or `workflow queue cancel` only for queue-level observation or pending cancellation; do not invent a `workflowRunId` before an admitted task exposes one.
- “Refresh the synthesis graph” requires diagnosis of the exact derived model and maintenance scope before any write.
- “Why is the bridge failing?” begins with semantic health and profile diagnostics; raw `call` is the last resort.

When a request spans families, preserve the boundary between each result and the next input. A context read does not authorize a mutation, workflow validation does not authorize submission, run termination does not prove Product delivery, and a maintenance receipt does not prove an unrelated model is current.

### Confirm the selected command

Before execution, answer all of these questions from the live descriptor and detailed reference:

- What canonical command will run?
- Which values are positionals, flags, inline JSON, stdin, or files?
- What object or typed handle identity is required?
- Is the operation read-only, navigational, mutating, maintenance, or diagnostic?
- Where can approval occur, and what exact scope does it cover?
- Does the result page, issue another handle, or require a later receipt?
- What live evidence proves the requested outcome?
- If the call is interrupted, what state or handle must be inspected before retry?

If any answer is absent, do not guess. Continue discovery, resolve live identity, or return the missing input or authority as the current blocker.

Choose an input channel only when the descriptor permits it:

- use direct flags and positionals for short scalar values and typed refs;
- use inline JSON only for short, reviewed payloads;
- use a documented path, `@file`, or `-` for stdin for larger payloads;
- keep workflow selection, workflow options, and provider profile as separate values;
- use absolute output paths when a command or profile helper requires them.

Do not reinterpret a CLI option from a similarly named command. The generated command-surface references expose all bindings, but the active binary's `surface describe` result wins when the loaded artifact and executable differ.

## Identity, paging, and freshness

A title, citation string, cached index row, generated report, or search candidate is not a Zotero object identity. Resolve current context for deictic requests, keep returned library IDs and item keys, normalize child notes or attachments to their top-level parent only when the next contract requires parent items, and fetch the selected object before reporting detailed state or writing.

For cursor or offset pagination, preserve accepted pages and the last returned cursor or offset. Continue until the response reports completion or the bounded request is satisfied. After interruption, resume from the last accepted position and never merge an already accepted page twice. An empty first page or truncated search is not proof of absence.

Local indexes, snapshots, workflow catalogs, notifications, and generated Synthesis artifacts have explicit freshness limits. Re-read the live object, selection, permission, run, Product, operation, or workflow description whenever the requested conclusion or write depends on current state.

## Effects, approval, and handles

The command card distinguishes read, navigation, write, maintenance, and debug operations. Navigation may change visible Zotero UI state without modifying bibliographic data. Ephemeral output or workflow control is not automatically a library mutation. Maintenance and debug repair require their own diagnosed scope and must not be used as shortcuts around a failed semantic command.

Zotero-managed writes and apply-back remain subject to the declared Zotero-side approval path. Permission reads are observational and cannot approve or reject a request. A prior approval, valid preview, local validation, notification, cached proposal, or terminal run never authorizes another operation.

Treat every returned identifier as an opaque typed handle. Keep Zotero refs, `submissionId`, `queueId`, `workflowRunId`, `skillRunId`, `agentRunId`, `agentRequestId`, `permissionRequestId`, `operationId`, `eventId`, `fileId`, and Product identifiers in their declared command families. Never synthesize, recast, or exchange them. A `submissionId` identifies one immutable native-queue admission, while a `queueId` identifies one pending unit inside that submission; neither is a workflow-run identity. Do not reuse a handle after `handleConsumption` is `consumed` or `unknown` without a domain receipt that explicitly permits continuation.

## Files, Products, and artifacts

A Zotero-side path is not automatically readable by the agent. When an attachment, Product, artifact, or operation returns a `fileId` or delivery instruction, use the declared download command and verify checksum and byte count before using the bytes as evidence. Reacquire expired access from the owning object rather than guessing a storage path.

Keep these identities separate:

- a local path names agent-accessible bytes;
- `fileId` is a short-lived bridge-issued transfer handle;
- Product identity names a Dashboard record and its downloadable assets;
- a workflow artifact belongs to its workflow or item contract;
- a Zotero attachment is live library state and must be verified through an item read.

For a local file writeback, verify the artifact first, upload it, retain the returned checksum and `fileId`, perform the approved attachment mutation, and re-read the parent item's attachments. A completed workflow run does not prove that a Product or expected artifact exists; inspect and download the requested output separately.

## Workflow and run control

For Zotero-managed execution, discover the current workflow, read its description or requirements, validate selection and workflow options, validate the backend provider profile independently, then submit them through the declared join point. Read the returned `admission` branch before choosing a monitoring family. Direct admission returns a `workflowRunId`; preserve it and use run commands for status, cancellation, skill interaction, permission observation, notifications, history, and events. A direct-run cancellation request is intent until a later run read confirms terminal state.

Host-queue admission returns a `submissionId`, unit counts, and queue links instead of fabricating an already-started run. Preserve that submission handle and inspect `workflow submission get` for the immutable unit projection and current aggregate state. Use `workflow queue list` to observe active queue units, `workflow queue cancel <queueId>` only to cancel a still-pending unit, and `run list --submission <submissionId>` to discover admitted Zotero-managed tasks without confusing task lineage with queue membership. Once a unit is admitted or running, queue cancellation must fail closed; use the returned `workflowRunId` and the normal run-control plane for execution cancellation or interaction.

The native queue owns bounded admission and keeps each admitted slot occupied through terminal execution and apply-back. Queue position or aggregate submission state is not a workflow result, a Product receipt, or proof that requested Zotero changes exist. Inspect every admitted task and its expected outputs independently, preserve failed and canceled units as distinct outcomes, and do not resubmit an uncertain submission merely because no `workflowRunId` was present in the initial response.

Active submission and queue projections are process-local. If Host restart makes the original `submissionId` unavailable, use submission-filtered task discovery and live run reads to recover units that had already been admitted; do not reconstruct pending units from labels or member counts. Report unadmitted units as no longer active, preserve their original source scope outside queue internals, and require current authority before submitting a replacement bounded request.

对于 agent 自主管理的执行，先确认 workflow 支持该模式，准备 handoff，保留 `agentRunId`、每个 `agentRequestId`、bundle 位置和 checksum，再检查每个请求契约。apply-back 前在本地验证每份完成结果。通过 `workflow agent-apply` 应用完整的请求到结果映射，并使用 `workflow agent-apply-status` 获取持久 receipt。apply 响应只提供有界聚合；分页读取 `workflow agent-apply-status`，并始终使用同一个 `agentRunId`，直至收集全部 receipt 结果，并将 state-change 与 handle-consumption 证据同各条结果分别保存。切勿通过 Zotero 托管的 run 平面监控 `agentRunId`。

`workflow agent-bundle inspect` and `workflow agent-result validate` are local preflight commands. They accept a directory or ZIP without contacting the service, applying data, renewing a lease, or consuming a handle. Unsafe paths, symbolic links, duplicate entries, excessive entry counts, oversized JSON, malformed archives, and unsupported compression return structured local-input failures. Local success proves structural validity only; it does not prove semantic correctness or authorize apply-back.

Notifications are lifecycle signals, not transcripts, interaction targets, or authorization. Use `skillRunId` for reply/connect, `permissionRequestId` for permission inspection, and `eventId` for acknowledgement. Acknowledge an event only after its action has been handled.

## Synthesis operation boundaries

Treat topics, graphs, indexes, resolvers, artifacts, concepts, schemas, and attention queues as distinct derived models. A derived association is not automatically a scholarly or causal claim, and a generated artifact is not proof of a current Zotero write.

Use cache and index status reads before proposing maintenance. Reference-sidecar refresh, citation-graph update, graph-metric refresh, and cache invalidation are separate operations with separate scopes, approvals, operation IDs, and receipts. Preserve the committed basis hash where required; do not treat one operation's completion as evidence that another derived model is current.

## Hard constraints

- Use only documented canonical CLI commands and the argv confirmed by `surface describe` or the command reference. Do not guess flags or substitute raw `call` for an available semantic command.
- Never read or modify Zotero databases, storage, or application internals directly. All library writes and apply-back operations stay on the Zotero-side approval path.
- Treat every returned identifier as an opaque, typed handle. Do not exchange handle kinds, reuse a consumed or unknown handle, or send local paths where a bridge-issued handle is required.
- Keep bearer tokens and other credentials out of command arguments, JSON results, diagnostics, and task evidence.
- Treat stdout as one JSON envelope. Preserve pagination cursors, file checksums, operation receipts, and output locations exactly as returned.
- A local validation success does not authorize a later `workflow agent-apply`; Zotero-side preflight and approval remain authoritative.
- Use the CLI binary, profile, embedded contract, and release envelope from one release set. A matching version string alone is not sufficient identity evidence.
- Do not infer current Zotero state from a cached projection, workflow terminal status, notification, local artifact, or generated analysis.
- Do not retry a state-changing call until its durable state and handle consumption are known.
- Do not implement an agent-side workflow queue, plan-entry registry, reservation loop, replay loop, or background batching layer around `workflow submit`. Bounded concurrency and pending-unit ownership belong to Zotero's native workflow queue.
- Do not treat `submissionId`, `queueId`, and `workflowRunId` as interchangeable. Queue cancellation applies only to a pending `queueId`; admitted work is controlled through its real run handle.

## LLM and tool responsibilities

- The agent owns operation selection, semantic interpretation, approval-aware decisions, evidence use, and recovery choices.
- The CLI owns exact argv parsing, Zotero Bridge service requests, typed-handle transport, structured errors, and local bundle/result validation.
- The renderer owns the command-surface references and embedded Agent Surface; do not hand-assemble those artifacts or invent a handle, receipt, checksum, or result envelope.

## Completion

The Skill is complete when the requested operation has returned a valid JSON envelope, all required pages or delivered bytes have been obtained, relevant handles and receipts are preserved, and any requested state change is live-verified. It is also complete when a structured failure is classified with the next safe action and no unsafe repeat has occurred.

Match the evidence to the operation:

- for a bounded read, retain the stable object ref and the fields that answer the request;
- for a paged result, retain the completed boundary or the last accepted cursor;
- for delivered bytes, retain the checksum, byte count, and owning object;
- for a mutation, retain the approval outcome, operation receipt, and live post-read;
- for an asynchronous run, retain terminal state and separately verify the requested deliverable;
- for a host-queue submission, retain `submissionId`, each unit's `queueId` and admitted task identity when present, the aggregate terminal projection, and the independently verified result or failure for every requested unit;
- for a local validator, report only structural validity and do not imply remote authority.

## Failure handling

1. Preserve the command, sanitized inputs, structured error code, relevant handles, accepted pages, and any operation or output identifiers.
2. Read `retryable`, `stateChange`, `handleConsumption`, `safeNextActions`, and `nextCommand` from the envelope.
3. When `stateChange` is `changed` or `unknown`, read the durable operation, apply-back receipt, workflow/run state, or affected live object before another change.
4. When `handleConsumption` is `consumed` or `unknown`, do not reuse the handle unless the domain receipt declares a resumable action.
5. Retry only when `retryable` is true, current state permits it, and the retry will not duplicate an accepted page, submission, mutation, upload, or apply-back.
6. For partial apply-back, report each applied, failed, and unattempted request from the receipt; never collapse the result into success or replay the complete mapping.
7. For file or paging failure, keep verified bytes/pages and resume only through the returned cursor, file owner, or safe next command.
8. If authority, input, identity, profile readiness, or approval is missing, return the structured failure and required decision rather than bypassing the CLI or Zotero-side boundary.
9. For an uncertain host-queue submission, inspect the original `submissionId`, then correlate admitted tasks with `run list --submission`; never create a second submission until the first admission outcome is known.
10. When pending cancellation races with admission, accept the queue endpoint's conflict as evidence that ownership has crossed to the run plane, re-read the submission projection, and continue only with the exposed task or run handle.

## References

When the canonical command is unknown, first read [the command catalog](references/command-catalog.md). The catalog links exactly one generated card for every canonical leaf command. After selecting a command, load only that card; it is independently complete for inherited globals, local argv, structured inputs, schemas, examples, effects, approval, handles, targets, and recovery. The active executable's `surface describe` result wins before a live operation.
