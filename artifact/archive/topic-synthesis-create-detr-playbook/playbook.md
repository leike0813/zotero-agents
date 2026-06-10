# DETR Create Topic Synthesis Playbook

## 目标

本 playbook 记录一次真实的 `create topic synthesis` dry-run。输入固定为：

```json
{
  "topicSeed": "DETR",
  "language": "zh-CN",
  "operation": "create"
}
```

本次运行只读 Zotero Bridge，不创建、不更新、不写回 Zotero topic。所有中间过程文件写入
`artifact/topic-synthesis-create-detr-playbook/`，供后续测试基准和 schema 样例参考。

## 数据保留边界

- 保留：paper ref、item key、标题、年份、标签、manifest/hash、短 evidence 摘要、命令输入和错误诊断。
- 不保留：本机附件绝对路径、完整 digest 正文、完整 Zotero note body、bearer token、远程 LAN host。
- paper triage 和 cross-paper context 只使用 resolver 返回集合中的 5 篇论文。

## 真实 Bridge 调用

本次运行确认 Host Bridge 在线：

```powershell
zotero-bridge status
```

落盘文件：`runtime/bridge/status.json`

能力和 endpoint 摘要来自：

```powershell
zotero-bridge manifest
```

落盘文件：`runtime/bridge/manifest.summary.json`

重复主题检查：

```powershell
zotero-bridge synthesis list-topics --input '{}'
```

返回 `topics: []`，因此 create 模拟的 `duplicate_status` 为 `none`。落盘文件：
`runtime/bridge/list-topics.json`。

库索引探测：

```powershell
zotero-bridge synthesis get-library-index --input '{"cursor":0,"limit":10,"query":"DETR","includeTags":true}'
```

该页显示 `model:DL/DETR` 标签计数为 22，总库内 compact papers 为 65。落盘文件：
`runtime/bridge/library-index-detr-page.json`。

resolver 执行：

```powershell
zotero-bridge synthesis resolve-resolver --input '{"resolver":{"mode":"tag_query","query":{"and":["model:DL/DETR"]}}}'
```

返回 22 篇候选，落盘文件：`runtime/bridge/resolver-result.json`。

图谱指标：

```powershell
zotero-bridge synthesis get-citation-graph-metrics --input '{"paper_refs":["1:EIMSDEU3","1:5HBHAWIV","1:W4CDLU28","1:HPLZ65Z2","1:CBJWE4JX"]}'
```

返回 5 条 lightweight metrics，但 `status` 为 `stale`，只能作为弱诊断信号。落盘文件：
`runtime/bridge/citation-graph-metrics.json`。

artifact manifest：

```powershell
zotero-bridge synthesis get-paper-artifact-manifest --input '{"paper_refs":["1:EIMSDEU3","1:5HBHAWIV","1:W4CDLU28","1:HPLZ65Z2","1:CBJWE4JX"]}'
```

返回 15 个可用 artifact descriptor，每篇样例论文都有 digest、references 和
citation-analysis payload。落盘文件：`runtime/bridge/paper-artifact-manifest.json`。

当前环境的两个能力漂移也作为基准记录：

- `read-paper-artifacts` CLI 子命令存在，但 Host Bridge 返回
  `capability_not_found`。
- `export-filtered-paper-artifacts` 要求 `run_root` 位于 ACP skill-runs 目录内；
  本 dry-run 不进入 ACP run workspace，因此不强行导出。

相关诊断落盘在：

- `runtime/bridge/read-paper-artifacts.error.json`
- `runtime/bridge/export-filtered-paper-artifacts.error.json`
- `runtime/bridge/cli-drift-diagnostics.json`

## 5 篇样例选择

选择全集来自 `runtime/bridge/resolver-result.json` 的 22 篇 DETR 候选。实际用于
paper triage 和 cross-paper context 的 5 篇见
`runtime/views/selected-paper-set.json`：

| paper_ref | 角色 | 选择理由 |
| --- | --- | --- |
| `1:EIMSDEU3` | 原始基线 | 原始 DETR，定义集合预测、object queries、Hungarian matching 和 NMS-free 检测。 |
| `1:5HBHAWIV` | 多尺度稀疏注意力 | Deformable DETR，代表对收敛慢和多尺度问题的结构改造。 |
| `1:W4CDLU28` | query design 收敛 | Conditional DETR，代表通过 spatial query 改善训练收敛。 |
| `1:HPLZ65Z2` | denoising/anchor 训练 | DINO，代表 denoising anchor/query 改造与高性能训练路线。 |
| `1:CBJWE4JX` | 实时化方向 | 代表 DETR 与 YOLO 系实时检测器对比的应用化路线。 |

未选的 17 篇保留在 resolver transcript 中，用于证明本 playbook 是裁剪样例，不是完整综述。

## Stage 文件

Prepare 阶段：

- `runtime/payloads/create-topic-context.json`
- `runtime/payloads/resolver-and-workset.json`
- `runtime/payloads/prepare-analysis-context.json`
- `runtime/handoff/prepare-analysis-context.json`

Core enrichment 阶段：

- `runtime/views/cross-paper-context.md`
- `runtime/views/external-literature-context.md`
- `runtime/views/source-paper-evidence-index.json`
- `runtime/payloads/core-synthesis.json`
- `runtime/payloads/kg-enrichment.json`
- `runtime/handoff/core-enrichment.json`

Finalize 阶段：

- `runtime/views/finalize-context.manifest.json`
- `runtime/views/synthesis-report.md`
- `runtime/views/synthesis-report.manifest.json`
- `runtime/payloads/coverage-and-collection-suggestions.json`
- `runtime/payloads/summary.json`
- `runtime/handoff/finalize-output.json`

结果候选：

- `result/sections/*.json`
- `result/sidecars/*.json`
- `result/topic-analysis.json`
- `result/final-output.candidate.json`

`result/final-output.candidate.json` 是 dry-run final candidate，`kind` 为
`topic_synthesis`，`operation` 为 `create`，不是 handoff。

## Schema 样例

`schemas/examples/manifest.json` 列出每个 stage schema、示例文件和对应 runtime source。
这些样例用于 focused test 验证，不作为新的 runtime SSOT。

## 复跑注意事项

1. 复跑时先确认 `zotero-bridge status` 为 `running`。
2. 不要执行 mutation 或 host apply；本 playbook 只记录 dry-run candidate。
3. 如果 resolver 返回数量变化，更新 `resolver-result.json`、`selected-paper-set.json`、
   diagnostics 和测试中的 subset 断言。
4. 如果 `read-paper-artifacts` 或 `export-filtered-paper-artifacts` 能力恢复可用，应更新
   diagnostics，并仍避免提交大段 digest 正文。
