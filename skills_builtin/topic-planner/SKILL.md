---
name: topic-planner
description: Inspect a Zotero literature library and incrementally create, revise, stale, or reactivate Planned Topics plus relation proposals. Use when users need a library-wide topic organization plan, want to refresh topic coverage after the library changes, or need topic skeletons before parallel topic synthesis.
---

# Topic Planner

## 目标

在生成综述内容之前，先建立可复用的 Topic 结构。每次运行都读取当前文献库、Topic
Graph、Planned Topics 和 materialized Topics，重新计算覆盖情况，再决定是否提交原子结构
变更。允许没有变更。

本 Skill 只负责结构：Planned Topic 定义、resolver、生命周期、relations 和 update 建议。
不生成 topic synthesis 正文，不改写 materialized Topic 的定义或 artifact，不保存 Planned
Topic 的临时论文列表。

## 必需工具与输入

必须能使用工作区注入的 `zotero-bridge`。先读取 `zotero-bridge-cli` wrapper Skill 的
command catalog 和本次选择的命令卡。静态命令卡与 live descriptor 不一致时，停止并报告
release identity 漂移。

优先使用工作区 shim：

- POSIX：`./.zotero-bridge/bin/zotero-bridge`
- Windows：`.\.zotero-bridge\bin\zotero-bridge.cmd`
- shim 不存在时才使用 `zotero-bridge`

必需 Host 命令：

- `synthesis topic get-planning-context`
- `synthesis artifact resolve-topic-digest`，仅在 metadata 不足时使用

运行参数 `language` 控制 Planned Topic 标题、定义和说明文字的语言；它不改变文献原始
metadata。

## 不变量

- 覆盖分母是 planning context 中全部 top-level regular items。
- 每篇论文恰好有一个 primary coverage state：`materialized_covered`、
  `planned_covered`、`uncovered`、`indeterminate`。
- 多 Topic 匹配单独写入 `overlaps`，不能替代 primary state。
- materialized coverage 优先于 planned coverage。
- Planned Topic 只保存 title、definition、aliases、include/exclude scope、resolver、
  revision、basis、provenance 和 lifecycle。
- 不在 Planned Topic 或 plan 中加入 `paper_ids`、`papers`、`members` 等临时 membership。
- Planner 只能创建或修改 placeholder；不得通过 topic action 修改 materialized node。
- `mark_stale` 可逆，不删除、不归档；stale Topic 不供 Create workflow 选择。
- relation 使用明确方向；无方向关系由宿主按 canonical tuple 归一。
- 已 confirmed/rejected 的 relation 决策不可被新 proposal 覆盖。
- 最终批次必须携带 context 中的 `base_graph_hash` 与 `library_index_hash`。

## 脚本合同

`scripts/topic_planner.py` 是确定性检查入口。不要修改其输出后声称已通过验证。

```text
python scripts/topic_planner.py summarize --context CONTEXT_JSON [--batch-size 24]
python scripts/topic_planner.py validate --context CONTEXT_JSON --coverage COVERAGE_JSON --plan PLAN_JSON
```

`summarize` 校验 context，并按稳定 paper_ref 顺序产生 metadata batches。`validate` 校验覆盖
互斥性、分母完整性、Graph CAS 字段、topic actions、relation targets 和禁止 membership
字段；成功时输出规范化 plan。任一命令失败都必须修正输入后重跑。

## 阶段 0：读取完整 planning context

1. 创建 run workspace 下的 `runtime/` 与 `result/` 目录。
2. 运行：

   ```text
   <zotero-bridge> synthesis topic get-planning-context --query '{"outputPath":"runtime/topic-planning-context.json","overwrite":true}'
   ```

3. 本地 delivery 直接读取指定文件。远程 profile 返回 `delivery.mode=bridge-download` 时，
   严格执行返回的 `downloadCommand` 和 `unpackHint`，再读取 bundle 内 JSON。
4. 运行 `summarize`。保留其 library hash、graph hash、paper batches 和 Topic 生命周期摘要。
5. context 声明 truncated 时，不能据此做全库计划；改用 outputPath 获取完整 snapshot。

失败处理：

- `output_exists`：确认目标属于当前 run workspace，再以 `overwrite:true` 重试。
- bridge-download 失败：按 file download 命令卡检查 fileId 和目标路径，不改用 raw API。
- graph/context schema 不完整：停止，不猜测 hash、topic identity 或遗漏论文。

## 阶段 1：从 metadata 计算覆盖

依次处理 `summarize` 返回的 batches。对每篇论文：

