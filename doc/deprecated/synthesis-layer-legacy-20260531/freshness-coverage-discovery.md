# Topic Freshness、Coverage 与 Discovery

本文档专门定义 topic freshness、coverage 和 discovery 的边界。三者经常同时出现在 UI 中，但语义不同，不能互相替代。

## 设计目标

- **coverage** 只回答：当前 topic 已保存依赖文献的 artifact 是否完整。
- **freshness/source check** 只回答：用户显式检查时，当前 topic artifact 的 source manifest 与当前 Host Library / Artifact Facade 是否存在可解释差异。
- **discovery** 只回答：literature-digest apply 后，这篇文献是否 best-effort 地看起来可能值得纳入某些 topic。
- 新文献进入 registry cache 不应默认写入 topic source-check changed diagnostic；只有 literature-digest apply 产生 matching metadata 后，才进行 apply-time discovery hint generation。
- 已保存依赖的 artifact hash、availability、paper set 或 graph hash 变化不应由后台 registry cache 事件持续推送到 Topics；它们只在显式 source check 或 topic update 中被比较。
- 用户确认纳入新文献、resolver 显式改变或 topic workflow update 后，才改变 topic artifact 的 dependency baseline。

## 现有实现状态

Status: `partial`。Coverage / source check / discovery 的目标语义已经拆分，但实现仍含 transitional freshness helper 和比目标合同更强的 registry coupling。

当前实现的核心逻辑在 `src/modules/synthesis/service.ts`：

- `buildTopicDependencySnapshot` 构造 topic dependency snapshot。
- `collectStaleReasons` 比较 baseline 与 current。
- `scanTopicFreshness` 写入 topic freshness state。
- `runTopicFreshnessWorker` 消费 `topic_freshness_dirty` events。
- literature-digest workflow apply 后，repository metadata matching 可以为该文献构造 bounded discovery hints。

当前实现细节仍包含比目标合同更强的耦合：

- Topic dependency snapshot 包含 resolver hash、saved/current paper refs、registry row hashes、artifact status/hash、graph hash、markdown/metadata/index hash。
- Coverage 以 saved paper refs 的 digest/references/citation_analysis 三类 artifact availability 为基础。
- Freshness 比较 paper set、graph hash、artifact availability 和 artifact hash；目标合同会把这类比较收敛为显式 source check，而不是后台常驻不变量。
- 新 paper 增量进入 registry cache 后，通常不会被 `topicIdsForPaperRefs` 命中，因此不会直接触发已有 topic freshness dirty。
- Topic interest metadata 和 literature matching metadata 进入 apply-time discovery hint 计算，不直接进入 freshness 判定。

当前缺口：

- Freshness state 仍有 transitional file-backed helper。
- Graph hash 是否应影响所有 topic freshness 仍是强策略，目标是收敛为显式 source check diagnostic，而不是通过通用 impact planning 推导。
- Dynamic resolver 新命中文献是否造成 stale，目前只有显式 scan 才会发现；自动路径不做全库 discovery 回扫。
- Deletion/merge 对 topic dependency 的影响应通过显式 topic source check/update 暴露；event routing policy 不应从 registry/cache dirty event 自动推导 topic work。
- Registry cache dirty events / full rebuild 对 topic freshness 的后台触发应逐步移除，改为用户或维护命令显式 source check。

## 三个概念的严格定义

### Coverage

Coverage 是 artifact 完整度。

输入：

- topic baseline 中保存的 `saved_paper_refs`；
- 每个 saved paper 的 artifact state：
  - digest；
  - references；
  - citation_analysis。

输出：

- `complete`：所有 saved papers 的 required artifacts 都 available。
- `partial`：至少一部分 available，但存在 missing/invalid。
- `missing`：没有 saved papers，或全部缺失。

Coverage 不回答：

- 有没有新文献应该纳入；
- graph layout 是否 ready；
- topic 内容是否过时；
- discovery candidates 是否存在。

### Freshness / Source Check

Freshness 的目标语义是 source check diagnostic：用户或显式维护命令要求检查时，系统把 topic artifact 保存的 source manifest 与当前 Host Library / Artifact Facade 输出进行对比。它不是由 registry cache 后台事件持续维护的同步状态。

