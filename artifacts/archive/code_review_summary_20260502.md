# GPT-5.5

高：ACP SkillRunner 的 bundle 结果契约没有兑现，会让部分工作流 apply 阶段失败。
acpSkillRunnerOrchestrator.ts (line 871) 把默认 fetchType 设为 bundle，但返回值只带 resultJson/responseJson，没有 bundleBytes 或 bundleDir；applySeam.ts (line 337) 在没有 bundle 时会传入 unavailable reader。已有 mineru applyResult (line 382) 明确要求 bundleReader.getExtractedDir()，因此 ACP 后端一旦用于这类 skillrunner.job.v1 工作流会失败。更明显的是测试还在断言 result.bundleDir 为 undefined (line 732)。建议把已实现的 projectAcpSkillRunnerBundle() 接入 orchestrator，并在返回 fetchType: "bundle" 时填 bundleDir；或者限制 ACP 兼容只开放给已迁移到 resultContext 的工作流。

中：插件内置 skill 根目录的 file:// 转换是 Windows-only，macOS/Linux 会扫不到打包内置 skills。
pluginSkillRegistry.ts (line 89) 对所有 file URI 都执行 pathname.replace(/\//g, "\\")。例如 file:///Users/me/addon/ 会变成 \Users\me\addon，再经 joinPath 可能变成非绝对路径，导致 getDefaultBuiltinSkillRoot (line 118) 指向错误位置。现有测试只覆盖了 D:/... 的 Windows URI，建议补 POSIX file URI 测试，并按运行平台保留 / 或只对 /D:/... 这类 Windows drive URI 特判。

中：runtime persistence 清理分类和实际持久化域不一致，可能误删或残留 ACP run 记录。
ACP skill run 记录持久化在 PLUGIN_TASK_DOMAIN_ACP 的 skill-runs scope：acpSkillRunStore.ts (line 187)、acpSkillRunStore.ts (line 646)。但 cleanupRuntimePersistenceCategory (line 761) 清理 acp-conversations 时调用 clearPluginTaskDomain("acp")，会删除整个 ACP domain，包括 skill-runs；而 acp-skill-runs (line 764) 只删目录，不清 DB rows 和内存缓存。建议提供按 scope 清理的 API，分别清 active/history 与 skill-runs，并让 acp-skill-runs 同步清理 store 内存。

# DeepSeek-v4-pro

高优先级
1. 本地化缺失 — ~80 个 i18n key 在 ja-JP 和 fr-FR 中缺失

check:localization-governance 失败，所有 ACP 相关的新 key（task-dashboard-acp-*、task-dashboard-home-acp-* 等）在日文和法文 locale 文件中完全缺失。这会导致日本和法国用户在界面上看到原始 key 名而非翻译文本。

修复建议：补齐 addon/locale/fr-FR/preferences.ftl 和 addon/locale/ja-JP/preferences.ftl。

2. 生产代码中包含测试辅助函数 — zoteroMcpServer.ts:2280-2465

configureZoteroMcpServerForTests、handleZoteroMcpHttpRequestForTests、handleZoteroMcpRequestForTests、serializeZoteroMcpResponseForTests、resetZoteroMcpServerForTests 等函数直接定义在生产模块中。这会增大打包体积，且存在测试代码被产品代码意外调用的风险。建议将这些函数抽取到独立的 test helper 模块中。

3. 过多空 catch 块静默吞错误 — zoteroMcpServer.ts

7 处空 catch 块（行 1023, 1054, 1522, 1872, 2019, 2132, 2138, 2266），例如：


// line 2019
try {
  state.serverSocket?.close?.();
} catch {
  // Best effort.
}
虽然部分场景（如 close()）确实可接受静默，但 startServer 中端口扫描失败（line 2212）直接忽略错误直到所有端口用尽，丢失了调试信息。建议至少记录到 runtime log。

4. 模块级可变全局状态 — zoteroMcpServer.ts:246-256


const circuitBreakers = new Map<string, CircuitBreakerRecord>();
let restartCount = 0;
let lastRestartAt = "";
let lastFatalError = "";
let descriptorStale = false;
// ... 共约10个模块级可变变量
这些变量使得模块不可重入，测试之间需要通过 resetZoteroMcpServerForTests() 手动清理状态，容易在测试间泄漏状态。建议封装为一个 ServerRuntime 类或单一 state 对象。

中优先级
5. 巨型文件违反单一职责原则

文件	行数
zoteroMcpServer.ts	2466
zoteroHostCapabilityBroker.ts	1417
zoteroMcpProtocol.ts	1147
zoteroMcpServer.ts 同时承担：HTTP Server、JSON-RPC 路由、并发队列、熔断器、健康监控、运行时日志、请求审计、watchdog 重启、Token 管理。建议拆分为独立的职责模块。

6. generateToken() 降级方案不安全 — zoteroMcpServer.ts:744


return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
在 crypto.getRandomValues 不可用时，退回使用 Math.random() + Date.now()，这个组合是可预测的。对于 Bearer token 而言这是一个安全风险。

7. DIY HTTP 解析器缺少边界情况处理 — zoteroMcpServer.ts:827-886

手动实现的 HTTP 请求解析器 (parseHttpRequest, tryParseHeaders, readInputStream) 处理了基本路径，但可能存在以下风险：

Transfer-Encoding: chunked 未处理（虽然当前 MCP 客户端不太可能使用）
请求头大小写处理依赖调用方规范
readInputStream 中的 busy-loop (while (Date.now() - startedAt < 500)) 可能在高负载下阻塞
8. void 模式可能丢失 Promise 拒绝 — zoteroMcpServer.ts


void guardedRun.then(...).catch(...)   // line 393
void startingPromise.catch(() => {});  // line 2043
void listener(event);                  // line 723
void shutdownZoteroMcpServer();        // line 2281
startingPromise.catch(() => {}) 在第 2043 行静默丢弃所有异常，且注释说 "keep the current ACP session alive"，但空 catch 意味着即使是关键错误也无法追踪。

低优先级
9. 代码格式化

Prettier 检查发现 383 个文件存在格式问题，建议运行 npm run lint:fix 统一格式化。

10. (globalThis as any) 模式广泛使用

虽然这是 Zotero 插件访问 Mozilla XPCOM API 的不可避免方式，但在 zoteroMcpServer.ts 和 zoteroHostCapabilityBroker.ts 中出现了约 15+ 次。建议封装一个 getZoteroRuntime() / getMozillaComponents() 工具函数统一处理。

11. getAllRegularZoteroItems() 的线性扫描 — zoteroHostCapabilityBroker.ts:716-728

id 从 1 到 50000 的线性扫描在大型库中效率不高。虽然已有 getAll() 优先路径，但降级路径的 O(n) 扫描可以作为优化点。

# qwen3.6-plus

🔴 严重（需修复）
全局运行时竞争条件 — src/workflows/runtime.ts:335-370
globalThis.__zsCurrentWorkflowExecutionRuntime 在并发工作流下会被互相覆盖，导致 hook 代码读到错误的上下文。

PowerShell 命令注入 — src/modules/windowsCommandResolution.ts:474
仅用 '' 转义单引号不够。含反引号 (`) 或 $() 的命令可在 PowerShell 子进程中执行任意代码。

stderr 无界内存泄漏 — src/modules/acpTransport.ts:605-606
stderrChunks 数组持续增长，每次 getStderrText() 都重新全量拼接。长时间运行的 session 会持续消耗内存。

管道死锁风险 — src/modules/acpTransport.ts:349-363
drainMozillaPipe 的 while(true) 循环无超时，若子进程挂起但不关闭 stderr，close() 将永远阻塞。

XSS 风险 — src/modules/taskManagerDialog.ts:634
innerHTML 渲染来源不可信的 Markdown，正则过滤 HTML 可被 SVG-based XSS 绕过。

🟡 中等（建议修复）
shutdownAcpSessionManager 调用测试工具 — src/modules/acpSessionManager.ts:2323
resetZoteroMcpServerForTests() 在生产环境 shutdown 时被调用。

clearAcpConversationState TOCTOU 竞态 — src/modules/acpConversationStore.ts:1093-1110
读索引与删索引之间存在窗口，并发调用可能重建已删除的索引。

getAdapter 双重检查锁定缺陷 — src/modules/pluginStateStore.ts:1032-1066
两个并发调用可能同时通过 !initialized 检查，第二个可能看到部分初始化的 DB schema。

resetPluginStateStoreForTests 不清内存表 — src/modules/pluginStateStore.ts:1503-1513
删除 SQL 行后未清空 memoryTables Map，内存 adapter 后续测试会看到脏数据。

upsertBuiltinBackends 不更新已有 builtin — src/modules/backendManager.ts:100-115
找到已有 ID 后什么都不做，插件更新后 builtin 配置不会刷新。

hydrateSnapshot 覆盖活跃状态 — src/modules/acpSessionManager.ts:215-226
插件重启时将 "prompting" 等状态重置为 "idle"，pendingPermissionRequest 被丢弃。

onClose 与 suppressCloseEvent 时序脆弱 — src/modules/acpSessionManager.ts:1281-1352
若 close() 异步触发，suppressCloseEvent 设置前回调可能已执行。

replyAcpSkillRun 错误事件累积 — acpSkillRunStore.ts:1223-1232
无 controller 时每次重试都 upsert 一条失败事件，store 中错误事件持续累积。

命令解析函数重复代码 — src/modules/windowsCommandResolution.ts:372-448
三个函数结构完全相同，应提取为一个通用函数。

🟢 低优先级（技术债）
openBackendManagerDialog 过长函数 — src/modules/preferenceScript.ts:1329-1553（225行），应拆分为 UI 构建/事件绑定/数据持久化。

Dashboard 三处重复验证逻辑 — app.js:51-87、workflow-settings-dialog.js:128-172、app.js:954-979。

Dashboard renderRow 重复 — app.js:656、app.js:734、app.js:843 三处几乎相同的 <td> 创建代码。

硬编码英文 confirm — app.js:1471 未使用 data-l10n-id 或 localize()。

消息监听器未校验 payload 结构 — app.js:501-517，恶意消息可使 render() 崩溃。

ACP message 无长度限制 — contracts.ts:209-226，超长消息可能导致下游 JSON 解析失败或 stdin buffer 溢出。

测试时序脆弱 — 多处使用固定迭代上限的 setTimeout 轮询（96-acp-session-manager.test.ts:1408、35-workflow-settings-execution.test.ts:144、40-gui-preferences-menu-scan.test.ts:844-846），慢速 CI 下可能 flake。