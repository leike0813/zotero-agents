
# scripts/mock-skillrunner-serve.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/mock-skillrunner-serve.ts -->

本地 Mock SkillRunner 服务，提供旧版后端的最小 HTTP 契约实现，供插件开发与集成测试使用。
源码：[scripts/mock-skillrunner-serve.ts](../../../../scripts/mock-skillrunner-serve.ts)

## 符号（2）
<!-- node: function:scripts/mock-skillrunner-serve.ts:main -->
<!-- node: function:scripts/mock-skillrunner-serve.ts:parseArgs -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| main | 函数 | 72–95 | 中等 | test、mock、server、skillrunner | 0 | 启动本地 Mock SkillRunner HTTP 服务，提供旧版后端的最小契约实现供集成测试使用。 |
| parseArgs | 函数 | 29–70 | 中等 | parsing、test、mock、server | 0 | 解析 Mock SkillRunner 服务的端口、路径与项目根目录等运行参数。 |
