
# run_host_preflight
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:run_host_preflight -->

调用宿主桥执行 preflight，收集文献、导出产物与远端清单等上下文事实。
类型：函数  
复杂度：复杂  
入边数：1  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2049](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L2049)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [submit_context_request](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:6945–7056 | stage10 提交入口，校验后落库并生成下一阶段指令。 |

## 调用

| 被调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [bridge_executable](bridge_executable.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:710–732 | 定位宿主桥可执行文件，校验存在性并返回绝对路径。 |
| [run_bridge_json](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:735–753 | 以 JSON 协议调用宿主桥，解析返回数据并向上抛出结构化错误。 |
