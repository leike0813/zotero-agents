# Synthesis Workflow 与 Artifact 合同

## 目的

本文档锚定 Synthesis workflows、runtime validation、final artifacts 与 host apply 之间的边界。它关注合同，而不是每个 topic section 的内容语义。

详细内容要求见 [Topic Synthesis 内容合同](./topic-synthesis-content-contract.md)。

Status: `partial`。Schema-first skill contract、manifest sidecars 和 host apply 读取边界已建立；旧顶层 sidecar path fallback 与部分 runtime/apply 摄取路径仍是兼容过渡。

## Topic Synthesis 结果包

Topic synthesis workflows 会把 stage payloads 写入 SkillRunner/ACP run workspace。Runtime scripts 负责校验 payload、持久化结构化状态、写入固定路径 artifact，并渲染 final result bundle。

当前实现锚点：

- `skills_builtin/create-topic-synthesis/SKILL.md`
- `skills_builtin/update-topic-synthesis/SKILL.md`
- `skills_builtin/create-topic-synthesis/scripts/stage_runtime.py`
- `skills_builtin/update-topic-synthesis/scripts/stage_runtime.py`
- `src/modules/synthesis/workflow.ts`
  - `validateSynthesisResultBundle`
  - `decideSynthesisApply`

Final bundle 是 host apply 的输入合同。它应标识 run root、topic definition、canonical artifact path、markdown path 和 `analysis_manifest_path`。

Sidecar paths 不是 canonical final bundle discovery surface。它们只是 legacy-compatible fields。

## 最终 Manifest Sidecars

Final manifest 是 canonical sidecar index。Runtime 会把 sidecars 写入固定路径，然后渲染包含 `sidecars` 对象的 `result/topic-analysis.json` 或 `result/topic-analysis.patch.json`。

Canonical sidecars：

| Sidecar | 固定路径 | Schema 职责 |
| --- | --- | --- |
| Topic interest metadata | `result/sidecars/topic-interest-metadata.json` | discovery profile |
| Concept card proposal | `result/sidecars/concept-cards-proposal.json` | Concept KB proposal input |
| Topic graph relation proposals | `result/sidecars/topic-graph-relation-proposals.json` | Topic Graph review proposal input |

每个 manifest sidecar entry 应包含：

- `path`；
- `hash`；
- `content_type`；
- `schema_id`。

Host apply 必须优先从 manifest 读取 sidecars。只有当 manifest sidecars 缺失时，顶层 bundle sidecar path fields 才作为 legacy fallback 被接受。

当前实现锚点：

- `src/modules/synthesis/topicStructuredArtifact.ts`
  - `validateTopicAnalysisManifest`
  - `validateTopicSynthesisArtifact`
  - `applyTopicSectionPatch`
- `src/modules/synthesis/service.ts`
  - structured topic apply path
  - concept proposal ingestion
  - topic graph proposal ingestion
  - topic interest metadata ingestion

## 阶段 Payloads

Skill instructions 应采用 schema-first：

1. 在 `SKILL.md` 中展示压缩 payload skeleton；
2. 解释 semantic rules、input sources、prohibited shortcuts 和 runtime command；
3. 在 `references/step_*.md` 中提供详细 schema fragments、examples、empty-output examples 和 anti-patterns；
4. 保持 canonical stage/action names 与 `runtime_db.STAGES` 和 gate `next_action` 对齐。

这样可以让指令人类可读，也让 agent 更容易稳定执行。

Stage 9 KG proposal payload 会一起生成三类 proposal/metadata：

- `concept_cards_proposal`；
- `topic_graph_relation_proposals`；
- `topic_interest_metadata`。

Topic interest metadata 是 discovery metadata。它不得插入人类可读的 topic artifact 正文。

## 宿主 Apply 职责

Host apply 负责：

- 校验 result bundle；
- 校验 complete 或 patch manifest；
- assemble 或 patch structured topic artifacts；
- 将 topic interest metadata 摄取进 SQLite；
- 将 concept card proposals 摄取进 Concept KB review state；
- 将 topic graph relation proposals 摄取进 Topic Graph review state；
- 更新 DB-backed topic graph/materialized topic rows，供普通 Workbench reads 使用。

Host apply 不应：

- 未经 schema validation 就信任 agent output；
- 在 manifest sidecars 存在时，通过扫描整个 run root 推断 sidecars；
- 基于 discovery hints 重写 topic artifact text；
- 在 read 中触发 broad rebuilds。

## 兼容性

Legacy bundles 可能仍包含：

- `topic_interest_metadata_path`；
- `concept_cards_proposal_path`；
- `topic_graph_relation_proposals_path`。

这些字段会为了旧 runs 被容忍。新的 workflow contracts 应使用 `analysis_manifest_path` 加 manifest `sidecars`。

兼容逻辑不应作为主要合同泄漏进用户可见文档。
