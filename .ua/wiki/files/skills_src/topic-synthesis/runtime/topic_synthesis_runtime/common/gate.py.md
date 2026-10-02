
# skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py
所属分层：[内置工作流包与 Skill 资产](../../../../../../layers/workflow-assets.md)  
所属目录：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common](../../../../../../modules/skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common.md)
<!-- node: file:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py -->

topic-synthesis 运行时通用 gate 命令行入口，读取阶段 payload、交给数据库模块校验后以 JSON 输出 gate 结果。
源码：[skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py](../../../../../../../../skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py)

## 符号（3）
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py:_configure_stdio -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py:_print_json -->
<!-- node: function:skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/gate.py:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| _configure_stdio | 函数 | 16–21 | 简单 | runtime、topic-synthesis、validation | 0 | 重配标准输出为 UTF-8，保证 Windows 下 JSON 输出不乱码。 |
| _print_json | 函数 | 24–25 | 简单 | runtime、topic-synthesis、validation | 0 | 以稳定格式打印 JSON 结果到标准输出。 |
| main | 函数 | 28–123 | 复杂 | runtime、topic-synthesis、validation | 0 | gate 命令入口，解析阶段参数、调用数据库模块做 payload 校验并输出 JSON 结果。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [topic_synthesis_db.py](topic_synthesis_db.py.md) | skills_src/topic-synthesis/runtime/topic_synthesis_runtime/common/topic_synthesis_db.py | topic-synthesis 运行时核心数据库与编排模块，负责运行态元数据、阶段记录、JSON Schema 校验、resolver 瀑布与最终报告物化。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| _configure_stdio | 函数 | 16–21 | 重配标准输出为 UTF-8，保证 Windows 下 JSON 输出不乱码。 |
| _print_json | 函数 | 24–25 | 以稳定格式打印 JSON 结果到标准输出。 |
| main | 函数 | 28–123 | gate 命令入口，解析阶段参数、调用数据库模块做 payload 校验并输出 JSON 结果。 |
