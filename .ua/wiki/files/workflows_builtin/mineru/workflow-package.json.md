
# workflows_builtin/mineru/workflow-package.json

语言：json
所属分层：[内置工作流包与 Skill 资产](../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/mineru](../../../modules/workflows_builtin/mineru.md)
<!-- node: config:workflows_builtin/mineru/workflow-package.json -->

MinerU 工作流包的身份清单，声明包 id、版本与所含工作流文件列表，供工作流 catalog 扫描、加载与版本校验。

规模：5 行
源码：[workflows_builtin/mineru/workflow-package.json](../../../../../workflows_builtin/mineru/workflow-package.json)

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflow.json](workflow.json.md) | workflows_builtin/mineru/workflow.json | MinerU 工作流的声明式定义：使用 schemaVersion 2 协议，绑定 generic-http Provider，要求存在 PDF 附件选择，通过 available 阶段的选择校验（源文件存在、同名 mineru-markdown 产物缺失），并以 generic-http.steps.v1 声明创建上传地址、PUT 上传、轮询解析结果直至 done/failed、下载 zip 包四个步骤，配套 preflight / buildRequest / applyResult 三个 hook 与 10 分钟超时。 |
