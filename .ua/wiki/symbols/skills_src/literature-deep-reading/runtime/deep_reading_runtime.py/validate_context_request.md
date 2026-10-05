
# validate_context_request
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:validate_context_request -->

校验 stage10 上下文请求 payload 的字段与引用合法性。
类型：函数  
复杂度：中等  
入边数：2  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:7115](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L7115)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [main](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:7349–7426 | 运行时 CLI 入口，解析阶段与命令后分发到 bootstrap、status、validate 与各阶段提交逻辑。 |
| [submit_context_request](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6945–7056 | stage10 提交入口，校验后落库并生成下一阶段指令。 |

## 调用

该符号没有记录对外调用。
