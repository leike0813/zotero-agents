
# skills_src/literature-deep-reading/contracts/stages.json
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[skills_src/literature-deep-reading/contracts](../../../../modules/skills_src/literature-deep-reading/contracts.md)
<!-- node: config:skills_src/literature-deep-reading/contracts/stages.json -->

literature-deep-reading skill 的阶段契约定义，声明 10/20/30/40 各阶段的标识、说明与提交要求。
源码：[skills_src/literature-deep-reading/contracts/stages.json](../../../../../../skills_src/literature-deep-reading/contracts/stages.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [deep_reading_runtime.py](../runtime/deep_reading_runtime.py.md) | skills_src/literature-deep-reading/runtime/deep_reading_runtime.py | literature-deep-reading skill 的 Python 运行时，单文件实现 10/20/30/40 四阶段的宿主预检、payload 校验、SQLite 持久化、桥接调用与静态 HTML 渲染。 |
