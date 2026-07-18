## Context

受控词表当前由 Synthesis repository 持久化，并通过多条保存、导入、同步和 staged promotion 路径更新。workflow apply hook 可以修改 Zotero 条目，却没有统一的 builtin 状态接口。旧 Tag Standard 同时把 `status` 当作单值阅读进度，并保留 `match_status`/`matching_status`，与实际 workflow 待办需求冲突。

## Goals / Non-Goals

**Goals:**

- 以一个 builtin policy SSOT 定义五个稳定 status key/tag 及字段治理规则。
- 在插件启动完成前创建或升级 builtin 词表定义，并让所有词表写入口持续恢复不变量。
- 区分受控词表定义与文献标签实例，向 workflow 暴露最小、幂等、结构化的状态转换接口。
- 让成功产物和对应待办状态保持可审计的一致关系，同时不因状态写入失败回滚产物。
- 在 UI、host command、Bootstrapper 和 Regulator 边界同时阻止越权修改。

**Non-Goals:**

- 不迁移或删除数字阅读状态及其他自定义 `status:*`。
- 不监听用户手工添加 PDF，不因产物删除自动重排待办。
- 不内建 translation 状态，不让 Translation/Explainer 参与转换。
- 不修改任何 skill submodule 或 submodule 指针。

## Decisions

### 1. Builtin policy 是唯一事实源

`builtinTagPolicy.ts` 定义 `status` facet、五个稳定 key/tag、说明、`source: builtin`、不可变字段和可编辑字段。builtin 身份由精确 tag 派生，不修改数据库 schema。其他模块只引用 policy API，不复制词表常量。

### 2. 规范化发生在每次词表持久化边界

词表初始化和所有保存、导入、同步恢复、staged promotion 共用 policy 规范化：补齐缺失 builtin，恢复 tag/facet/source/deprecated/replacement，保留或接纳 note/aliases。未知自定义 `status:*` 原样参与普通治理。

### 3. 启动采用 fail-closed

`onStartup()` 在 Synthesis persistence 可用后显式等待 repository 与 builtin vocabulary 初始化，并在成功后才设置 `addon.data.initialized = true`。失败保留结构化启动错误并阻止完成标记。

### 4. Workflow API 只操作条目实例

`WorkflowHostApi.statusTags.getPolicy()` 返回只读 key/tag 映射；`transition()` 验证 policy 已初始化、稳定 key 有效且 add/remove 无交集，然后幂等修改指定文献条目的标签实例并返回 `added`、`removed`、`warnings`。该 API 不创建或修改词表定义。

### 5. 产物优先，状态更新是可报告的后置步骤

各 apply hook 仅在正式产物成功时执行状态转换。状态写入失败不回滚已成功产物，而是在 apply 结果中追加结构化 partial warning。skipped、failed、canceled 或尚未完成正式 apply 的路径不清理状态。

### 6. 防护是纵深的

Workbench 通过模型标识和禁用控件表达 builtin；host command 再验证删除与身份修改。Bootstrapper apply 过滤同 tag 候选；Regulator apply 过滤 builtin add/remove 并记录 diagnostic，保证旧 submodule 也无法越权。

## Risks / Trade-offs

- 多个持久化入口若绕过统一 repository API 可能造成短暂漂移；通过搜索所有写入口、集中规范化和回归测试降低风险。
- Zotero 条目标签 API 的事务行为有限；转换采用幂等操作和结构化 warning，避免以回滚产物扩大损失。
- submodule 标准会在本仓库变更后暂时漂移；非 submodule apply 防护保证运行时安全，并通过交付方案追踪后续修改。
