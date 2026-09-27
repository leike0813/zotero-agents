# Zotero Agents 生产代码全面审查报告

- 仓库：`/home/joshua/Workspace/Code/JavaScript/zotero-agents`
- 审查时点：工作树 `7658e599`（`refactor: unify dashboard & synthesis page chrome`），`git status` 干净
- 审查方式：**只读**（未修改、未生成、未删除任何仓库文件；未运行任何 --fix / formatter / codemod）

## 0. 摘要

覆盖 **963 个生产源文件 / 624,677 行**：插件 TypeScript（`src/`）、四个 synthesis 包（`packages/`）、三个 Rust crate（`rust/`）、构建与发布脚本（`scripts/`）、前端资产（`addon/`）、skill 运行时（`skills_builtin`/`skills_src`/`profiles`）与 SkillRunner 输出合约库（`assets/`）。每个文件在第 8 节台账中都有独立结论行。

文件级结论：**问题 380**、OK 487、存疑 94、未细读 2。

问题条目：**P1 × 27**、P2 × 271、P3 × 236；**未发现 P0**（未确认不可逆数据丢失或已实现的安全绕过）。

> **证据分级（重要）**：第 3 节 11 条由我逐条打开源码核对（含逐字证据）；第 4 节是来自分片审查的**候选**列表，未逐条复核，误报率不可忽略；第 5 节列出我已证伪的 5 条高严重度误报。请勿把第 4 节直接当作改动依据。

自动门禁（本次实际运行，全部通过，故不重复 lint/格式类问题）：`tsc --noEmit`（主配置 + sidebar/dashboard/synthesis）、`eslint .`、`cargo clippy --workspace --all-targets`（synthesis-sidecar 0 警告；zotero-bridge 268 条既有 warning；acp-ws-bridge 7 条）。

## 1. 范围与覆盖

| 域 | 文件数 | 行数 | 分片数 | 分片 |
|---|---:|---:|---:|---|
| `src（其余）` | 194 | 97,386 | 15 | S01, S03, S04, S09, S10, S11… |
| `rust/synthesis-sidecar` | 87 | 91,297 | 10 | S59, S60, S61, S62, S63, S64… |
| `src/modules（其余）` | 87 | 73,252 | 9 | S05, S06, S07, S08, S30, S31… |
| `skills_builtin` | 62 | 61,131 | 6 | S24, S25, S26, S27, S38, S39 |
| `src/modules/acp` | 87 | 50,145 | 6 | S07, S41, S42, S43, S44, S45 |
| `scripts` | 104 | 30,642 | 4 | S00, S01, S02, S03 |
| `src/modules/hostBridge` | 37 | 28,452 | 6 | S06, S47, S48, S49, S50, S68 |
| `src/modules/skillRunner` | 37 | 25,169 | 5 | S08, S50, S51, S52, S53 |
| `packages/synthesis-contracts` | 53 | 24,582 | 3 | S18, S19, S20 |
| `src/modules/workflow*` | 48 | 24,312 | 4 | S33, S34, S55, S56 |
| `skills_src` | 16 | 24,183 | 4 | S27, S28, S40, S68 |
| `src/modules/synthesis` | 45 | 24,177 | 4 | S32, S33, S53, S54 |
| `addon` | 39 | 21,611 | 5 | S00, S01, S15, S16, S37 |
| `rust/zotero-bridge` | 14 | 13,406 | 3 | S22, S23, S24 |
| `packages/synthesis-engine` | 9 | 11,544 | 1 | S21 |
| `packages/synthesis-application` | 17 | 10,814 | 1 | S17 |
| `packages/synthesis-repository` | 10 | 7,032 | 1 | S22 |
| `profiles*` | 6 | 1,748 | 1 | S37 |
| `tools` | 2 | 1,512 | 2 | S15, S37 |
| `rust/acp-ws-bridge` | 1 | 1,233 | 1 | S22 |
| `assets` | 8 | 1,008 | 1 | S16 |

## 2. 分片索引

每个分片的完整台账（文件表 + findings 全文）在 `slices/S<编号>.md`。

- `slices/S00.md` —— 34 文件 / 10,867 行 —— ``
- `slices/S01.md` —— 17 文件 / 6,028 行 —— ``
- `slices/S02.md` —— 27 文件 / 8,783 行 —— `scripts`
- `slices/S03.md` —— 41 文件 / 10,360 行 —— ``
- `slices/S04.md` —— 12 文件 / 5,311 行 —— `src`
- `slices/S05.md` —— 1 文件 / 18,292 行 —— `src/modules/zoteroHostCapabilityBroker.ts`
- `slices/S06.md` —— 7 文件 / 11,000 行 —— `src/modules`
- `slices/S07.md` —— 16 文件 / 10,987 行 —— `src/modules`
- `slices/S08.md` —— 19 文件 / 3,652 行 —— `src/modules`
- `slices/S09.md` —— 15 文件 / 7,118 行 —— `src`
- `slices/S10.md` —— 20 文件 / 6,512 行 —— `src/shared`
- `slices/S11.md` —— 10 文件 / 10,550 行 —— `src/sidebar`
- `slices/S12.md` —— 25 文件 / 5,155 行 —— `src`
- `slices/S13.md` —— 10 文件 / 10,979 行 —— `src/workflows`
- `slices/S14.md` —— 16 文件 / 4,987 行 —— `src/workflows`
- `slices/S15.md` —— 18 文件 / 9,674 行 —— ``
- `slices/S16.md` —— 25 文件 / 10,084 行 —— ``
- `slices/S17.md` —— 17 文件 / 10,814 行 —— `packages/synthesis-application/src`
- `slices/S18.md` —— 12 文件 / 10,993 行 —— `packages/synthesis-contracts/src`
- `slices/S19.md` —— 22 文件 / 10,986 行 —— `packages/synthesis-contracts/src`
- `slices/S20.md` —— 19 文件 / 2,603 行 —— `packages/synthesis-contracts/src`
- `slices/S21.md` —— 9 文件 / 11,544 行 —— `packages/synthesis-engine/src`
- `slices/S22.md` —— 13 文件 / 8,399 行 —— ``
- `slices/S23.md` —— 11 文件 / 13,000 行 —— `rust/zotero-bridge/src`
- `slices/S24.md` —— 10 文件 / 8,308 行 —— ``
- `slices/S25.md` —— 4 文件 / 8,963 行 —— `skills_builtin`
- `slices/S26.md` —— 21 文件 / 9,398 行 —— `skills_builtin`
- `slices/S27.md` —— 5 文件 / 8,885 行 —— ``
- `slices/S28.md` —— 2 文件 / 8,344 行 —— `skills_src`
- `slices/S29.md` —— 12 文件 / 9,997 行 —— `src/dashboard/components`
- `slices/S30.md` —— 4 文件 / 5,317 行 —— `src/modules/dashboard`
- `slices/S31.md` —— 19 文件 / 10,440 行 —— `src/modules`
- `slices/S32.md` —— 23 文件 / 9,792 行 —— `src/modules/synthesis`
- `slices/S33.md` —— 6 文件 / 4,822 行 —— `src/modules`
- `slices/S34.md` —— 23 文件 / 9,412 行 —— `src/modules/workflowExecution`
- `slices/S35.md` —— 12 文件 / 7,791 行 —— `src`
- `slices/S36.md` —— 25 文件 / 8,245 行 —— `src`
- `slices/S37.md` —— 19 文件 / 12,370 行 —— ``
- `slices/S38.md` —— 13 文件 / 14,726 行 —— `skills_builtin/literature-analysis/scripts/analysis_runtime`
- `slices/S39.md` —— 11 文件 / 11,292 行 —— `skills_builtin/literature-deep-reading/renderer/templates`
- `slices/S40.md` —— 11 文件 / 11,312 行 —— `skills_src/literature-deep-reading/renderer/templates`
- `slices/S41.md` —— 14 文件 / 9,611 行 —— `src/modules/acp/chat`
- `slices/S42.md` —— 18 文件 / 10,889 行 —— `src/modules/acp/diagnostics`
- `slices/S43.md` —— 6 文件 / 10,988 行 —— `src/modules/acp/skillRun`
- `slices/S44.md` —— 35 文件 / 10,549 行 —— `src/modules/acp/skillRun`
- `slices/S45.md` —— 12 文件 / 7,192 行 —— `src/modules/acp/transport`
- `slices/S46.md` —— 10 文件 / 5,636 行 —— `src/modules/assistant/publication`
- `slices/S47.md` —— 13 文件 / 7,985 行 —— `src/modules`
- `slices/S48.md` —— 6 文件 / 5,115 行 —— `src/modules/hostBridge`
- `slices/S49.md` —— 13 文件 / 5,947 行 —— `src/modules/hostBridge/server`
- `slices/S50.md` —— 13 文件 / 10,978 行 —— `src/modules`
- `slices/S51.md` —— 15 文件 / 6,814 行 —— `src/modules/skillRunner/run`
- `slices/S52.md` —— 6 文件 / 8,187 行 —— `src/modules/skillRunner/runtime`
- `slices/S53.md` —— 12 文件 / 9,383 行 —— `src/modules`
- `slices/S54.md` —— 12 文件 / 7,745 行 —— `src/modules/synthesis`
- `slices/S55.md` —— 9 文件 / 4,787 行 —— `src/modules/workflow/catalog`
- `slices/S56.md` —— 15 文件 / 10,055 行 —— `src/modules/workflow`
- `slices/S57.md` —— 13 文件 / 7,316 行 —— `src/synthesis/components`
- `slices/S58.md` —— 11 文件 / 8,367 行 —— `src/synthesis/components`
- `slices/S59.md` —— 4 文件 / 2,899 行 —— `rust/synthesis-sidecar/crates/synthesis-application/examples`
- `slices/S60.md` —— 5 文件 / 10,996 行 —— `rust/synthesis-sidecar/crates/synthesis-application/src`
- `slices/S61.md` —— 5 文件 / 10,986 行 —— `rust/synthesis-sidecar/crates/synthesis-application/src`
- `slices/S62.md` —— 13 文件 / 12,478 行 —— `rust/synthesis-sidecar/crates/synthesis-application/src`
- `slices/S63.md` —— 7 文件 / 9,874 行 —— `rust/synthesis-sidecar/crates`
- `slices/S64.md` —— 4 文件 / 10,856 行 —— `rust/synthesis-sidecar/crates/synthesis-repository/src`
- `slices/S65.md` —— 7 文件 / 5,368 行 —— `rust/synthesis-sidecar/crates`
- `slices/S66.md` —— 10 文件 / 10,986 行 —— `rust/synthesis-sidecar/crates/synthesis-sidecar/src`
- `slices/S67.md` —— 21 文件 / 12,909 行 —— `rust/synthesis-sidecar/crates/synthesis-sidecar/src`
- `slices/S68.md` —— 18 文件 / 11,648 行 —— ``

## 3. 已核验的关键缺陷

### V1 [P1][信任边界/资源] `src/modules/hostBridge/server/hostHttpRequestReader.ts:55 + hostBridgeServer.ts:907`
**Host Bridge 在鉴权前完整读取请求体，且无并发连接上限**

- 证据：`const limits = options.limits || DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS;`（默认 `maxBodyBytes: 16 * 1024 * 1024`，hostHttpRequestReader.ts:55）；hostBridgeServer.ts:907 才执行 `if (!(await isHostBridgeAuthorizationValid(request.headers, state.token)))`，而 MAX_REQUEST_BODY_BYTES 的 413 判断在鉴权之后。
- 影响：未认证请求可让插件先缓冲至多 16 MiB 再被 401 拒绝；LAN 模式下（hostBridgeServer.ts:168 `LAN_HOST = "0.0.0.0"`，由 bindMode 决定）该面可被局域网内任意主机反复触发。默认 loopback 时风险受限。
- 建议：在鉴权前先做 content-length 预检并要求 Authorization 头存在；为 server socket 增加并发连接上限。
- 置信度：高

### V2 [P1][信任边界/资源] `src/modules/hostBridge/server/hostBridgeAuth.ts:294-314`
**每个伪造 Bearer token 触发一次 PBKDF2-SHA256 100000 轮派生（未认证 CPU 消耗）**

- 证据：`isHostBridgeAuthorizationValid` 在 `timingSafeEqualString(token, expectedToken)` 失败后无条件 `await readHostBridgeMasterToken()`；后者 `await deriveMasterTokenKey(base64ToBytes(envelope.salt))`，而 `deriveMasterTokenKey` 使用 `iterations: MASTER_PBKDF2_ITERATIONS`（=100000）。
- 影响：攻击者只需发含 `Bearer x` 的请求即可让主线程/WebCrypto 反复做 10 万轮 PBKDF2；配合 V1 的无连接上限可造成插件 UI 卡顿。仅在已配置 master token（`hostBridgeMasterTokenEncryptedJson` 非空）时可达。
- 建议：先用常量时间比较筛掉明显无效 token；或缓存派生结果/仅在主 token 比较命中后才派生。
- 置信度：高

### V3 [P1][契约] `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:1453-1497`
**MCP 工具错误丢弃 broker 的稳定 code/retryable/details**

- 证据：`const structuredCode = brokerError?.code === "not_found" ? … : undefined;` 之后 `if (structuredCode) { … }`，否则 `return jsonRpcError(request.id ?? null, -32602, message, { toolName, errorName, details: error instanceof ZoteroMcpToolInputError ? error.details : undefined })`。
- 影响：除 not_found 之外的所有 ZoteroHostCapabilityError（conflict / invalid_input / unavailable / repair_required 等）在 MCP 表面退化为 -32602 且 details 为空，违反「broker 失败统一使用稳定 code、retryable 和 strict-JSON details」的契约；agent 无法据此判断可重试性。
- 建议：对任意 ZoteroHostCapabilityError 一律投影 `{ errorCode: error.code, retryable: error.retryable, details: error.details }`。
- 置信度：高

### V4 [P1][信任边界] `src/workflows/zipBundleReader.ts:62-115`
**zip 解包无条目数/总字节配额（zip bomb）**

- 证据：Zotero 分支 `const entries = zipReader.findEntries(null); while (entries.hasMore()) { … zipReader.extract(entryName, …); }`；`safeZipEntrySegments` 只校验路径穿越（`segment === "." || segment === ".."`），不限制条目数与累计字节。
- 影响：恶意/损坏的工作流包可写满临时目录并耗尽磁盘；解包目录位于系统临时区（`mkTempDir("zotero-skills-bundle")`）。工作流包来自用户安装的内容包，属半可信输入。
- 建议：解包时累计条目数与字节数，超过阈值即中止并清理临时目录。
- 置信度：高

### V5 [P1][信任边界] `assets/skillrunner-output-contract/skill_runner_contract/artifact.py:66-80,238-247`
**工件路径越出 run dir 时用 shutil.move 把源文件搬进 run dir（破坏原文件）**

- 证据：`if candidate.is_absolute(): return candidate.resolve()`（`_resolve_run_local_path`）；随后 `if not _is_relative_to(resolved, root): target = run_dir / "artifacts" / field.name / resolved.name; … shutil.move(str(resolved), str(target))`。
- 影响：skill 输出里若填了绝对路径（如 `/home/user/paper.pdf` 或 `/etc/…`），该文件会被**移动**（非复制）进 run 目录，原位置文件消失，并被后续打进 bundle 上传；同时 `Path.is_absolute()` 使用宿主平台语义，Windows 盘符路径在 Linux 下会被当作相对路径处理。
- 建议：越界路径应报错或改为 copy；显式拒绝绝对路径。
- 置信度：高

### V6 [P1][资源] `src/modules/acp/transport/acpTransport.ts:1159-1184`
**waitForPromiseWithTimeout / withTimeoutValue 每次调用泄漏一个未清理的 setTimeout**

- 证据：`return await Promise.race([promise.then(()=>true,()=>true), new Promise<boolean>((resolve)=>{ setTimeout(()=>resolve(false), timeoutMs); })])`；`withTimeoutValue` 同构且缺少 `timeoutMs <= 0` 守卫。
- 影响：promise 先完成时定时器仍挂到超时时刻才回调（闭包+事件循环占用）；热路径反复调用会累积大量挂起定时器。`withTimeoutValue` 在 timeoutMs=0 时定时器几乎必然先到，直接返回 null 丢弃真实结果。
- 建议：持有 timer 句柄并在 promise 落定后 clearTimeout；补齐 `timeoutMs <= 0` 分支。
- 置信度：高

### V7 [P1][并发/资源] `src/modules/acp/transport/acpConnectionAdapter.ts:1041-1093`
**MCP/Zotero 写权限请求的 Promise 无超时、无取消、close() 不 resolve**

- 证据：`const outcome = await new Promise<RequestPermissionOutcome>((resolve) => { const pending = { requestId, …, resolve }; for (const listener of this.permissionListeners) void listener(pending); });` —— `pending` 只存在于闭包内，未登记到任何可被 `close()` 清理的表。
- 影响：若监听方（UI/dialog）不回调，该 await 永久挂起，ACP 回合无法收敛；session 关闭/窗口销毁也不会解除等待（`close()` 只处理 connection）。表现为回合卡死、无错误、无日志。
- 建议：把 pending 登记到实例级 Map，在 close()/owner 切换/超时路径统一 reject 或返回 unavailable。
- 置信度：中高

### V8 [P1][并发] `src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:906-925`
**flush 进行中入队的 lane 既无定时器也无尾随 flush，可能永久滞留**

- 证据：`async flush() { if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; } if (this.flushing) return this.flushing; const run = this.flushPending(); … }`；`rescheduleFlush` 要求 `this.flushTimer === expectedToken` 才重建定时器。
- 影响：flush 开始后清空了 flushTimer 并进入 flushing；此期间新入队的 lane 不会被在飞 flush 消费，也没有定时器兜底，需等下一次外部触发（新入队或显式 flush）才会被投递；若该 owner 后续无事件，transcript/chrome 发布滞留在 pending。
- 建议：flush 结束时若 pending 非空则自调度一次尾随 flush（或在入队时无条件重建定时器）。
- 置信度：中高

### V9 [P1][正确性/契约] `skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:562-591（skills_builtin 下 4 份副本字节相同）`
**topic-synthesis 运行时 record_action / register_artifact / write_*_transcript 是空实现**

- 证据：`def record_action(…)->None: return None`；`def register_artifact(…)->None: ARTIFACT_PATHS[key] = path; return None`；`def artifact_entry(conn, key): path = ARTIFACT_PATHS.get(key); …`；`write_gate_transcript`/`write_action_transcript` 同样 `return None`。
- 影响：action receipt 永不落库；工件登记的 hash/stage_id/skill_id 被丢弃，只有 path 进入**进程内**字典。gate 每次调用只跑一个 stage 且进程退出即丢，跨进程再查 `artifact_entry` 必然返回 None（`write_handoff` 因此静默少写条目，`section_manifest_entry`/`sidecar_manifest_entry` 则直接抛 ValueError）。
- 建议：把 receipt/artifact 落到 SQLite（与其它 runtime_db 一致），或让 handoff manifest 成为唯一事实源并移除这些空壳 API。
- 置信度：高

### V10 [P1][契约/一致性] `skills_src/literature-deep-reading/renderer/templates/* vs skills_builtin/literature-deep-reading/renderer/templates/*`
**deep-reading 渲染模板在源目录与发布目录之间存在内容漂移**

- 证据：`diff -rq` 显示 `citation-graph-synthesis-app.js`、`citation-graph-synthesis-i18n.json`、`citation-graph-synthesis.css` 三个文件不同；i18n 差异为缺失键（发布副本少 `synthesis-confirm-delete-concepts`、`synthesis-concepts-select-row` 等），CSS 副本少 `.synthesis-root.sidebar-collapsed .nav button` 规则。生成器 `scripts/content-package/build-literature-deep-reading-graph-renderer.ts` 的 outDir 指向 `skills_src/.../templates`。
- 影响：发布到用户机器的模板与仓库源不一致：源里新增的 i18n key/样式不会出现在发布副本，且无 `--check` 门禁比对二者（只有 `build:*` 生成，未见 freshness 校验）。用户可见文案缺失/样式失效，且难以察觉。
- 建议：建立 skills_src→skills_builtin 的复制/校验门禁（类似 `check:help-docs`），并重新生成发布副本。
- 置信度：高

### V11 [P2][正确性] `skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:1196-1209`
**单行 `$$…$$` 公式块会吞掉后续行**

- 证据：`if stripped.startswith("$$")` 分支在追加当前行后进入 `while`，仅当 `lines[i].strip().endswith("$$")` 才 break —— 起始行同时是结束行时不会 break，继续吞并后续段落直到遇到以 `$$` 结尾的行。
- 影响：源文档含单行行间公式时，其后直到下一个 `$$` 结尾行的内容（标题/表格/图片）全部被并入公式块，解析结构错位。（此项由自动化审查报告，证据来自其复现记录，我未独立复现。）
- 建议：起始行已以 `$$` 结尾时按单行公式处理，不进入收集循环。
- 置信度：中

## 4. 待核验的候选发现

### 4.1 P1 候选

| 类目 | 位置 | 结论 |
|---|---|---|
| 性能 | `src/modules/zoteroHostCapabilityBroker.ts:9550` | markWritten 忽略传入实体并对整个 mutation 输入做全量重算，批量成员操作退化为 O(N²) 原生读取 |
| 正确性 | `src/utils/runtimeBridge.ts:312-321` | `resolveRuntimeZoteroDetails` 在 override.zotero 已设时仍让 global-var/global-this 进入排序 |
| 信任边界 | `src/workers/runtimeFileRangeWorker.ts:44-85` | worker 自身未对 `request.ranges` 长度上限做防御 |
| 契约 | `src/synthesis/standaloneGraphApp.ts:36-58` | onAction 仅覆盖两个 action，其余静默丢弃 |
| 契约 | `src/synthesis/standaloneTopicApp.ts:39-61` | 同 F7，standalone topic export onAction 静默丢弃 |
| 正确性 | `src/synthesis/synthesisWorkbenchApp.ts:855-877` | `applyChromeMessage` 替换 `state.snapshot` 时不同步 `state.surfaces[visibleSurface].snapshot` |
| 信任边界 | `src/workflows/zipBundleReader.ts:62-115` | zip 解压无 entry 数与总字节上限，存在 zip bomb |
| 信任边界 | `assets/skillrunner-output-contract/skill_runner_contract/artifact.py:75` | 越出 run dir 的（含绝对）工件路径被 `shutil.move` 搬入 run dir 并随后打进 bundle |
| 正确性 | `packages/synthesis-application/src/topicCanonical.ts:228` | pathId 生成非单射，不同 topicId 可撞同一路径身份 |
| 性能 | `packages/synthesis-contracts/src/durableBundle.ts:641` | 分组用数组展开插入，单项上限 25 万时退化为 O(n²) |
| 契约一致性 | `tagEffect.ts:296-345` | effect.action vs receipt.action 强绑定，但 action union 仅一项 |
| 契约一致性 | `workflow.ts:478-479` | `sourceRef` 与 `source_ref` 同时存在 |
| 正确性 | `skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:1196` | 单行 `$$…$$` 公式块会吞掉后续行，导致其后的标题/表格/图片不再被解析 |
| 并发 | `src/modules/zoteroHost/zoteroHostNativeMutations.ts:426` | replaceStoredAttachment 在文件系统 effect 前后未持锁，且 native saveTx 与磁盘移动非原子 |
| 错误处理 | `src/modules/zoteroHost/zoteroHostNativeMutations.ts:470` | 回滚失败时磁盘可能已被改回 staging，但 DB 未被复原，错误状态标记为 unknown 而残余路径无人清理 |
| 信任边界 | `skills_builtin/literature-deep-reading/renderer/templates/markdown-renderer.js:292` | URL 协议白名单只作用于名为 `href`/`src` 的属性，命名空间属性（`xlink:href`）整条绕过 |
| 错误处理/并发 | `src/modules/acp/transport/acpConnectionAdapter.ts:1035-1095` | ACP/MCP 权限请求 Promise 无超时、无取消，`close()` 也不 resolve，永久挂起 |
| 资源 | `src/modules/acp/transport/acpTransport.ts:1159-1184` | `waitForPromiseWithTimeout` / `withTimeoutValue` 每次调用泄漏一个不受控 setTimeout，热路径上累积 |
| 并发 | `src/modules/acp/transport/acpClientConnection.ts:227-270` | `sendMessage` 的 writeQueue 链与 `close()` 的 getWriter 竞争，`acceptingWrites=false` 无法阻止已排队的写 |
| 并发 | `src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts:907` | 在飞 flush 期间入队的 lane 因定时器已被清空且 flush 提前返回而永久滞留 |
| 契约 | `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts:1453-1494` | ZoteroHostCapabilityError 除 not_found 外全部丢失稳定 code/retryable/details |
| 并发/资源 | `src/modules/hostBridge/server/hostBridgeServer.ts:1348` | 未认证请求在鉴权前被完整读入最多 16MB，且连接数无上限 |
| 信任边界/资源 | `src/modules/hostBridge/server/hostBridgeAuth.ts:312` | 无效 bearer token 触发 PBKDF2 100000 次派生，未认证 CPU DoS |
| 生命周期 | `src/modules/synthesis/production/synthesisProductionOwner.ts:144` | supervisor 创建失败后 owner 永久不可恢复，且 pre-ready 失败不回滚 |
| 并发 | `src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts:452` | stale generation 的 `fail` 直接 return，launch 在 `stop()` 之后仍会 spawn，导致 native sidecar 进程泄漏 |
| 正确性 | `legacy_ts_migration.rs:331-360` | copy_direct_tables 把 legacy 列名直接拼到 main 端 INSERT |
| 契约 | `tag_concept_topic_graph.rs:660-668、704-721、1280-1305` | replace_* 直接写 state，绕过 stale 闸门 |

### 4.2 P2 候选（按类目聚合，每类给代表条目）

**正确性（67 条）**

- `scripts/sync-gitee-release.ts:83` —— 空 release body 会让 Gitee 同步整体失败
- `src/backends/registry.ts:862` —— `enabled:false` 的 backend 仍会被选择，禁用形同虚设
- `src/dashboard/backendManagerApp.ts:425` —— refresh 结果按下标回写到可能已变形的 rows 数组，会把 A 行的 ACP 配置写到 B 行
- `src/platform/subprocess.ts:296` —— XPCOM 适配器没有平台守卫，非 Windows 宿主会被优先选中并静默返回空输出
- `src/shared/citationGraphStandalone.ts:464` —— hover-only 节点/边被投影出来但渲染器从不消费，单来源外部引用永远不可见
- `src/shared/topicTimelineRenderer.ts:487` —— 轴范围只由论文年份推导，跨度外的事件被静默过滤丢弃
- `src/utils/sha256.ts:54-61` —— Mozilla `nsICryptoHash` 路径 hex 输出把 base64 串按 charCode 再 hex
- `src/workflows/runtime.ts:1174` —— `skippedUnits` 对 preflight skip 双重计数，可超过 `totalUnits`
- `addon/content/components/custom-select.js:37-42` —— 单选下拉打开时会强关其它菜单的 DOM，却不复位其 `isOpen`，导致其它下拉必须点两次
- `packages/synthesis-application/src/conceptKbApplication.ts:102` —— shortHash 实际只有 5 个十六进制字符，id 碰撞概率被放大
- `packages/synthesis-application/src/webDavSyncApplication.ts:66` —— 对外宣传的 save_remote_copy 冲突动作没有实现
- `packages/synthesis-application/src/topicGraphApplication.ts:655` —— 已 resolve 的 review 合并 provenance 后不计入 changed，单变更被静默丢弃
- …其余 55 条见对应分片台账

**契约（37 条）**

- `src/backends/managementAuth.ts:157` —— 更新 management_auth 会静默丢弃文档其他顶层字段
- `src/modules/zoteroHostCapabilityBroker.ts:2683` —— snapshot 的 `identifiers.arxiv` 读取字段名与文件内其它 arXiv 投影不一致，静默恒为 null
- `src/modules/literatureArtifactMigration.ts:684` —— host 契约声明 `candidateIds`，生产 adapter 与扫描实现均丢弃该参数
- `src/schemas/zoteroHostMutationSchemas.ts:1107` —— `affectedRefs`/`residualRefs` 的 items 只允许空对象，任何真实 ref 都会让失败结果校验不过
- `src/providers/contracts.ts:41` —— 类型声明了 `mode?`，但 dispatcher 一律拒绝带 `mode` 的 payload
- `src/platform/processControl.ts:136` —— `pidfileIdentity` 为 `undefined` 时整段 pid/token 校验被跳过
- `src/workflows/workflowStoredAttachmentImport.ts:14-22` —— `validateSource` 可选，省略时字节上限静默绕过
- `packages/synthesis-contracts/src/durableBundle.ts:674` —— 持久化字段 `bytes` 存的是 UTF-16 code unit 数而非字节数
- `packages/synthesis-contracts/src/webDavSync.ts:687` —— 校验后回吐原始 JSON，`conflict_actions: null` 能通过校验并逃逸为 `null`
- `packages/synthesis-engine/src/citationGraphBuild.ts:542` —— 重建校验对 aggregateEdges.sourceRefs 强制排序/去重/≤256，生产端不满足，导致合法结果被拒
- `packages/synthesis-engine/src/conceptKbIndex.ts:550` —— 派生 search.normalized 可远超 stringMax，rebuildSearchRow 却强制上限，校验必拒绝引擎自身输出
- `packages/synthesis-engine/src/referenceMatcher.ts:4004` —— suggestedCandidates 的排序校验比候选比较器更严，会拒绝本引擎产生的合法结果
- …其余 25 条见对应分片台账

**信任边界（35 条）**

- `scripts/content-package/publish-content-package-github.ts:120` —— CLI `--tag` 未净化即进入路径并与 `fs.rm(recursive)` 组合，可越出 `.scaffold` 删除任意目录
- `scripts/content-package/publish-content-package-feeds.ts:191` —— RELEASE_PAT 被拼进 git remote URL，失败时经 `execFile` 错误消息/临时 `.git/config` 泄漏
- `scripts/host-bridge/host-bridge-release-controller.ts:282` —— CLI 未校验 `--surface-status`，非法枚举被原子写进 v2 receipt
- `scripts/host-bridge/host-bridge-surface-model.ts:109` —— 只校验 `skill.source` 的路径穿越，`skill.id`/`skill.mount` 未校验，可越出 bundle/仓库根
- `src/modules/hostBridgeCapabilityRegistry.ts:1790` —— 调用方可控的 topicId 未净化即拼入落盘文件名，可越出 bounded-output 目录写文件
- `src/modules/workspaceTab.ts:805` —— `workspace:action` 处理不校验消息来源，且桥接不校验 frame 身份
- `tools/synthesis-index-harness/cli.ts:90-94` —— debug DB 安全守卫用字符串比较路径，大小写/符号链接别名可绕过，使 harness 直接写真实 Zotero/插件 DB
- `assets/skillrunner-output-contract/skill_runner_contract/layout.py:30` —— `namespace` 未净化即拼接路径，`../` 可把 result/audit 写出工作区
- `addon/content/shared/markdown-renderer.js:292` —— 消毒器把 data:image 白名单复用到 `href`，且未覆盖 `xlink:href`
- `webDavSyncPort.ts:283-292` —— safeBaseUrl 阻断 password/secret 字段
- `rust/acp-ws-bridge/src/main.rs:661-672` —— spawn argv 明文写入审计文件，脱敏只按对象 key 匹配，字符串数组元素永远不脱敏
- `rust/zotero-bridge/src/transport.rs:727` —— 用户可控值被拼进裸 HTTP 头行；display-name 净化了，content-type / operation-id 没有
- …其余 23 条见对应分片台账

**错误处理（25 条）**

- `src/jobQueue/manager.ts:703` —— drain 的续跑链只有 fulfill 分支：runOne 抛出即队列停摆并产生 unhandled rejection
- `src/modules/zoteroHostCapabilityBroker.ts:17492` —— slice 的 run 已成功完成后仍可能 reject “canceled”，把已提交的原生效果上报为取消/失败
- `src/modules/zoteroHostCapabilityBroker.ts:13206` —— 公共 broker 成员的 stored_file 路径必然缺失 prepared 资源并以未类型化 Error 逃出
- `src/modules/runtimePersistence.ts:1967` —— 回滚失败会抛出新错误，丢掉导致回滚的原始错误
- `src/modules/bufferedWriteCoordinator.ts:136` —— sink 持久化失败只累加诊断后被吞掉，且失败后不再安排任何重试
- `addon/content/help-center/index.html:517` —— 导航/文档链接/语言切换触发的 `loadDoc` 失败无人捕获，UI 显示新标题但正文残留旧文档且无任何提示
- `packages/synthesis-application/src/referenceRefreshApplication.ts:491` —— 多个 apply 失败分支不回收 running operation
- `packages/synthesis-application/src/citationGraphApplication.ts:434` —— promotion 返回 false 时 operation 停留在 running
- `packages/synthesis-application/src/durableBundleApplication.ts:487` —— 数据已提交后清理失败会把整个导入报为失败
- `skills_builtin/literature-translator/scripts/restore_placeholders.py:90` —— 占位符表为空时返回 ok 却不产出任何文件
- `src/modules/dashboard/dashboardActions.ts:947` —— 工作流设置保存失败只写内部状态、从不推送快照，UI 永久停留在 “Saving...”
- `src/modules/dashboard/dashboardActions.ts:698` —— 批量删除产品的循环无 try/catch，异常会变成未处理拒绝并留下半提交状态
- …其余 13 条见对应分片台账

**资源（15 条）**

