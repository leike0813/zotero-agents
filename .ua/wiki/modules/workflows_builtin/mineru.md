
# workflows_builtin/mineru
> 目录聚合页：3 个文件、0 个符号。由知识图谱按源路径生成。

语言：json、markdown

## 文件

| 文件 | 类型 | 符号数 | 摘要 |
| --- | --- | --- | --- |
| [workflows_builtin/mineru/README.md](../../files/workflows_builtin/mineru/README.md.md) | 文档 | 0 | MinerU 工作流包的中文使用文档：说明该工作流调用 MinerU 云服务把 PDF 附件解析为 Markdown 与图片，涵盖 API Token 与 Generic HTTP Profile 配置、PDF 选择与同名冲突跳过规则、>200 页长 PDF 按页码分片、耗时预估、产物落盘位置与 status 标签清理，以及与 Literature Analysis / Deep Reading 的衔接。 |
| [workflows_builtin/mineru/workflow-package.json](../../files/workflows_builtin/mineru/workflow-package.json.md) | 配置 | 0 | MinerU 工作流包的身份清单，声明包 id、版本与所含工作流文件列表，供工作流 catalog 扫描、加载与版本校验。 |
| [workflows_builtin/mineru/workflow.json](../../files/workflows_builtin/mineru/workflow.json.md) | 配置 | 0 | MinerU 工作流的声明式定义：使用 schemaVersion 2 协议，绑定 generic-http Provider，要求存在 PDF 附件选择，通过 available 阶段的选择校验（源文件存在、同名 mineru-markdown 产物缺失），并以 generic-http.steps.v1 声明创建上传地址、PUT 上传、轮询解析结果直至 done/failed、下载 zip 包四个步骤，配套 preflight / buildRequest / applyResult 三个 hook 与 10 分钟超时。 |

## 子目录
- [hooks](mineru/hooks.md)、[lib](mineru/lib.md)

## 对外依赖目录

| 目录 | 关系数 |
| --- | --- |
| [workflows_builtin/mineru/hooks](mineru/hooks.md) | 3 |
