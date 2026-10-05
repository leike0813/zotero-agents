
# bootstrap
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:bootstrap -->

初始化运行目录、数据库与初始输入，为后续阶段建立一致的起点状态。
类型：函数  
复杂度：复杂  
入边数：1  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2539](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L2539)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:7349–7426 | 运行时 CLI 入口，解析阶段与命令后分发到 bootstrap、status、validate 与各阶段提交逻辑。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [initialize_database](initialize_database.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2219–2433 | 创建运行态数据库的表结构与初始元数据，返回可用的连接。 |
