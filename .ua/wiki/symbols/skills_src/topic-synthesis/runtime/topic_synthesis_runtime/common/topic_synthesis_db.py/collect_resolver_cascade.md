
# collect_resolver_cascade
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:collect_resolver_cascade -->

resolver 瀑布的主流程，按级联顺序解析文献引用并登记审计记录。
类型：函数  
复杂度：复杂  
入边数：2  
标签：runtime、topic-synthesis、validation  
所属文件：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md)
源码：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:1659](../../../../../../../../../skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py#L1659)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [run_create_preflight](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:1521–1566 | 新建主题前的预检流程，解析输入、生成 workset 与候选文献集合。 |
| [run_update_preflight](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:1371–1518 | 更新主题前的预检流程，比对既有定义并解析受影响文献范围。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [store_workset](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:1350–1368 | 把预检得到的 workset 写入运行态存储，供后续阶段复用。 |
