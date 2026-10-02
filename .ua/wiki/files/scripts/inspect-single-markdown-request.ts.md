
# scripts/inspect-single-markdown-request.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/inspect-single-markdown-request.ts -->

调研脚本：重建 single-markdown 工作流请求的完整报文，包括 job queue 记录与 SkillRunner provider 的上传字段。
源码：[scripts/inspect-single-markdown-request.ts](../../../../scripts/inspect-single-markdown-request.ts)

## 符号（3）
<!-- node: function:scripts/inspect-single-markdown-request.ts:main -->
<!-- node: function:scripts/inspect-single-markdown-request.ts:normalizeAttachmentPaths -->
<!-- node: function:scripts/inspect-single-markdown-request.ts:readSelectionFixture -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 70–172 | 中等 | entry-point、diagnostics、orchestration | 0 | 主流程：加载工作流与 provider，生成并打印一条完整的 single-markdown 请求报文及其 job 记录。 |
| normalizeAttachmentPaths | 函数 | 54–68 | 简单 | utility、path、normalization | 0 | 归一化附件路径并过滤缺失文件，得到可上传的附件清单。 |
| readSelectionFixture | 函数 | 42–52 | 简单 | utility、fixture、io | 0 | 读取选区 fixture 文件，得到用于构造请求的条目集合。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [loader.ts](../src/workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [manager.ts](../src/jobQueue/manager.ts.md) | src/jobQueue/manager.ts | 通用作业队列管理器：维护任务记录、并发调度与元数据规范化，为工作流与 Agent 运行提供统一的排队与状态查询能力。 |
| [provider.ts](../src/providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [runtime.ts](../src/workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
