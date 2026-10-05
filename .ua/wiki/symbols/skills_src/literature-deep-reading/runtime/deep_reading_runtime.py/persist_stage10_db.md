
# persist_stage10_db
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:persist_stage10_db -->

把 stage10 上下文请求写入数据库，更新 workset 与引用绑定。
类型：函数  
复杂度：复杂  
入边数：1  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6816](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L6816)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [submit_context_request](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6945–7056 | stage10 提交入口，校验后落库并生成下一阶段指令。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [initialize_database](initialize_database.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2219–2433 | 创建运行态数据库的表结构与初始元数据，返回可用的连接。 |
