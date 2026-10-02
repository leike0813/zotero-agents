
# write_complete_sections
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:write_complete_sections -->

写出最终报告的各章节内容，含主题、taxonomy、claims 与时间线。
类型：函数  
复杂度：复杂  
入边数：1  
标签：runtime、topic-synthesis、validation  
所属文件：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md)
源码：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:4017](../../../../../../../../../skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py#L4017)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [materialize_final_output](../../../../../../../files/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:4124–4196 | 把最终报告物化为 run 目录下的成品文件与 sidecar 清单。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [report_body](report_body.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py:3854–4000 | 把结构化报告数据渲染为 Markdown 正文，含小节、列表与引用标记。 |