- `src/jobQueue/manager.ts:266` —— jobs Map 只增不减，作业请求/结果永久驻留
- `src/sidebar/assistantWorkspaceAcpChild.js:1857` —— regionCollapse observer 永不释放
- `src/sidebar/assistantTranscriptRenderer.js:901` —— `requestVirtualTranscriptPage` 的 5s loadingCursors 清理 setTimeout 不取消
- `rust/zotero-bridge/src/commands.rs:2444` —— 上传先把整文件读入内存，且无本地大小上限、无写超时
- `src/modules/harness/assistantReadonlyPublication.ts:1558` —— ackRoutes 只写不删，随发布量无界增长
- `src/modules/synthesisClient/nativeComposition.ts:655` —— `dispose()` 只翻标志位，从不释放该组合自己创建的 rpc client
- `src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts:100` —— adapter factory 注册后连接失败不回滚，注册项泄漏
- `src/modules/acp/transport/acpBackendProbe.ts:217-235` —— `withProbeTimeout` 超时只造成 reject，后台 `initialize()`/`newSession()` 仍在运行，与 `finally` 中 `adapter.close()` 竞态
- `src/modules/acp/transport/acpExecutionProgress.ts:30-54` —— 模块级 `states` Map 仅在显式 release 时删除，无上限/无 TTL
- `src/modules/acp/transport/acpWebSocketBridgeService.ts:80-82、266-339` —— 桥接服务是进程级单例，`bridgeServicePromise` 在失败清理与 `ensure` 之间存在窗口，且无插件卸载钩子
- `src/modules/hostBridge/server/hostBridgeServer.ts:1691` —— rotateHostBridgeToken 忽略 well-known profile 写入结果，且未处理 rejection
- `src/modules/synthesis/production/synthesisProductionOwner.ts:226` —— shutdown 顺序 await，第一步失败则反代监听永不关闭且清理不可重试
- …其余 3 条见对应分片台账

**并发（15 条）**

- `src/modules/zoteroHostCapabilityBroker.ts:4362` —— markWritten 触发的原生读取在 Host slice 之外执行，破坏单一 FIFO 片段串行
- `src/modules/libraryArtifactsColumn.ts:208` —— 缓存清理与在途扫描无世代校验，清理后仍写入过期状态
- `src/utils/wait.ts:29-46` —— `CancellationController` 二次 addEventListener 在 abort 后无防重入
- `skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:739` —— 所有 Host Bridge 调用无超时、无取消传播，一次卡死即永久阻塞 runtime
- `src/modules/zoteroHost/zoteroLibraryPageQuery.ts:483` —— count/page 两次 queryAsync 未经过 Host admission，注释声称的安全依赖调用方
- `src/modules/zoteroHost/zoteroHostTrash.ts:188` —— 事务内重新 prepare 只做「observations/result 字符串」比对，target 集合变化但字符串相同的情形可被漏检
- `profiles/hermes/zotero-librarian/scripts/zotero_librarian_service.py:381` —— 写事务跨 `call_bridge` 子进程持有，且子进程无超时
- `src/modules/acp/transport/acpClientConnection.ts:100-119` —— `resolveClosed` 只在首次生效，`close()` 主动调用会把 origin 固定为 "local"，掩盖真实 remote-eof/receive-error
- `src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts:30` —— 同一 ACP conversation 的并发审批会覆盖 pending handler
- `src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts:153` —— 健康探测无超时，挂起后后端永久停留在 probing 且不再重试
- `src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts:1248-1255` —— 续跑去重键取自可选参数，混用调用会绕过去重并重复 apply
- `src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts:407` —— stop 竞态下已 accept 的 transport 被丢弃且不关闭
- …其余 3 条见对应分片台账

**性能（13 条）**

- `src/synthesis/synthesisWorkbenchChromeRenderer.ts:362-378` —— graphMount 在 graphIsActive=false 时仍持引用
- `packages/synthesis-application/src/citationGraphApplication.ts:685` —— projectSlice 每层重复解析 rolesJson，且 frontier 空后仍空转扫描全边
- `src/modules/pluginStateStore/taskTables.ts:800` —— 字节估算把整个 domain 的 payload 全量拉进 JS
- `src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts:3113` —— 运行列表对每个 run 重新全量扫描任务与 ACP 摘要（R×T）
- `src/modules/skillRunner/run/skillRunnerTaskReconciler.ts:369-374` —— 台账校准对“全部历史 requestId（含已归档）”串行双查后端，无终态/归档短路
- `src/modules/skillRunner/run/skillRunnerRunStore.ts:1415-1428` —— requestId 直查未命中时全表加载并逐条 `JSON.parse`，成本被诊断计数掩盖
- `src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts:97` —— 每次 append 都全量深拷贝并广播，流式日志下退化为 O(n²)
- `src/modules/skillRunner/surface/skillRunnerRunDialog.ts:3305` —— 流正常结束即重置退避，导致短流场景固定 800ms 重连轮询
- `rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:1055` —— 每条引用都对 citation artifact 做一次 Value 深拷贝 + 全量反序列化，形成 O(引用数 × citation 体积)
- `rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs:441` —— 每条 reference 都对其 target 节点的 aliases 重新排序并去重，同一 target 被 K 条引用命中的总代价为 O(K² log K)
- `tag_concept_topic_graph.rs:463-563` —— refresh_topic_discovery_projections 是 O(P*H) 全表扫描，写事务内执行
- `runtime_artifact_library_debug.rs:502` —— 无过滤 manifest 会对全库 artifact 做内容读取与 O(n²) 分组
- …其余 1 条见对应分片台账

**可维护性（9 条）**

- `src/utils/ztoolkit.ts:129-140` —— 死代码 `MyToolkit` 类与未使用的 import
- `src/workflows/packageHookBundler.ts:25,411` —— `bundleCache` 是无界 process-global Map
- `durableBundleImport.ts:208-240` —— IDENTITY_FIELD/REQUIRED_STRING_FIELDS 内联硬编码 19 类实体
- `sidecarRuntimeRelease.ts:521-528` —— assertReleaseIdentity 校验 expected SHA256 但未校验 length
- `topics.ts:155-157` —— SynthesisTopicRecord 末尾冗余 id/kind/status
- `tagVocabularyApplication.ts:686-700` —— MUTATION_STATUSES 用 `new Set` 而非常量数组
- `src/modules/zoteroHost/zoteroNotePayloadResolver.ts:20` —— readTagAttribute 与 notePayloadCodec.escapeAttribute 属性解析逻辑重复实现
- `src/modules/zoteroHost/libraryArtifactReadiness.ts:189` —— detachArtifactNote 对 referencesBasis 的内联类型守卫与 zoteroManagedNotes 的同类逻辑重复
- `library_snapshot_index.rs:48` —— valid_identity 与 schema 层约束职责重复

**并发/资源（7 条）**

- `src/modules/guardedSqlite.ts:145` —— PRAGMA 配置失败后 ownerCount 已被 +1，连接永久无法关闭
- `src/workflows/runtime.ts:631` —— 监听器与 interactive 资源创建位于 try 之外，抛错即泄漏且不进诊断/清理路径
- `rust/acp-ws-bridge/src/main.rs:595-609` —— 非 Windows 平台不终止后端子进程，连接关闭只会给 stdin 发 EOF
- `src/providers/skillrunner/client.ts:713` —— 轮询循环无总时限且不可取消，0 间隔会变成忙等
- `profiles/hermes/zotero-librarian/scripts/zotero_librarian_service.py:93` —— 每次 `connect()` 在“空日志”时执行 DROP，只读命令也走 DDL 写路径
- `src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts:78` —— `transcriptIndexStates` 只增不删，跨 run 无界占用内存
- `src/modules/assistant/workspace/assistantWorkspaceSidebar.ts:1417` —— sidenav click 监听器从不移除，宿主/重装累积

**契约与类型（4 条）**

- `packages/synthesis-contracts/src/debug.ts:15-23` —— Debug 分页 DTO 存在两套并存形态
- `packages/synthesis-contracts/src/lifecycle.ts:88-96` —— SynthesisPublicMaintenanceReceipt union 缺少 tagged discriminator
- `src/modules/zoteroHost/zoteroManagedNotes.ts:650` —— finalizeManagedNoteDetail 的 detailBytes 固定点迭代在极端载荷下可能不收敛且被静默接受
- `src/providers/generic-http/provider.ts:749` —— bytes 响应时 `responseJson` 被赋值为 Uint8Array

**正确性/信任边界（3 条）**

- `packages/synthesis-contracts/src/sidecarTransfer.ts:485` —— `jsonNodes` 递归无深度上限，先遍历后判限，深嵌套行会栈溢出
- `src/modules/pluginStateStore/taskTables.ts:1024` —— 以 payload 子串 "conversationid" 判定并删除 ACP 记录
- `rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:1061` —— `i64::MIN.abs()` 在 debug 下 panic、在 release 下绕过安全整数校验

**契约/正确性（2 条）**

- `src/modules/taskDashboardSnapshot.ts:69` —— `normalizeDashboardBackends` 承诺消费 history/active，实际只读 configured，补全逻辑整体是死代码
- `src/providers/skillrunner/provider.ts:482` —— 选项守卫会把 normalize 后未回显的合法 key 判为"不可用"并终止执行

**契约/一致性（2 条）**

- `src/sidebar/assistantTranscriptRenderer.js:2491` —— `applyAssistantTranscriptEffects` 静默吞掉 `failure` 信息
- `src/sidebar/assistantWorkspaceAcpChild.js:1755` —— expandedTranscriptRows 跨 owner 不清场

**正确性/错误处理（2 条）**

- `src/workflows/workflowInputPlanning.ts:333` —— 已捕获的 artifact issue 在 `readNotes` 中被转成硬失败，使过滤/可用性判定整体中断
- `assets/skillrunner-output-contract/skill_runner_contract/artifact.py:77` —— schema 属性名被当作目录段使用，越界后 move 已完成才抛错（半提交状态）

**错误处理/契约（2 条）**

- `packages/synthesis-engine/src/referenceMatcher.ts:2445` —— 被静默丢弃的 canonical 无诊断，且 counters.canonical_count 与请求数不一致使重建必失败
- `rust/zotero-bridge/src/contract.rs:1165` —— 由 flag 组合出来的用户输入违约被归类为 Internal（exit 70）

**正确性/并发（2 条）**

- `src/dashboard/components/RuntimeLogsRegion.tsx:464` —— 连续勾选两行（或两个 level）时第二次提交基于上次 host 回显，吞掉第一次选择
- `src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts:737` —— shutdown 丢弃未决完成等待者，使等待中的完成 Promise 永不 settle

**资源/生命周期（2 条）**

- `src/modules/acp/skillRun/acpSkillRunRecovery.ts:1001` —— 恢复流程在早期失败路径上永久泄漏 setup controller 注册
- `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs:220` —— `Drop` 只回收已结束的 handler，在途 handler 的 `JoinHandle` 被静默丢弃（线程 detach），无法保证 quiescence

**健壮性（2 条）**

- `src/modules/assistant/publication/assistantWorkspacePublication.ts:654` —— permission 投影把 option 无校验地断言成对象，`options:[null]` 会抛 TypeError 逃出「无效即返回 null」的契约
- `topic.rs:683` —— 公开方法对调用方可传枚举值 `Planned` 直接 `unreachable!` panic

**可移植性（1 条）**

- `scripts/e2e-single-markdown-live.ts:59` —— 用 `URL.pathname` 推导仓库根，Windows/含转义字符路径下会错

**契约/死代码（1 条）**

- `scripts/host-bridge/render-host-bridge-surfaces.ts:1268` —— `mode` 参数与 `--content-only` 完全无效

**信任边界/正确性（1 条）**

- `src/modules/zoteroHostMutationAuthority.ts:207` —— 内存键以 `\n` 拼接，且 started 分支不复验 digest，跨 operation 结果可互串

**时序（1 条）**

- `src/synthesis/synthesisWorkbenchPanelModel.ts:118-140` —— `resolveTimedStatusbarEntry` 首次 projection 锁定 expiresAt

**资源/信任边界（1 条）**

- `src/workflows/archive.ts:653` —— 条目数量上限在全部条目名枚举完成之后才校验

**设计债（1 条）**

- `src/workflows/loaderContracts.ts:286-301` —— `allowMixed: false` 校验只拦多必选 kind

**架构约束（1 条）**

- `addon/content/workspace/styles.css:2` —— 复制 page-chrome.css 的 control 设计 token 原始色值，违反“设计 token 唯一来源”

**契约一致性（1 条）**

- `workflow.ts:441-449` —— TOPIC_PLAN_ACTION_LIMIT / RELATION_LIMIT / SERIALIZED_LIMIT 与 tagVocabularyApplication LIMITS 风格不一致

**正确性/确定性（1 条）**

- `packages/synthesis-engine/src/conceptKbIndex.ts:532` —— normalizedKey 使用未指定 locale 的 toLocaleLowerCase

**正确性/契约（1 条）**

- `packages/synthesis-engine/src/topicStructuredArtifact.ts:1195` —— 冲突只返回第一条 mismatch，重建校验要求完整列表

**可维护性/契约（1 条）**

- `skills_builtin/create-topic-synthesis-prepare/scripts/topic_synthesis_db.py:574-584` —— `register_artifact` 只改进程内全局字典，不落库且丢弃 hash

**性能与分配（1 条）**

- `src/modules/zoteroHost/libraryArtifactReadiness.ts:291` —— notes 与 attachments 两路分页在 Promise.all 内并发，同时进入 native query

**并发/正确性（1 条）**

- `src/modules/acp/chat/acpSessionManager.ts:3329` —— 删除会话未取消 persist 定时器，2s 内会把已删会话写回索引（复活）

**数据丢失（1 条）**

- `src/modules/acp/chat/acpSessionManager.ts:3805` —— 名为「prune runtime」的函数会清空被移除后端的全部会话持久化数据

**性能/背压（1 条）**

- `src/modules/acp/transport/acpMessageStream.ts:78-109` —— NDJSON 解析对单次 `read()` 交付的整个 chunk 做 `split("\n")`，无行数/字节上限

**正确性/可观测性（1 条）**

- `src/modules/hostBridge/mcp/zoteroMcpServer.ts:2311-2313` —— descriptorStale 置位后没有成功注入/启动时的清理路径

**资源/隐私（1 条）**

- `src/modules/hostBridge/server/hostBridgeFileRegistry.ts:511` —— 上传文件过期/消费/释放时只删句柄，不删除磁盘临时文件

**契约/SSOT（1 条）**

- `src/modules/hostBridge/server/hostBridgeCapabilityContract.ts:95` —— 运行时直接改写导入的 JSON 契约，使 JSON 文件不再是该 capability 输出 schema 的单一事实源

**正确性/编码（1 条）**

- `src/modules/hostBridge/server/hostBridgePagination.ts:275` —— 文本分页按 UTF-16 code unit 切片，可能切断代理对

**验证（1 条）**

- `src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:81` —— advertised host 校验仅排除少数地址，接受 APIPA/多播/保留地址

**超时（1 条）**

- `src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts:145` —— fetch 反射端点无超时/AbortSignal，可无限挂起

**契约/可维护性（1 条）**

- `src/modules/workflow/settings/workflowSettingsDialogModel.ts:275` —— provider 运行时选项投影存在两套实现，同一输入结果不同

**正确性/静默数据丢失（1 条）**

- `rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs:772` —— 公开 staged 变更路径按小写建表，会把大小写不同的兄弟 staged 行（及其 parent bindings）静默删除

**并发/生命周期（1 条）**

- `rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs:572` —— `prepare` 与 `stop_admission` 竞态：stop 之后仍会安装 preparation，留下 `running` 操作且 `apply_refresh` 不检查 `accepting`，可在 drain 之后写库

**并发/健壮性（1 条）**

- `rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs:1574` —— 写事务没有 RAII 守卫，闭包 panic 会泄漏 BEGIN IMMEDIATE 与 `transaction_depth`

**一致性（1 条）**

- `library_snapshot_index.rs:142-225` —— promote 写完 singleton 与 generation 后才 DELETE 同行，但读路径无防御

**权限（1 条）**

- `hostBridgeWorkflowActivityRoutes.ts:716` —— agent-run renew/abandon 未传 permission scope，与 apply/cancel/submit 不一致（判断）

### 4.3 P3 候选（按类目统计）

| 类目 | 条数 |
|---|---|
| 可维护性 | 46 |
| 正确性 | 39 |
| 契约 | 33 |
| 错误处理 | 28 |
| 性能 | 19 |
| 并发 | 13 |
| 信任边界 | 11 |
| 资源 | 8 |
| 契约与类型 | 4 |
| 健壮性 | 3 |
| 可观测性 | 3 |
| 边界 | 2 |
| 验证 | 1 |
| 契约/一致性 | 1 |
| 死代码 | 1 |
| 可维护性/潜在缺陷 | 1 |
| 契约/SSOT | 1 |
| 契约/可维护性 | 1 |
| 性能/容量 | 1 |
| 可测试性 | 1 |
| 可维护性/可观测性 | 1 |
| 重复/错误处理 | 1 |
| 重复/契约 | 1 |
| 并发/资源 | 1 |
| 状态机 | 1 |
| 可访问性 | 1 |
| 资源/清理 | 1 |
| 并发/清理 | 1 |
| 可维护 | 1 |
| 重复 | 1 |
| 正确性/UX | 1 |
| 性能/分配 | 1 |
| 契约/一致 | 1 |
| 错误处理/可观测性 | 1 |
| 正确性/契约 | 1 |
| 契约/信任边界 | 1 |
| 可观测性/契约 | 1 |
| 安全 | 1 |
| 契约/性能 | 1 |

P3 集中在命名、死代码、未使用导出、文档/注释漂移；逐条清单见分片台账。

## 5. 已证伪的误报（不要据此改动代码）

- `src/utils/sha256.ts:54-61`：原结论「Mozilla nsICryptoHash 路径把 base64 串再按 charCode 转 hex，digestHex 输出错误」→ **不成立**：`hash.finish(false)` 返回的是**二进制**字符串。参照 Zotero 自带实现 references/Zotero-7/chrome/content/zotero/xpcom/utilities_internal.js:113-135：注释 “pass false here to get binary data back”，并同样做 `hash.charCodeAt(i)` → 两位 hex。因此当前实现是正确的。
- `skills_src/literature-deep-reading/runtime/deep_reading_runtime.py（persist_* 系列）`：原结论「没有事务封装，多条语句各自 autocommit，中途失败留下半提交状态」→ **不成立**：persist_stage20_db 等函数以 `sqlite3.connect(DB_PATH)` 打开连接（Python 默认 isolation_level=""），首条 DML 隐式 BEGIN，函数末尾调用 `conn.commit()`，DELETE+INSERT+UPDATE 属**同一事务**。并非逐条 autocommit。
- `src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts:452`：原结论「stale generation 的 fail 直接 return，stop() 之后 launch 仍会 spawn，导致 sidecar 进程泄漏」→ **不成立**：supervisor 维护 `controlledStop` 并在 494/504/539/544/565/657 等多处与 generation 一起校验（`if (launchGeneration !== generation || controlledStop)`），提前返回是**有意的世代隔离**，未发现可复现的泄漏路径。
- `src/workers/runtimeFileRangeWorker.ts:44-85`：原结论「P1：worker 未校验 ranges 长度/字节上限，可被 DoS」→ **不成立**：消息只能来自同进程的主线程发送方 `runtimeFileRangeReader`，其 `partitionRuntimeFileRanges` 已强制 `RUNTIME_FILE_RANGE_MAX_BATCH_ENTRIES=1024` 与 `RUNTIME_FILE_RANGE_MAX_BATCH_BYTES=2 MiB`；worker 无外部可达输入。属纵深防御缺口，非可达缺陷（降级为 P3）。
- `src/utils/runtimeBridge.ts:312-321`：原结论「P1：override.zotero 已设时仍可能被 global-var/global-this 覆盖」→ **不成立**：代码确实把候选一并打分（只有 global-var 在特定条件下被抑制），但 override 的存在语义是「注入候选」而非「强制胜出」；是否算缺陷取决于测试注入的预期契约，未在仓库测试中找到反例。标记为**待确认**而非缺陷。

## 6. 系统性主题

- **SSOT / 重复定义**：同一概念在多处复制：契约层与 application 层的状态并集（SynthesisGraphCommandResult vs SynthesisCitationGraphApplicationMutationStatus）、tag 突变状态 11 值并集、`sourceRef` 与 `source_ref` 双写法；skills 运行时若干 .py 在 4~5 个 skill 目录下字节相同副本（md5 一致，当前无漂移，但任一处修改即产生漂移风险）。
- **无界增长 / 缺少配额**：缓存、pending 表、pending 定时器、zip 解包、请求体缓冲等多处缺少上限或 LRU（packageHookBundler bundleCache、runtimePlans、acpTransport 定时器、host bridge 连接数）。
- **错误吞噬 / 诊断丢失**：大量 `catch {}`（全仓仅 2 处真正空 catch，但 `catch { return false/[] }` 模式普遍）与把结构化错误降级为布尔或字符串的包装层（MCP 错误投影为最典型）。
- **跨进程/跨目录一致性**：skills_src → skills_builtin 的发布副本缺少系统性 parity 门禁；Python gate 的进程内状态跨调用丢失。
- **发布治理**：Host Bridge 发布链的若干「默认值即通过」倾向：receipt advance 的 `option("status") || "complete"`（host-bridge-release-controller.ts:255-282，已读码确认存在）、release-set 的 source-commit 可被 CLI/env 覆盖（render-host-bridge-release-set.ts:7-24，已读码确认存在）。这两条与「发布必须显式、可审计」的硬约束相抵，建议优先处理。

## 7. 建议修复顺序

1. **Host Bridge 入口防护**（V1/V2）。默认 loopback 时风险可控；开启 LAN 模式前必须处理。
2. **MCP 错误契约**（V3）：改动很小，直接恢复 agent 可判定的重试语义。
3. **发布链「默认即通过」**：receipt advance 的 `option("status") || "complete"`、release-set 可被 CLI/env 覆盖的 `source-commit`（两处我均已读码确认），与「发布必须显式且可审计」的硬约束相抵。
4. **skill 运行时状态持久化**（V9）与 **工件路径处理**（V5）：影响 skill run 可恢复性与用户文件安全。
5. **配额与生命周期**（V4/V6/V7/V8）：解包配额、定时器清理、权限 Promise 收敛、flush 尾随调度。
6. **模板发布一致性门禁**（V10）：补 skills_src→skills_builtin parity 检查并重新生成发布副本。
7. 第 4 节剩余 P2/P3 先复核再排期（误报率不可忽略）。

## 8. 文件级台账（全部生产文件）

结论：`OK` 读毕未发现问题；`问题` 存在 finding；`存疑` 证据不足以判定；`未细读` 仅用于生成物/纯数据。说明列保留分片台账原始判词，括号内为分片编号。