Source check 可以报告这些差异：

- `paper_set_changed`：resolver 当前结果与 baseline saved paper set 不同。
- `graph_changed`：baseline graph hash 与当前 graph hash 不同，仅作为可选 graph-metrics diagnostic，不应阻断 topic update。
- `artifact_changed`：saved dependency 的 artifact hash 改变。
- `artifact_missing`：曾经 available 的 artifact 变 missing/invalid。
- `artifact_available`：曾经 missing 的 artifact 变 available。
- `evidence_missing` / `paper_deleted`：topic artifact 中的 `pe:*` 或 source manifest 仍引用某个 paper，但当前 Host Library / Artifact Facade 已无法定位。
- `evidence_redirected`：topic artifact 中的 `pe:*` 通过 registry/cache redirect 或 Zotero merge 指向 survivor paper。
- `missing_resolver`、`missing_resolved_paper_set` 等结构性错误。

这些变化不应直接产生后台 stale 状态：

- 新文献入库但尚未被 topic 接纳；
- discovery hint 新增；
- literature matching metadata 更新但不改变 topic dependency；
- graph layout 改变；
- job progress 改变。
- Registry cache rebuild、startup reconcile 或 registry dirty event。

Source check 的输出是诊断：它可以建议 `update topic`、`rerun digest` 或 `ignore for now`，但不自动改写 topic artifact、resolver、topic graph relation 或 concept links。

如果 source check 发现 deleted / merged paper evidence，既有 topic artifact 仍作为历史快照可读；后台不静默删除正文中的 `pe:*` 引用。只有显式 `update-topic-synthesis`、用户接受 redirect、或用户选择移除证据时，artifact 内容才会被改写。

### Discovery

Discovery 是 literature-digest apply 时产生的 topic-literature 候选提醒。它不是持续后台检索系统，也不承诺高召回语义搜索；它是 best-effort nudging。

输入：

- `synt_topic_interest_metadata`
  - include terms；
  - must-have terms；
  - methods；
  - exclude terms；
  - seed literature ids。
- `synt_literature_matching_metadata`
  - key terms；
  - methods；
  - problems；
  - datasets；
  - exclude terms。
- Registry cache metadata such as title/tags/collections may provide supplemental matching context.

触发：

- literature-digest apply 成功写入/更新 `synt_literature_matching_metadata` 后，对该单篇 literature 与所有 active topics 做一次轻量匹配。
- topic create/update 成功写入 `synt_topic_interest_metadata` 后，不回扫全库；之后新的 literature-digest apply 会自然使用最新 topic metadata。
- explicit debug/maintenance repair 可以重算 discovery hints，但不是普通 Workbench 热路径。

输出：

- `synt_topic_discovery_hint` rows；
- UI candidates/review/filter state。

Discovery 不会自动：

- 修改 topic resolver；
- 修改 topic artifact 正文；
- 修改 topic graph relation；
- 写入 topic source-check changed diagnostic。

### Discovery Matching Algorithm v1

第一版使用现有 metadata 合同，不改 `topic_interest_metadata` 或 `literature_matching_metadata` 的生成/持久化协议。算法是轻量、宽松、可解释的 token/phrase overlap，定位是 apply-time best effort。

权重、阈值、top-k 和停词表不是 artifact 合同的一部分；它们属于 Discovery Policy。当前默认 policy 是 `discovery.apply_time_token_overlap.v1`，机器可读版本见 `engineering/schemas/discovery-policy.yaml`。后续调参应修改 policy 版本和实验报告，而不是改变 metadata 持久化合同。

#### 规范化

所有字段进入匹配前做同一规范化：

- Unicode NFKC；
- lowercase；
- 去标点、连字符和多余空格；
- 保留短语边界；
- 过滤过短 token 和 policy stopwords。默认全局 stopwords 包括 `model`、`method`、`learning`、`analysis` 这类跨领域泛词，但具体列表由 Discovery Policy 管理；不同学科可以增加 domain stopwords。

#### 字段集合

