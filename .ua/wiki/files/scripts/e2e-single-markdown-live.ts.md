
# scripts/e2e-single-markdown-live.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/e2e-single-markdown-live.ts -->

端到端演练脚本：加载 single-markdown 工作流包，用 SkillRunner provider 真实提交一次请求并落盘产物，用于验证工作流运行时到后端的完整链路。
源码：[scripts/e2e-single-markdown-live.ts](../../../../scripts/e2e-single-markdown-live.ts)

## 符号（6）
<!-- node: function:scripts/e2e-single-markdown-live.ts:main -->
<!-- node: function:scripts/e2e-single-markdown-live.ts:makeOutputPath -->
<!-- node: function:scripts/e2e-single-markdown-live.ts:normalizeAttachmentPaths -->
<!-- node: function:scripts/e2e-single-markdown-live.ts:patchUploadFieldToFile -->
<!-- node: function:scripts/e2e-single-markdown-live.ts:readSelectionFixture -->
<!-- node: function:scripts/e2e-single-markdown-live.ts:summarizeRequest -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 127–212 | 中等 | entry-point、e2e、orchestration | 0 | 脚本主流程：读取 selection fixture、加载工作流、构造 single-markdown 请求并提交，打印请求摘要与输出路径。 |
| makeOutputPath | 函数 | 115–125 | 简单 | utility、path、artifact | 0 | 为演练结果拼装输出目录与产物文件名，保证多次运行不互相覆盖。 |
| normalizeAttachmentPaths | 函数 | 84–98 | 简单 | utility、path、normalization | 0 | 把附件路径统一解析为绝对路径并去重，剔除不存在的文件。 |
| patchUploadFieldToFile | 函数 | 45–56 | 简单 | utility、e2e、adapter | 0 | 把上传表单中的附件字段改写为文件句柄，使演练请求能携带本地文件。 |
| readSelectionFixture | 函数 | 72–82 | 简单 | utility、fixture、io | 0 | 从 fixture 文件读入模拟选区条目，作为演练请求的输入集合。 |
| summarizeRequest | 函数 | 100–113 | 简单 | utility、formatting、diagnostics | 0 | 生成请求的可读摘要（工作流 id、条目数、附件数），便于在 CI 日志中核对。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [loader.ts](../src/workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [provider.ts](../src/providers/skillrunner/provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [runtime.ts](../src/workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |

## 依赖

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [SkillRunnerProvider](../../symbols/src/providers/skillrunner/provider.ts/SkillRunnerProvider.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider 实现：校验后端协议兼容性、解析管理认证、按请求种类分派到 client，并声明模型、effort、缓存与超时等运行时选项 schema。 |
