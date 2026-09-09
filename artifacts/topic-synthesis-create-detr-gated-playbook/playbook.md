# DETR create topic synthesis 全仿真 playbook

## 运行摘要

- topic seed：`DETR`
- operation：`create`
- artifact mirror run root：`workspace/runtime/acp/skill-runs/acp-skill-detr-create-topic-synthesis`
- actual Host-validated run root：`<host-runtime-acp-skill-runs>/acp-skill-detr-create-topic-synthesis`
- workflow：`create-topic-synthesis-prepare` -> `topic-synthesis-core-enrichment` -> `topic-synthesis-finalize`
- Zotero 写入：无；本 playbook 只执行 Host Bridge read 与 runtime-local 文件写入。

## 真实性边界

本 artifact 是 gate-truth baseline。实际执行发生在 Host Bridge 认可的 ACP skill-runs 目录下，完成后完整镜像到本 artifact。run workspace 内只有 `runtime/input.json` 和 gate 指定的 `runtime/payloads/*.json` 由 agent 手写；SQLite、gate transcript、action transcript、resolver manifest、citation metrics、filtered paper artifacts、views、handoffs、sidecars、sections 和 final candidate 均由 `scripts/gate.py` 或其调用的 Host Bridge runtime 生成。

实际执行时本机 Python 由 `$HOME/.ar` 的 uv 环境包裹；skill-facing command 与 gate JSON 中保持通用裸 `python` 形式。

## Host Bridge discovery

本次先执行以下只读命令并保存 transcript：

```text
zotero-bridge status
zotero-bridge debug status
zotero-bridge manifest
zotero-bridge synthesis list-topics --input '{}'
zotero-bridge synthesis get-library-index --input '{"cursor":0,"limit":200}'
zotero-bridge synthesis resolve-resolver --input '{"resolver":{"mode":"tag_query","query":{"and":["model:DL/DETR"]}}}'
zotero-bridge synthesis get-paper-artifact-manifest --input '{"paper_refs":[...]}'
```

`list-topics` 返回空 topic 列表，因此 create duplicate 判断为 `none`。`model:DL/DETR` resolver 返回 22 篇候选，本 playbook 为了后续测试稳定性只选择 5 篇代表论文。

## 5 篇样例选择

| paper_ref | 标题 | 选择理由 |
| --- | --- | --- |
| `1:EIMSDEU3` | End-to-end object detection with transformers | DETR 原始论文，定义 query-based set prediction 与端到端检测基线。 |
| `1:5HBHAWIV` | Deformable DETR: deformable transformers for end-to-end object detection | 代表性改进，针对 DETR 收敛慢和多尺度小目标问题引入 deformable attention。 |
| `1:HPLZ65Z2` | DINO: DETR with improved DeNoising anchor boxes for end-to-end object detection | 训练/收敛问题代表，通过 denoising 与 anchor query 改善 DETR 训练稳定性。 |
| `1:3JUY9GBQ` | DETR3D: 3D object detection from multi-view images via 3D-to-2D queries | 检测范式扩展，把 DETR 查询机制推进到多视角 3D 检测。 |
| `1:SZ3GNWT9` | RF-DETR: neural architecture search for real-time detection transformers | 近期高相关变体，面向 real-time detection transformers 和架构搜索。 |

## Gate 执行序列

所有 stage 都遵循同一个循环：先运行 gate，读取 gate JSON；如果 `needs_payload=false`，复制执行 `command`；如果 `needs_payload=true`，只写 `payload_path` 指向的 JSON，然后复制执行 `submit_command`；成功后重新 gate。

本次实际生成的 gate/action transcript 位于 run workspace 的：

- `runtime/gate-transcript/`
- `runtime/action-transcript/`

额外保存的命令 stdout 位于：

- `transcripts/gate-commands/`
- `transcripts/bridge/`

## Stage payloads

- Stage 10：`runtime/payloads/create-topic-context.json`，定义 DETR-style Object Detection 的 create topic 边界。
- Stage 20：`runtime/payloads/resolver-and-workset.json`，使用来自真实 discovery resolver 的 5 篇 explicit `paper_refs`。
- Stage 30：`runtime/payloads/prepare-analysis-context.json`，对 5 篇论文逐篇做 paper-local triage。
- Stage 40：`runtime/payloads/core-synthesis.json`，从 cross-paper context 提炼 taxonomy、timeline、claims、gaps 和 review outline。
- Stage 50：`runtime/payloads/kg-enrichment.json`，提出 concept cards、topic relation candidates 和 matching terms。
- Stage 60：`runtime/payloads/coverage-and-collection-suggestions.json`，明确 5 篇样例的 partial coverage 与补库方向。
- Stage 70：`runtime/payloads/summary.json`，生成最终 summary，并由 runtime 写出 final candidate。

## 关键 runtime 产物

prepare 生成 SQLite、resolver manifest、citation metrics、filtered paper artifact manifest、`cross-paper-context.md`、`source-paper-evidence-index.json` 和 `runtime/handoff/prepare-analysis-context.json`。

core 生成 `concept-candidate-context.json`、`result/sidecars/*.json`、`runtime/views/finalize-context.manifest.json` 和 `runtime/handoff/core-enrichment.json`。

finalize 生成 `runtime/views/synthesis-report.md`、`result/sections/coverage.json`、`result/sections/summary.json`、`result/topic-analysis.json` 和 `result/final-output.candidate.json`。最终 candidate 的 `kind` 是 `topic_synthesis`，不是 handoff。

## 裁剪与脱敏

- 保留标题、paper_ref、item_key、短 evidence 摘要、hash 和 manifest。
- 不保留 bearer token、master token 或本机绝对附件路径。
- 不在 playbook 中粘贴大段 digest 全文；如需验证 artifact 存在，应查看 runtime filtered export manifest 和 hash registry。
- 本 artifact 不写回 Zotero topic，也不执行 mutation capability。

## 复跑注意事项

复跑必须在 Host Bridge `runtimePersistence.acpSkillRunsDir` 下进行，run id 目录名需匹配 `acp-skill-*`。如果真实 Zotero library、Synthesis sidecar cache 或 Host Bridge resolver 结果发生变化，新的 resolver total、paper refs 和 artifact hashes 可能不同；测试基准应以本次提交的 gated artifact mirror 为固定样例。