1. 只用 title、creators、year、tags、collections 和既有 Topic 定义/resolver 做初判。
2. 若匹配 materialized Topic，primary state 为 `materialized_covered`。
3. 否则若匹配 active Planned Topic，primary state 为 `planned_covered`。
4. 没有可靠匹配且 metadata 足以排除现有 Topic 时，标记 `uncovered`。
5. metadata 含糊、术语冲突或需正文语义才能判断时，标记 `indeterminate`。
6. 所有匹配 Topic IDs 写入 `topic_ids`；多于一个时同时写入 `overlaps`。

把结果写到 `runtime/topic-coverage.json`，结构必须符合
`assets/schemas/topic-coverage.schema.json`。`reason` 应简短说明可复核依据，不写综述。

## 阶段 2：只为不确定批次升级证据

只处理 `uncovered` 和 `indeterminate`，优先处理可能形成稳定 topic cluster 的批次。

1. 从 context 的 paper row 读取 `paper_ref`；若 row 同时提供 digest reference，也一并保留。
2. 按命令卡以 `paper_ref`（以及可用的 digest reference）运行 `synthesis artifact resolve-topic-digest`。
3. 每篇 digest 只用于确认主题归属、边界和命名；不做跨论文内容综合。
4. 更新 coverage entry。仍无足够证据时保留 `indeterminate`，不要强行归类。
5. 没有 digest 或 digest 不可读属于证据不足，不无限重试。

不得为 `materialized_covered` 或已明确 `planned_covered` 的论文批量读取 digest。

## 阶段 3：设计增量 Topic 结构

按以下顺序选择动作：

1. active Planned Topic 仍有清晰边界：保持不变。
2. 定义或 resolver 需要调整：`update`，revision 必须递增。
3. Planned Topic 不再有独立用途：`mark_stale`。
4. stale Planned Topic 再次适用：`reactivate`，复用原 topic_id。
5. 存在稳定、可解释的 uncovered cluster：`create`。
6. 证据不足或只有零散论文：不创建，保留 uncovered/indeterminate。

新 topic_id 必须稳定、可读，不得与 context 中任何节点冲突。create/update 必须给出：

- `title`、`definition`、`aliases`
- `scope.include` 与 `scope.exclude`
- 可由 `synthesis resolver resolve` 执行的 `resolver`
- 正整数 `revision`
- `basis`，引用 library index、coverage 结论或已读取的 digest refs

Planner 可以为 materialized Topic 写 `recommended_updates`，但不得为它创建 update action。

## 阶段 4：规划 relations

在所有节点动作确定后统一规划：

- `broader_than`：source 是较宽 Topic，target 是较窄 Topic。
- `related_to`：语义相关但无稳定层级。
- `overlaps_with`：研究范围实质交叠。
- `contrasts_with`：边界或结论形成明确对照。

relation target 必须是本次 action 后存在的节点或 context 中已有节点。每条 proposal 提供
0 到 1 的 confidence、简短 evidence refs，并在 provenance 中写
`{"producer":"topic-planner"}`。不要制造 self-edge，不要重复 canonical tuple。

## 阶段 5：验证并输出原子 plan

写入 `result/topic-plan.json`：

```json
{
  "kind": "topic_plan",
  "operation": "reconcile",
  "base_graph_hash": "<context topic_graph.manifest.manifest_hash>",
  "library_index_hash": "<context library.index_hash>",
  "topic_actions": [],
  "relation_proposals": [],
  "coverage_manifest_path": "runtime/topic-coverage.json",
  "recommended_updates": []
}
```

执行 `validate`。只使用验证成功时输出的规范化对象作为最终业务 JSON。最终 ACP final
branch 必须包含 `__SKILL_DONE__: true`，并附带该业务对象；output schema 本身不含
`__SKILL_DONE__`。

空变更合法：保留两个 hash，使用空 actions/proposals。宿主会返回 `no_change`。

## Apply 结果与恢复

- `persisted`：全部结构在一个 graph transaction 中提交。
- `no_change`：没有语义变化。正常完成。
- `already_applied`：同一语义 plan 已存在。正常完成，不重建 topic_id。
- `conflict`：Graph 已变化或 plan 违反约束。重新从新的 planning context 开始；不要只替换
  `base_graph_hash` 后重放旧判断。
- `coverage_stale: true`：提交期间 library index 漂移。结构仍有效，但覆盖已过期；立即再运行
  Planner，不回滚已提交结构。

完成后，可对 active Planned Topics 分别运行 Create Topic Synthesis。Create 会重新执行保存的
resolver，并把同一 placeholder topic_id materialize。多个 Planned Topic 的 Create 可以并行；
Planner 已提前建立它们之间的 relation proposals。
