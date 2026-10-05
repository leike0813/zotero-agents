
# src/providers/skillrunner/models/iflow/manifest.json
所属分层：[Agent 协议与后端运行时](../../../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner/models/iflow](../../../../../../modules/src/providers/skillrunner/models/iflow.md)
<!-- node: config:src/providers/skillrunner/models/iflow/manifest.json -->

iflow 引擎的模型快照清单，列出 engine 为 iflow 并按版本升序索引 0.0.0/0.5.2/0.5.12/0.5.14 四个 models_*.json 快照文件，供 SkillRunner modelCatalog 解析模型目录。
源码：[src/providers/skillrunner/models/iflow/manifest.json](../../../../../../../../src/providers/skillrunner/models/iflow/manifest.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [models_0.0.0.json](models_0.0.0.json.md) | src/providers/skillrunner/models/iflow/models_0.0.0.json | iFlow 引擎 0.0.0 的钉版（pinned snapshot）模型清单，仅含单个 gpt-4 条目，作为最早的回退模型集合。 |
| [models_0.5.12.json](models_0.5.12.json.md) | src/providers/skillrunner/models/iflow/models_0.5.12.json | iFlow 引擎 0.5.12 的钉版模型清单，登记 9 个模型，结构与 0.5.14 一致（0.5.12 用 MiniMax M2.1，0.5.14 换为 M2.5）。 |
| [models_0.5.14.json](models_0.5.14.json.md) | src/providers/skillrunner/models/iflow/models_0.5.14.json | iFlow 引擎 0.5.14 的钉版模型清单，登记 9 个模型，是 modelCatalog.ts 中 iflow 目录可选的最新快照版本。 |
| [models_0.5.2.json](models_0.5.2.json.md) | src/providers/skillrunner/models/iflow/models_0.5.2.json | iFlow 引擎 0.5.2 的钉版模型清单，登记 7 个模型（GLM 4.7、iFlow ROME 30BA3B、DeepSeek V3.2、Qwen3 Coder Plus、Kimi K2 Thinking、MiniMax M2.1、Kimi K2 0905）。 |

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [modelCatalog.ts](../../modelCatalog.ts.md) | src/providers/skillrunner/modelCatalog.ts | SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。 |
