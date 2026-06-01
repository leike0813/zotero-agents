# Synthesis Rebuild Runbooks

本文档定义 rebuild/reset/import 的工程执行骨架。机器可读版本见 [rebuild-contracts.yaml](./schemas/rebuild-contracts.yaml)。

## Runbook 总览

| Runbook ID | 操作 | 确认 | Progress | Override Policy |
| --- | --- | --- | --- | --- |
| `run.index.full_rebuild` | 重建 registry cache + graph structure（历史 ID） | required | item count + phase + epoch guard | preserve overrides / needs attention for orphan conflicts |
| `run.index.external_source_rebuild` | bulk/structural Zotero drift 后显式重建 registry cache + graph structure（历史 ID） | required | item count + phase + epoch guard | preserve committed state until final commit |
| `run.index.incremental` | bounded paper/artifact registry cache update（历史 ID） | none | determinate | preserve |
| `run.graph.structure_rebuild` | graph structure/light metrics | optional | determinate | no override mutation |
| `run.graph.layout_rebuild` | graph layout | none | determinate/phase | no override mutation |
| `run.topic.source_check` | explicit topic source manifest diagnostic | none | determinate | preserve |
| `run.topic.discovery_apply_match` | single-literature best-effort hints on digest apply | none | active topic count | preserve filters |
| `run.topic.discovery_repair` | bounded explicit discovery hint repair | none | bounded topic/literature count | preserve filters |
| `run.reset.synthesis_db` | 清 Synthesis DB runtime | double confirmation | table counts | clear by reset scope |
| `run.reset.clean_install` | 清 runtime + file residue | fixed phrase | table/file counts | clear by reset scope |
| `run.import.preview_apply` | bundle import | preview + apply confirm | file/row counts | policy-driven |

## `run.index.full_rebuild`

当前 runbook ID 保留历史 `index` 名称；目标语义是 full registry/graph cache rebuild，不是全 Synthesis 领域重建。

必需步骤：

1. UI/Host Bridge/CLI 显示确认。
2. 后端再次校验 approval 或 fixed confirmation。
3. 准备新的 `registry_epoch`（可映射到历史 `index_generation` 字段）和 rebuild stale guard。
4. Supersede old epoch/basis 的 registry/graph/topic discovery repair jobs；旧 worker final commit 必须因 stale basis no-op 或被拒绝。
5. 读取 Zotero items 和 artifact notes。
6. 在 final commit 前不得把半完成 registry cache facts 暴露为 ready snapshot。
7. Preserve durable effects / user overrides；orphan/hard-conflicted overrides 进入 Review & Overrides。
8. 重建 citation graph structure/light metrics，final commit 前不暴露为 ready graph state。
9. Do not plan topic source-check / freshness diagnostic work；不执行 discovery full backscan。
10. 短事务 final commit：替换相关 cache facts、推进 registry epoch、清理旧任务。
11. 写 job summary，刷新 Workbench。

禁止：

- 不得从 legacy JSON 自动恢复 registry cache。
- 不得保留旧 epoch/basis active jobs。
- 不得把 discovery candidate 当 topic source-check changed diagnostic。
- Rebuild final commit 前的中间 rows 不得作为 ready snapshot 暴露。

## `run.index.external_source_rebuild`

当 startup reconcile 记录 `bulk` 或 `structural` external source drift incident 后：

1. 普通启动路径不得继续 per-item fan-out。
2. UI/Host Bridge/CLI 必须显示 drift severity、bounded counts、examples 和 rebuild 影响。
3. 用户确认后才进入 full registry/graph cache rebuild runbook。
4. Rebuild 成功 final commit 前，Workbench 继续读旧 committed state 并显示 drift diagnostic。
5. Rebuild 成功后，清理或 supersede 对应 drift incident。
6. Rebuild 失败时保留旧 committed state，并显示 failed/retry/inspect。

禁止：

- 不得把 bulk drift 直接展开为大量 deletion reviews。
- 不得把 structural drift 当作 small drift 继续增量处理。
- 不得触发 topic source-check/discovery work。

## `run.index.incremental`

必需步骤：

1. 标记 bounded dirty events 为 `running`，写入 `run_id`、`scope`、可选 `basis_epoch/source_hash`、`started_at/updated_at`。
2. Materialize affected Zotero-bound literature facts。
3. Update references and reference resolutions。
4. Enqueue graph dirty if reference facts changed。
5. Do not compute topic impact from registry cache dirty events。
6. 如果当前 mutation 是 literature-digest apply，单独执行 apply-time discovery match。
7. Final commit 校验 run marker、basis/source version。
8. Complete、retry、failed 或 supersede event。

## Failure Recovery

- Full rebuild 失败在 final commit 前：保留旧 committed state，rebuild job 标记 `failed_retryable` 或 `needs_attention`。
- Review action stale guard 失败：不 materialize action，创建 Needs Attention 或新 review。
- After-commit ingestion 失败：不回滚核心事实，写 retryable job。
- Interrupted running jobs：由 startup maintenance 在 Zotero/plugin 启动时恢复。

## `run.reset.synthesis_db`

必需步骤：

1. 双重确认。
2. 后端校验确认短语。
3. 清 Synthesis runtime tables。
4. 保留 DB 文件、schema meta、非 Synthesis state。
5. 清 active Synthesis dirty/job rows。
6. 返回 table counts summary。

## `run.import.preview_apply`

必需步骤：

1. Read explicit bundle。
2. Dry-run diff。
3. 展示新增、覆盖、冲突、override policy。
4. 用户确认 apply。
5. Transactionally write DB facts。
6. Enqueue downstream invalidation events。
7. 返回 import summary。

Import 禁止成为 Workbench 热路径 fallback。