| 文件 | 行数 | 结论 | 说明（分片） |
|---|---:|---|---|
| `addon/bootstrap.js` | 83 | OK | Zotero 7 bootstrap 模板；`resolveAddonRootPath` 的 file:// 兜底对 POSIX/Windows 都做了处理，uninstall/install 空实现符合预期 (S00) |
| `addon/content/components/custom-progress.css` | 48 | OK | 纯样式；无证据问题 (S15) |
| `addon/content/components/custom-progress.js` | 38 | OK | 仅做 clamp + 追加 DOM；bar 以 appendChild 追加为最后一个子节点（判断，非缺陷） (S15) |
| `addon/content/components/custom-select.css` | 117 | OK | — (S15) |
| `addon/content/components/custom-select.js` | 309 | 问题 | P2 其它下拉未复位 isOpen（F1）；P3 label 匹配高亮（F2）；P3 多选数组别名（F3） (S15) |
| `addon/content/dashboard/backend-manager.css` | 582 | OK | — (S15) |
| `addon/content/dashboard/backend-manager.html` | 27 | OK | — (S15) |
| `addon/content/dashboard/index.html` | 44 | OK | — (S15) |
| `addon/content/dashboard/styles.css` | 2820 | OK | 滚动所有权（html/body/.main 不滚动 + 每面板单一滚动区）与 region 透明包装规则自洽 (S15) |
| `addon/content/dashboard/workflow-settings-dialog.css` | 520 | 问题 | P3 与 custom-select.css 重复且数值分歧（F10） (S15) |
| `addon/content/dashboard/workflow-settings-dialog.html` | 32 | OK | 同时引入共享与页面内自定义 select 样式（见 F10） (S15) |
| `addon/content/harness/harness-host.js` | 498 | 问题 | P3 frameForSource 对 null 帧无保护（F11） (S15) |
| `addon/content/harness/index.html` | 57 | OK | — (S15) |
| `addon/content/harness/prototype-source-switching.html` | 1329 | OK | 原型/评审页；openMenu 的 document mousedown 监听器清理不彻底（下次 mousedown 自清，影响可忽略） (S15) |
| `addon/content/harness/prototype-workspace.html` | 618 | OK | 原型页；内联 relay 与 harness-host.js 的 assistant 分支重复，但注释已声明为同窗口自包含适配 (S15) |
| `addon/content/harness/styles.css` | 111 | OK | — (S15) |
| `addon/content/help-center/index.html` | 678 | 问题 | P2 未处理 Promise 拒绝、失败无提示（F4） (S15) |
| `addon/content/markdown-reader/index.html` | 1012 | 问题 | P3 启动重复加载（F5）；另有 Object.assign(state,payload) 整包合并（存疑，未列为缺陷） (S15) |
| `addon/content/shared/assistant/assistant-panel-shared.css` | 3096 | 问题 | P3: 引用未定义的自定义属性（F10）；折叠菜单按钮键盘不可达（F11）；dark 主题规则与 `prefers-color-scheme` 规则整段重复（判断，未单列） (S37) |
| `addon/content/shared/assistant/assistant-workspace-acp-child.css` | 116 | 问题 | 同样引用未定义的 `--asst-surface-alt`（F10）；`[data-role="main"]` 等选择器未限定作用域，需确认该表仅在 ACP 子页加载 (S37) |
| `addon/content/shared/icons.css` | 190 | OK | 纯 icon mask 映射表；`arrow-back` 用 rotate 复用 `keyboard_arrow_up.svg`，无缺陷。 (S16) |
| `addon/content/shared/markdown-renderer.css` | 128 | OK | 纯样式；`.markdown-body table{display:block}` 与 outline depth 规则一致，无缺陷。 (S16) |
| `addon/content/shared/markdown-renderer.js` | 434 | 问题 | 见 F10：消毒器对 `href` 复用 data:image 白名单、未覆盖 `xlink:href`。其余（parserCache、heading id、锚点绑定）未见缺陷。 (S16) |
| `addon/content/shared/page-chrome.css` | 249 | OK | 自身即设计 token 唯一来源（`--zs-control-*`/`--zs-text-*`/`--zs-badge-*`）；滚动模型注释与选择器一致。 (S16) |
| `addon/content/shared/theme.css` | 182 | OK | 明/暗/系统三份变量一致；`--zs-theme-mode` 在本切片无消费者，但属跨文件 token，不计缺陷。 (S16) |
| `addon/content/shared/theme.js` | 71 | OK | `applyTheme/setTheme/getTheme` 幂等；localStorage/CustomEvent 均有 try 保护；storage 监听只读 `event.key`。 (S16) |
| `addon/content/shared/topicTimeline.css` | 567 | OK | 变量全部来自 `--topic-*`（synthesis/styles.css 提供）；`!important` 与硬编码 `#dc2626` 为风格，未造成运行期缺陷。 (S16) |
| `addon/content/shared/workflow-number-validation.js` | 65 | OK | 空值→remove、非有限值拒绝、min/max 闭区间；`Number("0x10")`/`"1e3"` 会被接受（判断，非缺陷）。与 TS 侧是否同源在本切片不可验证。 (S16) |
| `addon/content/sidebar/acp-chat.html` | 93 | OK | 区域划分与 ACP 解耦约定一致；empty 初始 `hidden`。 (S16) |
| `addon/content/sidebar/acp-skill-run.html` | 93 | OK | 与 acp-chat.html 唯一差异是 empty 初始不 hidden（`data-source="acp-skills"`），需渲染层保证首帧隐藏，见 NOISE。 (S16) |
| `addon/content/sidebar/assistant-workspace.css` | 174 | OK | 全部走 `--zs-*` token；滚动所有权为 shell 内 `overflow:hidden` + iframe，符合约束。 (S16) |
| `addon/content/sidebar/assistant-workspace.html` | 89 | 存疑 | 三个 iframe 同时带 `src` 静态加载（仅切 `hidden`），非惰性；见 NOISE。 (S16) |
| `addon/content/sidebar/skillrunner.html` | 93 | OK | 与 acp-skill-run.html 同构，`data-source="skillrunner"` 交由同一 bundle 分派。 (S16) |
| `addon/content/synthesis/index.html` | 41 | OK | 加载顺序（theme→page-chrome→icons→timeline→styles）与 token 依赖一致。 (S16) |
| `addon/content/synthesis/styles.css` | 6218 | 问题 | 见 F7（引用未定义 token）、F9（同选择器两处定义且取值冲突）。 (S16) |
| `addon/content/workspace/index.html` | 16 | OK | 仅挂载 `#app`；不加载 page-chrome.css（与 F8 相关）。 (S16) |
| `addon/content/workspace/styles.css` | 373 | 问题 | 见 F8：复制 page-chrome.css 的 control token 原始色值，违反设计 token SSOT。 (S16) |
| `addon/content/zoteroPane.css` | 323 | 存疑 | 纯样式；`@media (prefers-color-scheme: dark)` 只覆盖 `:root`，无 `html[data-zs-theme="light"]` 反向覆盖，用户显式选 light 且系统为 dark 时 popover 仍取暗色变量（需 `theme.js` 语义确认）；`.makeItRed` 疑为模板残留死样式 (S01) |
| `addon/prefs.js` | 77 | 存疑 | 需确认 `hostBridgeMasterTokenKeyMaterial` 是否已被宿主 keystore/DPAPI 包裹后再落入明文 prefs.js (S00) |
| `assets/skillrunner-output-contract/skill_runner_contract/__init__.py` | 24 | OK | 纯再导出，`__all__` 与导入一致。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/artifact.py` | 260 | 问题 | 见 F1（越界绝对路径被 move 进 run dir 并进 bundle）、F3（schema 属性名直接做目录段）。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/bundle.py` | 164 | 问题 | 见 F4：`build_run_bundle` 的 `run_dir` 参数被丢弃，且 `relative_to` 依赖其为绝对祖先路径。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/cli.py` | 152 | 问题 | 见 F6：`validate-bundle` 强制要求三个未使用参数。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/finalize.py` | 73 | OK | 先 validate 再解析工件；`result.json` 在 bundle 之前落盘（失败会留半成品），但 artifacts 已全部为 run-dir 相对路径，风险低。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/layout.py` | 51 | 问题 | 见 F2：`namespace` 未净化即参与路径拼接（`safe_segment` 仅被 `default_namespace_for_run` 使用）。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/schema.py` | 209 | 问题 | 见 F5：`TARGET_OUTPUT_SCHEMA_RELPATH` 与实际写入路径重复定义（导出常量未被使用）。另：`_write_json_atomic` 固定 `<name>.tmp`（并发同名写者会互踩），单进程 CLI 下不构成缺陷。 (S16) |
| `assets/skillrunner-output-contract/skill_runner_contract/skill.py` | 75 | OK | schema 路径做 `relative_to(root)` 反穿越校验；缺文件返回 None 语义一致。 (S16) |
| `packages/synthesis-application/src/citationGraphApplication.ts` | 809 | 问题 | P2: rebuildFull basis_mismatch 早退未收口 operation（F5）；projectSlice 每层重解析 rolesJson 且 frontier 空后仍空转（F8） (S17) |
| `packages/synthesis-application/src/citationGraphProjection.ts` | 263 | OK | 读毕未见缺陷；投影仅做字段映射与排序 (S17) |
| `packages/synthesis-application/src/conceptKbApplication.ts` | 931 | 问题 | P2: shortHash 只取 5 个十六进制字符导致 id 碰撞面扩大（F2） (S17) |
| `packages/synthesis-application/src/debugMaintenanceApplication.ts` | 162 | OK | 读毕未见缺陷 (S17) |
| `packages/synthesis-application/src/durableBundleApplication.ts` | 527 | 问题 | P2: 提交后 clearDurableImportCommit 失败会把已提交的导入报为失败（F7） (S17) |
| `packages/synthesis-application/src/index.ts` | 207 | OK | 读毕未见缺陷；时间戳为字典序比较，依赖 ISO-ms 统一格式 (S17) |
| `packages/synthesis-application/src/knowledgeCheckpointApplication.ts` | 498 | OK | 读毕未见缺陷；apply 前清 receipt 属一次性语义 (S17) |
| `packages/synthesis-application/src/knowledgeCheckpointCompatibility.ts` | 27 | OK | 读毕未见缺陷 (S17) |
| `packages/synthesis-application/src/referenceMatchingReviewApplication.ts` | 855 | 存疑 | paperRef 按 `split(":")[0]` 取 libraryId（228/262 行）；需确认 paperRef 的契约格式是否保证首段为数字 libraryId (S17) |
| `packages/synthesis-application/src/referenceProjection.ts` | 799 | OK | 读毕未见缺陷；canonicalReferenceId 不含 DOI/URL，疑为有意去重 (S17) |
| `packages/synthesis-application/src/referenceRefreshApplication.ts` | 748 | 问题 | P2: basis_mismatch / projection_failed 等 apply 失败路径不回收 running operation（F3） (S17) |
| `packages/synthesis-application/src/tagVocabularyApplication.ts` | 1144 | 问题 | P2: legacy 数字 parentBindings 使 listStaged 直接抛错，而迁移只在 promote 内触发（F9） (S17) |
| `packages/synthesis-application/src/topicApplication.ts` | 1108 | OK | 读毕未见缺陷 (S17) |
| `packages/synthesis-application/src/topicApplyDecision.ts` | 271 | OK | 读毕未见缺陷 (S17) |
| `packages/synthesis-application/src/topicCanonical.ts` | 606 | 问题 | P1: canonicalSynthesisTopicPathId 非单射，合法且不同的 topicId 可映射到同一 pathId（F1） (S17) |
| `packages/synthesis-application/src/topicGraphApplication.ts` | 987 | 问题 | P2: 已 resolve 的 review 合并 provenance 后不计入 changed，单变更会被 unchanged 早退丢弃（F6） (S17) |
| `packages/synthesis-application/src/webDavSyncApplication.ts` | 872 | 问题 | P2: conflict_actions 宣传 save_remote_copy，但 resolveWebDavSyncConflict 未实现该分支（F4） (S17) |
| `packages/synthesis-contracts/src/canonicalJson.ts` | 302 | 存疑 | 见 F4；独立 SHA-256 + canonical JSON 实现；`compareSynthesisContractStrings` 仅供客户端按 UTF-16 code-unit 排序（设计如此） (S20) |
| `packages/synthesis-contracts/src/citationGraphApplication.ts` | 546 | 问题 | P1 状态机并集与 graph.ts 完全重复（见 F1）；同包内 mutation status 拆为两份，互不引用（S19 台账以裸文件名列出） (S19) |
| `packages/synthesis-contracts/src/client.ts` | 39 | OK | 顶层 `SynthesisClient` 接口，仅组合 `readonly` 客户端子接口 (S20) |
| `packages/synthesis-contracts/src/common.ts` | 232 | 问题 | 见 F1（孤儿导出）、F2（孤儿导出） (S20) |
| `packages/synthesis-contracts/src/conceptKbApplication.ts` | 1155 | OK | 逐字段重建 + 快照交叉引用校验（senseIds/alias.senseId/conceptId、topicLink、reviewItem 候选）完整；`jsonArray` 做 JSON 往返比较；未发现缺陷。可选字段用 `string()` 二次调用（如 319-327、264-267）只是重复计算，非缺陷。 (S18) |
| `packages/synthesis-contracts/src/conceptKbCore.ts` | 101 | OK | Concept KB 索引/查询 DTO 与 schema 版本字符串，engine 已使用全部导出 (S20) |
| `packages/synthesis-contracts/src/concepts.ts` | 122 | OK | 4-命令 Workbench Concept 客户端；`rebuildSynthesisConceptCapabilityResult` 在 clientPortAdapter 中调用 (S20) |
| `packages/synthesis-contracts/src/debug.ts` | 93 | 问题 | 见 F3（DebugPage 形态不一致：snake_case vs camelCase） (S20) |
| `packages/synthesis-contracts/src/debugMaintenance.ts` | 179 | 存疑 | 见 F7（`buildSynthesisDebugPage` 每个 item 单独 `Set`，跨 item 引用不会被识别为循环） (S20) |
| `packages/synthesis-contracts/src/durableBundle.ts` | 1058 | 问题 | P1 性能（F1：分组 O(n²)）；P2 字段 `bytes` 用 UTF-16 code unit（F3）。路径校验/哈希/nullable 语义其余部分严谨。 (S18) |
| `packages/synthesis-contracts/src/durableBundleImport.ts` | 567 | 问题 | P2 IDENTITY_FIELD/REQUIRED_STRING_FIELDS 散落超大表，与 durableBundle 真实 schema 易脱节（见 F2）（S19 台账以裸文件名列出） (S19) |
| `packages/synthesis-contracts/src/exportDelivery.ts` | 537 | 问题 | P2 enum + utf8ByteLength 与 topicApplication.ts/webDavSyncPort.ts 各自重复实现（见 F3） (S19) |
| `packages/synthesis-contracts/src/graph.ts` | 367 | 问题 | P1 `SynthesisGraphCommandResult.status` 并集与 citationGraphApplication.ts 同字面量重复定义（见 F1） (S19) |
| `packages/synthesis-contracts/src/hostRead.ts` | 776 | 存疑 | 内部独立 `stringArray/diagnostics/exactObject` 工具与 common.ts 重复；仅消费公共契约，可正常 (S19) |
| `packages/synthesis-contracts/src/index.ts` | 51 | OK | 仅 `export *`，包含清单中所有 19 文件 (S20) |
| `packages/synthesis-contracts/src/itemRef.ts` | 71 | OK | Host ItemRef 校验与排序键（`libraryId\nitemKey`），是 Host 适配的事实源 (S20) |
| `packages/synthesis-contracts/src/knowledgeCheckpoint.ts` | 396 | 问题 | P1 私有 `exact()` 工具只拒绝未知字段，不强制必填字段存在（见 F4）（S19 台账以裸文件名列出） (S19) |
| `packages/synthesis-contracts/src/libraryIndex.ts` | 94 | OK | `rebuildSynthesisLibraryIndexResult` 在 clientPortAdapter 中使用；其余类型被 DTO 消费 (S20) |
| `packages/synthesis-contracts/src/librarySnapshot.ts` | 507 | 问题 | P2 `import {…} from "./common.js"` 被写到文件最末尾 503 行；TS 兼容但与全包顶部 import 风格不一致（见 F5） (S19) |
| `packages/synthesis-contracts/src/lifecycle.ts` | 216 | OK | 公共维护操作生命周期类型、Startup/DatabaseReset/Notifications；`SynthesisPublicMaintenanceOperation` 是多 capability 的返回类型（见 F1 关联） (S20) |
| `packages/synthesis-contracts/src/literatureArtifacts.ts` | 152 | OK | 单一文献工件 schema + Ajv；与 sourceReferenceArtifact 对齐 (S19) |
| `packages/synthesis-contracts/src/protocolSchema.ts` | 295 | 存疑 | 见 F8（`rebuildProtocolJsonValue` 仅在 result 方向改写错误码） (S20) |
| `packages/synthesis-contracts/src/referenceMatchingReviewApplication.ts` | 970 | OK | `jsonSafe` 有 depth≤32 与数组/键数量上限；counts 一致性（954）、target 判别（415-456）、重复 proposalId（473）均有校验。 (S18) |
| `packages/synthesis-contracts/src/referenceRefreshApplication.ts` | 793 | 存疑 | wire 解析器未对 `prepare.items` / `apply.payloads` 设置显式上限（对比同包其它文件均有 `page/decisions` 上限），目前仅靠传输层字节上限兜底；需确认传输层确有界。 (S18) |
| `packages/synthesis-contracts/src/references.ts` | 325 | 存疑 | `SynthesisReferenceCommandResult` `diagnostic`/`diagnostics` 单复混用，仅契约层，consumer 自行决定取舍 (S19) |
| `packages/synthesis-contracts/src/relatedItemsEffect.ts` | 273 | 问题 | 见 F5（`provenance?.kind` 在 `assertSynthesisExactFields` 通过后仍用 `?.` 可选链冗余但无正确性问题）、见 F6（`occurredAt` 校验采用 `Date.parse`，合法但等价于非 ISO 时间戳也可通过——属设计） (S20) |
| `packages/synthesis-contracts/src/representativeImageRead.ts` | 270 | OK | `rebuild*Request/Result` 严格 base64 字节解码+边界（2 MiB），所有错误路径必抛 `invalid_request` (S20) |
| `packages/synthesis-contracts/src/schemaVersion.ts` | 2 | OK | 单一版本常量。 (S18) |
| `packages/synthesis-contracts/src/sidecarCanonicalStore.ts` | 39 | OK | snapshot 校验 3 字段白名单 + 64-hex storeId；sidecarSystem 与 sidecarProduction 双向使用 (S20) |
| `packages/synthesis-contracts/src/sidecarLifecycle.ts` | 437 | 存疑 | 与 sidecarRuntimeBundle 强耦合引用，导入不属于 runtime；属 wire DTO 投影，仍属契约范围 (S19) |
| `packages/synthesis-contracts/src/sidecarObservability.ts` | 320 | OK | 独立观察 schema；stable value 正则紧凑，未发现缺陷 (S19) |
| `packages/synthesis-contracts/src/sidecarProduction.ts` | 1060 | OK | discovery/health/handshake 的身份、目标三元组、能力顺序强校验；reverse-host 逐能力分派校验。`SYNTHESIS_REVERSE_HOST_CAPABILITY_POLICIES` 仅覆盖 7/16 能力，其余回落 2s/1MB 默认值（判断性问题，未上升为 finding）。 (S18) |
| `packages/synthesis-contracts/src/sidecarRuntimeBundle.ts` | 457 | OK | 完整 bundle + platform signature 校验；含 `isExpiredSynthesisSidecarRuntimeManifest` 等纯函数 (S19) |
| `packages/synthesis-contracts/src/sidecarRuntimeRelease.ts` | 667 | 问题 | P2 `assertReleaseIdentity` 把 expected 当 SHA256 校验但不校验 actual 也匹配长度，调用方传入 hex 时仍正常（见 F6） (S19) |
| `packages/synthesis-contracts/src/sidecarSystem.ts` | 1254 | 存疑 | `SYNTHESIS_SIDECAR_PRODUCTION_CLIENT_CAPABILITY_FINGERPRINT` 是硬编码常量，与上游能力数组无运行时绑定；`rebuildSynthesisSidecarCallEnvelope` 只做 `protocol` 有界字符串校验（不比对 `SYNTHESIS_SIDECAR_PROTOCOL`）。均无法在本切片内证实为缺陷。 (S18) |
| `packages/synthesis-contracts/src/sidecarTransfer.ts` | 1530 | 问题 | P2 信任边界/健壮性（F2：`jsonNodes` 无深度上限的递归）。其余 page/manifest 判别按 direction/target/version 分层校验，较完整。 (S18) |
| `packages/synthesis-contracts/src/sourceReferenceArtifact.ts` | 498 | 问题 | P2 `validateCanonicalArtifactJson` `byteLength > 1 MiB` 限但 `JSON.stringify` 对 surrogate/循环仍可能抛错；与 strict-JSON 文档语义 OK (S19) |
| `packages/synthesis-contracts/src/sync.ts` | 35 | OK | WebDav Sync 传输客户端 5 方法 + 7 项冲突解决动作枚举；clientPortAdapter 使用全部 (S20) |
| `packages/synthesis-contracts/src/tagEffect.ts` | 366 | 问题 | P1 `rebuildSynthesisHostTagEffectBatchResult` 把 effect.action 与 receipt.action 严格绑定，但 `SYNTHESIS_HOST_TAG_EFFECT_BATCH_MAX=100` 与 diagnostic max=20 内嵌（见 F7） (S19) |
| `packages/synthesis-contracts/src/tagVocabularyApplication.ts` | 763 | 问题 | P1 私有 `exact()` 同上不强制必填；`MUTATION_STATUSES` 11 项并集与 tags.ts `SynthesisTagMutationResult.status` 完全重复（见 F4, F8）（S19 台账以裸文件名列出） (S19) |
| `packages/synthesis-contracts/src/tagVocabularyCore.ts` | 44 | OK | 6 个类型被 tagVocabulary engine 完全 re-export 使用 (S20) |
| `packages/synthesis-contracts/src/tags.ts` | 715 | 问题 | P1 `SynthesisTagMutationResult.status` 11 项并集与 tagVocabularyApplication.ts 重复定义（见 F8） (S19) |
| `packages/synthesis-contracts/src/topicApplication.ts` | 306 | 问题 | P1 `bundle.topic_definition.id` 与 `bundle.topic_id` 强一致性校验，但 `topicIds.length === 0` 失败时 location 报 `bundle.topicId` 不直观；`utf8Bytes` 与 exportDelivery/webDavSync 重复（见 F3）（S19 台账以裸文件名列出） (S19) |
| `packages/synthesis-contracts/src/topicDomain.ts` | 602 | OK | 巨大 schema 集合，本文件为类型定义层，未发现缺陷 (S19) |
| `packages/synthesis-contracts/src/topicGraph.ts` | 70 | OK | TopicGraph 4 命令客户端；`rebuildSynthesisTopicGraphCapabilityResult` 在 clientPortAdapter 中被调用 (S20) |
| `packages/synthesis-contracts/src/topicGraphApplication.ts` | 883 | OK | `jsonSafe` depth≤16；快照校验边/复审项自环与节点存在性、唯一性；请求层枚举/上限齐全。 (S18) |
| `packages/synthesis-contracts/src/topicGraphCore.ts` | 77 | OK | TopicGraph 索引引擎的 SSOT 常量与类型；engine + topicGraphApplication + tests 三方使用 (S20) |
| `packages/synthesis-contracts/src/topics.ts` | 495 | 问题 | P1 `SynthesisTopicRecord` 末尾冗余 `id?/kind?/status?` 与已有 `topic_id/kind/operation` 重复语义（见 F9） (S19) |
| `packages/synthesis-contracts/src/webDavSync.ts` | 784 | 问题 | P2 契约（F4：校验后回吐原始 JSON，`conflict_actions:null` 可绕过）。`boundedJson` 未被调用（lint 级未使用，按 §0 不单列）。 (S18) |
| `packages/synthesis-contracts/src/webDavSyncPort.ts` | 505 | 问题 | P2 `utf8Bytes` 与 exportDelivery/topicApplication 重复实现；`safeBaseUrl` 拒绝带密码/secret query（见 F3, F10） (S19) |
| `packages/synthesis-contracts/src/workbench.ts` | 1343 | OK | surface→definition 分派、strictObject、operational chrome 按 descriptor 下标强校验；id 长度/数值上下界齐全。 (S18) |
| `packages/synthesis-contracts/src/workflow.ts` | 682 | 问题 | P1 `SynthesisLiteratureDigestApplyResult.sourceRef` 与 `source_ref` 同义双字段（见 F11）；`TOPIC_PLAN_*` 内部限常量多处用同一魔数 10_000/20_000 (S19) |
| `packages/synthesis-contracts/src/workflowReview.ts` | 161 | OK | 纯类型 + 两个协议 DTO 委托，无独立逻辑。 (S18) |
| `packages/synthesis-engine/src/canonicalJson.ts` | 15 | OK | 纯 re-export 别名映射，未发现问题 (S21) |
| `packages/synthesis-engine/src/citationGraphBuild.ts` | 1469 | 问题 | P2: F1 aggregateEdges.sourceRefs 生产/校验规范化不一致；P2: F2 同一 targetId 的 targetKind 冲突被静默合并 (S21) |
| `packages/synthesis-engine/src/citationGraphBuildTransfer.ts` | 496 | OK | 分页/清单重建自洽；但 page rebuild 复用 citationGraphBuild 的验证器，实际受 F1 影响 (S21) |
| `packages/synthesis-engine/src/conceptKbIndex.ts` | 941 | 问题 | P2: F3 派生 search.normalized 可超 stringMax；P2: F4 normalizedKey 未固定 locale (S21) |
| `packages/synthesis-engine/src/index.ts` | 1282 | OK | 布局/度量请求与结果校验自洽；仅 BFS O(n²) 性能观察（NOISE） (S21) |
| `packages/synthesis-engine/src/referenceMatcher.ts` | 4269 | 问题 | P2: F5 suggestedCandidates 排序校验过严；P2: F6 可选布尔被强制必填；P2: F7 canonical_count 与静默丢弃 (S21) |
| `packages/synthesis-engine/src/tagVocabulary.ts` | 898 | 问题 | P3（判断）: F11 请求提供的 tagPattern 被直接编译并逐条执行 (S21) |
| `packages/synthesis-engine/src/topicGraphIndex.ts` | 441 | OK | 索引重建与结果校验一致，未发现问题 (S21) |
| `packages/synthesis-engine/src/topicStructuredArtifact.ts` | 1733 | 问题 | P2: F8 冲突只报第一条；P2: F9 校验结果不重算；P2: F10 source_paper_refs 非数组绕过校验 (S21) |
| `packages/synthesis-repository/src/citationGraph.ts` | 812 | 存疑 | 主体 OK。两处需确认：导出的 `replaceSynthesisCitationGraphRows` 自身不开事务（685-713）；`synt_citation_edge` 的 `UNIQUE(source_literature_item_id,reference_instance_id)` 配 `INSERT OR REPLACE`（346-353 / 490）会静默删除同 (source… (S22) |
| `packages/synthesis-repository/src/conceptKb.ts` | 681 | 问题 | P2: 缺 schema 版本校验，INSERT OR REPLACE 无条件覆盖 meta（见 F6） (S22) |
| `packages/synthesis-repository/src/durableBundle.ts` | 270 | OK | 读侧 capture，draft 排序在构造 aggregateBasis 之前，按 payload 内 id 建 entityId（与 F5 相关） (S22) |
| `packages/synthesis-repository/src/durableBundleImport.ts` | 648 | 问题 | P2: domain state 只 UPDATE 不 UPSERT（F4）；payload 表主键与 capture 身份来源不一致（F5） (S22) |
| `packages/synthesis-repository/src/index.ts` | 1720 | OK | store 组合层；promotion/operation/cache 的 CAS 与抛错都包在同一事务内，回滚语义正确 (S22) |
| `packages/synthesis-repository/src/knowledgeCheckpoint.ts` | 149 | OK | 三段替换的外层事务 + 内层 CAS 抛错可整体回滚；capture 单事务读 (S22) |
| `packages/synthesis-repository/src/referenceMatchingReview.ts` | 764 | OK | 分页 cursor 实为 OFFSET（随更新会跳/重），属设计取舍，非缺陷 (S22) |
| `packages/synthesis-repository/src/referenceRefresh.ts` | 774 | 存疑 | `canonicals`/`bindings`/`reviews` 用 INSERT OR IGNORE（605/664/688），需确认 canonical 行是否允许被更新（id 是否含 metadataHash）；`graphReady` 在无 current 时默认 true（737-741）需确认是否有意 (S22) |
| `packages/synthesis-repository/src/tagVocabulary.ts` | 767 | 存疑 | `replaceVocabularyRows` 直接读 `state.protocol.protocolId`（474），而 capture 类型允许 `protocol: null`（knowledgeCheckpoint.ts:41-43）；需确认调用方是否可能回灌捕获态 (S22) |
| `packages/synthesis-repository/src/topicGraph.ts` | 447 | 问题 | 同 F6：schema meta 无版本校验（224-230） (S22) |
| `profiles/hermes/zotero-librarian/scripts/install_zotero_bridge_cli.py` | 212 | 问题 | P2: 安装后建链失败未捕获（F5） (S37) |
| `profiles/hermes/zotero-librarian/scripts/zotero_librarian_service.py` | 507 | 问题 | P2×4: 写事务跨子进程（F1）、终态集合分裂（F2）、异常逃逸破坏 receipt 契约（F3）、只读路径做 DDL（F4）；另 F13 (S37) |
| `profiles/hermes/zotero-librarian/scripts/zotero_librarian_workspace.py` | 155 | OK | `_inside` 用 `relative_to` 做组件级包含校验，`db` 越界被拒；`strict=True` 解析 profile 语义正确 (S37) |
| `profiles_src/hermes/zotero-librarian/scripts/install_zotero_bridge_cli.py` | 212 | 问题 | 与 `profiles/` 同名文件在本切片中逐字一致，F5 同样适用；是否为构建同步产物存疑 (S37) |
| `profiles_src/hermes/zotero-librarian/scripts/zotero_librarian_service.py` | 507 | 问题 | 同上，F1–F4、F13 同样适用 (S37) |
| `profiles_src/hermes/zotero-librarian/scripts/zotero_librarian_workspace.py` | 155 | OK | 同上，未发现问题 (S37) |
| `rust/acp-ws-bridge/src/main.rs` | 1233 | 问题 | P2: 非 Windows 不终止子进程（F1）；argv 秘密入审计文件（F2）；审计文件无上限/热路径多次 open（F3） (S22) |
| `rust/synthesis-sidecar/crates/synthesis-application/examples/checkpoint_bundle_webdav_debug_application_parity.rs` | 514 | 问题 | P3: `if_match` 比较吞掉 etag 读取错误导致假 conflict（见 F3）。其余为 dev-only parity 驱动，逻辑自洽，`FileHost::resolve` 路径校验（空段/`.`/`..`/`\`/绝对路径）完整 (S59) |
| `rust/synthesis-sidecar/crates/synthesis-application/examples/citation_reference_application_parity.rs` | 657 | 问题 | P3: `id_factory` 耗尽后静默伪造重复 id（见 F4）；`preparation_id.unwrap_or_default()` 会把 None 变成空串。其余 OK (S59) |
| `rust/synthesis-sidecar/crates/synthesis-application/examples/tag_concept_topic_graph_application_parity.rs` | 605 | 存疑 | `operation_ids`/`fault_phases`/`coverage` 只做形状校验、从未消费（见 F5）；`:457` 用 `edges.first()` 取边而非按 proposal 定位，依赖 fixture 初始无边的隐含前提，需确认 (S59) |
| `rust/synthesis-sidecar/crates/synthesis-application/examples/typed_application_parity.rs` | 1123 | 问题 | P2: 三处对共享原子计数器下标的无边界索引可 panic（见 F1）；`run_drain` 闸门等待无超时，被测代码提前返回/panic 会永久挂起（见 F2） (S59) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/admission.rs` | 98 | OK | 单飞 admission 自洽：`accepting`/`active` 均在 `state` 锁内读写，`shutdown` 用 `timed_out && active.is_some()` 复查谓词，lease Drop 清槽并 `notify_all`。同形实现在 crate 内另有 2 处（见 F10）。 (S60) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/canonical_literature_artifacts.rs` | 566 | 问题 | P3: `CitationUnresolvedMention` 上 `deny_unknown_fields` 与 `#[serde(flatten)]` 组合在 serde 中不生效，与文件头的“closed wire shape / reject aliases”意图不符（F5） (S61) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph.rs` | 1681 | 问题 | 公共 Application 入口正确归口；持久化路径存在 transaction/reader 混用（见 F1）和 metric refresh 在 writer 持锁窗口内做读（见 F2）；`prepare_rebuild` 写入 receipt 失败时已释放 admission；但 reservation 与 claim 之间无 CAS（见 F3）。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/persistence.rs` | 100 | OK | 纯 adapter 转发；读写分别走 `with_reader/with_writer`，与 basis-bound 契约一致 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/read.rs` | 627 | 问题 | P2: `explicit()` 缺参数上界校验（F4）；P3: metrics cursor 加法可溢出（F7） (S68) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/citation_graph/rebuild.rs` | 49 | OK | 仅 DTO + opaque attempt；`#[must_use]` 与文档已说明泄漏语义 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs` | 1694 | 存疑 | ingest/review 走 application.admit 再走独立 read→update→commit，没有显式 short reader tx，但读路径都是 `repository.load` / `get_state`；mutation admission 在两条互斥路径上独立 admit，可能并发（见 F4）。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/debug_maintenance.rs` | 487 | OK | 仅承载 debug 投影 + 单一 maintenance.run 代理，不承担 public maintenance 语义；后者由 synthesis-sidecar/runtime_public_maintenance_operation 拥有。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/dto.rs` | 859 | OK | 纯 DTO/枚举序列化定义；含 `deny_unknown_fields`，无运行时副作用。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/durable_bundle.rs` | 1323 | 问题 | `preview_import`/`apply_import` 在持 writer 的语义窗口内通过 admission SingleFlight 把所有路径串行；但 `reconcile_pending_import` 在 `acquire_with_runtime` 路径中持有 repository owner 写锁做 canonical.recover_import（潜在持锁 IO）（见 … (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/knowledge_checkpoint.rs` | 824 | 问题 | `preview_import` 与 `apply_import` 各自 `admit` 而非 atomic CAS：同一 receipt 可被两次 apply 间的窗口覆盖（已被 `.take()` 单次消费保护）；`stop_admission` 在 stop 时丢弃 in-flight receipt（语义与 durable_bundle 类似，需主代理复核 F5）。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/lib.rs` | 48 | OK | 仅模块声明 + `PromotionCheckpoint` 类型别名，无运行时行为。 (S60) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/library_snapshot_index.rs` | 297 | OK | `consume_page` 单一原子事务：`begin` 仅在 batch_index==0，stage 后仅在 completed 才 promote；验证严格（schema/scope/order/has_more/nextCursor/deliveredItems/deliveredBatches）；无可疑 pattern。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/ports.rs` | 1937 | 存疑 | 未证实缺陷。需确认：(a) `TopicGraphRepositoryPort::load_window` 默认实现（全量 `load()` 后再截断）是否会被任何生产实现走到；(b) `prepare_import` 只按 `relative_path.split('/')` 取 `parts[1]` 作分组键 + 期望 basis，是否与 `decode_topic_assets` 的 pa… (S61) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/reference.rs` | 496 | OK | host page collection 校验严格，cycle 检测靠 `seen_cursors`，revision 一致性靠 `expected_revision`；Dedupe 通过 paper_ref+item_key。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/reference_application.rs` | 5502 | 问题 | F1（batch 无上限）、F2（`pub` 测试 seam）、F3（artifact 页校验失效）、F5（Unchanged→Err）、F9（缺 mutation 串行化）、F11（authors 上限巨大）、F13（批内取消丢部分账目）；存疑见 F16/F17。 (S60) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/reference_matching.rs` | 1701 | 问题 | F8（同一批内冲突决策）、F10（admission 重复实现）；其余状态机（prepare/apply/review、basis 复核、receipt 幂等）读毕未发现问题。 (S60) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs` | 2734 | 问题 | P2: `roles_for_reference` 对每条引用重复深拷贝+解析 citation artifact（F2）；P2: `prepare` 与 `stop_admission` 竞态，可在 drain 后仍安装 preparation 并实施写（F3）；P3: `stop_admission` 持 state 锁做仓储 IO（F7） (S61) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/related_items.rs` | 849 | 问题 | `try_sync` 在循环前未持有 admission，transport 失败后直接 break 离开循环，后续 batch 不会被处理（已知）；但 `exact_receipts` 校验失败时仅追加一个 batch 标记（`summary.failed += batch.len()`），不持久化失败 receipt（见 F7）；`unreachable!("receipt validati… (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/tag_audit.rs` | 1074 | 问题 | `begin` 一次性 abandon 同主机非 active runs 与其他主机 runs，并直接 commit 当前 run（CAS 单插入）；其他主机 runs 仅按 host_instance_id 过滤 abandon，存在多 host 共用同一 host_instance_id 的边界 case 风险（见 F9）；`promote` 用 lease_token 比对但未 CAS——… (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs` | 3637 | 问题 | P2: `stage_public`/`update_public_staged` 以 lowercase 建 map，静默丢弃大小写兄弟 staged 行及其 parent bindings（F1） (S61) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/topic.rs` | 3647 | 问题 | F4（`unreachable!` panic）、F6（空 tag 选择器匹配全库）、F7（非 JSON asset 静默丢弃）、F12（batch 隐式确认 retarget）、F14（drain 假超时）；存疑：section 名未校验即进入 manifest 路径字符串。 (S60) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/topic_digest.rs` | 637 | OK | 校验严格（base64、bytes、mime type、dimensions、JSON safe int）；无 SQL/IO。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/topic_graph.rs` | 2112 | 问题 | P3: `validate_snapshot` 不校验 `edge_id`/`review_id` 唯一性，且 `safe_topic_graph_id` 有损映射可让不同 topic 对生成同一 edge_id（F4） (S61) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/webdav_sync.rs` | 1651 | 问题 | `execute_sync` 在持有 `state_transaction` 互斥锁外做 host.read_text/write_text/ensure_collection，但 `persist_patch` 重新获取 `state_transaction`，存在仅 `runtime` mutex 但 state store IO 不在事务内的窗口（实测上由 `runtime.generat… (S62) |
| `rust/synthesis-sidecar/crates/synthesis-application/src/workbench.rs` | 606 | OK | 读路径，无写；`active_review_tab` 拒绝未知值，`unreachable!` 仅在三个合法字符串上分支（与 F8 不同，此处安全）。 (S62) |
| `rust/synthesis-sidecar/crates/synthesis-canonical-store/src/lib.rs` | 3168 | 问题 | P2: 打开 store 无条件删除 `.writer.lock`，破坏跨 owner 写者互斥（见 F1） (S63) |
| `rust/synthesis-sidecar/crates/synthesis-citation-graph-build/src/lib.rs` | 680 | 问题 | P2: 每条 reference 对 target 的 aliases 反复排序/去重，同一 target 被 K 条引用时 O(K²logK)（见 F2） (S63) |
| `rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs` | 695 | OK | 校验、边界、自环剔除、确定性排序均自洽；unwrap 均有构造性保证 (S63) |
| `rust/synthesis-sidecar/crates/synthesis-concept-kb/src/lib.rs` | 1022 | OK | 输入校验、歧义/overlay、查询语义读毕未发现缺陷 (S63) |
| `rust/synthesis-sidecar/crates/synthesis-metrics/src/lib.rs` | 351 | OK | 年份窗口 `0..len-3` 无越界/off-by-one；PageRank/组件确定 (S63) |
| `rust/synthesis-sidecar/crates/synthesis-protocol/src/lib.rs` | 1723 | OK | 分页/帧校验、canonical 序列化、时间函数读毕未发现缺陷（canonical 快路径存疑见 NOISE） (S63) |
| `rust/synthesis-sidecar/crates/synthesis-reference-matcher/src/lib.rs` | 2235 | 问题 | P3: block 跳过无计数导致 counters 失真（见 F3）；另见 存疑 (S63) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/checkpoint_bundle_webdav_debug.rs` | 1240 | 问题 | P2：topic 分页终止用「过滤后 total」（F1，与 lib.rs 共同构成缺陷）；存疑：`DurableImportCapture` 的 `flatten`+`deny_unknown_fields`（serde 文档列为不支持组合）、`aggregate_count: 10` 硬编码、tag 状态未自增 `revision`（concept/topic 均自增） (S64) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs` | 4815 | 问题 | P2：匹配提升把 graph_ready/related_items_ready 复位为 true（F2）；P3：per-redirect 全表重载（F5）、`source_structure_version` 静默为 0（F6）、节点页无用 LEFT JOIN（F10）；存疑：source-slice 删节点可能留悬挂边（读路径已过滤，仅影响落库行与 graph_hash） (S64) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/legacy_ts_migration.rs` | 1002 | 问题 | P1：copy_direct_tables 未对 legacy 列漂移做防御；copy_counts 对聚合表校验不全（见 F1、F2） (S65) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/lib.rs` | 4526 | 问题 | P2：分页 total 语义不一致（F1）、写事务无 panic 守卫（F3）、`i64::MIN.abs()` 溢出（F4）；P3：`_reconcile_now` 被校验但从不使用（F7）、echo 消费全表扫描（F9）；存疑：identity marker 仅接受 v3/v4（v1/v2 影子库直接 mismatch） (S64) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/library_snapshot_index.rs` | 428 | 问题 | P2：promote 路径上的状态/读一致性裂缝与 valid_identity 重复校验（见 F3、F9） (S65) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/reference_redirect_graph.rs` | 275 | 问题 | P3：`is_explicit_reference_redirect_reason` 对 JSON 串做子串匹配（F8）；图算法本身（resolve/merge/reroot/cycles/repair_cycles）逐条核对未发现逻辑错误 (S64) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/tag_audit.rs` | 1209 | 问题 | P2：update_tag_effect 单条更新接口未做 status 白名单与 diagnostics 校验（见 F4） (S65) |
| `rust/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs` | 2418 | 问题 | P1：replace_* 不强制重置 index_stale；P2 性能/契约（见 F5、F6、F7） (S65) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_runtime_contract_parity.rs` | 124 | 存疑 | set_path 在 schema 不匹配时 .expect() panic；外部 harness 是否真接 panic 待确认 (S65) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/examples/native_worker_transfer_parity.rs` | 35 | OK | 仅做 request → compute → canonical 输出，逻辑清晰 (S65) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/examples/worker_protocol_corpus_parity.rs` | 152 | 存疑 | case.id 子串分发脆弱（见 F8）；byte_length 不做实际校验 (S65) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/bin/synthesis-metrics-worker-fixture.rs` | 80 | OK | 测试夹具二进制（spin/exit/panic 分支仅供超时/崩溃用例） (S68) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/lib.rs` | 32 | OK | 模块装配与 `serve`/`worker` 两个公开入口，符合“`serve` 为唯一生命周期入口”的约束；无逻辑。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/main.rs` | 15 | OK | 仅做 `worker`/`serve --config` 适配；Windows release CRT 静态链接用 `compile_error!` 兜住。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs` | 1398 | 问题 | P2: 无过滤 manifest 触发全库 artifact 内容读取 + O(n²) 分组（见 F1） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_background_tasks.rs` | 213 | OK | 任务登记/取消/drain 语义自洽；spawn 全程持锁、join 只在 is_finished 后调用 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_canonical_autosync.rs` | 443 | OK | debounce/maintenance epoch/abort 状态机与测试一致，无丢通知路径 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_capabilities.rs` | 636 | 问题 | P2: 生产 compute 路径含 env 控制的故障注入（见 F5）；P3: token 非常量时间比较（见 F8） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_commands.rs` | 1083 | 问题 | P2: 增量重建中 raw×binding 线性嵌套扫描（见 F2） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_citation_graph_read_surface.rs` | 1466 | OK | 预算收缩循环、basis 校验、layout 版本/完整性判定均可终止 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_cli.rs` | 49 | OK | 参数分派严格（缺 `--config` 归 usage）；多余尾参被忽略，属可接受。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_concept_topic_graph_surface.rs` | 497 | 问题 | P3: query 响应 limits.limit 被写成 total（见 F7） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_contract.rs` | 459 | OK | launch-config/discovery/health/handshake 逐字段校验，无路径穿越；token 未做控制字符校验（低风险，见 NOISE） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_deadline.rs` | 54 | 存疑 | thread-local 请求 deadline 在 `operation` panic 时不会恢复（无 RAII guard）；是否可复现取决于 runtime_http 是否 `catch_unwind` 并复用线程，证据不足，未列为 finding。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_diagnostics.rs` | 451 | OK | 事件字段为固定 allowlist，未启用时不构造 payload (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_file_system.rs` | 19 | OK | unix 走 `File::open+sync_all`，Windows 显式声明为 no-op 并说明理由。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_host_collection.rs` | 207 | OK | 委托 application 层分页校验，错误码映射完整；get_items_by_ref 未做结果校验（低） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_http.rs` | 408 | OK | 请求行/头/体三重上限、总 deadline 不随进度重置、拒绝 TE/重复 CL (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_lifecycle.rs` | 444 | OK | 锁→清理 stale discovery→ready 发布；终态只形成一次，cleanup issue 语义正确 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_client.rs` | 1959 | 问题 | P2: 每能力字节上限硬编码绕过 manifest（F4）；P2: 提交后超时仍返回错误（F7）；P3: 持 transfer 锁做可达 1GB 的读+哈希（F8）。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_production_ports.rs` | 2567 | 问题 | P2: `source_structure_version` 解析恒失败静默取 0（F1）；P2: 启动期修复/迁移错误被 `let _ =` 吞掉（F3）；P3: tag index 丢 aliases/abbrev（F9）。另注：`library_id()` 在无 config 时回退 0，生产 `serve --config` 下不可达，未列 finding。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_public_maintenance_operation.rs` | 1468 | 问题 | P3: 同一哈希切片偏移有两种写法（见 F9）；其余 admission/CAS/terminal 归属与 AGENTS 约束一致 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reference_citation_surface.rs` | 684 | 问题 | P3: review target 变体字段仍是 snake_case（见 F6） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_reverse_host.rs` | 308 | 存疑 | authorization_token 未校验控制字符即写入请求头（见 NOISE）；配置由 supervisor 提供，判定为低风险 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_server_loop.rs` | 298 | 问题 | P2: Drop 不 join 在途 handler（见 F1）。就 §2 Synthesis Sidecar 生命周期硬约束而言：本文件只持有 loopback listener（`127.0.0.1:0`）、active connections、socket interruption（`interrupt_all`）与 handler drain（`drain`）；不发布 discovery… (S69) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_service.rs` | 707 | OK | 启动回滚/ready commit/`can_close_storage` 与 AGENTS 生命周期条款一致 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_tag_surface.rs` | 393 | 问题 | P2: preview 与 apply 的 previewDigest 基于不同输入（见 F4） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_topic_workbench_surface.rs` | 1772 | 问题 | P2: `review` 页 `limit` 无上界（F2）；P2: `input_hash` 在截断/删段之后才生效（F5）；P3: `timeline` 形状不一致（F6）。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_transfer.rs` | 2943 | OK | 会话状态机、字节预留/释放、cleanup 与 attempt 交错做了逐条核对（含 cleanup_requested + active attempt 的延迟删除、reservation 单一归属），未发现证据充分缺陷；`kind` 未见路径穿越（受 manifest 白名单约束）。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_maintenance_surface.rs` | 334 | 问题 | P2: startup reconciliation 被暴露为可随时调用的 capability（见 F3） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_webdav_runtime.rs` | 188 | OK | pending→backup→rename 提交顺序与回滚正确 (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker.rs` | 824 | OK | 帧字段严格校验、分页字节/节点双上限、取消传播到每页；非分页路径无输出上限（见 NOISE） (S67) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_worker_pool.rs` | 1576 | OK | 熔断/替换/取消语义自洽；`with_worker` 与 `stop()` 的锁序无反转（`stop` 先置 stop_requested 才能抢占 worker 锁）；`admit` 的 queued 计数在 `wait` 出错时不回退，但 mutex 中毒后所有 `lock()` 均失败，实际影响为零，未列 finding。 (S66) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/tests/native_process_lifecycle.rs` | 1033 | OK | 端到端生命周期测试；未发现可影响生产的缺陷 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-sidecar/tests/native_worker_pool.rs` | 331 | OK | 分页 worker 协议测试，descriptor 逐页复算 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-tag-vocabulary/src/lib.rs` | 320 | OK | UTF-16 排序/正则校验/取消检查均正确；`checkpoint` 每 256 条 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-test-support/src/lib.rs` | 131 | OK | 测试根 owner；清理失败不覆盖主 panic (S68) |
| `rust/synthesis-sidecar/crates/synthesis-test-support/tests/test_root.rs` | 31 | OK | — (S68) |
| `rust/synthesis-sidecar/crates/synthesis-topic-graph/src/lib.rs` | 106 | OK | 边/节点校验与 UTF-16 排序正确；无 HashMap 顺序泄漏 (S68) |
| `rust/synthesis-sidecar/crates/synthesis-topic-structured-artifact/src/lib.rs` | 1137 | 存疑 | 深度/大小/取消边界检查完整；但 `discipline`、axes 数量、body 最小长度等硬约束只在此侧，Python 生成端靠硬编码满足（见 F1），需确认两侧是否为同一 SSOT (S68) |
| `rust/zotero-bridge/examples/export-agent-surface.rs` | 18 | OK | 示例/开发工具，导出 surface JSON，非生产运行路径 (S22) |
| `rust/zotero-bridge/examples/export-command-inventory.rs` | 116 | OK | 示例/开发工具，遍历 clap 命令生成清单；仅 `expect` 失败即 panic，属工具可接受 (S22) |
| `rust/zotero-bridge/src/args.rs` | 3926 | 问题 | P3: `--limit` 帮助写 1–100 但无 `value_parser` 范围（F11）；其余为 clap 定义与测试 (S23) |
| `rust/zotero-bridge/src/client.rs` | 223 | 问题 | P3: dry-run 协议违例时错误上下文里 operationId 为空（F6）；canonical mutation 名单与契约双份事实源（F10） (S23) |
| `rust/zotero-bridge/src/commands.rs` | 4215 | 问题 | P2: 服务端 displayName 未净化即 join 输出目录（F3）；上传整文件读入内存（F5） (S23) |
| `rust/zotero-bridge/src/config.rs` | 486 | 存疑 | `normalize_endpoint` 只做 `contains("/bridge/v2")` 弱校验且仅允许 http://，remote 模式是否接受明文承载 bearer token 需确认（见 NOISE-1） (S23) |
| `rust/zotero-bridge/src/contract.rs` | 1478 | 问题 | P2: 组合后 payload 违约被归类为 Internal/exit 70，用户输入错误经由该路径暴露（F4）；`strip_composed_fields` 整组丢弃 anyOf/oneOf 需确认（见 NOISE-2） (S23) |
| `rust/zotero-bridge/src/error.rs` | 203 | OK | 错误 DTO/退出码映射读毕，未见缺陷 (S23) |
| `rust/zotero-bridge/src/main.rs` | 175 | OK | clap 错误→结构化 envelope、--schema 短路、leaf_path 设上下文，均自洽 (S23) |
| `rust/zotero-bridge/src/output.rs` | 54 | 问题 | P3: 每次成功/失败输出都重建整份 surface descriptor（F8） (S23) |
| `rust/zotero-bridge/src/schema.rs` | 152 | OK | leaf_path 在叶子命令处 break，跳过全局取值参数，未发现路径解析错误 (S23) |
| `rust/zotero-bridge/src/surface.rs` | 914 | 问题 | P3: `descriptor()` 无缓存，每次调用重建全目录并全量 schema 校验（F8） (S23) |
| `rust/zotero-bridge/src/transport.rs` | 1174 | 问题 | P2: `verified: true` 恒真（F1）；裸 HTTP 头未净化（F2）；不可达分支（F7）；只读 POST 也带 operationId 与回执指引（F9） (S23) |
| `rust/zotero-bridge/tests/schema_mode.rs` | 272 | OK | 纯契约/黑盒测试，逐条读完未发现缺陷 (S24) |
| `scripts/build-help-docs.ts` | 596 | OK | 路径/资产/内链校验齐全；`build()` 先 rm 后重建非原子，但属构建脚本可接受 (S00) |
| `scripts/check-localization-governance.ts` | 443 | OK | 纯治理扫描；`projectAssistantWorkspacePanel` 未命中时 slice 边界会退化，但不影响门禁结论 (S00) |
| `scripts/check-runtime-diagnostics-release-elision.ts` | 302 | OK | esbuild 元数据 + 标记双重断言，check 自身无误 (S00) |
| `scripts/check-skillrunner-ssot-invariants.ts` | 336 | OK | YAML/事实双源比对，required-id 与重复 id 都覆盖 (S00) |
| `scripts/ci-gate-plan.ts` | 39 | OK | 纯编排数据 (S00) |
| `scripts/clear-acp-chat-records.ts` | 6 | OK | 薄委托 (S00) |
| `scripts/clear-acp-skills-records.ts` | 6 | OK | 薄委托 (S00) |
| `scripts/clear-skillrunner-records.ts` | 6 | OK | 薄委托 (S00) |
| `scripts/content-package/build-canonical-literature-validators.ts` | 54 | OK | 生成器逻辑自洽；`--check` 在目标缺失时报 ENOENT 而非友好消息（非缺陷） (S01) |
| `scripts/content-package/build-content-package-feed.ts` | 540 | OK | 逐行读完；CRLF 归一化、tracked 过滤、debug-only 跳过与 manifest 重写自洽；`DEFAULT_CHANNELS` 返回共享可变数组但调用方只读 (S01) |
| `scripts/content-package/build-literature-deep-reading-graph-renderer.ts` | 210 | OK | shell 命令拼接的路径全部来自 `repoRoot` 常量，无外部可控输入；1MB 阈值只统计 citation-graph 产物（命名略窄） (S01) |
| `scripts/content-package/bump-content-package-version.ts` | 88 | OK | semver 校验、禁止降级、requires.plugin 更新均正确 (S01) |
| `scripts/content-package/check-builtin-workflow-manifest.ts` | 143 | OK | `UNSHIPPED_BUILTIN_PATH_PREFIXES = []` 恒空（死配置）；`endsWith("/workflow.json")` 不含根级 workflow.json (S01) |
| `scripts/content-package/check-content-package-release.ts` | 446 | OK | 签名比对依赖 `requires` 的 JSON key 顺序，因远端/本地同源生成，可接受 (S01) |
| `scripts/content-package/content-package-channels.ts` | 37 | OK | 去重 + 规范化 + 空值拒绝，正确 (S01) |
| `scripts/content-package/prepare-content-package-release.ts` | 288 | OK | 互斥参数校验、干净树/远程祖先校验、dispatch 流程完整 (S01) |
| `scripts/content-package/publish-content-package-feeds.ts` | 206 | 问题 | P2：token 内嵌 remote URL（F2） (S01) |
| `scripts/content-package/publish-content-package-github.ts` | 168 | 问题 | P2：`tag` 未净化即参与路径拼接 + `fs.rm(recursive)`（F1） (S01) |
| `scripts/e2e-single-markdown-live.ts` | 217 | 问题 | P2：`new URL(import.meta.url).pathname` 求仓库根（见 F2） (S00) |
| `scripts/github-workflow-run.ts` | 328 | 存疑 | 未发现可证实的运行期缺陷；两处需外部契约确认：(1) `buildGithubWorkflowDispatchArgs` 只用 `-f`（raw-field=字符串），若 release workflow 声明 boolean/number 类型 dispatch input 可能被 GitHub 拒绝（本切片无 `.github/workflows/*.yml`）；(2) list 路径不校验… (S69) |
| `scripts/host-bridge/check-host-bridge-agent-language.ts` | 124 | OK | 全局正则 lastIndex 已重置；无运行期缺陷 (S02) |
| `scripts/host-bridge/check-host-bridge-consumer-guidance.ts` | 262 | OK | 仅 `--baseline-ref` 空值时静默降级（判断性，噪声级） (S02) |
| `scripts/host-bridge/check-host-bridge-skill-packages.ts` | 698 | OK | 计数基线为 ratchet 用途；每卡重复读文件 3 次，仅 CI 成本 (S02) |
| `scripts/host-bridge/check-plugin-host-bridge-assets.ts` | 367 | OK | 同一 xpi 读两次；ACP 侧车无外部期望值（见存疑） (S02) |
| `scripts/host-bridge/dispatch-host-bridge-release.ts` | 274 | OK | 本地门禁 splice 索引硬编码 3，行为不变 (S02) |
| `scripts/host-bridge/host-bridge-agent-surface.ts` | 259 | 问题 | P3: 内容寻址 canonical 化重复（F7）；P3: 空 intent 全命中（F8）；`_catalog` 参数未被使用（F4 引用） (S02) |
| `scripts/host-bridge/host-bridge-command-contracts.ts` | 481 | OK | protocol/cliSchema 字面量与 src/shared 常量分离（F7 同类，未单列） (S02) |
| `scripts/host-bridge/host-bridge-release-controller.ts` | 297 | 问题 | P2: `--surface-status` 未校验即落盘（F1） (S02) |
| `scripts/host-bridge/host-bridge-release-plan.ts` | 192 | OK | git 失败静默降级为空串，仅影响降级精度 (S02) |
| `scripts/host-bridge/host-bridge-release-set.ts` | 375 | 问题 | P3: 第二份 stableJson + localeCompare 排序参与 releaseSetId（F7） (S02) |
| `scripts/host-bridge/host-bridge-review-mirror.ts` | 608 | OK | 路径均经 assertInside/无符号链接校验；swap 失败会重抛但目标已更新（低） (S02) |
| `scripts/host-bridge/host-bridge-semantic-review-context.ts` | 318 | OK | 分类优先级清晰；未分类项落到 unclassifiedChanges 属设计 (S02) |
| `scripts/host-bridge/host-bridge-surface-catalog.ts` | 287 | OK | 与 command-contracts 的 CommandTarget 形状重复；execFileSync 未设 maxBuffer（存疑） (S02) |
| `scripts/host-bridge/host-bridge-surface-model.ts` | 336 | 问题 | P2: skill.id/mount 缺穿越校验（F2） (S02) |
| `scripts/host-bridge/host-bridge-surface-version.ts` | 58 | OK | — (S02) |
| `scripts/host-bridge/host-bridge-version-intent.ts` | 30 | 问题 | P3: 版本文法与另两处不一致（F5） (S02) |
| `scripts/host-bridge/host-bridge-workflow-catalog.ts` | 132 | OK | — (S02) |
| `scripts/host-bridge/materialize-host-bridge-surfaces.ts` | 329 | OK | 模块级 `ROOT=process.cwd()` 与顶层 argv 副作用（可测试性，低） (S02) |
| `scripts/host-bridge/prebuild-zotero-bridge-cli.ts` | 381 | OK | ref/sha 校验完整、顺序正确 (S02) |
| `scripts/host-bridge/prepare-host-bridge-release.ts` | 125 | OK | `run()` 未检查 `result.error`，ENOENT 时错误信息失真（低） (S02) |
| `scripts/host-bridge/render-host-bridge-release-set.ts` | 122 | 问题 | P3: catalog 构建后被丢弃（F4） (S02) |
| `scripts/host-bridge/render-host-bridge-surfaces.ts` | 1410 | 问题 | P2: `mode`/`--content-only` 完全无效（F3） (S02) |
| `scripts/host-bridge/render-host-mutation-contract.ts` | 124 | OK | 顶层读写为 CLI 入口；--check 幂等比较 (S02) |
| `scripts/host-bridge/stage-host-bridge-cli-prebuilds.ts` | 162 | 问题 | P3: 生产路径依赖 `...ForTests` seam（F6） (S02) |
| `scripts/host-bridge/sync-host-bridge-cli-prebuilds.ts` | 719 | 问题 | P3: 导出 `...InternalsForTests` 成为生产 API（F6） (S02) |
| `scripts/host-bridge/zotero-bridge-cli-release.ts` | 34 | OK | 不校验 buildFingerprint 形状，由下游 buildHostBridgeReleaseSet 兜底 (S02) |
| `scripts/inspect-literature-analysis.ts` | 287 | OK | 仅用 `fileURLToPath` + 强校验，无副作用导出 (S00) |
| `scripts/inspect-single-markdown-request.ts` | 177 | 问题 | P2：同 F2 的 `new URL(...).pathname` (S00) |
| `scripts/internal/cleanup-runtime-category-cli.ts` | 279 | 存疑 | 需确认消费方 `bindByIndex` 是否 0 基（mozIStorage 真实 API 为 1 基） (S02) |
| `scripts/mock-skillrunner-serve.ts` | 92 | OK | 参数解析有回退，端口 0 允许随机端口 (S00) |
| `scripts/patch-zotero-test-runner.ts` | 359 | OK | 注入块无 `$`/`<`/`&` 冲突，锚点缺失显式报错，幂等标记正确 (S00) |
| `scripts/record-acp-runtime-governance-baseline.ts` | 171 | OK | 双跑一致性校验 + force 保护 (S00) |
| `scripts/release-coordinator-gate.ts` | 732 | OK | blocker/next_action 映射完整；CLI 取值对空值不敏感 (S00) |
| `scripts/run-ci-gate.ts` | 58 | OK | spawn 同时处理 `error`/`exit` (S00) |
| `scripts/run-node-test-shards.ts` | 788 | OK | 分片互斥/未分配/重复都强制失败；临时 shard 数据目录不回收（OS tmp 兜底） (S00) |
| `scripts/run-zotero-compatibility-matrix.ts` | 490 | OK | receipt 先写后补；失败阶段归类正确；锁释放排在清理之前属权衡 (S00) |
| `scripts/run-zotero-compatibility-worker.ts` | 135 | OK | 入口代理 + host-facts 落盘路径与 matrix 读取一致 (S00) |
| `scripts/run-zotero-direct.ts` | 687 | OK | RDP 客户端/预检/清单校验完整；重试路径的 socket 释放见 NOISE (S00) |
| `scripts/run-zotero-full-suite.ts` | 62 | 问题 | P3：spawn 失败只挂 `exit`，无 `error` 分支会永久挂起（见 F3） (S00) |
| `scripts/run-zotero-start-with-mock.ts` | 281 | OK | detached 进程组 + 平台分支终止逻辑正确 (S00) |
| `scripts/run-zotero-test-with-mock.ts` | 423 | OK | managed data dir 只在自建时清理；端口/模式规范化正确 (S00) |
| `scripts/runtime-diagnostics-esbuild.ts` | 239 | OK | 禁用桩与生产模块导出保持一致 (S00) |
| `scripts/runtime-diagnostics-production-manifest.ts` | 151 | OK | 纯清单数据（SSOT） (S00) |
| `scripts/sync-gitee-publication.ts` | 444 | OK | 编排与远端校验正确；空 body 的根因在 F1 指向的文件 (S00) |
| `scripts/sync-gitee-release.ts` | 537 | 问题 | P2：空 release body 触发 `--body requires a value`（见 F1） (S00) |
| `scripts/synthesis/check-synthesis-artifact-library-debug-surface-parity.ts` | 84 | OK | 语料身份/bounds/12 操作/access 对账/边界与 reopen 用例/ready 白名单检查链完整；`!` 断言仅在语料缺失时抛错。 (S03) |
| `scripts/synthesis/check-synthesis-citation-graph-surface-parity.ts` | 114 | OK | 窗口读用例、durable mutation、Host revision 例外白名单、ready 去重均自洽。 (S03) |
| `scripts/synthesis/check-synthesis-concept-topic-graph-surface-parity.ts` | 117 | OK | mutation 集合硬编码与 operations.json access 交叉校验；`missing Concept query case` 错误串丢 id（单条匹配，无实害）。 (S03) |
| `scripts/synthesis/check-synthesis-cross-language-contracts.ts` | 690 | OK | 注册表/引用解析/开放对象开放数组逃逸/负例生成逻辑闭合；`validator` 用 `${schemaId}#${fragment}` 解析依赖 Ajv 归一化，未发现翻转。 (S03) |
| `scripts/synthesis/check-synthesis-native-runtime-contract-parity.ts` | 168 | OK | node/rust 双跑比对；`nodeCode` 忽略错误细节（只比对稳定 code），符合设计。 (S03) |
| `scripts/synthesis/check-synthesis-native-worker-transfer-parity.ts` | 264 | OK | 所有权断言用源码字符串匹配（刻意钝化）；协议语料双向比对并回收 expected，未见漏检。 (S03) |
| `scripts/synthesis/check-synthesis-production-capabilities.ts` | 394 | OK | manifest/TS 常量/AST 端口/语料五方对账，operation 元数据字段集与 receipt/workDeadline 双向一致性检查到位。 (S03) |
| `scripts/synthesis/check-synthesis-production-route-performance.ts` | 995 | 问题 | P3: `cachedSetup` 缓存 rejection（见 F8）；另存疑：`FORMAL_SAMPLE_COUNT = 11` 时 `nearestRank(…,95)` 取到第 11 个即最大值，"p95 预算"实为 max 预算，需确认是否有意。 (S03) |
| `scripts/synthesis/check-synthesis-reference-canonical-surface-parity.ts` | 169 | OK | Host job / worker / batch / dedicated port 四类族用例覆盖检查完整。 (S03) |
| `scripts/synthesis/check-synthesis-rust-license-inventory.ts` | 160 | OK | Cargo.lock 块解析、stale/missing 双向、rusqlite 声明与 provenance 字段存在性检查；属文本门禁，无运行期逻辑。 (S03) |
| `scripts/synthesis/check-synthesis-service-boundary.ts` | 188 | OK | 正则边界检查（可能误报注释/类型名，属钝化设计）；仅 runtime_service.rs 允许 open_production 的约束与 AGENTS 条款一致。 (S03) |
| `scripts/synthesis/check-synthesis-sidecar-runtime-freshness.ts` | 66 | OK | 逐 target 校验并把读取异常降级为 `bundle_unreadable` 诊断；CLI 显式传 `undefined` 会回落到默认 assetRoot（正确）。 (S03) |
| `scripts/synthesis/check-synthesis-sidecar-runtime-xpi.ts` | 120 | 问题 | P3(判断): 第一段 forbidden 过滤硬编码 `bin/synthesis-sidecar/`（见 F5）。 (S03) |
| `scripts/synthesis/check-synthesis-tag-surface-parity.ts` | 119 | OK | special 族用例、ready 白名单、baseline stableErrors 反查齐全。 (S03) |
| `scripts/synthesis/check-synthesis-topic-workbench-surface-parity.ts` | 98 | OK | 与 baseline fixture 的 observable id/access 双向对账。 (S03) |
| `scripts/synthesis/check-synthesis-webdav-maintenance-surface-parity.ts` | 89 | OK | 控制操作 cancel/continue/retry/restart 覆盖检查到位。 (S03) |
| `scripts/synthesis/dispatch-synthesis-sidecar-prebuild.ts` | 407 | OK | ref/SHA/source 前置校验（check-ref-format + upstream 比对 + 全 SHA）、结果身份断言、dirty bundle 拒绝覆盖、失败提示 resume-run-id；`--overwrite-dirty-bundles=value` 形式会被忽略成裸 flag（无实害）。 (S03) |
| `scripts/synthesis/dispatch-synthesis-sidecar-release.ts` | 131 | OK | 仅 clean main、prepared==remote、ancestor 校验由 execFile 非零码兜底。 (S03) |
| `scripts/synthesis/download-synthesis-sidecar-runtime-cache.ts` | 267 | 问题 | P3: bearer token 进入 curl argv（见 F7）；另存疑：解压用 `unzip`，但同文件谱系对 tar 专门做了 Windows 分支（`synthesisSidecarRuntimeTar`），Windows runner 上 `unzip` 是否可用需确认。 (S03) |
| `scripts/synthesis/package-synthesis-sidecar-runtime-symbols.ts` | 179 | OK | manifest 形状/字节数/SHA 校验与 gzip 体积上限自洽。 (S03) |
| `scripts/synthesis/package-synthesis-sidecar-runtime.ts` | 204 | OK | 符号链接/非文件条目拒绝、provenance 与 manifest 生成后立即 candidate 校验。 (S03) |
| `scripts/synthesis/prepare-synthesis-sidecar-release.ts` | 82 | OK | 强制 clean main 且与 origin/main 同步，无 verification receipt 即拒绝生成 release set。 (S03) |
| `scripts/synthesis/publish-synthesis-sidecar-runtime-prebuild.ts` | 376 | 问题 | P3: token 拼进 remote URL 传给 git（见 F7）。 (S03) |
| `scripts/synthesis/resolve-synthesis-sidecar-runtime-cache.ts` | 349 | 问题 | P3: 内联 `--exclude-run-id=` 不做整数校验，NaN 静默退化为"不过滤"（见 F4）。 (S03) |
| `scripts/synthesis/resolve-synthesis-sidecar-verification.ts` | 345 | OK | receipt 重建 + run 元数据/workflow path/身份四重比对；分页上限 10×100 明确。 (S03) |
| `scripts/synthesis/smoke-synthesis-rust-durable-candidate.ts` | 1000 | 问题 | P3: finally 中清理失败会掩盖主错误并跳过后续清理（见 F10）。 (S03) |
| `scripts/synthesis/smoke-synthesis-rust-sidecar-worker.ts` | 115 | OK | worker ready/result 帧与 fingerprint 校验；失败靠顶层 await 的未捕获 rejection 退出码，可接受。 (S03) |
| `scripts/synthesis/stage-synthesis-sidecar-runtime-prebuilds.ts` | 261 | 存疑 | rename 失败后只要目标目录存在就吞掉错误并返回 `reused:false`（未再比对目标内容）；因 aggregate 由归档字节派生，实际风险需确认 aggregate 覆盖范围。 (S03) |
| `scripts/synthesis/sync-synthesis-sidecar-runtime-prebuilds.ts` | 236 | OK | 先解包到 bundleStaging 校验再原子换入，失败回滚 backup；catch 中回滚自身失败属边缘路径。 (S03) |
| `scripts/synthesis/synthesis-native-stage1-suite.ts` | 86 | OK | 必需编号集合与三段 segment 划分互补且不重叠，缺号即抛错。 (S03) |
| `scripts/synthesis/synthesis-sidecar-runtime-release-controller.ts` | 161 | OK | 步骤顺序、不可回退（complete→非 complete）、失败态与全完成态收敛逻辑自洽。 (S03) |
| `scripts/synthesis/synthesis-sidecar-runtime-release-governance.ts` | 495 | 问题 | P3: `verifySynthesisSidecarRuntimeBundleDirectory` 的 `policy` 参数被接受但正文从不读取（见 F6）；另存疑 `computeSynthesisSidecarRuntimeBundleId` 依赖 `JSON.stringify` 字段序，与 `rebuild…` 归一化是否一致未验证。 (S03) |
| `scripts/synthesis/synthesis-sidecar-runtime-release-plan.ts` | 64 | OK | 仅做 receipt/plan 一致性投影。 (S03) |
| `scripts/synthesis/synthesis-sidecar-runtime-release-set.ts` | 84 | OK | 读写 release set 的薄封装。 (S03) |
| `scripts/synthesis/synthesisProductionSurfaceCorpora.ts` | 295 | OK | 语料 SSOT 常量 + 指纹 + baseline/normalization/migration YAML 一致性检查；`inspectStableValue` 递归无界（fixture 受控，可接受）。 (S03) |
| `scripts/ui-harness-serve.ts` | 926 | OK | 内容路径前缀校验到位；请求体无上限见 NOISE (S00) |
| `scripts/update-skillrunner-runtime-feed.ts` | 159 | OK | schema/版本校验，ENOENT 才回退空 feed (S00) |
| `scripts/zip-archive.ts` | 125 | OK | 条目名/重复/加密/大小都校验；不支持 ZIP64 属已知范围 (S00) |
| `scripts/zotero-compatibility-fixture.ts` | 1105 | OK | 下载哈希校验、原子发布、锁持有者存活判定、清理越界防护都正确 (S00) |
| `skills_builtin/collection-collector/scripts/gate_runtime.py` | 138 | OK | 仅做 gate 指令拼装与 CLI 分发 (S24) |
| `skills_builtin/collection-collector/scripts/stage_runtime.py` | 974 | 问题 | P3: `page_cursor` 静默截断（F7）；另有 `run_root_from_db` 隐式回退 cwd 的可疑行为（NOISE） (S24) |
| `skills_builtin/create-topic-synthesis-prepare/scripts/gate.py` | 127 | OK | — (S24) |
| `skills_builtin/create-topic-synthesis-prepare/scripts/topic_synthesis_db.py` | 4231 | 问题 | P2: 工件 key 不匹配致 handoff 丢项（F1）；P2: 工件注册表进程内失效/hash 丢弃（F4）；P2: triage 层级读取不一致（F3）；P3 若干（F5/F6/F9） (S24) |
| `skills_builtin/export-research-bundle/scripts/gate_runtime.py` | 197 | OK | — (S24) |
| `skills_builtin/export-research-bundle/scripts/stage_runtime.py` | 1951 | 问题 | P2: manifest content_file 未做路径约束（F2）；P3: selection 的 O(n²) 成员判断（F8）；P3: script_command 硬编码 `python`（F9） (S24) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/__init__.py` | 1 | OK | 仅包 docstring (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/agent_work.py` | 95 | 问题 | P3: `write_manifest` 的 `package_key` 形参从未使用（见 F6） (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/algorithm_adapter.py` | 64 | OK | 临时文件在 `finally` 中清理，stdout 捕获与 JSON 解析路径完整 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/citations.py` | 489 | 问题 | P3: `_citation_batch_packages` 为死代码，且与生效的 10 条分批规则不一致（见 F5） (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/deterministic_core.py` | 7683 | 问题 | P2: 模板契约不一致（F1）/LaTeX 任意路径读（F2）；P3: items 无覆盖校验（F7）、死分支（F8）、fix 模式 error 约定（F9） (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/gate_contract.py` | 223 | OK | next_action/前置检查与 DB 状态一致；`allowed_payload_shape` 与 handler 校验一致 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/payload_normalization.py` | 55 | OK | 别名归一与未知字段丢弃均带 warning，无静默丢失 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/reference_api.py` | 570 | OK | 响应有 16MiB 上限、重试上限与 Retry-After 封顶；未见可证实缺陷 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/references.py` | 1488 | 问题 | P2: 校验失败路径先重跑 prepare 并清空 reference_items（F3）；P3: `_batch_packages` 死代码（F5） (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/runtime.py` | 203 | OK | 初始化写入 4 个模板路径，与 render 前置检查自洽 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/runtime_db.py` | 2607 | OK | schema/迁移/取值路径一致；`store_reference_items` 的整表替换是 F3 的放大器，本身按设计 (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/scoring.py` | 1175 | 问题 | P3: `_source_windows` 每条证据引用重建（F4） (S38) |
| `skills_builtin/literature-analysis/scripts/analysis_runtime/stages.py` | 73 | OK | 薄适配，参数透传正确 (S38) |
| `skills_builtin/literature-analysis/scripts/run_analysis.py` | 342 | OK | — (S24) |
| `skills_builtin/literature-analysis/scripts/runtime_db.py` | 10 | 未细读 | 纯 re-export shim（`from analysis_runtime.runtime_db import *`），无自有逻辑 (S24) |
| `skills_builtin/literature-analysis/tests/test_citation_materialization.py` | 66 | OK | 测试文件 (S24) |
| `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-standalone.css` | 231 | OK | — (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-standalone.js` | 1 | OK | 压缩 bundle，按函数逐段核对（边去重/可见性模型/投影/悬停重绘）；无缺陷。悬停时整图重建 SVG 属既有设计，见 NOISE (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-synthesis-app.js` | 393 | 问题 | P3：诊断字段名写成 `cache_status`（F4）；P3：角色选项来源与筛选语义不一致（F5）；P3：可见性/尺寸模型与 standalone bundle 重复实现（F6） (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-synthesis-theme.js` | 71 | 存疑 | `storage` 事件只改属性、不派发 `zotero-skills-theme-change`；需确认是否有 in-page 消费者依赖该事件重绘 (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/citation-graph-synthesis.css` | 6889 | 未细读 | 拼接/生成产物：内联 KaTeX 0.16.9、与 page-chrome 同形的设计 token、`topic-timeline-shared.css` 全文与 app CSS；抽查未发现独立缺陷 (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/deep-reading.css` | 1402 | OK | — (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/deep-reading.js` | 1173 | OK | 所有插值走 `esc()`；digest iframe 的双轮询有 `settled` 守卫，未发现缺陷 (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/markdown-renderer.css` | 128 | OK | — (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/markdown-renderer.js` | 434 | 问题 | P1：属性级 URL 校验只覆盖 `href`/`src`（F1）；P2：标签黑名单（F2）；P2：KaTeX 后代内联样式被清除（F3） (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/topic-timeline-shared.css` | 567 | OK | 与 `citation-graph-synthesis.css:188-754` 逐字重复（疑为构建内联），见 NOISE (S39) |
| `skills_builtin/literature-deep-reading/renderer/templates/topic-timeline-shared.js` | 3 | OK | 压缩 bundle；tooltip 为模块级单例 `h`，容器被移除时可能残留，证据不足，不列为缺陷 (S39) |
| `skills_builtin/literature-deep-reading/scripts/deep_reading_runtime.py` | 7429 | 问题 | P2: 图片引用未做路径包含校验即读盘并内联进最终 HTML（F1）；P2: section_roles 覆盖只作用于批准备、不作用于翻译校验，Stage 30 可提交性自相矛盾（F2）。另见「存疑」两处 (S25) |
| `skills_builtin/literature-explainer/scripts/dispatch_source.py` | 399 | 问题 | P2: PDF 字面量解码用 `isdigit()` 配 `int(octal, 8)`，遇到 `\8` 或 latin-1 数字类字符抛 ValueError，整个 stdlib 兜底失败（F3） (S25) |
| `skills_builtin/literature-explainer/scripts/evidence_verifier.py` | 479 | 问题 | P2: 校验用 `urlopen` 无 scheme 白名单、无状态码校验，`data:`/`file:` 可直接伪造 pass（F4）；P2/P3: 远端返回非对象 JSON 时 `data.get(...)` 抛 AttributeError 未被 except 覆盖，脚本崩溃（F5） (S25) |
| `skills_builtin/literature-explainer/scripts/memory_engine.py` | 656 | 问题 | P3: `handle_update` 读全量→截断原文件→重写，无临时文件/无锁，中断或并发会丢整段记忆（F6） (S25) |
| `skills_builtin/literature-translator/scripts/blockify.py` | 675 | 问题 | P2: 代码围栏闭合分支不可达（F1）；`state` 守卫缺失导致 `#`/`<table`/图片行可打断进行中的 code 块 (S26) |
| `skills_builtin/literature-translator/scripts/build_block_sentences.py` | 140 | 问题 | P2: BLOCK_START_RE 强制 heading 字段，与 blockify 可选输出不匹配 → 无 heading 块被静默丢弃（F2） (S26) |
| `skills_builtin/literature-translator/scripts/concatenate.py` | 196 | 问题 | P2: 译文 sentences 为空时块内容被静默删除且仍计为 applied（F7） (S26) |
| `skills_builtin/literature-translator/scripts/export_alignment.py` | 296 | 存疑 | 句对按位置配对（`tgt_sentences_raw[i]`），译文丢句时会整体错位，是否由上游 quality_gate 的 sentence_count 兜住需确认；mode.txt 解析与 quality_gate 重复（F13） (S26) |
| `skills_builtin/literature-translator/scripts/export_qa_report.py` | 210 | 问题 | P2: `--block-stats` 收 sentences.json 时 `total_blocks` 变 dict，第 110 行 `dict - int` 抛 TypeError（F3） (S26) |
| `skills_builtin/literature-translator/scripts/parse_input.py` | 319 | 问题 | P3 空文件 IndexError（F12）；P2 `\cite{key}` 不被剥离（F8）；P2 LaTeX 分支自造 BLOCK 标记与 sentencify 冲突（F9） (S26) |
| `skills_builtin/literature-translator/scripts/partition_batches.py` | 197 | OK | 依赖模块级 global `target_size`（main 里赋值、write_batch_files 里读）才能运行，属可测试性隐患，非缺陷 (S26) |
| `skills_builtin/literature-translator/scripts/protect_placeholders.py` | 339 | OK | 保护优先级与占位符自洽；`get_placeholder_map` 的 by_type 对 `<EQ_REF_001>` 这类两段式类型统计成 "EQ"（无消费者，仅元数据失真） (S26) |
| `skills_builtin/literature-translator/scripts/quality_gate.py` | 831 | 问题 | P3: `resolve_mode` 与 export_alignment 逐字重复、`check_language` 死代码（F13） (S26) |
| `skills_builtin/literature-translator/scripts/restore_placeholders.py` | 135 | 问题 | P2: 占位符表为空时 exit 0 且不产出任何文件，下游 concatenate 直接失败（F6） (S26) |
| `skills_builtin/literature-translator/scripts/sentencify.py` | 277 | 问题 | P2: list 块内换行被替换为空格 → 多行列表塌缩为单句、项目符号丢失（F10）；文件头 docstring 与 NO_SPLIT_TYPES 对 heading 的描述互相矛盾 (S26) |
| `skills_builtin/manuscript-literature-framing/scripts/gate_runtime.py` | 233 | OK | gate 检查字段集合与 stage_runtime 写入字段一一对应；状态机无非法跃迁 (S26) |
| `skills_builtin/manuscript-literature-framing/scripts/runtime_state.py` | 90 | OK | `write_json` 非原子（直接覆盖），单写者场景下可接受 (S26) |
| `skills_builtin/manuscript-literature-framing/scripts/stage_runtime.py` | 503 | OK | `require_run_root_path` 有路径逃逸守卫；payload 校验充分；错误以 traceback 而非 JSON 契约返回（低） (S26) |
| `skills_builtin/tag-bootstrapper/scripts/normalize_output.py` | 89 | OK | 非法输入返回 None 时不动原字段，交给 validate_output 报错，行为一致 (S26) |
| `skills_builtin/tag-bootstrapper/scripts/validate_output.py` | 94 | OK | 校验键集合与 normalize 输出形状一致 (S26) |
| `skills_builtin/tag-regulator/scripts/normalize_output.py` | 90 | 存疑 | 第 55 行用 input_tags 过滤 remove_tags：请求删除但不在 input_tags 中的标签被静默丢弃，是否符合语义待确认 (S26) |
| `skills_builtin/tag-regulator/scripts/validate_valid_tags.py` | 68 | OK | auto 模式回退合理；宽 except 仅用于探测格式 (S26) |
| `skills_builtin/topic-planner/scripts/topic_planner.py` | 258 | OK | 覆盖度分母/材料化节点/关系规范化检查完整，错误统一返回 code=2 的 JSON (S26) |
| `skills_builtin/topic-synthesis-core-enrichment/scripts/gate.py` | 127 | OK | 参数与 action 分派清晰，异常统一转 JSON 错误 (S26) |
| `skills_builtin/topic-synthesis-core-enrichment/scripts/topic_synthesis_db.py` | 4231 | 问题 | P2: handoff artifact key 拼写不一致导致静默丢路径（F4）、stage_state 主键只有 stage_id 跨 skill 互相覆盖（F5）、schema 校验器静默忽略未实现关键字（F11）、locator 重复实现（F14）、artifact 注册表为全局 dict 且丢弃 hash（F15） (S26) |
| `skills_builtin/topic-synthesis-finalize/scripts/gate.py` | 127 | OK | 薄 CLI 适配层：参数解析 → 4 个 action 分派 → 统一异常兜底返回 `{error:{code,message}}` + exit 2。未发现缺陷；`--action cancel` 只打印终态而不落库，属既有设计（与 db 层 `write_canceled_output` 分工不同）。 (S27) |
| `skills_builtin/topic-synthesis-finalize/scripts/topic_synthesis_db.py` | 4231 | 问题 | F1–F7（见下）。 (S27) |
| `skills_builtin/update-topic-synthesis-prepare/scripts/gate.py` | 127 | OK | 与 finalize 的 gate.py 逐行相同，薄适配层，无额外缺陷。 (S27) |
| `skills_builtin/update-topic-synthesis-prepare/scripts/topic_synthesis_db.py` | 4231 | 问题 | 与上表 topic-synthesis-finalize 副本逐行相同（同 4231 行，文本一致），F1–F7 同样适用，行号相同；修复需同时落到两份生成物/其生成器。 (S27) |
| `skills_src/literature-deep-reading/renderer/render_literature_deep_reading_skill.ts` | 169 | 问题 | F8、F9（见下）；另见文件级存疑（`npx tsx` 依赖、frontmatter 定界符未找到时静默不加 notice）。 (S27) |
| `skills_src/literature-deep-reading/renderer/templates/citation-graph-standalone.css` | 231 | OK | 纯样式；所有 `var()` 均带 fallback，未发现缺陷 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/citation-graph-standalone.js` | 1 | OK | 压缩产物；逐一核对 HTML 转义 `h()`、边合并 `k()`、坐标投影 `fe()`、hover 定时器清理，未发现缺陷 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/citation-graph-synthesis-app.js` | 393 | 存疑 | 内嵌 Preact/Sigma/Graphology 压缩库未逐行审阅；产品侧 `Qn` 控制器与 `Ad` 导出入口已读，未见 P1/P2；`ni()` 强制 ready 见存疑栏 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/citation-graph-synthesis-theme.js` | 71 | OK | 主题归一化/回退/DOM 属性写入自洽；storage 事件只 apply 不重发 change（当前无消费者受影响） (S40) |
| `skills_src/literature-deep-reading/renderer/templates/citation-graph-synthesis.css` | 6909 | 问题 | P3 同文件重复定义（见 F3）；`.main{overflow:auto}` 与页面滚动所有权条款疑似冲突，见存疑 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/deep-reading.css` | 1402 | OK | 纯样式 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/deep-reading.js` | 1173 | 问题 | P2 digest outline 锚点失效（见 F1） (S40) |
| `skills_src/literature-deep-reading/renderer/templates/markdown-renderer.css` | 128 | OK | 纯样式 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/markdown-renderer.js` | 434 | 问题 | P2 消毒器 URL 属性覆盖不全（见 F2）；负缓存见存疑栏 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/topic-timeline-shared.css` | 567 | OK | 纯样式 (S40) |
| `skills_src/literature-deep-reading/renderer/templates/topic-timeline-shared.js` | 3 | 存疑 | 同年多个 event 共用同一 `left`，标记完全重叠且无法分别交互，见存疑栏 (S40) |
| `skills_src/literature-deep-reading/runtime/deep_reading_runtime.py` | 7429 | 问题 | P1 单行 `$$…$$` 吞掉后续行（F1）；P2 角色覆盖在批次与校验间不一致（F2）、`data-image-src` 绕过自包含校验（F3）、bridge 子进程无超时/取消（F4）；P3 DDL 双份（F7） (S28) |
| `skills_src/topic-synthesis/renderer/render_topic_synthesis_skills.ts` | 915 | 问题 | P3 `copyFileWithHeader` 名实不符（F5）；P3 未知 skill id 静默产出空目标/空边界段（F6） (S28) |
| `skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py` | 127 | 问题 | P3: `--action cancel` 不落库、不写 result（F10） (S68) |
| `skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py` | 4231 | 问题 | P2: 硬编码 `discipline`（F1）、handoff key 不匹配（F2）；P3: 哈希被丢弃 + 全局 artifact 表（F9）、空实现 transcript（F11） (S68) |
| `src/addon.ts` | 76 | OK | 纯类型/构造，无逻辑问题 (S01) |
| `src/backends/displayName.ts` | 23 | OK | managed-local 优先返回受治理本地化名，其余走 configured→id；行为与命名意图一致。 (S03) |
| `src/backends/identity.ts` | 146 | OK | 指纹/ID 生成逻辑自洽；`normalizeManagedLocalBackendId` 实为 trim 直通（命名偏强），无运行期缺陷。 (S03) |
| `src/backends/managementAuth.ts` | 161 | 问题 | P2: 写回只保留 schemaVersion/backends，丢弃其他顶层字段（见 F2）；另与 registry 对同一 pref 存在两套解析/容错语义。 (S03) |
| `src/backends/registry.ts` | 934 | 问题 | P2: 选择路径忽略 `enabled:false`（见 F1）；P3: 死诊断计数器（F3）、错误串正则反解 id（F9）。 (S03) |
| `src/backends/types.ts` | 80 | OK | 类型定义，无逻辑。 (S03) |
| `src/config/defaults.ts` | 44 | OK | 纯常量表，无逻辑。 (S03) |
| `src/dashboard/backendManagerApp.ts` | 694 | 问题 | P2: action-result 按数组下标回写行，行集变化后写错行（见 F1）；message 监听未校验来源（见 NOISE） (S04) |
| `src/dashboard/backendManagerRenderer.ts` | 185 | OK | 五个 managed mount + rAF 滚动恢复；pendingRestoreFrame 取消/清理正确 (S04) |
| `src/dashboard/components/AcpTraceReplayRegion.tsx` | 1172 | OK | 投影/生命周期与 memo 边界一致；250ms 计时器与原生 change 监听器都可清理 (S29) |
| `src/dashboard/components/BackendManagerRegion.tsx` | 1373 | OK | 非阻塞观察：`buildAcpPresetDisplayName` 在 useNpx+isolated 时拼出 `"(npm)(Isolated)"`，疑似逐字沿用 legacy 字符串，未达 finding 门槛 (S29) |
| `src/dashboard/components/BackendRegion.tsx` | 773 | OK | 非阻塞观察：TaskTable 由空态切到有行时 wrap 是新节点而 `[scrollKey]` 未变，滚动位置不回填（影响极小） (S29) |
| `src/dashboard/components/HomeRegion.tsx` | 364 | OK | 文档视图与 running 表均为纯投影；文档滚动位置经 props 回灌 (S29) |
| `src/dashboard/components/MigrationsRegion.tsx` | 662 | 问题 | P2：搜索框完全受控于异步 host 回显，快速输入丢字（见 F1） (S29) |
| `src/dashboard/components/ProductsRegion.tsx` | 1442 | OK | 树构建/折叠/滚动记忆均在本地，签名比较只吃 selection (S29) |
| `src/dashboard/components/RuntimeLogsRegion.tsx` | 952 | 问题 | P2：勾选与 level 切换基于「上次回显」计算，快速连点吞掉前一次（见 F2） (S29) |
| `src/dashboard/components/SkillrunnerAuditRegion.tsx` | 258 | OK | 只读渲染，条形宽度对 max=0 有 `Math.max(…,1)` 兜底 (S29) |
| `src/dashboard/components/SynthesisSidecarRegion.tsx` | 736 | OK | 行复用/签名一致；150ms 防抖 + `lastSentRef` 与外部回显的同步逻辑正确 (S29) |
| `src/dashboard/components/TabBarRegion.tsx` | 109 | OK | — (S29) |
| `src/dashboard/components/WorkflowOptionsRegion.tsx` | 1263 | 存疑 | 需确认：schema（如 `disabled`/`allowCustom`）变化而 `workflowOptionsDraftResetKey` 不变时，`useLayoutEffect(…, [])` 注册的原生 change/blur 会残留在被替换掉的旧 input 上，导致该字段 blur 不再提交（resetKey 只含 selectedWorkflowId/selectedProfi… (S29) |
| `src/dashboard/components/WorkflowSettingsDialogRegion.tsx` | 893 | 问题 | P2：hostOptions 读扁平 `maxConcurrency`、写/发送嵌套 `queue.maxConcurrency`，形状不自洽（见 F3） (S29) |
| `src/dashboard/dashboardApp.ts` | 268 | OK | 投影 memo 键与 effective-selection 回写自洽；message 监听未校验来源（见 NOISE） (S04) |
| `src/dashboard/dashboardChromeRenderer.ts` | 362 | OK | 每区域独立 mount/渲染；null 面板清空各区域；dispose 顺序正确 (S04) |
| `src/dashboard/dashboardDomUtils.ts` | 227 | OK | `escapeHtml` 在本切片内已无调用（可能为其它切片保留）；`execCommand` 返回值未检查（低风险，见 NOISE） (S04) |
| `src/dashboard/dashboardLabels.ts` | 23 | OK | 纯标签解析，未解析 key 回退逻辑正确 (S04) |
| `src/dashboard/dashboardPanelModel.ts` | 1462 | 问题 | P3: migrations 选择集无条件构建（F4）；P3: 未保护的 `new Date().toISOString()`（F5） (S04) |
| `src/dashboard/dashboardTypes.ts` | 102 | OK | 纯类型/DTO 装配 (S04) |
| `src/dashboard/workflowSettingsDialogApp.ts` | 116 | OK | snapshotRevision 语义与旧实现一致；message 监听未校验来源（见 NOISE） (S04) |
| `src/hooks.ts` | 1937 | 问题 | P3：shutdown 步骤定时器未清理（F3）；P3：startup preflight 失败被永久记忆（F4）；存疑：library artifacts 可能经 `onNotify` 与自注册 observer 双重通知（1022-1053 vs 1259） (S01) |
| `src/index.ts` | 30 | OK | 单例守卫 + 全局 getter 定义正确 (S01) |
| `src/jobQueue/manager.ts` | 710 | 问题 | P2: jobs Map 无淘汰（F2）；P2: drain 链无 rejection 分支（F3）；P3: getJob/listJobs 共享 meta 引用（F6） (S04) |
| `src/jobQueue/workflowSubmissionQueue.ts` | 951 | OK | slot admit/yield/resume/settle 计数与索引（pending/backend/identity）逐路径核对一致；`resetForTests` 为 public 测试 seam（见 NOISE） (S04) |
| `src/jobQueue/workflowSubmissionQueueContracts.ts` | 211 | OK | 纯契约类型，无运行期代码 (S04) |
| `src/modules/acp/chat/acpBackendPresets.ts` | 500 | 问题 | P3: isolated 显示名拼接缺空格（见 F7）；`startsWith("acp-"+presetId)` 形式的 id 匹配对当前预设集合无歧义 (S41) |
| `src/modules/acp/chat/acpChatSkillInjection.ts` | 575 | OK | 清单（ownership）先提交、后复制、失败回滚目标集合，order 正确；stale 清理只对非 desired root 生效；诊断经注入 host (S41) |
| `src/modules/acp/chat/acpChatTranscriptMirror.ts` | 792 | 问题 | P2: 分页 limit 归一化可产出 NaN（见 F6）；边界分类走协议级分类器，未见 backend/provider 特判 (S41) |
| `src/modules/acp/chat/acpChatWorkspaceDataPlane.ts` | 645 | OK | change 构建用 `splice(0)` 消费事件（消费语义，需调用方保证 listener 不抛）；diagnostics 只取 tail 12 (S41) |
| `src/modules/acp/chat/acpChatWorkspaceEmissionFacade.ts` | 55 | OK | 纯注册点；未注册时由 `requireAcpChatWorkspaceEmission` 显式抛错 (S41) |
| `src/modules/acp/chat/acpChatWorkspaceSurface.ts` | 568 | OK | kind→publication 映射覆盖全部 14 个 kind（`satisfies Record` 保证）；transcript-append 受 displayMode 过滤 (S41) |
| `src/modules/acp/chat/acpContextBuilder.ts` | 106 | OK | reader 分支依赖 `Zotero_Tabs._getTab` 私有 API，缺失时降级为空上下文，不抛错 (S41) |
| `src/modules/acp/chat/acpConversationStore.ts` | 983 | 问题 | P2: 目录删除 fire-and-forget（F3）、id 直接拼路径（F4）、每后端全量扫描（F8） (S41) |
| `src/modules/acp/chat/acpConversationTranscriptStore.ts` | 102 | 问题 | P2: 两类 item 形状共用同一 store，仅靠 `as unknown as` 断言桥接（F5） (S41) |
| `src/modules/acp/chat/acpModelOptionFolding.ts` | 500 | 存疑 | provider 解析用「最后一个 `/` 或 `:`」启发式，含 `:` 的非 provider 前缀 id 会把整个选择器切到 provider 模式；需确认各 agent 实际 model id 形态 (S41) |
| `src/modules/acp/chat/acpReasoningEffortFallback.ts` | 64 | OK | kilo 的 -32602+"effort" 文本特判是本切片唯一 provider 特例，且经 reason 文本匹配，脆弱但被显式隔离为 fallback 结果 (S41) |
| `src/modules/acp/chat/acpSessionConfigOptions.ts` | 495 | OK | `reasoningSource==="none"` 时仍可能由 observed current 注入单个 effort 选项，调用方按 source 判定，未见误用 (S41) |
| `src/modules/acp/chat/acpSessionManager.ts` | 3987 | 问题 | P2: 删除会话不清 persist 定时器导致复活（F1）；prune 运行时时顺带清空该后端全部会话数据（F2） (S41) |
| `src/modules/acp/chat/acpSidebarModel.ts` | 239 | OK | 纯投影；仅 plan 项有嵌套数组，其余浅拷贝可接受 (S41) |
| `src/modules/acp/diagnostics/acpAuditAppendCore.ts` | 140 | OK | 缓冲写入键/owner 映射与 flush/discard 语义一致；TextEncoder 每次 append 新建属微优化，未达 finding 门槛。 (S42) |
| `src/modules/acp/diagnostics/acpBackendRefreshCacheDiagnostic.ts` | 4169 | OK | 逐路径读完主要探针逻辑（base64/PowerShell 引号/路径处理正确）；embedded 探针脚本为模板，略读。大量 `compact*` 序列化属同 shape 重复，仅记录不报。 (S42) |
| `src/modules/acp/diagnostics/acpChatDiagnosticAuditTrail.ts` | 170 | OK | owner 丢弃集 + 调试门控逻辑自洽；`discardedOwners` 理论可随会话数增长，规模有限，不作 finding。 (S42) |
| `src/modules/acp/diagnostics/acpDiagnosticRouter.ts` | 51 | OK | 日志与审计 sink 均 try/catch 包裹，不污染执行流。 (S42) |
| `src/modules/acp/diagnostics/acpDiagnostics.ts` | 213 | OK | 证据投影/脱敏/错误序列化逻辑完整；`safeJson` 有兜底。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeDiagnosticsMode.ts` | 29 | OK | 单模式全局互斥，acquire/release 对称。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimePerformanceBaseline.ts` | 466 | 问题 | P3：`BYTE_METRICS` 漏列 `semantic_event_bytes`（见 F3）。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimePerformanceProfiler.ts` | 915 | 存疑 | `recordPublicationLifecycle` 对 shell_forward/child_apply/render_ack 提前返回 false 会丢弃这些计数（见「存疑」）。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayController.ts` | 440 | OK | 运行态互斥、completion promise、取消传播均正确；视图克隆为浅拷贝但无可达缺陷。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayIdentity.ts` | 116 | OK | phase 校验、slug、artifact stem 唯一性正确。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayLogicalTime.ts` | 157 | OK | 逻辑时钟批处理/释放语义自洽。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayProductionPorts.ts` | 522 | OK | 生产端口实现与接口一致；R2 合成负载计数与校验常量对应。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayProfileContext.ts` | 24 | OK | 简单上下文持有，拷贝隔离。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayProfiler.ts` | 1619 | OK | 矩阵状态机、phase provenance、acceptance 规则读毕；硬编码 33/536/8 为对合成负载的守护常量。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayPublicationSidecar.ts` | 421 | 问题 | P3：`inspectCurrent` 中存在不可达分支（见 F4）。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeReplayTargets.ts` | 415 | 问题 | P2：连接失败路径泄漏 adapter factory 注册（见 F2）。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeSemanticTrace.ts` | 275 | OK | NDJSON 完整性/摘要重算与 recorder 写出口径一致。 (S42) |
| `src/modules/acp/diagnostics/acpRuntimeSemanticTraceRecorder.ts` | 747 | 问题 | P2：shutdown 丢弃未决 finishWaiters 导致挂起（见 F1）。 (S42) |
| `src/modules/acp/skillRun/acpAgentFamilyResolver.ts` | 279 | OK | 家族推断/技能根归一化；`normalizeAcpProjectSkillRoot` 显式拒绝绝对路径、盘符与 `..`，信任边界正确。 (S44) |
| `src/modules/acp/skillRun/acpPermissionQueue.ts` | 52 | OK | FIFO 队列语义清晰；重复 requestId 直接 resolve(cancelled)。 (S44) |
| `src/modules/acp/skillRun/acpRuntimeDependencyWrapper.ts` | 491 | OK | uv/system-python 探测与包装；Python 探测脚本用 `JSON.stringify` 嵌入，未发现可注入通道。 (S44) |
| `src/modules/acp/skillRun/acpRuntimePromptTemplates.ts` | 142 | 问题 | P3：与 acpSkillPatchTemplates.ts 大段重复（见 F7）。 (S44) |
| `src/modules/acp/skillRun/acpSharedSkillCatalog.ts` | 223 | 问题 | P2：复用分支下 resourceManifest 绝对路径来自源目录（见 F3）。 (S44) |
| `src/modules/acp/skillRun/acpSkillMaterializer.ts` | 109 | 存疑 | 本地 `readJsonFile` 无 try/catch，runner.json 缺失/损坏即抛错，而 acpThinProxySkillMaterializer 的同名函数容错返回 `{}`；需确认“请求技能缺 runner.json”是否应 fail-fast。 (S44) |
| `src/modules/acp/skillRun/acpSkillOutputConvergence.ts` | 210 | OK | JSON 候选提取与 `__SKILL_DONE__` 分支判定符合契约。 (S44) |
| `src/modules/acp/skillRun/acpSkillOutputValidator.ts` | 188 | 问题 | P2：相对 artifact 路径保留 `..`，可越出 workspaceDir（见 F1）。 (S44) |
| `src/modules/acp/skillRun/acpSkillPatchTemplates.ts` | 162 | 问题 | P3：模板加载/渲染逻辑与 acpRuntimePromptTemplates.ts 重复（见 F7）。 (S44) |
| `src/modules/acp/skillRun/acpSkillReferenceRewriter.ts` | 159 | 问题 | P3：`./assets/x` 形态既不改写也不告警（见 F6）。 (S44) |
| `src/modules/acp/skillRun/acpSkillResourceManifest.ts` | 67 | OK | 纯投影，`runtimeTreeManifest` 优先级导致的问题源自调用方（见 F3）。 (S44) |
| `src/modules/acp/skillRun/acpSkillResultFileFallback.ts` | 158 | OK | 候选按 mtime/深度/字典序选择，多候选有告警；逻辑自洽。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunActions.ts` | 1100 | 存疑 | `cancelAcpSkillRun` 只 unregister run controller，未 `unregisterAcpSkillRunSetupController`（shutdown 路径有做）；且 cancel 设置 `removedAt` 使其从默认列表消失，需确认语义。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunAuditTrail.ts` | 723 | 存疑 | `append*` 系列受 `shouldWriteDetailedAcpAuditArtifacts()` 门控，但 `writeAcpSkillRunAuditPrompt/StderrTail/RuntimeLogs/FinalState` 无门控且 prompt 无条件写入 runtimeDir；与 README“debug-only”描述存在漂移，需确认是否有意。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunControllerRegistry.ts` | 108 | OK | null 注册走统一清理（计时器/权限队列）；setup controller 身份校验正确。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunExecutionSupport.ts` | 1275 | OK | 硬超时监视器 pause/resume/triggered 语义自洽；MCP 预检、运行时选项解析未见缺陷。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunForeground.ts` | 98 | OK | 仅 `void` 触发 selection/sidebar（潜在 unhandled rejection，影响低）。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunHosts.ts` | 126 | OK | 叶子模块 host 槽，避免 store/host 循环 TDZ，设计正确。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunInteractionFiles.ts` | 313 | OK | 分阶段 staging + 临时目录失败清理 + in-flight 去重；文件名净化/冲突处理完整。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunPayloadStore.ts` | 166 | 问题 | P3：run-context.json 读-改-写无串行化（见 F8）。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunPermissionFacade.ts` | 29 | OK | 单处理器注册，语义单一。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunPermissionQueue.ts` | 314 | OK | stale 清理与 active 匹配逻辑完备，非法 resolve 抛错。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunPersistence.ts` | 1279 | 问题 | P3: 软持久化 flush 不清 timer/记录（F4）；P3: invalidate hydration 不解除订阅（F3）；另 `lastPersistedEventIds` 无删除路径（会话内单调增长） (S43) |
| `src/modules/acp/skillRun/acpSkillRunPromptBuilder.ts` | 326 | OK | 按 family 选择引擎目录/指令文件/调用行；Hermes 分支单独处理。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunRecovery.ts` | 2358 | 问题 | P2: 早期失败路径泄漏 setup controller 注册（F1）；P3: 取消被记为 recovery failed（F5） (S43) |
| `src/modules/acp/skillRun/acpSkillRunRequestAdapter.ts` | 140 | OK | upload_files/绝对路径/相对上传路径校验完整。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunRuntimeCatalog.ts` | 86 | OK | 归一化 + 变更发射，无副作用泄漏。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunState.ts` | 54 | OK | 共享可变状态集中，注释与代码一致。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunStatus.ts` | 112 | OK | 终态/可恢复判定为纯函数，边界清晰。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunStore.ts` | 2085 | OK | 未发现独立缺陷；仅作为 F4 的删除调用方参与（flush→delete 顺序） (S43) |
| `src/modules/acp/skillRun/acpSkillRunTaskProjection.ts` | 78 | OK | 纯投影，字段默认值合理。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunTranscriptMirror.ts` | 1439 | OK | 未发现缺陷；`readFullTranscript` 在非 live 模式下每次分页读都全量扫读属既有设计（存疑点见 NOISE） (S43) |
| `src/modules/acp/skillRun/acpSkillRunTranscriptStore.ts` | 996 | 问题 | P2：`transcriptIndexStates` 无淘汰，跨 run 无界增长（见 F4）。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunWorkspaceDataPlane.ts` | 759 | 存疑 | `emitWorkspaceChanged` 同步遍历监听器且无 try/catch，某监听器抛错会中断后续监听并回灌到调用方（store/selection）链路；需确认监听器是否保证不抛。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunWorkspaceSelection.ts` | 54 | OK | owner-first：先写 selected 再 prune 再 emit。 (S44) |
| `src/modules/acp/skillRun/acpSkillRunnerOrchestrator.ts` | 3219 | 问题 | P2: 等待用户回复期间被 interrupt 会把 run 置为 failed（F2） (S43) |
| `src/modules/acp/skillRun/acpSkillRunnerWorkspace.ts` | 237 | OK | 复用/新建命名空间分配与扫描一致。 (S44) |
| `src/modules/acp/skillRun/acpSkillSchemaAssets.ts` | 571 | 存疑 | parameter 分支用原始 `requestParameter` 做 AJV 校验，而返回的 `parameterContext` 已被 `properties` 过滤（input 分支则校验过滤后的 `inputContext` 并对未知键报错）；不一致是否有意需确认。 (S44) |
| `src/modules/acp/skillRun/acpSkillsWorkspaceSurface.ts` | 608 | 存疑 | details DTO 内 `collapsed` 为静态字面量，需确认 UI 是否把它当作折叠状态来源（每次 run 变更重读会重置） (S43) |
| `src/modules/acp/skillRun/acpStartupPromptPreambles.ts` | 81 | OK | 模板必需占位符校验到位。 (S44) |
| `src/modules/acp/skillRun/acpThinProxySkillMaterializer.ts` | 563 | 问题 | P2：full-snapshot 分支复制前不清理 targetDir（见 F2）；P3：runner.json 每 root 重复读（见 F5）。 (S44) |
| `src/modules/acp/transport/acpBackendProbe.ts` | 423 | 问题 | P2: 超时后 adapter 仍可能存活于临时目录；见 F4 (S45) |
| `src/modules/acp/transport/acpClientConnection.ts` | 449 | 问题 | P2: `close()` 与 `sendMessage` 的 writer 竞争/`closed` 语义；见 F3、F5 (S45) |
| `src/modules/acp/transport/acpConnectionAdapter.ts` | 2134 | 问题 | P1: 权限请求无取消通道；P2: 会话状态与 `latestConfigOptions` 全局单值；见 F1、F6、F7 (S45) |
| `src/modules/acp/transport/acpExecutionProgress.ts` | 192 | 问题 | P2: 模块级全局 Map 无上限且无 TTL；见 F9 (S45) |
| `src/modules/acp/transport/acpMessageStream.ts` | 206 | 问题 | P2: 单次 `read()` 无界解析 + `waiting` 无背压；见 F8 (S45) |
| `src/modules/acp/transport/acpNpxLaunchCache.ts` | 334 | 问题 | P2: `rotate()` 未持有 lease 之外的互斥；见 F10 (S45) |
| `src/modules/acp/transport/acpPermissionOptions.ts` | 54 | OK | — (S45) |
| `src/modules/acp/transport/acpSilentTerminalAssistantCollector.ts` | 51 | OK | — (S45) |
| `src/modules/acp/transport/acpSyntheticConnectionAdapter.ts` | 207 | 问题 | P2: `resolvePermission` 不 resolve 真实挂起 Promise；见 F11 (S45) |
| `src/modules/acp/transport/acpTranscriptBoundary.ts` | 77 | OK | 与 AGENTS.md “不得把 tool_call_update/usage 当硬边界”一致 (S45) |
| `src/modules/acp/transport/acpTransport.ts` | 2604 | 问题 | P1: `waitForPromiseWithTimeout` 定时器泄漏 / Mozilla stderr 双读；见 F2、F12 (S45) |
| `src/modules/acp/transport/acpWebSocketBridgeService.ts` | 461 | 问题 | P2: 全局单例桥接未随会话/插件卸载回收；见 F13 (S45) |
| `src/modules/acpProtocol.ts` | 357 | OK | 纯协议常量/类型 + JSON-RPC 判定与 `RequestError`；未发现运行期缺陷 (S07) |
| `src/modules/acpTypes.ts` | 559 | OK | 类型与 normalize/clone 辅助；分支覆盖完整 (S07) |
| `src/modules/assistant/publication/assistantExecutionDisplayPolicy.ts` | 128 | OK | 观察者注册/注销与 listeners.size 联动正确；重复 notify 被 lastKnownMode 去重；fallback（assistantStreamingRenderEnabled===false → boundary）语义自洽。 (S46) |
| `src/modules/assistant/publication/assistantMessageCounts.ts` | 117 | OK | 计数归一化有界（NaN/负数→0），begin/finish/increment 均原地改 owner state；finish 非 active 时静默返回 false，与「幂等结束」一致。 (S46) |
| `src/modules/assistant/publication/assistantTranscriptMirrorStore.ts` | 817 | 问题 | P2: transcriptItemCount 与 transcriptItemIds 分离维护导致计数漂移（F3）。存疑：`resetAssistantTranscriptMirror` 不清 `transcriptMirrorLoaded`/`transcriptItemCount`（L254-266），forceRelease 后 `shouldSkipHydrate` 默认走 loade… (S46) |
| `src/modules/assistant/publication/assistantTranscriptPageProjection.ts` | 87 | OK | 分页钳制（min(1,max)）、cursor/prev/next 边界正确；隐藏 streaming 项只在非 live 模式生效。import 语句置于文件末尾（类型导入被提升，无运行期影响）。 (S46) |
| `src/modules/assistant/publication/assistantTranscriptRenderingPreference.ts` | 15 | OK | 默认开启、setter 回读一致；无观察者，属局部 UI 偏好。 (S46) |
| `src/modules/assistant/publication/assistantWorkspacePublication.ts` | 1858 | 问题 | P2: permission 投影对畸形 options 抛 TypeError（F4）。另：owner 断言中 acp-chat/acp-skills 分支缺 `assertExactObjectKeys`（L1289-1305），与 skillrunner 分支（L1307-1311）严格度不一致，属判断性收紧点，未单列 finding。 (S46) |
| `src/modules/assistant/publication/assistantWorkspacePublicationCoordinator.ts` | 574 | 问题 | P2: rebasePending 单向后无法自愈 + `void` 化回调未接错误（F2）。存疑：page-request 快照分支（L184-198）不更新 `state.page`/projection，之后 flush 的 delta 携带旧 page 元数据，需确认侧栏是否以 pageKey 不匹配即回退 rebase。 (S46) |
| `src/modules/assistant/publication/assistantWorkspacePublicationLabels.ts` | 242 | OK | 纯标签投影；skillrunner 与 acp-skills 两分支近似重复（~30 行/处），属可维护性判断项，未列为缺陷。 (S46) |
| `src/modules/assistant/publication/assistantWorkspacePublicationRuntime.ts` | 1112 | 问题 | P1: 在飞 flush 期间入队的 lane 可能永久滞留（F1）。 (S46) |
| `src/modules/assistant/publication/assistantWorkspaceTranscriptPublication.ts` | 686 | OK | 解析器 key 精确校验 + cursor/limit 归一化充分；累加器字节/条数上限溢出后整批丢弃并交给 rebase 兜底；投影状态机（held/soft-side-channel/hard-boundary）与 cardinality delta 一致。 (S46) |
| `src/modules/assistant/workspace/assistantPanelLabels.ts` | 666 | OK | 纯本地化标签表（单一 builder、无分支/状态）；核对无同对象内重复键，跨对象复用 dashboard/workflow 既有键属有意共享。 (S47) |
| `src/modules/assistant/workspace/assistantSidebarViewModel.ts` | 182 | 存疑 | `panes[tab].active` 取 `args.full`，其余 pane 取 `activeTab === tab`，同一字段两种语义；且未收到 ownerKey/selectedOwnerKey，无法判定 `full ⇔ tab===activeTab` 不变式是否成立（见 NOISE）。 (S47) |
| `src/modules/assistant/workspace/assistantWorkspaceActionRouter.ts` | 1098 | OK | 注册表（action×source×payloadKeys）→ scope/owner 存在性 → 选中 owner 三段校验顺序正确；`actionPayload` 用 owner 身份覆盖 child payload，身份不可被 child 伪造。无来源 envelope 走 legacy 回退分支（注释标注有意保留），会绕过 payloadKeys 校验，属同一 iframe 内契约软化而… (S47) |
| `src/modules/assistant/workspace/assistantWorkspacePublicationHost.ts` | 1234 | OK | 生命周期/基线 init/ack 归并逻辑自洽；`flushScheduledWorkspacePost` 内 `postSnapshotForTab` 未 await 也未 `void`（浮空 promise），判断为低风险（initialize 失败已有 `onInitializationFailed` 吸收），未升为 finding。 (S47) |
| `src/modules/assistant/workspace/assistantWorkspaceSidebar.ts` | 2069 | 问题 | P2：mountLibraryPane/mountReaderPane 在 Zotero sidenav 上注册的 capture 监听器在 `removeAssistantWorkspaceSidebarShell` 中从不移除（F2）。另：`snapshotRevision` 声明后从未递增（死状态）。 (S47) |
| `src/modules/assistant/workspace/assistantWorkspaceSurfaceSkeleton.ts` | 213 | 问题 | P2：`mapWorkspaceChangeKindsToPublicationKinds` 对未映射 kind 会产出 `undefined` 元素（F3）。`createWorkspaceOwnerControl` 注释称“8-field block”，实际 9 个字段（注释漂移）。 (S47) |
| `src/modules/backgroundRefreshGovernance.ts` | 125 | OK | 注册表 + 诊断环形缓冲（上限 500），normalize 校验 owner/allowedDataSources；仅登记不施加 `minimumIntervalMs`（本文件亦无调用点，无法判定是缺陷）。 (S08) |
| `src/modules/bufferedWriteCoordinator.ts` | 354 | 问题 | P2：sink 失败被静默吞掉且不再自动重试（见 F2）。 (S08) |
| `src/modules/dashboard/dashboardActions.ts` | 1536 | 问题 | P2: 工作流设置保存失败不上报（F1）；P2: 批量删除产品无错误处理/部分提交（F2）；P2: 反馈导出失败提示文案误用日志复制文案（F3）；P3: 剪贴板写入逻辑复制 4 份且失败静默（F5）；P3: 与 dashboardSnapshot 重复声明 23 个状态字段（F7） (S30) |
| `src/modules/dashboard/dashboardFrame.ts` | 220 | 问题 | P3: 特权 action 通道的 message 监听未校验 event.source/origin（F4）；其余（frame 复用、management mount 幂等、cleanup）细读未见缺陷 (S30) |
| `src/modules/dashboard/dashboardRuntime.ts` | 919 | 问题 | P3: 合成诊断订阅与 cleanup 竞态（F6）；refresh 去抖/链式串行、periodic 门禁逻辑细读未见缺陷；save-state 跳表是 F1 的放大条件 (S30) |
| `src/modules/dashboard/dashboardSnapshot.ts` | 2642 | 存疑 | 无已证实缺陷；需确认两点：`logSummary.facets.backendIds.sort()` / `workflowIds.sort()` 是否原地排序共享数组（F 存疑-1）；`activeRun` 与 `activeRunId` 语义不对齐是否有意（F 存疑-2） (S30) |
| `src/modules/dashboardActiveTasks.ts` | 151 | OK | scope 过滤 + acp-skill-run 去重 + updatedAt 倒序；`filterDashboardActiveTasks` 只是 `projectDashboardActiveTasks` 的别名（名/行为略不符，非缺陷）。 (S08) |
| `src/modules/dashboardHost.ts` | 138 | 存疑 | 对话框存活期间 `externalSelectTab?.()` 为可选链，runtime 未 ready 时二次打开的 tab 选择被静默丢弃；需确认是否要求“后到为准”。 (S08) |
| `src/modules/dashboardToolbarButton.ts` | 423 | OK | 插入锚点与移除路径对称；popover 安装/卸载成对 (S07) |
| `src/modules/debugMode.ts` | 168 | 存疑 | `DEBUG_MODE_OVERRIDE_KEY` 只写不读（本切片内无读者）；需确认是否供切片外测试读取。其余 define/global 兜底逻辑自洽。 (S08) |
| `src/modules/diagnosticVerbosity.ts` | 72 | OK | 仅 verbose 开启时输出；时间/环境读取无副作用。 (S08) |
| `src/modules/guardedSqlite.ts` | 234 | 问题 | P2：`configureBusyTimeout` 失败泄漏 ownerCount，连接永不关闭（F1） (S07) |
| `src/modules/harness/assistantReadonlyPublication.ts` | 1966 | 问题 | P2: ackRoutes 无界增长（F2）；其余只读投影逻辑与生产 DTO 语义一致 (S31) |
| `src/modules/harness/backendsReadonly.ts` | 168 | OK | 只读 prefs 解析，错误累计到 errors/invalidBackends，未发现缺陷 (S31) |
| `src/modules/harness/dashboardReadonlyModel.ts` | 1071 | 问题 | P2: normalizeProduct 的 backendType 回退到 row.backendId（F1）；snapshot 有副作用但属 harness 设计 (S31) |
| `src/modules/harness/env.ts` | 66 | OK | 仅解析白名单 PATH_KEYS；引号/注释处理未见可达缺陷 (S31) |
| `src/modules/harness/pluginStateReadonly.ts` | 435 | OK | safeRows 吞错返回 []（只读诊断场景），未构成缺陷 (S31) |
| `src/modules/harness/prefsReadonly.ts` | 76 | OK | 覆盖 prefs.get，set/clear 抛错，符合只读意图 (S31) |
| `src/modules/harness/skillRunnerReadonlyProjection.ts` | 455 | 问题 | P3: stateSemantics 恒等三元（F6）；其余投影字段与生产 run store 对齐 (S31) |
| `src/modules/harness/sqliteReadonly.ts` | 200 | 问题 | P3: 每次打开整库 backup 到 tmp（F10）；SQL 白名单仅浅层判定但写保护实测由 readOnly 连接兜底 (S31) |
| `src/modules/harness/synthesisReadonlyClient.ts` | 65 | OK | close 幂等，失败路径均释放 hostReadPort/database (S31) |
| `src/modules/harness/synthesisReadonlyPort.ts` | 847 | 问题 | P2: topicPage.next_cursor 无对应翻页实现（F4） (S31) |
| `src/modules/harness/synthesisWorkbenchI18nEnvelope.ts` | 141 | OK | 缓存按 rootDir+locale 有界；FTL 续行处理未污染相邻键 (S31) |
| `src/modules/harness/zoteroReadonlyLibraryAdapter.ts` | 544 | OK | locatorEntries 随扫描累积（会话内小量，未单列 finding）；分页/游标校验完整 (S31) |
| `src/modules/helpCenterTab.ts` | 317 | 问题 | P3：消息监听在 `frameWindow` 未就绪时跳过来源过滤（见 F4）。 (S08) |
| `src/modules/hostBridge/cli/hostBridgeCliInjection.ts` | 360 | OK | 密钥只经 env/`tokenEnv` 传递，profile/README 不落 token；grant 在写入失败时回滚。shim 模板与 installer 重复（见 F5）。 (S47) |
| `src/modules/hostBridge/cli/hostBridgeCliInstallPrompt.ts` | 398 | 问题 | P2：先执行待校验的目标二进制读版本、后比对摘要，自报版本可抑制重装（F1）。 (S47) |
| `src/modules/hostBridge/cli/hostBridgeCliInstaller.ts` | 715 | 问题 | P3：`sha256Bytes`/shell shim 模板与另外两个 CLI 模块逐字重复（F5）。另：`defaultPathIncludes` 无视注入的 `pathEnv`，与 `resolveHostBridgeCliInstallTarget` 读取同源信息却不同源（可测试性不一致）。 (S47) |
| `src/modules/hostBridge/cli/hostBridgeCliResolver.ts` | 217 | 存疑 | `resolveRuntimePlatform` 只从 `process.arch` 取架构，缺省回落 `"x64"`，无 `Services.appinfo` 类回退；在 arm64 且无 `process` 的环境会静默挑错平台二进制，需确认主窗口是否暴露 `process.arch`。 (S47) |
| `src/modules/hostBridge/cli/hostBridgePluginSkillBundle.ts` | 371 | 存疑 | staging→backup→root→receipt 顺序正确、校验严密；但 `promoted=true` 后 receipt 写入失败时既不回收 `backup` 目录，又返回 `ok:false`（bundle 实际已发布），需确认调用方是否容忍该组合状态。 (S47) |
| `src/modules/hostBridge/cli/hostBridgeProfileStore.ts` | 157 | 问题 | P2：chmod 失败仍返回 `ok:true`，token 文件可能保留默认权限（F4）。 (S47) |
| `src/modules/hostBridge/cli/hostBridgeSkillRunnerEnv.ts` | 305 | OK | local/remote 分流、LAN+pinned port+非 loopback 三道门禁齐全，无绕过路径发现；`advertisedHost` 若为未加方括号的 IPv6 字面量，`buildEndpoint` 会生成非法 URL（检测函数在切片外，未证实可达，故不列 finding）。 (S47) |
| `src/modules/hostBridge/mcp/zoteroMcpProtocol.ts` | 1502 | 问题 | P1 broker 错误投影丢失 code/retryable/details（F1）；审批拒绝响应形态不一致（F9） (S48) |
| `src/modules/hostBridge/mcp/zoteroMcpServer.ts` | 2656 | 问题 | P2 JSON-RPC batch 被当作单工具做 admission/circuit（F3）；descriptorStale 只置位不清理（F5）；超时分支遗漏控制信号清理（F8） (S48) |
| `src/modules/hostBridge/permissions/acpConversationHostBridgePermissionRegistry.ts` | 57 | 问题 | P2 同一 conversation 并发审批会覆盖 handler，旧请求只能等超时（F2） (S48) |
| `src/modules/hostBridge/permissions/hostBridgePermissionManager.ts` | 649 | 问题 | P2 parseHostBridgePermissionScope 丢弃 connectionMode，导致 auto-approval 在 wire 路径永不生效（F4）；P3 permissionProjections 无界增长（F7） (S48) |
| `src/modules/hostBridge/permissions/hostBridgeWriteAutoApprovalRegistry.ts` | 110 | 问题 | P2 参与 F4：registry 要求 scope.connectionMode === "local"，但解析路径永不产生该字段 (S48) |
| `src/modules/hostBridge/permissions/skillRunnerHostBridgePermissionRegistry.ts` | 141 | 问题 | P2 仅凭 runRequestId 解析时会选中最早 resolver，而不是当前 pending，可能批准错误请求（F6） (S48) |
| `src/modules/hostBridge/server/hostBridgeAdvertisedHostDetection.ts` | 231 | 问题 | P2: advertised host 校验过宽（F8）；fetch 无超时/AbortSignal（F10） (S49) |
| `src/modules/hostBridge/server/hostBridgeAuth.ts` | 314 | 问题 | P1: 无效 token 触发 PBKDF2 100k 派生（F2）；P3: envelope.iterations/kdf 未被校验/使用（F11） (S49) |
| `src/modules/hostBridge/server/hostBridgeCapabilityContract.ts` | 309 | 问题 | P2: 运行时改写导入的 JSON 契约，SSOT 分裂（F5） (S49) |
| `src/modules/hostBridge/server/hostBridgeFileRegistry.ts` | 530 | 问题 | P2: 上传临时文件只删句柄不删磁盘（F3）；contentType 未净化，是否可达需确认 (S49) |
| `src/modules/hostBridge/server/hostBridgeMutationAdapter.ts` | 176 | 问题 | P3: 主错误存在时清理错误被静默丢弃（F9） (S49) |
| `src/modules/hostBridge/server/hostBridgeNotificationInbox.ts` | 423 | 存疑 | `pruneHostBridgeNotificationInbox` 为空实现，需确认调用方是否依赖其清理 (S49) |
| `src/modules/hostBridge/server/hostBridgeOperationStore.ts` | 226 | OK | — (S49) |
| `src/modules/hostBridge/server/hostBridgePagination.ts` | 287 | 问题 | P2: UTF-16 切片可能截断代理对（F6）；cursor 无签名，TTL 可被绕过（存疑） (S49) |
| `src/modules/hostBridge/server/hostBridgeProtocol.ts` | 374 | 问题 | P3: 与 capability contract 重复定义 capability entry，字段命名漂移（F12） (S49) |
| `src/modules/hostBridge/server/hostBridgeRouteContract.ts` | 19 | OK | — (S49) |
| `src/modules/hostBridge/server/hostBridgeServer.ts` | 1944 | 问题 | P1: 鉴权前读满请求体且连接无上限（F1）；P2: 文件响应 operation 记为 unknown（F4）；P2: rotate 忽略 profile 写入结果（F7） (S49) |
| `src/modules/hostBridge/server/hostHttpRequestReader.ts` | 656 | 问题 | 见 F1：默认 16MB body 在鉴权前生效；无独立发现 (S49) |
| `src/modules/hostBridge/server/routes/hostBridgeCapabilityRoutes.ts` | 691 | 存疑 | `capabilityAdmission` 解析失败时降级为 `read`（畸形 JSON 的写能力会占 read admission），但随后必 400 失败；是否有意为之需确认 (S68) |
| `src/modules/hostBridge/server/routes/hostBridgeDiagnosticsRoutes.ts` | 303 | 问题 | P3: profile inspect 未捕获 cursor 错误（F6） (S68) |
| `src/modules/hostBridge/server/routes/hostBridgeFileRoutes.ts` | 181 | 存疑 | `recordSuccessfulDownload()` 在响应构建之前调用（F? 见存疑），流式写出失败时计数已置位 (S68) |
| `src/modules/hostBridge/server/routes/hostBridgeSynthesisRoutes.ts` | 226 | 存疑 | 调用 `synthesis.operation.get` 传 `{operation_id}`（snake_case），同文件其它 DTO 用 camelCase；需确认 capability 契约字段名 (S68) |
| `src/modules/hostBridge/server/routes/hostBridgeWorkflowActivityRoutes.ts` | 1944 | 问题 | P2: ack 未包 try（F3）、renew/abandon 未传 scope（F5）；P3: notification limit 无上限（F8）；skill-run events 的 `limit` 被 1000 覆盖（存疑，见说明） (S68) |
| `src/modules/hostBridge/server/runtimeHttpResponse.ts` | 458 | 存疑 | `contentType` 直接拼入响应头，需确认 upload 路径是否传入客户端 Content-Type (S49) |
| `src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts` | 731 | 问题 | P3: 整个 bundle 一次性读入内存打包，选择集无数量/字节上限（见 F6） (S50) |
| `src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts` | 415 | 问题 | P3: 每次读记录都做全 domain 扫描清理；启动恢复为 O(n²)（见 F10） (S50) |
| `src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts` | 3569 | 问题 | P2: runs 列表 N+1/平方级（F2）；通知投影无刷新入口（F4）；apply 结果不去重可重复导入（F9）。存疑：权限决策 outcome 未在调用点校验（F1 见 NOISE） (S50) |
| `src/modules/hostBridge/workflow/hostBridgeWorkflowResources.ts` | 834 | 问题 | P2: 输出分配跨 slot 同路径冲突（F1）；P3: releaseResources 透传非 materialized ref 必抛（F5） (S50) |
| `src/modules/hostBridge/workflow/researchBundleService.ts` | 2921 | 问题 | P3: commitGroup 内取消错误被改写成 execution_failed/rolled_back（F7）。导出侧限制与清理逻辑整体自洽 (S50) |
| `src/modules/hostBridgeCapabilityRegistry.ts` | 3052 | 问题 | P2: 调用方可控的 topicId 直接拼进落盘文件名（F1）；存疑见 F1 备注与下方「存疑」项 (S06) |
| `src/modules/libraryArtifactsColumn.ts` | 362 | 问题 | P2：缓存清理与在途扫描竞态，清理后仍写入过期状态（F5） (S07) |
| `src/modules/literatureArtifactMigration.ts` | 1924 | 问题 | P2：host 契约字段 `candidateIds` 被生产 adapter 静默忽略（F3）；P3：清理谓词重复两份（F6） (S07) |
| `src/modules/literatureArtifactMigration/converter.ts` | 1318 | 问题 | P2(判断): 32 位 FNV 作为 basisHash（F9）；其余归一化/冲突判定逻辑自洽 (S31) |
| `src/modules/markdownAttachmentOpenProbe.ts` | 176 | OK | monkeypatch 有幂等与还原；异常回落到原始 `open`，可接受。 (S08) |
| `src/modules/markdownAttachmentTab.ts` | 717 | OK | 桥接安装前有 frame URL 校验；定时器在 close/load 均被清理 (S07) |
| `src/modules/notificationHub.ts` | 309 | 问题 | P3：`suppressionWindowMs: 0` 被 `//` 吞掉，无法关闭抑制（见 F3）。 (S08) |
| `src/modules/packagedAssetResolver.ts` | 357 | 存疑 | `normalizeRelativePath` 不处理 `..`，需确认调用方是否只传内部常量（见 NOISE） (S07) |
| `src/modules/pluginStateStore.ts` | 1125 | OK | 初始化/迁移为同步事务；错误详情只含 paramKeys，不泄漏值 (S07) |
| `src/modules/pluginStateStore/core.ts` | 70 | OK | 类型与 normalize 工具，测试 seam 走 Symbol.for 全局注册表 (S31) |
| `src/modules/pluginStateStore/literatureMigrationTables.ts` | 377 | OK | 游标与 ORDER BY 一致，limit 上限 100 (S31) |
| `src/modules/pluginStateStore/mutationAuthorityTable.ts` | 228 | 问题 | P3: `expire…Evidence` 不校验更新行数，与 `settle…Entry` 的 fail-loud 语义不一致（见 F2）。`claim` 的 durable-insert-winner 语义（`INSERT OR IGNORE` + `changes()` + 同事务回读）与"仅 winner 执行/重放"契约一致。 (S69) |
| `src/modules/pluginStateStore/runTables.ts` | 629 | 问题 | P3: 事件/运行列表可无 LIMIT 全量读取（F7） (S31) |
| `src/modules/pluginStateStore/taskTables.ts` | 1167 | 问题 | P2: 字节估算整域全量读（F3）；P2: ACP 会话记录子串启发式删除（F5） (S31) |
| `src/modules/preferenceScript.ts` | 2612 | OK | 未发现缺陷；两处判断性风险见 NOISE（confirmWithWindow 默认放行、若干 `void onPrefsEvent` 无 catch） (S06) |
| `src/modules/preferences/skillRunnerLocalRuntimePreferences.ts` | 617 | 问题 | P3: confirm 缺失时默认放行、卸载选项默认勾选清除（F8） (S31) |
| `src/modules/runtimeFileRangeProtocol.ts` | 74 | 存疑 | `normalizeRuntimeFileRange` 未过滤 Infinity/NaN 的有限性（本仓库其它 normalize 用 `Number.isFinite`）；需确认下游 worker 是否自校验。 (S08) |
| `src/modules/runtimeFileRangeReader.ts` | 291 | OK | 代际校验 + 超时/错误统一 reject 整代；pending/timeout 清理完整，shutdown 后不可用为有意。 (S08) |
| `src/modules/runtimeFileTransfer.ts` | 590 | OK | 单槽 FIFO 转让语义正确；泄漏路径均走 finally (S07) |
| `src/modules/runtimeLogManager.ts` | 2279 | 问题 | P3: flush 早退竞态（F3）；P3: 写盘失败被吞且不重排重试（F4） (S06) |
| `src/modules/runtimePersistence.ts` | 1995 | 问题 | P2: copyRuntimeTree 回滚路径抛错会顶掉主错误（F2） (S06) |
| `src/modules/runtimePersistenceGovernance.ts` | 891 | 存疑 | `cleanupPersistenceIssues` 的 `!isUnderPath(paths.dataDir, path)` 是否让所有 issue 永不可清理，需 `runtimePersistence` 的路径布局（见 NOISE） (S07) |
| `src/modules/runtimeTreeManifest.ts` | 316 | 存疑 | policy 预算只产出 warning，无硬限；符号链接环/超大目录是否被 `io.stat` 或调用方拦截，需看 adapter。 (S08) |
| `src/modules/selectionContext.ts` | 200 | OK | 严格 ref 校验、分页游标重复检测、DTO 只 `Pick` broker 子集。 (S08) |
| `src/modules/sidebarBrowserHost.ts` | 109 | OK | 纯 DOM 辅助，XUL/iframe 双路径一致；与 helpCenterTab 的 browser 创建逻辑重复（形态重复，非缺陷）。 (S08) |
| `src/modules/skillRunner/connection/skillRunnerBackendHealthRegistry.ts` | 472 | OK | 状态机与退避计算自洽；`shouldProbeSkillRunnerBackendNow` 有建状态副作用（轻微） (S50) |
| `src/modules/skillRunner/connection/skillRunnerBackendReachabilityCoordinator.ts` | 319 | 问题 | P2: 健康探测未传 timeoutMs，governor 无默认超时→卡在 probing（见 F3） (S50) |
| `src/modules/skillRunner/connection/skillRunnerConnectionAudit.ts` | 39 | OK | 纯投影合并，无副作用 (S50) |
| `src/modules/skillRunner/connection/skillRunnerConnectionAuditStore.ts` | 137 | OK | 有 200 条上限，WeakMap 归属，无泄漏 (S50) |
| `src/modules/skillRunner/connection/skillRunnerConnectionGovernor.ts` | 1112 | 问题 | P3: 超时回调内先记债并驱逐，可能把自己驱逐成 evict，债务不释放且错误类型变成 abort（见 F8） (S50) |
| `src/modules/skillRunner/connection/skillRunnerHandshake.ts` | 117 | 存疑 | capability 缓存仅按 id+baseUrl，成功后无 TTL/版本失效；需确认后端升级后是否必须重启插件 (S50) |
| `src/modules/skillRunner/connection/skillRunnerHandshakeProtocol.ts` | 220 | OK | 限制值统一取 min(上限, 后端声明)，schema 校验严格 (S50) |
| `src/modules/skillRunner/connection/skillRunnerManagementClientFactory.ts` | 92 | OK | 附注：prompt 默认值回填已保存密码（明文可见），属判断性建议，未计为缺陷 (S50) |
| `src/modules/skillRunner/run/skillRunFeedback.ts` | 459 | OK | 候选路径构造/解析链路完整；`normalizeEntryPath` 会剥离 `..`，无路径穿越。低风险观察：workspace 前缀比较非边界安全（`/a/b` 与 `/a/bc`），仅多生成一条无效候选（:250-263），未单列 finding。错误被吞后不失败主流程，符合“反馈收集不阻断 apply”的意图。 (S51) |
| `src/modules/skillRunner/run/skillRunnerAutoReplyObserver.ts` | 546 | 存疑 | 定时器/监听器清理路径完整（stop/shutdown/clearObservers）。存疑：`guardSkillRunnerAutoReplyBeforeUserReply` 有 try/catch 吞错（:403-420），而 `reconcileSkillRunnerAutoReplyAfterReplyError` 直接 await `queryAutoReplyState`（:443… (S51) |
| `src/modules/skillRunner/run/skillRunnerExecutionMode.ts` | 40 | OK | 纯规范化函数，fallback 语义明确。 (S51) |
| `src/modules/skillRunner/run/skillRunnerForegroundContinuation.ts` | 1275 | 问题 | P2: 去重键依赖可选入参（见 F4）；P3: 步定位使用 provider 返回的 requestId（见 F9）。 (S51) |
| `src/modules/skillRunner/run/skillRunnerInteractiveAutoReply.ts` | 130 | OK | auto-reply 仅在 interactive + 显式开启时透传，否则清理 runtime_options。注：`buildSkillRunnerRunRecordRequestPayload` 无条件写入 `runtime_options.execution_mode`（:67-68），会给无 runtime_options 的请求造出该字段，属既有投影决策，未确认为缺陷。 (S51) |
| `src/modules/skillRunner/run/skillRunnerProgressMapping.ts` | 73 | 问题 | P3: 与 run store 对同一事件给出不同 submitPhase（见 F5）。 (S51) |
| `src/modules/skillRunner/run/skillRunnerProviderStateMachine.ts` | 345 | OK | 转换表、终态/等待态判定自洽；终态只能到自身，非终态可入任意态。`validateTransition` 在非法跃迁时丢弃 `status.unknown` violation（:245-260），仅信息损失，不构成缺陷。 (S51) |
| `src/modules/skillRunner/run/skillRunnerRecoverableState.ts` | 98 | 存疑 | 存疑：`coerceRecoverableSkillRunnerState` 把终态（succeeded/failed/canceled）一律映射为 `"running"`（:87-89）。若调用方用它决定是否重新派发，会把已完成/已取消的 run 重新拉回可恢复态；本切片看不到调用方，无法判定，需确认调用点。 (S51) |
| `src/modules/skillRunner/run/skillRunnerRunIdentity.ts` | 17 | OK | 纯拼接，缺字段返回空串。 (S51) |
| `src/modules/skillRunner/run/skillRunnerRunSettlement.ts` | 187 | 问题 | P2: 终态结算与 session sync 路径行为不一致、返回值含义不实（见 F3）。 (S51) |
| `src/modules/skillRunner/run/skillRunnerRunStateProjection.ts` | 76 | OK | 终态清 pending、等待态 owner 覆盖 queued/running，分支完备。 (S51) |
| `src/modules/skillRunner/run/skillRunnerRunStore.ts` | 1915 | 问题 | P2: requestId 回退查找全表解析（见 F2）；P3: 两个状态更新函数逐字重复（见 F6）、`settleSkillRunnerRun` 冗余三元（见 F7）、执行模式规范化第 4 份实现（见 F8）。 (S51) |
| `src/modules/skillRunner/run/skillRunnerSessionSyncManager.ts` | 517 | 问题 | P2: 同一终态错误的处理与 runSettlement 分叉（见 F3，本文件 :313-345 为对照实现）。低风险观察：`retryDelayMs`（:24、:407）从未被读取，`streamEventLoop` 每次消费后立即 stop（:307-308），实际是单次历史拉取，命名与行为不符；`lastEventCursorBySession`（:148-150）只在测试里清理，随 r… (S51) |
| `src/modules/skillRunner/run/skillRunnerSubmissionContext.ts` | 28 | OK | 纯映射，空 skillId 归一。 (S51) |
| `src/modules/skillRunner/run/skillRunnerTaskReconciler.ts` | 1108 | 问题 | P2: 台账校准对全部历史 requestId 串行双查后端（见 F1）。另注：错误返回分支把 `missingRequestIds` 硬置为 `[]`（:502），即使本轮已把若干 requestId 结算为 failed，属结果上报不自洽（未单列 finding）。 (S51) |
| `src/modules/skillRunner/runtime/skillRunnerAsyncLifecycle.ts` | 58 | OK | 顺序 shutdown，每步独立 try/catch + `appendRuntimeLog`，单步失败不阻断后续清理；重复调用无副作用（lease 释放有 `acquired` 守卫）。 (S52) |
| `src/modules/skillRunner/runtime/skillRunnerCtlBridge.ts` | 2242 | 问题 | F7：preflight 把 `readable` 直接等于 `exists`（名实不符的 DTO 字段）。另：`appendCtlStreamChunks` 在 debug 关闭时仍全量切分 stdout/stderr（见 F4 分析）；`resolveTempRoot` 在本文件内无调用点（死代码，仅 lint 级）。 (S52) |
| `src/modules/skillRunner/runtime/skillRunnerLocalDeployDebugStore.ts` | 113 | 问题 | F4（emit 全量 clone + 全量广播，O(n²)、entries 无上限）、F6（listener 异常未隔离）。 (S52) |
| `src/modules/skillRunner/runtime/skillRunnerLocalRuntimeManager.ts` | 5048 | 问题 | F2（升级部署不停旧 runtime，旧版本继续服务却写入新 versionTag）、F3（uninstall 先清 state，失败路径不回滚 → 半提交）。另：本地 `getParentPath`(3928) 与 `platform/path` 的实现并存（见 NOISE）；`quoteShellArg` 的 Windows 分支用 `\"` 转义（PowerShell 非法转义，仅影响生成… (S52) |
| `src/modules/skillRunner/runtime/skillRunnerReleaseInstaller.ts` | 422 | 问题 | F1：`keepTempOnFailure` 对提前 `return createFailure(...)` 的失败路径无效，temp 被删。 (S52) |
| `src/modules/skillRunner/runtime/skillRunnerRuntimeFeed.ts` | 304 | 问题 | F5：feed 的 `skillrunner` 版本串只做非空校验即流向文件路径/URL。 (S52) |
| `src/modules/skillRunner/surface/skillRunnerBackendToasts.ts` | 124 | OK | 端口/去重/文案投影清晰；唯一小瑕：`relatedHandles.backendId` 用未规范化入参而非本地 `backendId`（不影响去重键） (S53) |
| `src/modules/skillRunner/surface/skillRunnerLocalDeployDebugDialog.ts` | 251 | 存疑 | 单例与 `unloadPromise.finally` 清理存在竞态/监听器覆盖可能，见「存疑」条目（依赖 toolkit 回调语义） (S53) |
| `src/modules/skillRunner/surface/skillRunnerManagementDialog.ts` | 30 | OK | 协议白名单 + 去尾斜杠 + 追加 `/ui`，清空 search/hash，边界（空 path、`/ui` 结尾）正确 (S53) |
| `src/modules/skillRunner/surface/skillRunnerRunDialog.ts` | 6067 | 问题 | P2: F5（刷新链无 catch）、F6（重连退避被重置）、F7（auth 回复静默丢弃）；另见「存疑」中的空 backendId 事件与硬编码 local backend id（3 处：1475/1789/1801） (S53) |
| `src/modules/skillRunner/surface/skillRunnerSidebarModel.ts` | 371 | 存疑 | 纯投影函数；`buildSkillRunnerSidebarSections` 内硬编码英文标签（"Running"/"Queued"/"Needs user interaction"），需确认是否仍有生产消费者并由下游本地化 (S53) |
| `src/modules/skillRunner/surface/skillRunnerSkillDisplayRegistry.ts` | 103 | OK | pref 水合/仅变更落盘/测试清理，均无副作用外泄 (S53) |
| `src/modules/skillRunner/surface/skillRunnerWorkspaceSurface.ts` | 561 | OK | publication kind 映射与 region 读取只读投影，未把 transcript revision 混入 navigation/owner 签名；状态比较与同文件 `skillRunnerStatusToken` 约定一致 (S53) |
| `src/modules/skillRunnerSsoFacts.ts` | 153 | OK | 纯声明式事实表，值均来自被引 SSOT；`legacyManagedBackendIds` 是可变空数组（低）。 (S08) |
| `src/modules/synthesis/builtinTagPolicy.ts` | 159 | OK | 内建 status 策略常量与保护函数；未发现可证据化缺陷 (S32) |
| `src/modules/synthesis/citationGraph.ts` | 621 | 问题 | P3: promotions 去重 O(n²)（F6）；isbn 字段从不参与身份键（F7）；canonical 分组非传递闭包（见 NOISE） (S32) |
| `src/modules/synthesis/digestRepresentativeImage.ts` | 162 | 存疑 | 块提取正则 `<div …>[\s\S]*?</div>` 遇块内嵌套 div 会提前截断，caption 兜底同时失效；需确认笔记 HTML 实际形状 (S32) |
| `src/modules/synthesis/exportDeliveryAdapter.ts` | 110 | OK | 失败时删根目录且保留稳定 unavailable 结果；路径前缀用 capability 白名单清洗 (S32) |
| `src/modules/synthesis/foundation.ts` | 171 | 存疑 | `buildSynthesisStoragePaths(root, topicId)` 直接把 topicId 拼入路径，是否已由 `canonicalSynthesisTopicPathId` 归一需确认（调用方不在本切片） (S32) |
| `src/modules/synthesis/itemObserver.ts` | 180 | 问题 | P3: 返回的 `recorded` 恒为 0，函数名/返回值与行为不符（F5） (S32) |
| `src/modules/synthesis/libraryAdapter.ts` | 1467 | 问题 | P2: artifacts.read 不校验 configuredLibraryId（F1）；digest payload 形状假设与 registry 冲突（F2）；metadataFingerprint 中 arxiv 恒为 ""（见 NOISE） (S32) |
| `src/modules/synthesis/production/synthesisProductionOwner.ts` | 537 | 问题 | P1: F1（supervisorTask 失败不可重置、pre-ready 无 owner 回滚）；P2: F2（shutdown 顺序 await，失败后清理不可重试） (S53) |
| `src/modules/synthesis/production/synthesisProductionRpcPolicy.ts` | 162 | 存疑 | manifest 自校验未覆盖 `deadlineMs` / `deadlineOverridesMs`（与 `workDeadlineMs` 的校验不对称），需确认 contract-set 侧是否已保证 (S53) |
| `src/modules/synthesis/registry.ts` | 507 | 问题 | 同 F2（digest 要求 object.markdown）；`rolesByReference` 对同一 sourceReferenceId 覆盖而非累积（见 NOISE） (S32) |
| `src/modules/synthesis/relatedItemsEffectAdapter.ts` | 127 | OK | ensure_present/移除双向处理齐备，失败转 receipt (S32) |
| `src/modules/synthesis/representativeImageReadAdapter.ts` | 249 | OK | stat 后二次校验长度，规避读放大 (S32) |
| `src/modules/synthesis/reverseHost/synthesisReverseHostBroker.ts` | 269 | 问题 | P2: F4（`completedEffects` 无上限/无 TTL，且 dispose 后可被在飞任务重新写入） (S53) |
| `src/modules/synthesis/reverseHost/synthesisReverseHostEndpoint.ts` | 447 | 问题 | P2: F3（`onSocketAccepted` 在 `active=false` 时丢弃 transport 不关闭） (S53) |
| `src/modules/synthesis/reverseHost/synthesisReverseHostHandlers.ts` | 461 | 问题 | P2: F8（`library.items.get_audit_state` 是唯一未做元素级校验的 handler）；另见「存疑」中的一次性 snapshot cursor 重试语义 (S53) |
| `src/modules/synthesis/reviewInput.ts` | 377 | OK | 输入归一化、过滤、hash 自洽 (S32) |
| `src/modules/synthesis/runWorkspaceMaterializationAdapter.ts` | 96 | 问题 | P2: run_root 仅做字符串前缀比较，未消解 `..`（F4，条件性） (S32) |
| `src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts` | 228 | 存疑 | 逻辑自洽；但 `semanticFailureClassification` 对 maintenance 终态（如 `failed`）一律落到默认 `"conflict"`，审计分类可能失真（仅审计字段，无功能影响）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarComputeClient.ts` | 131 | 问题 | P3：`SYNTHESIS_SIDECAR_LAYOUT_DEADLINE_MS/METRICS_DEADLINE_MS` 导出后未被接线，所有能力共用 5s 默认（见 F10，判断）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarControlClient.ts` | 416 | OK | 身份校验字段齐全；capabilities 用 `every` 按索引比较、未校验长度，多出的能力会被接受（影响低）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarRpcClient.ts` | 411 | 问题 | P3：同一请求串重复 `TextEncoder.encode` 三次（F6）；非 compute 响应体复用 `requestBodyBytes` 上限（存疑，需核对 LIMITS 定义）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarRuntimeInstaller.ts` | 309 | 问题 | P2×2：清理失败把成功安装报成 corrupt（F2）；`.old-<nonce>` 残留目录永不回收（F3）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarRuntimeManifest.ts` | 82 | OK | 尺寸+sha256 双重校验；失败码前缀可区分。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarRuntimeSupervisor.ts` | 961 | 问题 | P1 进程泄漏（F1）+ P2 陈旧健康/非当前 session 触发重启（F4）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarTrace.ts` | 299 | 问题 | P3：`active` trace 永不驱逐，1000 事件上限在有卡死 root 时不是硬上界（F7）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarTransferClient.ts` | 352 | OK | 三层哈希/尺寸/页序校验到位；`strictManifest/strictPage` 用 `as unknown as` 双断言复用类型（形状混用，低风险）。 (S54) |
| `src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts` | 59 | OK | — (S54) |
| `src/modules/synthesis/syncRecovery.ts` | 205 | OK | 状态优先级与 allowedActions 一致；autoOverwriteCanonical 固定 false (S32) |
| `src/modules/synthesis/syncRuntimeCleanup.ts` | 40 | OK | 退役路径/偏好清理，失败不影响返回 (S32) |
| `src/modules/synthesis/tagEffectAdapter.ts` | 122 | 存疑 | 恒提交 `add: [effect.tag]`，从不依据 `effect.action` 分支；需确认契约是否只有 ensure_present (S32) |
| `src/modules/synthesis/uiModel.ts` | 4198 | OK | 纯归一化/派生模块，按函数粒度走读；未发现带证据的缺陷（见 COVERAGE 说明） (S32) |
| `src/modules/synthesis/webDavSyncAdapter.ts` | 266 | 问题 | P3: MKCOL 把 409 当“已存在”接受（F8） (S32) |
| `src/modules/synthesis/webDavSyncClient.ts` | 110 | 问题 | P3: 凭据读取失败被吞成空串（F9） (S32) |
| `src/modules/synthesis/webDavSyncCredentialPrefs.ts` | 193 | 问题 | P3: envelope.iterations/kdf 写入但读取时忽略（F10） (S32) |
| `src/modules/synthesis/webDavSyncPrefs.ts` | 337 | 问题 | P2: 连接测试把 404/其它 4xx 判为 ok（F3） (S32) |
| `src/modules/synthesis/webDavSyncRemote.ts` | 31 | OK | 脱敏与 URL 拼接；relativePath 由契约层校验 (S32) |
| `src/modules/synthesis/webDavSyncTypes.ts` | 13 | OK | 纯类型再导出（contracts 为 SSOT） (S32) |
| `src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts` | 51 | OK | 监听器抛错会中断后续通知、`invalidatedListeners` 报的是集合大小；影响低。 (S54) |
| `src/modules/synthesis/workbench/synthesisWorkbenchTab.ts` | 4446 | 问题 | P2：图页合并失败时静默 return，无 surface/error 消息（F5）；P3：摘要读取无界并发（F8）、导出分页 O(n²) 拷贝（F9）。 (S54) |
| `src/modules/synthesis/zoteroItemRefAdapter.ts` | 51 | 存疑 | `findZoteroItemByRef` 回退 `getAll(libraryId)` 全库扫描，热路径代价取决于调用频率 (S32) |
| `src/modules/synthesisClient/clientPortAdapter.ts` | 2684 | 问题 | P3：端口存在性检查不一致（F6）；`clearTagAuditRecord` 无响应时伪造 `ok:true`（F7）。存疑：`protocol: (request.protocol ?? null) as never`；`stageTagSuggestions` 中 `tag` 用 `as string` 无运行期校验 (S33) |
| `src/modules/synthesisClient/defaultClient.ts` | 177 | 问题 | P3：清理任务失败被完全吞掉、无日志，drain 仍视为成功（F8） (S33) |
| `src/modules/synthesisClient/nativeComposition.ts` | 671 | 问题 | P2：`dispose()` 不释放内部创建的 rpc client（F1）；transfer 分支覆盖 `normalizedArgs` 后仍用于 surface 结果重建（F2）。P3：分块函数 O(n²) 重复编码（F5） (S33) |
| `src/modules/synthesisClient/workbenchUiAdapter.ts` | 299 | 存疑 | `toSynthesisUiSnapshotInput` 用 `as unknown as` 无校验跨越投影/UI 边界；busy 判定依赖 `message` 子串匹配——需确认投影与 UI 状态是否同构、message 匹配是否可接受 (S33) |
| `src/modules/synthesisClient/workflowHostClient.ts` | 933 | 问题 | P3：`in` 命中原型链导致 reason 可能是函数（F3）；浅拷贝后原地改写嵌套 locator 会污染调用方输入（F4） (S33) |
| `src/modules/taskDashboardHistory.ts` | 394 | OK | 内存表只存非默认 backend；与 skillrunner 投影按 key 去重 (S07) |
| `src/modules/taskDashboardSnapshot.ts` | 232 | 问题 | P2：`normalizeDashboardBackends` 忽略 `history`/`active`，唯一能补全的 helper 是死代码（见 F1）。 (S08) |
| `src/modules/taskRetentionPolicy.ts` | 10 | OK | 纯常量 + getter，无逻辑风险（与 runtimeLogManager 的 30 天保留期各自独立定义，属可接受的重复） (S06) |
| `src/modules/taskRuntime.ts` | 956 | 问题 | P3: 反序列化持久化记录时 state/skillRunnerLifecycleState 未做白名单校验（F5） (S06) |
| `src/modules/testLeakProbeTempArtifacts.ts` | 156 | OK | 测试支撑，诊断记录有上限、按 path 去重。 (S08) |
| `src/modules/testPerformanceProbeBridge.ts` | 96 | OK | 全局挂载的测试探针；存疑：无法确认是否存在生产调用方（若仅为测试而导出，属扩大 production API） (S06) |
| `src/modules/testRuntimeCleanup.ts` | 152 | 存疑 | 清理 seam 未覆盖本切片中 notificationHub / bufferedWriteCoordinator / backgroundRefreshGovernance / helpCenterTab / markdown probe / runtimeFileRangeReader；需确认由各自测试自理。 (S08) |
| `src/modules/windowsCommandResolution.ts` | 479 | OK | PowerShell 分支先做 `isSafeBareWindowsCommand` 白名单，无注入面 (S07) |
| `src/modules/workflow/catalog/builtinWorkflowSync.ts` | 650 | 问题 | P3: 替换已提交后被清理失败回滚（F2）、catch 中清理失败吞掉主错误（F4）、manifest 路径未拒绝 `..`（F8）、6 个同形死包装函数（F7） (S55) |
| `src/modules/workflow/catalog/contentPackageSubscription.ts` | 1294 | 问题 | P3: `feed_mirror_mismatch` 死分支 + 镜像比对只看 `packages[0]`（F6）；存疑：`copyRuntimeDirectory` 是合并还是替换（陈旧文件残留）、`setContentPackageInstallProgress` 单测外的全局进度未被 install 驱动 (S55) |
| `src/modules/workflow/catalog/pluginSkillRegistry.ts` | 646 | 问题 | P2: `inspectCandidate` 的 IO/扫描异常未兜住，单目录失败使整次扫描 reject（F1）；优先级覆盖顺序与 workflowRuntime 一致，非缺陷 (S55) |
| `src/modules/workflow/catalog/workflowPackageDiagnostics.ts` | 203 | OK | 调试门控 + 逐字段 trim 的日志投影；`zoteroDebug(JSON.stringify)` 有 try/catch 兜底 (S55) |
| `src/modules/workflow/catalog/workflowProductStore.ts` | 1199 | 问题 | P2: `removeWorkflowProduct` 不回收对象树（F3）；P3: 单条 legacy 失败即整库 fail-closed（F5） (S55) |
| `src/modules/workflow/catalog/workflowRequestKind.ts` | 33 | OK | 声明式 kind 优先、显式抛错，无静默默认 (S55) |
| `src/modules/workflow/catalog/workflowRuntime.ts` | 655 | 存疑 | 需确认：`latestBuiltinSync` 类型/语义漂移（类型是 `ContentPackageInstallState`，实际只是 `latestContentInstall` 的别名）；技能依赖过滤只识别 `skillrunner.job.v1`/`sequence.v1`；生产路径读 `ZOTERO_TEST_WORKFLOW_DIR` 环境变量 (S55) |
| `src/modules/workflow/catalog/workflowRuntimeBridge.ts` | 79 | OK | 仅写 global/addon 桥；无授权语义，纯转发 (S55) |
| `src/modules/workflow/catalog/workflowVisibility.ts` | 28 | OK | 纯判定，`debug_only` 门控清晰 (S55) |
| `src/modules/workflow/productionExecution.ts` | 58 | OK | 纯依赖装配（Pick + 显式映射），未见问题 (S33) |
| `src/modules/workflow/settings/backendManager.ts` | 2959 | 问题 | F3/F5：postMessage 动作通道未校验来源窗口；ACP 指纹失效逻辑与行收集校验各重复 3~4 份（见 F3、F5）。另见「存疑」中 idMapping 恒空、managed-local else 分支 (S56) |
| `src/modules/workflow/settings/genericHttpBackendPresets.ts` | 77 | OK | 纯预设表；`listGenericHttpBackendPresets` 只浅拷贝数组、元素对象可被外部改写（判断项，未达缺陷阈值） (S56) |
| `src/modules/workflow/settings/workflowParameterOptions.ts` | 164 | OK | 分页有 `nextCursor === cursor` 守卫、limit=100 合规；仅缺页数上限（判断项，非缺陷）。存疑项：非法 library 被静默降级为“全部库” (S56) |
| `src/modules/workflow/settings/workflowSettings.ts` | 1187 | 问题 | F1：provider 运行时选项投影与 workflowSettingsDialogModel 重复且行为分叉；F6：run-once seam 是空实现 (S56) |
| `src/modules/workflow/settings/workflowSettingsDialog.ts` | 1161 | 问题 | F7：每次重渲染向 document 追加 click 监听且从不移除；F6：调用空实现后弹“已保存 run-once” (S56) |
| `src/modules/workflow/settings/workflowSettingsDialogModel.ts` | 471 | 问题 | F1：第二套 provider schema 投影（effort 回退语义与 workflowSettings.ts 不一致） (S56) |
| `src/modules/workflow/settings/workflowSettingsDomain.ts` | 471 | OK | 解析/合并/规范化逻辑自洽；runOptions 只在 override 侧生效与“run-once 不持久化”一致 (S56) |
| `src/modules/workflow/settings/workflowSettingsNormalizer.ts` | 108 | OK | hook 前后剥离/回挂 hostOptions，非对象返回值安全回退 (S56) |
| `src/modules/workflow/settings/workflowSettingsOptionLocalization.ts` | 149 | OK | 纯查表 + fallback，无副作用 (S56) |
| `src/modules/workflow/settings/workflowSettingsWebDialog.ts` | 970 | 问题 | F3：动作消息不校验来源/来源窗口，confirm 可携带 runOptions (S56) |
| `src/modules/workflow/ui/selectionSample.ts` | 141 | OK | debug-only 菜单与采样写盘，路径来自用户 pref，错误路径均有 alert (S56) |
| `src/modules/workflow/ui/workflowDebugProbe.ts` | 534 | 问题 | F4：特权对话框内 innerHTML 插值未转义（同块内其它值已转义） (S56) |
| `src/modules/workflow/ui/workflowEditorHost.ts` | 840 | 问题 | F8：脏数据关闭提示只挂在 Cancel 按钮，窗口 X 直接丢弃；另见存疑（context 有界校验与注释矛盾、全局开放 seam 绕过 bounds） (S56) |
| `src/modules/workflow/ui/workflowExecute.ts` | 408 | OK | 选择快照先于设置门捕获并全程复用，持久化剥离 runOptions，日志/提示路径完整 (S56) |
| `src/modules/workflow/ui/workflowMenu.ts` | 415 | 问题 | F2：popup 重建可重入，异步等待期间二次 `popupshowing` 会产生重复菜单项 (S56) |
| `src/modules/workflowExecution/acpSequenceStepLifecycle.ts` | 45 | OK | final step 无 apply_result 时让位给 applySeam，非 final step 统一 settle，语义自洽 (S34) |
| `src/modules/workflowExecution/applyDiagnostics.ts` | 58 | OK | 计数与 code 数均有上界；codeTotal 只作下界，不产生错误值 (S34) |
| `src/modules/workflowExecution/applySeam.ts` | 1172 | 问题 | P3: finally 内 dispose 抛错会跳过后续释放并覆盖主错误（F3）；P3: 反馈 sidecar 失败把已成功 apply 记为失败（F5） (S34) |
| `src/modules/workflowExecution/artifactManifest.ts` | 200 | OK | 路径校验覆盖 `..`、反斜杠归一、盘符相对路径与 `scheme://`，拒绝分支正确 (S34) |
| `src/modules/workflowExecution/bundleIO.ts` | 114 | 问题 | P2: requestId 未净化直接进入临时文件名（F1） (S34) |
| `src/modules/workflowExecution/contracts.ts` | 185 | OK | 纯类型声明，无运行期逻辑 (S34) |
| `src/modules/workflowExecution/duplicateGuardSeam.ts` | 370 | OK | 用户确认前后二次读 + skip 记录，阈值与日志一致；request 级用快照 vs unit 级重读属设计差异 (S34) |
| `src/modules/workflowExecution/feedbackPolicy.ts` | 5 | OK | — (S34) |
| `src/modules/workflowExecution/feedbackSeam.ts` | 621 | 问题 | P3: callerScope 状态表与 dedup 表无淘汰，长期运行无界增长（F4） (S34) |
| `src/modules/workflowExecution/messageFormatter.ts` | 92 | OK | 缺失 runtime addon 时回落 fallback，未解析 id 也被识别 (S34) |
| `src/modules/workflowExecution/preparationSeam.ts` | 968 | OK | 预览失败降级为空 preview 有 warn 日志；host bridge env 注入带脱敏 (S34) |
| `src/modules/workflowExecution/requestMeta.ts` | 29 | OK | 身份串由 refs 顺序决定，调用侧一致 (S34) |
| `src/modules/workflowExecution/resultContext.ts` | 589 | 问题 | P3: 显式 resultJsonPath 的解析错误被吞并回落（F2）；P3: bytes 解析失败不写诊断、与文本路径不对称（F8） (S34) |
| `src/modules/workflowExecution/resultEnvelope.ts` | 45 | OK | 解包条件保守，未命中即原样返回 (S34) |
| `src/modules/workflowExecution/runConcurrency.ts` | 18 | OK | 非批量 provider 退化为 1，数值做了 floor/下界 (S34) |
| `src/modules/workflowExecution/runSeam.ts` | 1053 | 存疑 | 需确认 `submit.local_created` 的 init 是否必须携带 runKey（此处未传，sequence 路径始终传）；事件订阅在未终态时会长期驻留 (S34) |
| `src/modules/workflowExecution/sequenceRuntime.ts` | 2082 | 问题 | P3: `sequenceStepApplyEventType` 为死代码且与内联三元重复（F6） (S34) |
| `src/modules/workflowExecution/sequenceStateStore.ts` | 874 | 问题 | P3: `sequence.step.started` 无终态守卫，可把终态回退为 running_step（F7，可达性未证实） (S34) |
| `src/modules/workflowExecution/sequenceStepApply.ts` | 76 | 问题 | P3: 反馈 sidecar 失败使 step apply 记为失败（F5 同源） (S34) |
| `src/modules/workflowExecution/submissionSeam.ts` | 262 | OK | host-queue/direct 两路计数一致；build/run 失败转 terminal outcome 并留日志 (S34) |
| `src/modules/workflowExecution/terminalResolution.ts` | 327 | 存疑 | ACP 分支 `applyError` 恒为 `undefined`，需确认 `getAcpSkillRunRecord` 是否暴露 apply 失败原因（否则失败原因只会是泛化文案） (S34) |
| `src/modules/workflowExecution/valuePath.ts` | 37 | OK | 只比较原始值、只读自有属性，符合短路规则语义 (S34) |
| `src/modules/workflowExecution/workflowExecuteMessage.ts` | 190 | OK | 截断与 overflow 计算正确，canceled 分支优先 (S34) |
| `src/modules/workspaceTab.ts` | 925 | 问题 | P2：`workspace:action` 监听未校验 `event.source`/origin，桥接不校验 frame（F4） (S07) |
| `src/modules/workspaceToolbarTaskPopover.ts` | 721 | OK | 监听器/定时器在 uninstall 与 popuphidden 双侧回收 (S07) |
| `src/modules/zipStore.ts` | 159 | 问题 | P3：条目名 `".."` 未被拒绝（见 F5）。 (S08) |
| `src/modules/zoteroHost/libraryArtifactReadiness.ts` | 848 | 问题 | P2: `resolveGeneratedNoteArtifacts` 对 literature-score 的 `scoreStatus` 判定在 issue 早退时把非 score 的无效 note 也算作 score invalid 的邻近路径；另见 F3 与 F5（noteKind/counts 与 withCitationHealth 的重复判定） (S35) |
| `src/modules/zoteroHost/notePayloadCodec.ts` | 936 | 问题 | P2: `parseV1TailPayloadEnvelope` 在整块字节流上做 marker 搜索并按行取 base64，无 JSON shape 校验；`findPngChunk` 未校验 chunk 数据长度累计上限；见 F6 (S35) |
| `src/modules/zoteroHost/zoteroHostBrokerPrimitives.ts` | 309 | OK | — (S35) |
| `src/modules/zoteroHost/zoteroHostNativeMutations.ts` | 522 | 问题 | P1: `replaceStoredAttachment` 在校验/移动文件与 `saveTx` 之间未持有 native 事务；见 F1、F2 (S35) |
| `src/modules/zoteroHost/zoteroHostPreparedFiles.ts` | 185 | OK | — (S35) |
| `src/modules/zoteroHost/zoteroHostTrash.ts` | 245 | OK | — (S35) |
| `src/modules/zoteroHost/zoteroLibraryPageQuery.ts` | 1097 | 问题 | P2: `queryZoteroLibraryPage` 在 adapter 层未进入 Host admission/FIFO 短片段；见 F4 (S35) |
| `src/modules/zoteroHost/zoteroManagedNotes.ts` | 1914 | 问题 | P2: `finalizeManagedNoteDetail` 迭代收敛细节；`readManagedNoteDetail` 未对 `readRevision` 与 html/payload 重读做 revision 复核；见 F7、F8 (S35) |
| `src/modules/zoteroHost/zoteroNotePayloadResolver.ts` | 531 | 问题 | P2: 分页游标重验只校验上一页 attachment basis，attachment 页之间可能漏检变更；见 F9 (S35) |
| `src/modules/zoteroHostCapabilityBroker.ts` | 18292 | 问题 | P1: markWritten 全量重算导致 O(N²) 原生读取（F1）；另 F2 并发门禁旁路、F3 取消语义覆盖已提交效果、F4 arXiv 字段 SSOT 漂移、F5 stored_file 公共路径抛未类型化 Error、F6 伪造 observed、F7 literature.ingest 字段校验缺失、F8 未绑定 image slot 落盘。836–839 行为内嵌 base64… (S05) |
| `src/modules/zoteroHostMutationAuthority.ts` | 929 | 问题 | P2：内存键用 `\n` 拼接 scope/operationId，可碰撞且 started 分支不复验 digest（F2） (S07) |
| `src/platform/command.ts` | 955 | 问题 | P3: 启动缓存命中后 `options` 被静默忽略（见 F13）；cmd 引号转义仅用于 `commandLine` 诊断，未深究 (S09) |
| `src/platform/env.ts` | 902 | 问题 | P3: `getRuntimeTempRoot` 回退链失效（F7）；凭据 env 落盘临时文件（F8）。BOM 由 `trim()` 消除，不是缺陷 (S09) |
| `src/platform/filePicker.ts` | 142 | OK | native picker 失败静默回退到 toolkit（无日志），影响低，未列为 finding (S09) |
| `src/platform/hash.ts` | 40 | OK | WebCrypto 优先、XPCOM 兜底，`finish(false)` 逐字节转 hex 正确 (S09) |
| `src/platform/path.ts` | 179 | 问题 | P3: `getParentPath` 存在不可达分支（F12） (S09) |
| `src/platform/processControl.ts` | 311 | 问题 | P2: `pidfileIdentity` 可选语义漂移，`undefined` 跳过 pid/token 校验（F4） (S09) |
| `src/platform/runtimePlatform.ts` | 138 | 存疑 | 需确认 `SynthesisSidecarRuntimeTarget` 是否覆盖 `linux-x86/arm`；`as SynthesisSidecarRuntimeTarget` 断言屏蔽编译期校验（第 123 行） (S09) |
| `src/platform/subprocess.ts` | 645 | 问题 | P2: XPCOM 适配器缺平台守卫（F2）；P3: stdout/stderr 无上限缓冲（F6） (S09) |
| `src/providers/acp/provider.ts` | 265 | OK | — (S35) |
| `src/providers/contracts.ts` | 301 | 问题 | P2: `mode?` 类型声明与 dispatcher 校验互斥（F3）；P3: `runtime_options`/`poll` shape 三/四重复制（F10） (S09) |
| `src/providers/generic-http/provider.ts` | 837 | 问题 | P2: `readFileBytes` 无路径校验（`binary_from` 直接读任意文件）；`lastResponseKind` 为 `bytes` 时 `responseJson` 类型不匹配；见 F10、F11 (S35) |
| `src/providers/pass-through/provider.ts` | 102 | OK | — (S35) |
| `src/providers/profile.ts` | 653 | 问题 | P3: catalog 敏感键列表重复两份（F9）。另存疑：`validateProviderProfile` 覆盖 `normalizedOptions.acpModelId` 为裸 model（637-640），与 `expectedAcpDisplayModelId` 的关系在本切片无法确认；FNV-1a32 fingerprint 是否被当身份 token 也需消费方确认 (S09) |
| `src/providers/registry.ts` | 221 | 问题 | P3: `resolveProvider` 报错使用 contract 默认 providerType 而非匹配对（F11）。注：`normalizeWithSchema` 中 number 选项空字符串会被 `Number("")=0` 吞掉（低） (S09) |
| `src/providers/requestContracts.ts` | 797 | OK | `validateGenericHttpRequest/StepsPayload` 未校验 payload `kind`（外层 requestKind 已门禁），未列为 finding (S09) |
| `src/providers/skillrunner/client.ts` | 1424 | 问题 | P2: poll 无上限/不可取消（F2）；P2: request_id 未编码插值进 URL（F3）；P3: 失败路径 20 次投机 IO（F8） (S36) |
| `src/providers/skillrunner/errors.ts` | 93 | OK | 纯类型/判定辅助；status 提取有 `typeof object` 守卫，无静默吞错 (S36) |
| `src/providers/skillrunner/managementClient.ts` | 1101 | 问题 | P3: `limit` 非数值生成 `limit=NaN`（F9）；P3: 两份完全相同的 history payload 类型（F7） (S36) |
| `src/providers/skillrunner/modelCache.ts` | 675 | 问题 | P3: pref 读-改-写无串行化，重叠刷新会丢条目（F6）；模型 DTO/解析与 modelCatalog 重复（F4） (S36) |
| `src/providers/skillrunner/modelCatalog.ts` | 744 | 问题 | P3: `SkillRunnerModelEntry` 与 modelCache 的 `SkillRunnerModelCacheModel` 同形重复（F4）；其余为静态模型表 (S36) |
| `src/providers/skillrunner/provider.ts` | 683 | 问题 | P2/P1-conditional: 选项守卫会拒绝 normalize 后未回显的合法 key（F1）；P3: 三个完全相同返回分支（F5） (S36) |
| `src/providers/skillrunner/skillPackageBundler.ts` | 120 | 存疑 | `registry.entriesById[skillId]` 为无 hasOwnProperty 的字典下标；目录遍历未见符号链接/环防护；整树读入内存后同步打包 (S36) |
| `src/providers/skillrunner/uploadMapping.ts` | 72 | OK | 相对路径构造 + 绝对路径判定；非法段由下游 `ensureUploadRelativePath` 拒绝 (S36) |
| `src/providers/skillrunner/zipTransport.ts` | 168 | OK | 逐字节核对 local/central/EOCD 布局与 CRC32 正确；入口名做 `..`/绝对路径清洗 (S36) |
| `src/providers/types.ts` | 117 | OK | 纯类型定义；`ProviderProgressEventSequenceStep.type` 含 `/ string` 使联合失去约束（与 F3 同类，未单列） (S09) |
| `src/schemas/selectionContextSchema.ts` | 98 | OK | 纯 JSON Schema 常量；切片内未见消费方，与 TS 类型对齐无法在本切片核对 (S09) |
| `src/schemas/zoteroHostMutationSchemas.ts` | 1619 | 问题 | P2: `affectedRefs/residualRefs` items 只允许空对象（F1）；P3: 公共投影未把 operationId 置必填（F5）；P3: managed note 写目标 shape 两份定义（F14） (S09) |
| `src/shared/acpToolCallDisplay.ts` | 336 | OK | 纯投影/截断逻辑，未发现可证实缺陷 (S10) |
| `src/shared/assistantActionContract.ts` | 493 | OK | 纯类型契约；运行时词表由 registry 单点持有，文件自带覆盖守卫 (S10) |
| `src/shared/assistantInteractionContract.ts` | 520 | 存疑 | 需确认 nullable 文本字段收到 `""` 时被整体拒绝是否符合调用方约定；非数组 `options/files/methods` 在“严格”解析里被静默当空数组 (S10) |
| `src/shared/assistantWireContract.ts` | 273 | OK | 常量/类型 SSOT，未发现运行期缺陷 (S10) |
| `src/shared/citationGraphStandalone.css` | 231 | OK | 纯样式数据，未细读布局细节（无逻辑） (S10) |
| `src/shared/citationGraphStandalone.ts` | 489 | 问题 | P2：投影出的 hover-only 节点/边完全未被渲染（F1）；P3：hover 重绘全量重算+重建 DOM（F4） (S10) |
| `src/shared/citationGraphVisualRules.ts` | 391 | 问题 | P3：节点 kind/字段词汇与另两处重复（F6） (S10) |
| `src/shared/dashboardWireContract.ts` | 1214 | OK | 纯 JSON wire DTO/常量，未发现运行期缺陷 (S10) |
| `src/shared/hostBridgeAgentContract.ts` | 29 | OK | 纯常量/类型 (S10) |
| `src/shared/hostBridgePluginSkillBundleContract.ts` | 57 | 问题 | P3：`isSafe...Path` 接受盘符绝对路径/控制字符（F5，利用面取决于消费方） (S10) |
| `src/shared/literatureScore.ts` | 129 | OK | 解析/换算逻辑边界正常 (S10) |
| `src/shared/preactRegionMount.ts` | 77 | OK | 未发现可证实缺陷；region name 直接拼进选择器/class 名，调用方需保证标识符形状（非本文件缺陷） (S10) |
| `src/shared/regionEquality.ts` | 42 | 存疑 | NaN/Infinity 经 `JSON.stringify` 都成 `"null"` 被判等；函数/Symbol 的 signature 运行时为 `undefined`，是否可进入 region 选择集需确认 (S10) |
| `src/shared/synthesisCitationGraphWindow.ts` | 278 | 问题 | P3：slice 合并无条件清 error 却保留 failed 状态（F3） (S10) |
| `src/shared/synthesisGraphVendors.ts` | 6 | OK | 纯 vendor 聚合 (S10) |
| `src/shared/synthesisWorkbenchI18nContract.ts` | 19 | OK | 纯 re-export，SSOT 在 src/synthesisWorkbenchI18n.ts (S10) |
| `src/shared/synthesisWorkbenchWireContract.ts` | 1328 | 问题 | P3：graph node kind/字段与另两处重复定义（F6） (S10) |
| `src/shared/topicTimelineRenderer.ts` | 567 | 问题 | P2：早于/晚于论文年份跨度的事件被静默丢弃（F2） (S10) |
| `src/shared/topicTimelineStandalone.ts` | 17 | 存疑 | 模块顶层直接 `window.ZoteroSkillsTopicTimeline = ...`，无 `typeof window` 守卫；非 DOM 环境 import 即抛错，需确认消费边界 (S10) |
| `src/shared/zoteroRuntimeVersion.ts` | 16 | OK | 版本解析边界（major 7/9/10，其余 unknown）正常 (S10) |
| `src/sidebar/acpChildApp.js` | 1 | OK | 纯入口：`import "./assistantWorkspaceAcpChild.js";`，无业务逻辑。 (S11) |
| `src/sidebar/assistantPanelModel.js` | 2073 | OK | 纯投影层：`normalizeAssistantPanelSnapshot`、`projectAssistantWorkspacePanel` 等均为从 selection/navigation/control 投影到 chrome 区域可见字段的纯函数，不持有任何 DOM/observer/定时器。已对照 `regionEquality.ts` 的 `detailsDrawerEquality… (S11) |
| `src/sidebar/assistantPanelRenderer.js` | 141 | OK | 仅剩根属性（`data-assistant-panel-kind`/`data-assistant-tone`/…）和 `markRegion`/`managedMount`/`installOverlayDismiss`/`adoptPanelRegions` 等结构性 helper。所有 chrome 区域都已迁移到 Preact（见 chromeRenderer.ts），本文件只是「Liv… (S11) |
| `src/sidebar/assistantRegionCollapse.ts` | 250 | OK | 严格符合 §2「折叠是纯 chrome 表现态」：只 toggle 容器 `is-region-collapsed` class 与 root `data-collapse-stage` 属性；`apply()` 的 `appliedSignature` 字符串不含 transcript 字段；`ensureToggle` 的回挂逻辑把按钮绑回 region 容器（Preact managed … (S11) |
| `src/sidebar/assistantTranscriptRenderer.js` | 2715 | 问题 | 见 F2–F5。所有 chrome 解耦点已通过：`installAssistantTranscriptStickiness` 用 `data-assistant-transcript-stick-installed` 数据属性去重，`installVirtualTranscriptScrollHandler` 用 `state.scrollInstalled` 守卫；`renderAssist… (S11) |
| `src/sidebar/assistantWorkspaceAcpChild.js` | 1905 | 问题 | 见 F1、F6。已对照 AGENTS §2 解耦硬约束：`renderPanel` → `renderChromePanel` → Preact region components（每个 region 独立 signature 见 `regionEquality.ts`）；transcript-only 更新只走 `renderTranscriptPage` / `renderMutationE… (S11) |
| `src/sidebar/assistantWorkspaceApp.js` | 1 | OK | 纯入口：`import "./assistantWorkspaceShell.js";`。 (S11) |
| `src/sidebar/assistantWorkspaceShell.js` | 810 | OK | 仅 host 协议：`state` 容器含 `hostReadyAcked`/`hostReadyTimer`/`childDocumentGenerations` 等，`ensureHostReady` 通过 `clearHostReadyRetry` 用 `clearTimeout` 显式取消待发 retry；`attachFrameLoadListeners`/`acceptChildRe… (S11) |
| `src/sidebar/components/ActionControls.tsx` | 269 | OK | pending/aria-busy 走 DOM 侧属有意设计；键盘 roving 索引有 values.length 保护 (S36) |
| `src/sidebar/components/BannerRegion.tsx` | 219 | OK | 边界恰为 {context,lifecycle}，符合既有守卫；onAction 稳定由调用方保证 (S36) |
| `src/sidebar/components/ContextDrawerRegion.tsx` | 562 | OK | container.onclick 闭包捕获首帧 onAction（与 imperative 原实现一致，调用方传稳定句柄） (S36) |
| `src/sidebar/components/DetailsDrawerRegion.tsx` | 195 | OK | 折叠态走原生 `open`/class，未进入 selection；overlay dismiss 与旧实现同构 (S36) |
| `src/sidebar/components/EmptyStateRegion.tsx` | 16 | OK | — (S36) |
| `src/sidebar/components/HintRegion.tsx` | 440 | OK | 边界仅 interaction；labelOf 有意在边界外 (S36) |
| `src/sidebar/components/MessageCountsRegion.tsx` | 95 | OK | 保留上次 items 的 quirk 与旧实现一致；见 F7（其 selection 来自 regionEquality） (S36) |
| `src/sidebar/components/PermissionDrawerRegion.tsx` | 127 | OK | open 进入边界（与 details/context 不同）符合注释；关闭时残留 onclick 因 hidden 不可达 (S36) |
| `src/sidebar/components/PlanRegion.tsx` | 132 | OK | 隐藏保留最后可见 DOM，同旧实现 (S36) |
| `src/sidebar/components/ReplyRegion.tsx` | 288 | OK | 双层结构/实时边界与 textarea 非受控同步逻辑正确，焦点态不回写 (S36) |
| `src/sidebar/components/ToolbarRegion.tsx` | 56 | OK | — (S36) |
| `src/sidebar/components/TranscriptRegion.tsx` | 75 | OK | 只吃 state/message/mode/ownerKey，未引入 transcript revision/chunk 计数 (S36) |
| `src/sidebar/components/ViewModeToggle.tsx` | 63 | OK | — (S36) |
| `src/sidebar/components/chromeRenderer.ts` | 297 | OK | 每区域独立 render 到自己的 mount；permission overlay 首次创建后复用 (S36) |
| `src/sidebar/components/regionEquality.ts` | 200 | 问题 | P3（判断）: `revision` 进入 messageCounts 签名但渲染未使用，chunk 级重渲染（F7）；其余 selection 未混入他区域计数 (S36) |
| `src/sidebar/components/replyHistory.ts` | 131 | OK | 上限 50/键，键受 kind\/context\/action 约束，越界与草稿恢复逻辑正确 (S36) |
| `src/sidebar/markdownParser.js` | 54 | OK | `markdownit({ html: false, breaks: true, linkify: false })` 与 Decision 7 一致：sanitize profile 关闭 raw HTML，启用美元分隔符 `texmath`/`katex`，失败时返回原字符串而非抛错。fallback 路径手工 escape `&`/`<`/`>` 并把 `\n` 转 `<br>` — 与 … (S11) |
| `src/sidebar/prototypeWorkspaceApp.js` | 2600 | OK | Harness-only 文件（注释明确「Production builds never include this entry」）；mock 数据静态生成，与真实 ACP child 同构 DOM 类名（`assistant-transcript-row`、`assistant-panel-region` 等），未触发任何 host 流量；mock `mockTranscriptRow` 用 `… (S11) |
| `src/synthesis/components/ChromeRegion.tsx` | 251 | OK | chrome 只读 selection，memo 比较器只含本区域签名 + 回调身份 (S37) |
| `src/synthesis/components/ConceptsRegion.tsx` | 977 | OK | 本地选择态只留在组件内，未进 wire；`reviewIndex` 读取时统一 wrap (S37) |
| `src/synthesis/components/HomeRegion.tsx` | 929 | OK | 投影只取本区域可见字段；`anyInFlight` 语义已在注释中固定 (S37) |
| `src/synthesis/components/ShellRegion.tsx` | 116 | OK | 纯投影 + 回调，memo 边界正确 (S37) |
| `src/synthesis/components/TagsRegion.tsx` | 2173 | 问题 | P3: 硬编码英文可见串绕过 `t`（F6）；`CommitTextInput` 每次渲染重挂监听（F12） (S37) |
| `src/synthesis/components/TopicGraphPanel.tsx` | 508 | 存疑 | 布局为 O(n·e)（F7 记在算法文件）；`queue` 空数组时 `selected` 为 undefined 依赖父级门控，需确认不会被单独复用 (S37) |
| `src/synthesis/components/TopicsRegion.tsx` | 520 | 存疑 | `submitTopicSynthesisUpdate` 仅传 `{topicId}`，而 operation key 含 `args?.language`；需确认 controller 侧 pending key 用同一 helper 生成 (S37) |
| `src/synthesis/components/graph/GraphRegion.tsx` | 1328 | OK | 读毕未发现缺陷；search draft/echo 同步、island 生命周期与 memo 比较均自洽 (S57) |
| `src/synthesis/components/graph/graphModel.ts` | 740 | 问题 | P3：`enumKeyPart`/`humanizeEnumValue`/`localizedGraphDetailValue` 与 `reader/values.ts` 重复（见 F3） (S57) |
| `src/synthesis/components/graph/sigmaIsland.ts` | 1017 | 存疑 | mergeGraphPage 在 forEach 迭代中 drop 节点/边，是否安全取决于 graphology 迭代语义（见 NOISE） (S57) |
| `src/synthesis/components/reader/ArtifactReader.tsx` | 97 | 问题 | P3：剪贴板写入失败无 catch，产生未处理 Promise 拒绝（见 F2） (S57) |
| `src/synthesis/components/reader/DigestModal.tsx` | 135 | OK | 命令式 island 与 loading 分支互斥，contentRef 仅在非 loading 时存在，无竞态 (S57) |
| `src/synthesis/components/reader/EvidenceDrawer.tsx` | 179 | OK | 派生链接与选择逻辑正确，evidenceForRef 唯一匹配语义一致 (S57) |
| `src/synthesis/components/reader/ReaderRegion.tsx` | 367 | 问题 | P2：digest 结果解析依赖整区域重渲染，相同负载被 equalBySignature 过滤后可能卡在 loading（见 F1） (S57) |
| `src/synthesis/components/reader/TimelineIsland.tsx` | 121 | OK | buildTimelineData 每渲染计算两次（轻微），无正确性缺陷 (S57) |
| `src/synthesis/components/reader/conceptOverlay.ts` | 275 | OK | replace 回调参数位（match, alias, offset）正确；lastIndex 复位到位 (S57) |
| `src/synthesis/components/reader/markdownIsland.ts` | 318 | OK | 短路码/摘要链接增强的 lastIndex 与 cursor 处理正确 (S57) |
| `src/synthesis/components/reader/narrowing.ts` | 955 | 问题 | P3：`refItemKey \/\/ \`paper:…\` \/\/ code` 中 `// code` 为死代码（见 F4） (S57) |
| `src/synthesis/components/reader/sections.tsx` | 1490 | 问题 | P3：ReportMarkdownIsland 的 signature 未包含 `t` 与 evidence 的 digestCandidates（见 F5） (S57) |
| `src/synthesis/components/reader/values.ts` | 294 | OK | 与 graphModel 的重复在 F3 中统一记，本文件自身逻辑正确 (S57) |
| `src/synthesis/components/registry/CanonicalRevisionWorkbench.tsx` | 1683 | OK | 合并队列/选中集/编辑草稿/抽屉 tab 均为组件本地状态，未进入 wire selection；合并提交用本地 `mergeSubmission` + `lastCompleted/FailedOperationKey` 对账，逻辑自洽。备注：本文件的 `blockersText`(58-68) 与 `registryTypes.canonicalActionBlockersText`(120… (S58) |
| `src/synthesis/components/registry/IndexReviewDrawer.tsx` | 644 | OK | 只渲染 controller 投影；`items` 由 `indexReviewItems` 过滤 open+未决+未 resolved，与 pending 控件一致。 (S58) |
| `src/synthesis/components/registry/RegistryRegion.tsx` | 430 | 存疑 | 展开行仅本地 state，折叠时不回写 `filters.expandedSourceRefs`（回写只在展开且无内嵌 references 时发生）——需确认宿主是否会因此保留无用 hydrate 意图；另 memo 比较含 5 个 handler 身份，需确认供给方已 memo 化，否则 signature 快速路径失效。 (S58) |
| `src/synthesis/components/registry/RegistryTables.tsx` | 687 | 存疑 | 展开的 reference 子行未注册 `windowed.measureRow`（只有父行测量），展开大行后估算高度与真实高度偏离、滚动锚点漂移；`RegistryReferencedOnlyTable` 的 `getKey` 用 `referenceInstanceId`，为空时多行同 key。 (S58) |
| `src/synthesis/components/registry/controls.tsx` | 157 | OK | `RegistryFilterInput` 用 `document.activeElement` 保护在焦输入（正确）；`registryCountText` 本切片无调用方，疑为外部 API。 (S58) |
| `src/synthesis/components/registry/registryTypes.ts` | 1308 | 问题 | P3：`finiteNumber` 将 null/""/false 归一为 0（见 F4）；另有与 reviewCenterText 的大面积重复（F5）。 (S58) |
| `src/synthesis/components/reviewCenter/ReviewCenterRegion.tsx` | 1880 | 问题 | P2：无 `referenceReview` 时本地 pending/submission 对账分支不可达（F1）+ `submittedReferenceIdsRef` 只写不清（F2）；P2：搜索框被 trim 后的投影值覆盖（F3）。 (S58) |
| `src/synthesis/components/reviewCenter/ReviewTargetPicker.tsx` | 250 | OK | 定位/初始分组滚动都在 layout effect + rAF，取消正确；无泄漏的监听器。 (S58) |
| `src/synthesis/components/reviewCenter/reviewCenterProjection.ts` | 887 | 存疑 | match 行用 status 严格相等（:309-313），cleanup/concept/topic-graph 用 `reviewStatusMatches` 的等价映射（:363、:574、:767）——同一筛选控件两套语义，需确认是否有意（legacy 路径不同）。 (S58) |
| `src/synthesis/components/reviewCenter/reviewCenterText.ts` | 247 | 问题 | P3：与 registryTypes 重复实现同一套 enum domain 表/i18n key/status tone（F5）。 (S58) |
| `src/synthesis/components/reviewCenter/reviewCenterWire.ts` | 194 | OK | 纯防御性 narrowing，字段来源与投影一致。 (S58) |
| `src/synthesis/components/topicsControls.tsx` | 119 | OK | 按钮 pending 判定与 payload 形状与约定一致 (S37) |
| `src/synthesis/components/topicsRegionData.ts` | 721 | 问题 | P3: hierarchy 布局深度松弛为 O(n·e)（F7） (S37) |
| `src/synthesis/components/windowedRows.tsx` | 418 | OK | ref/observer/RAF 清理齐全；`scrollToIndex` 本切片未被消费（导出 API，非缺陷） (S37) |
| `src/synthesis/registryProjection.ts` | 100 | OK | — (S12) |
| `src/synthesis/standaloneGraphApp.ts` | 100 | 问题 | P1/F7：onAction 仅覆盖 `setGraphView`/`setFilters.graph`，其余 action 静默丢弃，standaloneGraphOnly 无法交互。 (S12) |
| `src/synthesis/standaloneGraphState.ts` | 48 | OK | — (S12) |
| `src/synthesis/standaloneTopicApp.ts` | 118 | 问题 | P1/F8：同 F7，standalone topic export 的 ReaderRegion hostCommand/backToTopicDetail 被静默丢弃。 (S12) |
| `src/synthesis/synthesisExportProjection.ts` | 77 | 问题 | P3/F9：`declare const __debug_mode__: boolean` + typeof 检查为 dead branch。 (S12) |
| `src/synthesis/synthesisSurfaceProjection.ts` | 174 | OK | — (S12) |
| `src/synthesis/synthesisWorkbenchApp.ts` | 1318 | 问题 | P1/F10：`applyChromeMessage` 替换 `state.snapshot` 时不同步 `state.surfaces[visibleSurface].snapshot`，失败 fallback 可能用旧快照。 (S12) |
| `src/synthesis/synthesisWorkbenchChromeRenderer.ts` | 488 | 问题 | P2/F11：`graphSelection` 局部闭包在切 tab 时不清空，仅靠 inert+visibility 隐藏，Sigma 实例无法释放直至 dispose。 (S12) |
| `src/synthesis/synthesisWorkbenchPanelModel.ts` | 776 | 问题 | P2/F12：`resolveTimedStatusbarEntry` 首次 projection 锁定 expiresAt，配合 `pruneStatusbarExpirations` 语义正确但时序固定。 (S12) |
| `src/synthesis/synthesisWorkbenchTypes.ts` | 135 | 问题 | P3/F13：`referenceReview?: T` 类型松散，运行时始终填值。 (S12) |
| `src/synthesisWorkbenchApp.ts` | 7 | OK | 启动装配；`as unknown as` 类型断言由 vendors 层保证 (S01) |
| `src/synthesisWorkbenchI18n.ts` | 939 | 存疑 | 约 900 行为纯消息表（机械数据）；`projectSynthesisSidecarFailureCard` 形参含 `lifecycle` 但函数体从不读取，签名与行为不符 (S01) |
| `src/utils/docsUrl.ts` | 84 | OK | — (S12) |
| `src/utils/env.ts` | 7 | OK | — (S12) |
| `src/utils/fileSystem.ts` | 36 | OK | — (S12) |
| `src/utils/locale.ts` | 142 | 问题 | P3: locale 内 `getString`/`getLocaleID` 仅 add-on 路径有效，作为通用工具语义受限；无运行时缺陷。 (S12) |
| `src/utils/localizationGovernance.ts` | 215 | 存疑 | 未细读全部正文（elided 段）：需确认 `looksLikeUnresolvedLocalizationValue` 对 FTL placeholder/select-syntax 不产生假阳性。 (S12) |
| `src/utils/path.ts` | 22 | OK | — (S12) |
| `src/utils/prefs.ts` | 95 | 问题 | P3: `clearPref(key: string)` 未用 `keyof PluginPrefsMap`，类型松动但无运行时影响。 (S12) |
| `src/utils/runtimeBridge.ts` | 576 | 问题 | P1/F1：override 路径下候选排序仍允许 global-var/global-this 反客为主。 (S12) |
| `src/utils/runtimeCompatibility.ts` | 60 | OK | — (S12) |
| `src/utils/sha256.ts` | 117 | 问题 | P2/F3：Mozilla `nsICryptoHash` 路径把 `hash.finish(false)`（base64 串）按 charCode 再 hex，digestHex 输出错误。 (S12) |
| `src/utils/timingSafeEqual.ts` | 10 | OK | — (S12) |
| `src/utils/wait.ts` | 207 | 问题 | P2/F4：二次 `addEventListener` 在 abort 后无防重入保护，需调用方主动 removeEventListener。 (S12) |
| `src/utils/window.ts` | 10 | OK | — (S12) |
| `src/utils/ztoolkit.ts` | 142 | 问题 | P2/F5：死代码 `class MyToolkit` 与未使用的 `BasicTool`/`UITool` import。 (S12) |
| `src/workers/runtimeFileRangeWorker.ts` | 98 | 问题 | P1/F6：worker 入口未对 `request.ranges` 长度/字节上限做防御性校验。 (S12) |
| `src/workflows/archive.ts` | 842 | 问题 | P2: Gecko 抽取路径的条目上限在枚举之后才校验（F4）；P3: catch/finally 中清理失败会覆盖主错误（F7）。路径规范化、ZIP 解析边界、原子写回校验读过未发现其他缺陷 (S13) |
| `src/workflows/bibliography.ts` | 399 | 问题 | P3: 错误透传判据 `typeof code === "string"` 过宽，非 host 错误会绕过 `execution_failed` 契约（F8）。条目/格式/选项校验、回退语义自洽 (S13) |
| `src/workflows/clipboard.ts` | 234 | 存疑 | Gecko transferable 解码 `value?.value ?? value` 跨平台稳定性需在 references 对照 nsITransferable 实际形态。 (S14) |
| `src/workflows/declarativeRequestCompiler.ts` | 704 | 存疑 | 参数模板、内联输入/上传键冲突、handoff 分支均自洽；但 `entry.from` 仅做类型断言后直接传入 selector，selector 未命中时落入 `return true`（第 100 行）等价于 `selected.source`。需确认 manifest 解析层（loaderContracts）是否已限制该字段取值 (S13) |
| `src/workflows/errorMeta.ts` | 83 | 存疑 | `summarizeWorkflowExecutionError` 从 carrier 读 `capabilitySource`/`executionMode` 兜底，无脱敏但 caller 自挂载，泄漏面有限。 (S14) |
| `src/workflows/file.ts` | 541 | 存疑 | `atomicWrite` 临时后缀 `Date.now()+random.toString(36).slice(2)` 短，cleanup 兜底；`requirePath` 委托 `platform/path.ts`，不在本切片审查。 (S14) |
| `src/workflows/helpers.ts` | 50 | OK | `toHtmlNote` 转义 title/body；hook 输出 HTML 注入面有限。 (S14) |
| `src/workflows/hostApi.ts` | 684 | 存疑 | `archive.withExtractedZip` 的 `control` 未 `withDefaultControl` 包裹（F7），与其余成员不一致。 (S14) |
| `src/workflows/loader.ts` | 1153 | 问题 | P3: `debug_only` 工作流在隐藏分支前仍执行 hooks 加载（F5）；重复 workflow id 静默覆盖、无诊断（F6）。目录过滤、包清单、locale 资源与诊断排序逻辑读过未发现其他问题 (S13) |
| `src/workflows/loaderContracts.ts` | 595 | 问题 | P2/F2：`allowMixed: false` 校验只拦多必选 kind，不拦运行期异类混入。 (S14) |
| `src/workflows/localization.ts` | 331 | 存疑 | `localizeWorkflowLabel` 三参签名无 caller 使用；保留即可，无缺陷。 (S14) |
| `src/workflows/manifestContract.ts` | 114 | OK | ACP/skillrunner/pass-through 兼容矩阵与 SkillRunner 实际行为一致。 (S14) |
| `src/workflows/packageHookBundler.ts` | 432 | 问题 | P2/F1：`bundleCache` 无界 process-global Map。P3/F3：`__packageHookBundlerTestOnly` 暴露内部到 export。 (S14) |
| `src/workflows/runtime.ts` | 1294 | 问题 | P2: try 覆盖范围之外的 interactive 资源/上游 abort 监听未清理（F1）；P2: `__stats.skippedUnits` 重复计数（F2）。全局 scope 串行化只覆盖 work，未见嵌套重入路径，暂列为存疑 (S13) |
| `src/workflows/triggerPolicy.ts` | 9 | OK | — (S13) |
| `src/workflows/types.ts` | 3073 | 问题 | P3: mutation 操作名集合被手写 4 份（F9）；`size`/`sizeBytes` 双字段语义漂移（F10）。另存疑：本文件定义的大量 DTO（`MutationReceipt`、`ItemDetailDto` 等）是否与 `src/shared/*WireContract.ts` 重复，未读到 shared 侧无法判定 SSOT (S13) |
| `src/workflows/workflowHostContract.ts` | 471 | 存疑 | `inspectWorkflowHostContract` 的 `_variant` 参数未使用（F8）。 (S14) |
| `src/workflows/workflowHostErrorContract.ts` | 579 | 存疑 | sanitize + assert 顺序下 numeric `limit`/`observed` 原值落库，无 schema 漏洞。 (S14) |
| `src/workflows/workflowHostOwners.ts` | 1453 | 问题 | P3: 笔记内嵌图槽位的“检测面”与“重写面”支持的属性写法不一致（F13）。补偿链、幂等 operationId、快照分页循环读过；`createWorkflowHostCapabilityBroker(_resources)` 形参被忽略属死参数，未单独记为缺陷 (S13) |
| `src/workflows/workflowInputMaterialization.ts` | 152 | OK | 路径分段规范化 + Windows 保留名 + 长度截断，防御面充分。 (S14) |
| `src/workflows/workflowInputPlanning.ts` | 1251 | 问题 | P2: `readNotes` 把已记录的 artifact issue 转成硬失败，过滤语义失效（F3）。计数规则、分组、mime 过滤、分页续读检查读过未发现其他缺陷 (S13) |
| `src/workflows/workflowLoggingOwner.ts` | 150 | OK | log 走 regex 脱敏 + strict-JSON 校验 + 节点/字节上限；安全语义到位。 (S14) |
| `src/workflows/workflowNoteImagePreparation.ts` | 801 | 问题 | P3: `inferImageMimeType` 用 `includes("image/")` 会把路径当作 MIME（F11）；P3: 输入字节上限在整文件读入之后才校验（F12）。ref 作用域隔离、随机 id、画布回退路径读过 (S13) |
| `src/workflows/workflowStoredAttachmentImport.ts` | 226 | 问题 | P2/F4：`validateSource` 类型可选，省略时字节上限静默绕过。P3/F5：`cleanupErrors` 与 hook-failure-meta 双约定分歧。 (S14) |
| `src/workflows/zipBundleReader.ts` | 174 | 问题 | P1/F6：解压无 entry 数与总字节上限，存在 zip bomb 风险。 (S14) |
| `src/workflows/zoteroHostAccessOptions.ts` | 171 | OK | 双键名兼容 + 路径剥离 + bypass 强制默认关闭。 (S14) |
| `src/workspaceApp.ts` | 536 | 存疑 | `message` 监听无 origin 校验；view 切换分支（`render()` 早返回）不调用 `updateWorkspaceLocalizedText`，view+labels 同时变更时标签会滞留 (S01) |
| `tools/synthesis-index-harness/cli.ts` | 834 | 问题 | P2 debug-db 守卫可绕过（F6）；P3 必填校验死代码（F7）、O(n²) 累积（F8）、runId 碰撞（F9） (S15) |
| `tools/synthesis-index-harness/static/index.html` | 678 | 问题 | 开发 harness：未转义插值进 `innerHTML`（F9）；raw count 两套实现语义分歧（F8） (S37) |

共 963 行，覆盖全部生产文件。

## 附录 A. 方法学与局限

- 生产文件集由机械枚举得出（`.ts/.tsx/.js/.rs/.py/.html/.css`，排除 `node_modules`、`target`、`dist`、`vendor`、`references/`、`tests/`、`*.min.js`），按目录聚成 69 个互不重叠的分片，保证同一文件不被两个分片重复审查。
- 首轮用并行子代理分片审查；子代理供应商中途触发配额限制并持续失败，改为经 `completion` 通道对每分片做整文件（带行号）静态审查，再由主代理对高严重度结论逐条回读源码核验。第 3 节即核验产物，第 5 节为核验中被否定的样本。
- 未做动态验证：未启动 Zotero、未运行测试套件、未执行 skill 运行时。全部结论基于静态阅读；涉及并发时序与 Gecko/Zotero API 语义的条目已标注置信度。
- `zotero-bridge` 的 268 条既有 clippy warning 未逐条列入（既有基线，多为风格类），仅将其中代表真实缺陷者纳入 findings。
- 本报告未修改任何代码；`git status` 仅新增 `artifacts/code-review-20260912/`。

## 附录 B. 高危问题复核与修复结果（2026-09-12）

本轮以基线提交 `7658e599` 为复核起点，通过 OpenSpec change `remediate-code-review-20260912-high-risk-findings` 实施。范围覆盖第 3 节 V1–V11，以及第 4.1 节全部 27 条 P1 候选；重复候选仍逐行列出，避免状态遗漏。

复核后确认 16 个独立问题真实存在，其中 attachment replacement 的原报告影响描述部分过重，但进程崩溃后的恢复缺口确实存在。所有真实问题均已修复。V9 和第 4.1 节其余 11 条候选确认为误报、不可达的纵深防御建议，或有意保留的契约设计，未据此改动生产代码。

### B.1 第 3 节已核验缺陷

| 编号 | 复核结论 | 处理结果 |
|---|---|---|
| V1 | **确认存在，已修复** | Host HTTP reader 改为 head/body 两阶段读取；鉴权、路由与 body 配额判定在继续读取 body 前完成。socket backlog 与进程内 accepted connection 同时限制为 16。覆盖 `hostHttpRequestReader.ts`、`hostBridgeServer.ts`。 |
| V2 | **确认存在，已修复** | `readHostBridgeMasterToken()` 按加密 envelope 与 key material 缓存解密 Promise；重复无效 Bearer 不再重复执行 PBKDF2，token 或 key material 变化时自动失效。覆盖 `hostBridgeAuth.ts`。 |
| V3 | **确认存在，已修复** | MCP 现在为全部 `ZoteroHostCapabilityError` 保留稳定 `errorCode`、`retryable` 和 strict-JSON `details`，不再仅特判 `not_found`。覆盖 `zoteroMcpProtocol.ts`。 |
| V4 | **确认存在，已修复** | Gecko ZIP reader 复用 `archive.ts` 的条目数、单项字节数与总字节数配额，在 extraction 前检查。覆盖 `archive.ts`、`zipBundleReader.ts`。 |
| V5 | **确认存在，已修复** | SkillRunner output contract 拒绝 run dir 外部来源及跨平台绝对路径，不再移动或打包外部文件。覆盖 `artifact.py`。 |
| V6 | **确认存在，已修复** | 两个 timeout helper 合并到一个会在任一分支 settle 后 `clearTimeout` 的实现，并保留非正 timeout 的直接语义。覆盖 `acpTransport.ts`。 |
| V7 | **确认存在，已修复** | permission 请求登记为 adapter-owned pending settlement；最终 listener 解除或 adapter close 时统一返回 unavailable，迟到回调只能 settle 一次。覆盖 `acpConnectionAdapter.ts`。 |
| V8 | **确认存在，已修复** | publication flush 持续排空在飞期间新增的 pending lane；flush 期间 enqueue 不再依赖已清除的 timer。覆盖 `assistantWorkspacePublicationRuntime.ts`。 |
| V9 | **误报，未改运行时** | 当前 split-skill 是有意采用的最小 gate-directed runtime：handoff/manifest 是事实源，gate/action transcript、stage receipt 与持久 artifact registry 已退出当前契约。空实现是兼容调用面，不构成跨进程恢复承诺。原 `topic-synthesis-skills` 主规格仍描述旧模型，已在本 change 的 delta spec 中纠正。 |
| V10 | **确认存在，已修复** | 重新生成 built-in deep-reading renderer，并在现有 deterministic package 测试中直接比较 `skills_src` 生成结果与 `skills_builtin`，覆盖 app、i18n、CSS、Markdown renderer 和 runtime。 |
| V11 | **确认存在，已修复** | 单行 `$$…$$` 在当前行闭合时不再进入多行收集循环；回归用例同时确认后续 heading 仍独立解析。源 runtime 与生成包均已更新。 |

### B.2 第 4.1 节 P1 候选

| 候选位置/主题 | 复核结论 | 处理结果或依据 |
|---|---|---|
| `zoteroHostCapabilityBroker.ts`：`markWritten` 批量 O(N²) | **确认存在，已修复** | 建立 observation entity index，只刷新当前 effect 影响的实体；未来目标 stale 时停止后续写入并补偿已完成 effect。 |
| `runtimeBridge.ts`：override 可能被全局候选覆盖 | **误报** | override 的契约是注入候选，不是强制最高优先级；候选仍按 runtime 完整度排序。未发现违反调用方或测试契约的路径。 |
| `runtimeFileRangeWorker.ts`：worker 无独立 ranges 配额 | **误报（纵深防御建议）** | 唯一发送方 `runtimeFileRangeReader` 已固定拆分为至多 1024 项/2 MiB，worker 不接收外部消息；当前不可达 P1。 |
| `standaloneGraphApp.ts`：未处理 host actions | **误报** | standalone projection 设置 `standaloneExport/standaloneGraphOnly`，组件隐藏或禁用 Host、分页、邻域扩展和返回动作；其 controller 只需处理本地 graph view/filter。 |
| `standaloneTopicApp.ts`：未处理 Reader host actions | **误报** | standalone Reader 禁用 Host update/export，并以本地数据处理 graph/digest；未发现可见控件能进入被“静默丢弃”的 Host 路径。 |
| `synthesisWorkbenchApp.ts`：chrome snapshot 未覆盖 surface snapshot | **误报** | chrome 与 surface 是有意隔离的独立通道。失败 surface 必须保留该 owner 最后一次成功内容；shell/chrome snapshot 不能充当 surface 已加载证据，强行同步反而违反页面硬约束。 |
| `zipBundleReader.ts`：zip bomb | **确认存在，已修复** | 与 V4 相同。 |
| `artifact.py`：越界文件被 move | **确认存在，已修复** | 与 V5 相同。 |
| `topicCanonical.ts`：Topic path 非单射 | **确认存在，已修复** | Topic path v2 改为最多 15 字符 slug 加完整 64-hex digest；无 slug 时使用完整 digest。TypeScript/Rust 共用 corpus，repository foundation 升至 v6，并在 canonical store 启动时验证、迁移和保留旧目录。 |
| `durableBundle.ts`：数组展开形成 O(N²) | **确认存在，已修复** | 复用已创建的 group 后直接 `push`，不再每次复制已有数组；25 万项级输入由确定性回归用例覆盖。 |
| `tagEffect.ts`：action union 仅一项 | **误报** | 当前协议只支持 `ensure_present`；request/receipt 强绑定是有效输入校验，不因 union 当前只有一个成员而失效。 |
| `workflow.ts`：`sourceRef` 与 `source_ref` 并存 | **误报（兼容投影）** | 结果 DTO 来自共享协议 schema，client 明确兼容读取两种命名；未发现二者被当作两个独立身份或产生安全/数据一致性后果。 |
| `deep_reading_runtime.py`：单行公式吞后文 | **确认存在，已修复** | 与 V11 相同。 |
| `zoteroHostNativeMutations.ts`：stored replacement 非原子 | **确认存在，已修复** | filesystem 与 Zotero DB 无法形成单一原子事务，现以 operation journal、内容 digest、阶段记录和串行 recovery tail 收敛；Host admission 前先恢复未完成 replacement。 |
| `zoteroHostNativeMutations.ts`：rollback 残余无人清理 | **部分成立，已修复** | 原实现的进程内失败路径会尽力回滚并保留 backup，未证实原报告暗示的即时字节丢失；但崩溃后确实没有恢复入口。现在按 metadata 与 old/new digest 决定提交或回滚，歧义状态返回 `repair_required` 并保留证据。 |
| Markdown sanitizer：`xlink:href`/`data:` | **确认存在，已修复** | sanitizer 同时检查 `href`、`src`、`xlink:href`；`data:` 仅允许图片元素的 `src`，链接和命名空间属性不再放行。共享与 generated renderer 同步。 |
| `acpConnectionAdapter.ts`：权限 Promise 永久挂起 | **确认存在，已修复** | 与 V7 相同。 |
| `acpTransport.ts`：timeout timer 泄漏 | **确认存在，已修复** | 与 V6 相同。 |
| `acpClientConnection.ts`：close 后已排队写仍执行 | **误报** | close 先停止新 admission，再等待当时的 `writeQueue`；成功等待意味着已接受写均完成，超时时 writer lock 仍阻止 close 与在飞 writer 并发取得底层 writer。未复现 write-after-close。 |
| publication runtime：在飞 flush 尾项滞留 | **确认存在，已修复** | 与 V8 相同。 |
| MCP 错误结构丢失 | **确认存在，已修复** | 与 V3 相同。 |
| Host Bridge body-before-auth/无连接上限 | **确认存在，已修复** | 与 V1 相同。 |
| Host Bridge 无效 token 反复 PBKDF2 | **确认存在，已修复** | 与 V2 相同。 |
| `synthesisProductionOwner.ts`：setup 失败后资源/owner 卡死 | **确认存在，已修复** | endpoint 或 supervisor 任一步 setup 失败都会清理已取得资源并清除未 ready owner；仍只允许显式 `recover()` 开始下一代，ready 后的恢复规则不变。 |
| sidecar supervisor stale generation 泄漏 | **误报** | 与第 5 节既有复核一致：`controlledStop` 与 generation 在 launch 多个边界重复校验，stale `fail` 返回是世代隔离的一部分。 |
| `legacy_ts_migration.rs`：legacy 列直接拼接 | **误报** | copy 前 `classify_legacy_ts_schema` 已逐表比对静态 `LEGACY_TABLES` 列集合，只接受列完全匹配或两个显式变体；动态值不能成为 SQL identifier，未知列会在 copy 前 fail-closed。 |
| `tag_concept_topic_graph.rs`：replace 绕过 stale gate | **误报** | replace API 接受的是 application 已验证、包含 index identity 的完整原子 snapshot，并以 expected hash/receipt CAS 提交；`promote_*_index` 服务于另一条 staged 路径，不能据此强制把完整 snapshot 改写为 stale。 |

### B.3 验证证据

- `openspec validate remediate-code-review-20260912-high-risk-findings --type change --strict --no-interactive`：通过。
- `npx tsc --noEmit`，以及 synthesis contracts/repository/application 三个独立 TypeScript 检查：通过；canonical literature validator freshness 检查通过。
- 变更涉及的 TypeScript/JavaScript 文件 ESLint：通过；Prettier 与 `cargo fmt --check`：通过。
- Rust：`synthesis-canonical-store` 28 项、`synthesis-repository` 68 项测试通过；`synthesis-protocol`、`synthesis-canonical-store`、`synthesis-repository` 的 all-target clippy 以 `-D warnings` 通过。
- 26 项定向 Node/Mocha 行为测试通过，覆盖 Host request 两阶段读取、连接上限、master-token 缓存、MCP 错误、ZIP 配额、ACP permission/timer/publication、attachment recovery、Broker stale target、generated parity、公式边界、Markdown URL sanitizer、production owner、durable bundle 和 Topic 跨语言 identity。
- `git diff --check`：通过。未运行 Zotero GUI/真实插件进程；本轮改动均由 Node、Rust 或现有 mock seam 覆盖。
