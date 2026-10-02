
# initialize_database
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:initialize_database -->

创建运行态数据库的表结构与初始元数据，返回可用的连接。
类型：函数  
复杂度：复杂  
入边数：2  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2219](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L2219)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [bootstrap](bootstrap.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2539–2689 | 初始化运行目录、数据库与初始输入，为后续阶段建立一致的起点状态。 |
| [persist_stage10_db](persist_stage10_db.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6816–6942 | 把 stage10 上下文请求写入数据库，更新 workset 与引用绑定。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ensure_stage10_tables](ensure_stage10_tables.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2436–2536 | 幂等地确保 stage10 所需的表与索引存在。 |
