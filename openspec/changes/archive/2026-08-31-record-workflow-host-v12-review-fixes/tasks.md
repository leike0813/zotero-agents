> 审计记录：以下工作已于 2026-08-31 全部实施并验证，全部任务按实际完成状态勾选。

## 1. Tag audit 证据链与排序（B1/H5/跨语言排序）

- [x] 1.1 B1：插件侧 `traverseLibraryItems` 改为缓冲 (ref, revision, tagDigest) tuple、completion 时按 (libraryId, key) 码元序排序后哈希；Rust 侧 synthesis-application 新增一致性单测；以 test/core/102 多 item 乱序用例验证。
- [x] 1.2 H5：删除 traversal 交付前的 revision 二次读取（TOCTOU），复用同一次 read 的 item.revision；以 test/core/102 及 traversal 相关用例验证。
- [x] 1.3 跨语言 tag 排序统一为码元序：`packages/synthesis-contracts/src/tags.ts` 的 rebuildAuditTags 与 broker `compareCanonicalTextCodeUnits`；以 contracts 与 broker 测试验证。

## 2. 内置包消费方迁移（B2/B3）

- [x] 2.1 B2：workflows_builtin 两处 `host.resources?.mode` 改为 `host.interactionMode`（literatureBundle.mjs、export-notes/hooks/applyResult.mjs）并同步测试 stub；以相关 workflow 测试验证。
- [x] 2.2 B3：literatureBundle.mjs 的 archive.withExtractedZip 改为 v12 (input, control, callback) 形态；以 literature-workbench 包测试验证。

## 3. Mutation 写路径 fail-closed 与门禁（H1/H2/H3）

- [x] 3.1 H1：item.updateTags 与 statusTags.transition 写路径 tag 读取 fail-closed（canonicalTags，读取失败/截断拒绝而非静默丢 tag）；以 mutation 相关测试验证。
- [x] 3.2 H2：snapshot feed 序列化（serializeLibrarySyncSnapshotItem）tag 读取 fail-closed，失败不签发 completion evidence；以 snapshot 相关测试验证。
- [x] 3.3 H3：attachments.updateMetadata/replaceFile/move/remove 增加 ordinary-role 门禁（note_image/note_payload 以 invalid_ref/wrong_kind 拒绝）；以 attachment mutation 测试验证。

## 4. Mutation admission 与幂等（M11a/M11b）

- [x] 4.1 M11a：未知 mutation operation 在 admission 以 stable unsupported_operation 拒绝（CANONICAL_MUTATION_OPERATIONS 集合）；以 admission 测试验证。
- [x] 4.2 M11b：retry_same_operation 的 failed terminal 不再 replay 陈旧失败，删除记录重新执行形成 successor attempt（zoteroHostMutationAuthority.ts）；以 mutation authority 重试测试验证。

## 5. Workflow Host 组合与 Synthesis facade（注入 broker/H4/H6/M13）

- [x] 5.1 withItemSnapshot 改用注入的 broker（createWorkflowLibraryItemSnapshotApi 工厂，workflowHostOwners.ts/hostApi.ts）；以 host 组合与 snapshot 测试验证。
- [x] 5.2 H4：synthesis facade 14 成员错误经 workflowHostErrorContract 归一化（normalizeWorkflowSynthesisError），tag_audit_operation_in_progress → conflict/operation_in_progress，sidecar 细节不进 details；以 test/core/240 验证。
- [x] 5.3 H6a：withAuditRun published 与 acknowledgeRegulation acknowledged 后触发 notifyChanged ledger invalidation；以 facade 测试验证。
- [x] 5.4 H6b：卡死 tag audit run 出口——sidecar begin 携带 active_run_ids，repository 回收同 host 不活跃 run（abandon_inactive_tag_audit_runs_for_host），facade 维护 activeTagAuditRunIds + begin 串行队列；以 Rust 与 facade 测试验证。
- [x] 5.5 M13a：re-promote 幂等命中返回已持久化 snapshot（repository promote 返回 TagAuditPromoteOutcome），不再返回未落库的新 revision；以 Rust repository/application 测试验证。
- [x] 5.6 M13b：acknowledgeRegulation 在 signal aborted 时抛 stable canceled，不再伪造 stale outcome；以 facade 测试验证。

## 6. Runtime 控制接线与 file/archive 契约（M5a/M5b+M9）

- [x] 6.1 M5a：workflow runtime 每次 hook run 创建 AbortController，scoped hostApi 注入 defaultControl 与 inputScope（src/workflows/runtime.ts、hostApi.ts）；以 runtime 取消语义测试验证。
- [x] 6.2 M5b+M9：file/archive/metadata 成员接线 control 取消检查；file/archive 错误改 stable taxonomy；makeDirectory recursive；picker DTO（initialDirectory/filters）对齐；materializeWorkflowInputFile 接线 scoped factory；archive DTO 对齐 ADR §13.2（{entries}、content discriminated union、sizeBytes、duplicate case-fold 统一、写后复核）；workflows_builtin 六个包文件同步；以 file/archive 测试与包测试验证。

## 7. Owner DTO 对齐（M6/M7/M8/M10/M12）

- [x] 7.1 M6：related-item mutation DTO 对齐 ADR §6（outcome 枚举 + sourceRevision + 端点校验）；以 related mutation 测试验证。
- [x] 7.2 M7：StableIssueDto 对齐 ADR §3.9 五变体 closed union，materialize 路径区分 missing/permission_denied/unreadable；以 materialize/bibliography 测试验证。
- [x] 7.3 M8：collection mutations 补齐校验（placement cycle/同库 parent、membership 统一 helper、remove preview 有界分页、canonicalCollectionVersion fail-closed）；以 collection mutation 测试验证。
- [x] 7.4 M10：snapshot item DTO 对齐 ADR §5.9（structured creators、identifiers 等），同步 host-bridge capabilities.v2.json 与 materialized surfaces、test/core/173 fixture；以 test/core/173 与 surface 校验验证。
- [x] 7.5 M12：editor.openSession 不再静默丢弃 detached:true（detached 绕过 caller queue）；以 editor owner 测试验证。

## 8. 静态门禁与低危清扫

- [x] 8.1 静态门禁补强：test/node/core/187 forbidden 列表新增 Zotero.File、resources.mode、已删 logging 测试成员、archive v11 形态启发式；删除两处死调用；以 test/node/core/187 验证。
- [x] 8.2 低危清扫：删除 handlers.command 空实现及无行为测试、bibliography.ts 死代码 exportZoteroItemsAsText、broker searchItems shim；zipBundleReader 收编到 platform subprocess seam；handlers/index.ts ensureFileFromPath 改经 runtimePersistence；openspec 旧 tasks.md 中 §9.12 telemetry 完成状态更正；以全量测试验证无回归。

## 9. 全量验证（已执行）

- [x] 9.1 `npx tsc --noEmit` 通过。
- [x] 9.2 test/core + test/node/core 全量 3214 passing / 0 failing。
- [x] 9.3 test/workflow-* 全量 254 passing / 0 failing。
- [x] 9.4 Rust synthesis-application + synthesis-repository 96+61 passed / 0 failed。