Topic：

- `T_required = must_have_terms`
- `T_include = include_terms`
- `T_methods = methods`
- `T_exclude = exclude_terms`
- `T_seed = seed_literature_item_ids`

Literature：

- `L_terms = key_terms`
- `L_methods = methods`
- `L_problems = problems`
- `L_datasets = datasets`
- `L_title_tags = title + tags`
- `L_exclude = exclude_terms`

#### 硬拒绝

直接不写 hint：

1. `T_exclude` 命中 `L_terms/L_methods/L_problems/L_datasets/L_title_tags`。
2. `L_exclude` 命中 `T_required/T_include/T_methods`。
3. `T_required` 非空，且没有任何 required term 命中，也没有 method 命中，且 literature 不是 seed。

#### 打分

记 `hit(A, B)` 为 A 中 normalized phrase 在 B 中命中的数量，按 A 的条目去重，并按 cap 限制上限。

```text
must_score    = hit(T_required, L_terms + L_problems + L_title_tags) / max(1, min(|T_required|, 3))
include_score = hit(T_include,  L_terms + L_problems)                / max(1, min(|T_include|, 8))
method_score  = hit(T_methods,  L_methods)                           / max(1, min(|T_methods|, 4))
weak_score    = hit(T_include + T_methods, L_datasets + L_title_tags) / max(1, min(|T_include| + |T_methods|, 8))

score =
  2.0 * must_score
+ 1.5 * include_score
+ 1.2 * method_score
+ 0.8 * weak_score

normalized_score = score / active_weight_sum
```

`active_weight_sum` 的计算必须显式、可复现：

```text
active_weight_sum =
  (T_required 非空 ? 2.0 : 0)
+ (T_include  非空 ? 1.5 : 0)
+ (T_methods  非空 ? 1.2 : 0)
+ (weak_component_active ? 0.8 : 0)

weak_component_active =
  (T_include 或 T_methods 非空)
  且 policy 启用 weak component
  且 literature 有可比较的 L_datasets 或 L_title_tags
```

因此，如果某 topic 只有 `include_terms` 且目标 literature 没有启用/可比较的 weak 字段，`active_weight_sum = 1.5`；如果 weak component 可用，则为 `2.3`。实现和实验报告必须记录实际使用的 active components，避免 UI 或 debug 输出只给出一个不可解释的总分。

Seed literature 是 topic author 显式给出的强提示。它不绕过 exclude hard reject，但在未被 hard reject 时 `normalized_score` 至少提升到 policy 的 `seed_min_score`，默认 `0.8`。这个值的含义是“应进入候选提醒”，不是“自动纳入 topic dependency”。

#### 阈值与限流

- `normalized_score >= policy.min_open_score`：写入 `open` discovery hint，默认 `0.25`。
- `< 0.25`：不写 hint。
- 每次 literature-digest apply 最多写入该 literature 的 `policy.top_per_literature` 个 topic hints，默认 5。
- 每个 topic UI 默认最多展示 `policy.top_per_topic_ui` 个 open hints，默认 20。

这些数值是 default policy，不是长期内容合同。改变阈值、权重或停词表时应更新 policy id/version，并用真实库 fixture 或人工审阅样本验证噪音水平。

#### 用户解释

UI 只展示最多 3 条简短理由，不展示完整打分审计。例如：

- `matched required term: object tracking`
- `matched method: transformer`
- `matched problem: multi-object tracking`

### Filtered Suppression

用户把 `topic_id + literature_item_id` 标记为 filtered 后，默认不再因为 digest 重跑、metadata hash 变化、增加 key term 或 registry cache rebuild 重新出现。

允许重新出现的条件：

- 用户显式 unfilter；
- 用户手动 reset filtered hints；
- topic update flow 中用户明确选择清理该 topic 的 filtered history；
- explicit debug/maintenance repair 使用强制重算选项。

## 常见场景判定

