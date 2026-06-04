# Step 06 Cross-Paper Evidence Map

本文件是可选扩展材料；硬约束以 `SKILL.md` 为准；gate 输出和 JSON schema 是执行时补充约束。

## Payload schema

本阶段没有 agent-authored payload schema。`runtime/payloads/cross-paper-evidence-map.json`
由 runtime 生成并校验；agent 不提交该文件。

## 当前主路径

Stage 6 不再要求 agent 手写 `runtime/payloads/cross-paper-evidence-map.json`。
主路径是：

```bash
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action export_cross_paper_context
python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --action derive_cross_paper_evidence_map
```

runtime 会根据已校验 `paper_unit` 派生跨论文 evidence map、候选 ids 和最终 artifact 中的
`evidence_map` section。agent 在后续 Stage 7/8/10 中只写语义内容和 `source_paper_refs`；
runtime 会将这些 paper refs 转成稳定 `evidence_refs` 与 `evidence_map_refs`。

## Agent 职责

- 不创建、不编辑 `runtime/payloads/cross-paper-evidence-map.json`。
- 不发明 candidate id、`evidence_map_refs` 或 paper evidence id。
- 在需要说明证据来源的对象上写 `source_paper_refs`，值必须来自当前 resolved paper set。
- 继续基于 `runtime/views/cross-paper-context.md` 和已校验 paper units 做语义综合。

## Runtime 职责

- 写入 `runtime/views/cross-paper-context.md`、`runtime/views/external-literature-context.md`、
  `runtime/views/cross-paper-context.manifest.json` 和 `runtime/views/cross-paper-evidence-index.json`。
- 派生并登记 `runtime/payloads/cross-paper-evidence-map.json`。
- 维护 `cross_paper_evidence_map_candidate_ids` 与 candidate counts。
- 在后续 stage 校验时补齐并验证 `evidence_refs` / `evidence_map_refs`。

如果 gate 要求 `derive_cross_paper_evidence_map` 失败，优先检查 Stage 5 是否已经完成所有
paper units，以及 resolved paper set 是否非空。
