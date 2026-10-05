
# src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts
所属分层：[Zotero 宿主与 Bridge 集成](../../../../../layers/zotero-host.md)  
所属目录：[src/modules/hostBridge/workflow](../../../../../modules/src/modules/hostBridge/workflow.md)
<!-- node: file:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts -->

Agent Run 持久化存储：以插件状态库记录 handoff 的生命周期状态机、租约、续期与 apply receipt，并在重启后做遗留记录恢复。
源码：[src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts](../../../../../../../src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts)

## 符号（11）
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:abandonHostBridgeAgentRunRecord -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:createHostBridgeAgentRunRecord -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:finishHostBridgeAgentRunRecord -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:getHostBridgeAgentRunApplyReceipt -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:hasCompleteHostBridgeWorkflowSelection -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:markExpired -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:recordHostBridgeAgentRunApplyReceipt -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:recoverHostBridgeAgentRunStoreAfterRestart -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:renewHostBridgeAgentRunRecord -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:sealHostBridgeAgentRunRecord -->
<!-- node: function:src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts:transition -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| abandonHostBridgeAgentRunRecord | 函数 | 292–313 | 简单 | host-bridge、agent-run、cleanup、state-machine | 0 | 放弃一条 run 记录并释放其占用的文件与租约资源。 |
| createHostBridgeAgentRunRecord | 函数 | 201–219 | 简单 | host-bridge、agent-run、persistence、state-machine | 0 | 创建一条新的 agent run 记录并置为 pending，是 durable insert 的唯一赢家入口。 |
| finishHostBridgeAgentRunRecord | 函数 | 315–330 | 简单 | host-bridge、agent-run、state-machine、persistence | 0 | 把 run 记录推进到终结态并写入终态证据，供后续查询与重放判定使用。 |
| getHostBridgeAgentRunApplyReceipt | 函数 | 353–369 | 简单 | host-bridge、agent-run、query、receipt | 0 | 按 run id 读取 apply 回执，供 Bridge/MCP/CLI 观察 canonical 执行结果。 |
| hasCompleteHostBridgeWorkflowSelection | 函数 | 120–143 | 简单 | host-bridge、agent-run、selection、validation | 1 | 校验选区事实是否完整可用，任一 portable ref 缺字段即判定为不完整。 |
| markExpired | 函数 | 221–235 | 简单 | host-bridge、agent-run、lease、state-machine | 0 | 把超时未续期的 run 记录标记为 expired，使其不再参与续接与重放。 |
| recordHostBridgeAgentRunApplyReceipt | 函数 | 332–351 | 简单 | host-bridge、agent-run、receipt、persistence、core | 0 | 记录 apply 结果的终态回执，包含成功证据或失败分类，是 canonical 结果的事实源。 |
| recoverHostBridgeAgentRunStoreAfterRestart | 函数 | 371–404 | 中等 | host-bridge、agent-run、recovery、persistence、core | 0 | 插件重启后扫描未终结的 run 记录，清理过期项并把 started 记录归类为 unknown。 |
| renewHostBridgeAgentRunRecord | 函数 | 279–290 | 简单 | host-bridge、agent-run、lease、persistence | 0 | 续期 run 租约，阻止长时间运行的 Agent 交接被判定为过期。 |
| sealHostBridgeAgentRunRecord | 函数 | 267–277 | 简单 | host-bridge、agent-run、state-machine、immutability | 0 | 封存已交付给 Agent 的 run 载荷，冻结身份绑定防止后续被改写。 |
| [transition](../../../../../symbols/src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRunStore.ts/transition.md) | 函数 | 176–199 | 简单 | host-bridge、agent-run、state-machine、validation、core | 4 | 状态机迁移内核：校验允许的迁移路径并落盘，非法迁移直接拒绝。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeWorkflowControl.ts](hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |
| [pluginStateStore.ts](../../pluginStateStore.ts.md) | src/modules/pluginStateStore.ts | 插件侧持久化门面：基于 SQLite 暴露任务、运行、文献迁移与变更权威等表的读写 API，并聚合 core 与各表模块，是插件状态的事实源入口。 |
| [selectionContext.ts](../../selectionContext.ts.md) | src/modules/selectionContext.ts | 选区上下文模块：通过 Broker 获取一次性锁定的有序 canonical 选区事实，产出不携带原生 ID 的 portable 引用供工作流与 Host Bridge 使用。 |
| [taskRetentionPolicy.ts](../../taskRetentionPolicy.ts.md) | src/modules/taskRetentionPolicy.ts | 任务记录保留策略的单一事实源，导出统一的保留时长常量，供 Host Bridge operation store、Dashboard history 等持久化层共同引用。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostBridgeServer.ts](../server/hostBridgeServer.ts.md) | src/modules/hostBridge/server/hostBridgeServer.ts | Host Bridge HTTP server 主体：绑定监听端口、分发到 capability/诊断/文件/synthesis/工作流路由、维护 operation 幂等存储与 supervisor 恢复，并发布 well-known profile。 |
| [hostBridgeWorkflowAgentRun.ts](hostBridgeWorkflowAgentRun.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowAgentRun.ts | Host Bridge Agent Run 交接构建：把工作流请求投影为 Agent 可消费的 handoff 载荷，包含锁定的选区事实、协议指引、输出契约与 apply-back 指令。 |
| [hostBridgeWorkflowControl.ts](hostBridgeWorkflowControl.ts.md) | src/modules/hostBridge/workflow/hostBridgeWorkflowControl.ts | Host Bridge 工作流控制面：向 Bridge/MCP/CLI 暴露工作流目录、提交、Agent Run 交接与结果 apply、任务与 run 查询、通知投影和取消等全部代理面向能力。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| abandonHostBridgeAgentRunRecord | 函数 | 292–313 | 放弃一条 run 记录并释放其占用的文件与租约资源。 |
| createHostBridgeAgentRunRecord | 函数 | 201–219 | 创建一条新的 agent run 记录并置为 pending，是 durable insert 的唯一赢家入口。 |
| finishHostBridgeAgentRunRecord | 函数 | 315–330 | 把 run 记录推进到终结态并写入终态证据，供后续查询与重放判定使用。 |
| getHostBridgeAgentRunApplyReceipt | 函数 | 353–369 | 按 run id 读取 apply 回执，供 Bridge/MCP/CLI 观察 canonical 执行结果。 |
| hasCompleteHostBridgeWorkflowSelection | 函数 | 120–143 | 校验选区事实是否完整可用，任一 portable ref 缺字段即判定为不完整。 |
| recordHostBridgeAgentRunApplyReceipt | 函数 | 332–351 | 记录 apply 结果的终态回执，包含成功证据或失败分类，是 canonical 结果的事实源。 |
| recoverHostBridgeAgentRunStoreAfterRestart | 函数 | 371–404 | 插件重启后扫描未终结的 run 记录，清理过期项并把 started 记录归类为 unknown。 |
| renewHostBridgeAgentRunRecord | 函数 | 279–290 | 续期 run 租约，阻止长时间运行的 Agent 交接被判定为过期。 |
| sealHostBridgeAgentRunRecord | 函数 | 267–277 | 封存已交付给 Agent 的 run 载荷，冻结身份绑定防止后续被改写。 |
