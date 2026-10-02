
# src/providers/skillrunner/models/codex
> 目录聚合页：5 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/providers/skillrunner/models/codex/manifest.json](../../../../../files/src/providers/skillrunner/models/codex/manifest.json.md) | 配置 | 0 | Codex 引擎模型快照目录的清单，声明 engine 为 codex，并按版本号升序列出四份快照文件名，供 SkillRunner Provider 定位并加载对应版本的模型定义。 |
| [src/providers/skillrunner/models/codex/models_0.0.0.json](../../../../../files/src/providers/skillrunner/models/codex/models_0.0.0.json.md) | 配置 | 0 | Codex 引擎 0.0.0 基线模型快照，仅收录 gpt-5-codex 一个模型，支持 minimal 到 xhigh 五档 effort，作为版本对比与兜底的起点。 |
| [src/providers/skillrunner/models/codex/models_0.106.0.json](../../../../../files/src/providers/skillrunner/models/codex/models_0.106.0.json.md) | 配置 | 0 | Codex 引擎 0.106.0 模型快照，是本目录最新且条目最多的版本，在 0.99.0 基础上补入 gpt-5.4，共六个模型，并区分 mini 与通用模型的 effort 上限。 |
| [src/providers/skillrunner/models/codex/models_0.89.0.json](../../../../../files/src/providers/skillrunner/models/codex/models_0.89.0.json.md) | 配置 | 0 | Codex 引擎 0.89.0 模型快照，收录 gpt-5.1-codex-mini、max、gpt-5.2 与 gpt-5.2-codex 四个模型，并逐个标注 supported_effort 档位。 |
| [src/providers/skillrunner/models/codex/models_0.99.0.json](../../../../../files/src/providers/skillrunner/models/codex/models_0.99.0.json.md) | 配置 | 0 | Codex 引擎 0.99.0 模型快照，在 0.89.0 的四个模型基础上新增 gpt-5.3-codex，共五个模型条目，deprecated 均为 false。 |
