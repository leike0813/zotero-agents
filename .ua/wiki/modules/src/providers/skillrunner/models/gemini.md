
# src/providers/skillrunner/models/gemini
> 目录聚合页：4 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/providers/skillrunner/models/gemini/manifest.json](../../../../../files/src/providers/skillrunner/models/gemini/manifest.json.md) | 配置 | 0 | Gemini 引擎的模型快照清单，声明 engine=gemini 并索引三个版本化快照文件（0.0.0、0.25.2、0.30.0），供 SkillRunner Provider 按版本发现并加载对应模型表。 |
| [src/providers/skillrunner/models/gemini/models_0.0.0.json](../../../../../files/src/providers/skillrunner/models/gemini/models_0.0.0.json.md) | 配置 | 0 | Gemini 0.0.0 初始基线快照，仅收录 gemini-3-pro-preview 一个模型，作为后续模型表扩展的对照基线。 |
| [src/providers/skillrunner/models/gemini/models_0.25.2.json](../../../../../files/src/providers/skillrunner/models/gemini/models_0.25.2.json.md) | 配置 | 0 | Gemini 0.25.2 版本模型表，收录 gemini-3-pro/flash-preview 与 gemini-2.5-pro/flash/flash-lite 共 5 个模型条目（均未废弃），供 SkillRunner Provider 做模型选择。 |
| [src/providers/skillrunner/models/gemini/models_0.30.0.json](../../../../../files/src/providers/skillrunner/models/gemini/models_0.30.0.json.md) | 配置 | 0 | Gemini 0.30.0 版本模型表，把 pro 主力模型升级为 gemini-3.1-pro-preview，其余 4 个模型与 0.25.2 保持一致，用于多版本后端下的模型发现与降级。 |
