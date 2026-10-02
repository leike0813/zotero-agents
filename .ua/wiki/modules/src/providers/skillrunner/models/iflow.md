
# src/providers/skillrunner/models/iflow
> 目录聚合页：5 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/providers/skillrunner/models/iflow/manifest.json](../../../../../files/src/providers/skillrunner/models/iflow/manifest.json.md) | 配置 | 0 | iflow 引擎的模型快照清单，列出 engine 为 iflow 并按版本升序索引 0.0.0/0.5.2/0.5.12/0.5.14 四个 models_*.json 快照文件，供 SkillRunner modelCatalog 解析模型目录。 |
| [src/providers/skillrunner/models/iflow/models_0.0.0.json](../../../../../files/src/providers/skillrunner/models/iflow/models_0.0.0.json.md) | 配置 | 0 | iFlow 引擎 0.0.0 的钉版（pinned snapshot）模型清单，仅含单个 gpt-4 条目，作为最早的回退模型集合。 |
| [src/providers/skillrunner/models/iflow/models_0.5.12.json](../../../../../files/src/providers/skillrunner/models/iflow/models_0.5.12.json.md) | 配置 | 0 | iFlow 引擎 0.5.12 的钉版模型清单，登记 9 个模型，结构与 0.5.14 一致（0.5.12 用 MiniMax M2.1，0.5.14 换为 M2.5）。 |
| [src/providers/skillrunner/models/iflow/models_0.5.14.json](../../../../../files/src/providers/skillrunner/models/iflow/models_0.5.14.json.md) | 配置 | 0 | iFlow 引擎 0.5.14 的钉版模型清单，登记 9 个模型，是 modelCatalog.ts 中 iflow 目录可选的最新快照版本。 |
| [src/providers/skillrunner/models/iflow/models_0.5.2.json](../../../../../files/src/providers/skillrunner/models/iflow/models_0.5.2.json.md) | 配置 | 0 | iFlow 引擎 0.5.2 的钉版模型清单，登记 7 个模型（GLM 4.7、iFlow ROME 30BA3B、DeepSeek V3.2、Qwen3 Coder Plus、Kimi K2 Thinking、MiniMax M2.1、Kimi K2 0905）。 |

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/providers/skillrunner](../../skillrunner.md) | 5 |
