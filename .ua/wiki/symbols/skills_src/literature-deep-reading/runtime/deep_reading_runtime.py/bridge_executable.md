
# bridge_executable
<!-- node: function:skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:bridge_executable -->

定位宿主桥可执行文件，校验存在性并返回绝对路径。
类型：函数  
复杂度：简单  
入边数：2  
标签：runtime、literature-deep-reading、stage-pipeline  
所属文件：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md)
源码：[skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:710](../../../../../../../skills_src/literature-deep-reading/runtime/deep_reading_runtime.py#L710)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [run_bridge_json](../../../../../files/skills_src/literature-deep-reading/runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:735–753 | 以 JSON 协议调用宿主桥，解析返回数据并向上抛出结构化错误。 |
| [run_host_preflight](run_host_preflight.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py:2049–2142 | 调用宿主桥执行 preflight，收集文献、导出产物与远端清单等上下文事实。 |

## 调用

该符号没有记录对外调用。