| 场景 | Registry Cache | Coverage | Freshness | Discovery | 说明 |
| --- | --- | --- | --- | --- | --- |
| Library 不变，仅 rebuild registry cache | 重建 registry/graph cache | 不变 | 不自动检查 | 不变 | Registry cache rebuild 不驱动 topic source check |
| 新条目入库，无 digest | 新 paper 进入 registry cache，artifacts missing | 已有 topic 不变 | 不自动检查 | 不产生候选 | 新文献不是 saved dependency，且没有 matching metadata apply |
| 新条目跑 digest | artifact state available | 已有 topic 不变 | 不自动检查 | 对该文献执行 O(T) best-effort matching | Discovery hint 不改变 topic source-check diagnostic |
| 已保存依赖 artifact 重新生成且 hash 变 | artifact hash 更新 | 上次记录不变 | 下次显式 source check 可报告 `artifact_changed` | 可能 apply-time 重算 hints | 需要用户决定是否 update topic |
| 已保存依赖 artifact 删除 | artifact missing | 上次记录不变 | 下次显式 source check 可报告 missing | 不直接相关 | 需要补 artifact 或 update |
| Saved dependency Zotero item 删除 | binding/review 状态变化 | 上次记录不变 | 下次显式 source check 可报告 missing/changed | 不直接相关 | 不由 registry cache 自动把 topic 标 stale |
| Duplicate merge 到 survivor | redirect/binding/resolution 变化 | 上次记录不变 | 下次显式 source check 可报告 changed | 不直接相关 | 需要用户确认是否 update topic |
| 新 discovery candidate 被用户接受 | topic dependency policy changes | 取决于 artifact | stale or workflow update required | accepted | 应通过显式 topic update |

## 复杂度模型

记号：

- `N`：registry cache 中 active library papers。
- `T`：topic 数。
- `K`：某 topic saved dependencies 数。
- `E`：受某 paper 影响的 topic 数。

当前实现近似复杂度：

- 单 topic source check：`O(K)` 如果只比较 saved source manifest；`O(N + K)` 如果用户选择重新执行动态 resolver。
- 找某 paper 影响的 topics：目标合同不要求后台查找；若 debug/maintenance 需要，可由 source manifest inverted index 降到 `O(E)`。
- 全量 source check：`O(T * N + ΣK)`，只允许显式维护/diagnostic 使用，不属于普通热路径。
- literature-digest apply-time discovery：`O(T)`，只把本次 apply 的单篇 literature 与 active topics 匹配。
- explicit discovery repair/recompute：`O(T * N)`，只允许 debug/maintenance 显式动作使用，不属于普通热路径。

目标优化方向：

- 建立 dependency inverted index：paper_ref -> topic_ids，用于 debug/diagnostic 和显式 source check summary，而不是后台 topic dirty fan-out。
- Event routing / invalidation policy 不应从普通 registry cache dirty event 生成 topic dirty event；只允许用户显式 topic check/update/delete/import 等 topic-domain action 产生 topic work。
- Discovery 普通路径绑定 literature-digest apply；不做周期性全量 worker。

## UI 表达规则

- `coverage != complete`：提示 artifact 不完整，主动作是补 artifact 或 Complete。
- `source_check == changed`：提示上次显式检查发现 source manifest 差异，主动作是 Update 或 Ignore for now。
- `source_check == queued/running`：提示用户已启动显式检查，不允许重复提交相同 check。
- `discovery_status == candidates`：提示有候选文献，不暗示 topic 已过时。
- `graph layout missing/running`：只提示 graph drawing，不改变 topic freshness。

## 实现约束

- Topic workflow apply 成功后，应写入该 topic 的 source manifest / dependency baseline。
- Registry cache rebuild、startup reconcile、registry dirty events 不应默认生成 topic freshness dirty events。
- Source check 只能由用户动作、显式维护命令或 debug capability 触发。
- Topic discovery hint 被接受后，应进入显式 topic update workflow，而不是后台直接改 artifact。
- 新文献自动进入 registry cache 后，默认不产生 discovery；只有 literature-digest apply 后才生成 best-effort hints。
- Registry cache rebuild 不触发全量 discovery；需要 repair 时必须由显式 debug/maintenance 动作触发。
- Filtered discovery hints 是 user override；普通 digest 重跑和 metadata hash 变化不得重新打开。
