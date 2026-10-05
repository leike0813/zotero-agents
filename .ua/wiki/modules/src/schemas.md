
# src/schemas
> 目录聚合页：4 个文件、0 个符号。由知识图谱按源路径生成。

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [src/schemas/selectionContextSchema.ts](../../files/src/schemas/selectionContextSchema.ts.md) | 文件 | 0 | Selection Context 的 JSON Schema 定义，约束 Broker 锁定选择上下文的数据结构。 |
| [src/schemas/workflow-package.schema.json](../../files/src/schemas/workflow-package.schema.json.md) | 配置 | 0 | 工作流包 manifest 的 JSON Schema，定义包标识、版本、入口 workflow 与目录布局等字段约束。 |
| [src/schemas/workflow.schema.json](../../files/src/schemas/workflow.schema.json.md) | 配置 | 0 | 单个工作流定义的 JSON Schema，完整描述 task/step 声明、输入物化、输入输出契约与构建策略等结构。 |
| [src/schemas/zoteroHostMutationSchemas.ts](../../files/src/schemas/zoteroHostMutationSchemas.ts.md) | 文件 | 0 | Zotero 宿主变更的 JSON Schema 契约：定义 note detail、managed note 写入、文献产物 upsert 与各 mutation 操作的输入/预览/执行结果 schema 及其按操作索引的映射表。 |

## 子目录
- [skill](schemas/skill.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [src/workflows](workflows.md) | 4 |
