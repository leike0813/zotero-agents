
# scripts/synthesis/check-synthesis-service-boundary.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/synthesis](../../../modules/scripts/synthesis.md)
<!-- node: file:scripts/synthesis/check-synthesis-service-boundary.ts -->

Synthesis 侧车服务边界巡检脚本，遍历仓库源码查找越界模式（生产代码引用测试设施、跨契约层导入等）并以 CLI 结果报告违规。
源码：[scripts/synthesis/check-synthesis-service-boundary.ts](../../../../../scripts/synthesis/check-synthesis-service-boundary.ts)

## 符号（7）
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:findForbiddenSynthesisSourcePatterns -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:findSynthesisContractBoundaryViolations -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:findSynthesisProductionBoundaryViolations -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:inspectSynthesisServiceBoundary -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:normalizedRepoPath -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:runCli -->
<!-- node: function:scripts/synthesis/check-synthesis-service-boundary.ts:walkFiles -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| findForbiddenSynthesisSourcePatterns | 函数 | 42–75 | 中等 | script、tooling、build-system | 0 | 扫描源码中的禁止模式，识别生产代码引用测试设施等越界写法。 |
| findSynthesisContractBoundaryViolations | 函数 | 77–115 | 中等 | script、tooling、build-system | 0 | 检测跨契约层导入，确保 sidecar 只通过 contracts 描述跨语言边界。 |
| findSynthesisProductionBoundaryViolations | 函数 | 117–152 | 中等 | script、tooling、build-system | 0 | 检测生产路径依赖测试或非生产模块的违规依赖。 |
| inspectSynthesisServiceBoundary | 函数 | 154–167 | 简单 | script、tooling、build-system | 0 | 边界巡检入口，汇总禁止模式、契约边界与生产边界三类违规并统一输出。 |
| normalizedRepoPath | 函数 | 22–24 | 简单 | script、tooling、build-system | 0 | 把绝对路径归一化为仓库相对路径，便于稳定比较与报告。 |
| runCli | 函数 | 169–183 | 简单 | script、tooling、build-system | 0 | 执行底层检查 CLI 并把其 JSON 结果回传给巡检入口。 |
| walkFiles | 函数 | 26–40 | 简单 | script、tooling、build-system | 0 | 递归遍历目录下的受管源文件，忽略构建产物与依赖目录。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| findForbiddenSynthesisSourcePatterns | 函数 | 42–75 | 扫描源码中的禁止模式，识别生产代码引用测试设施等越界写法。 |
| findSynthesisContractBoundaryViolations | 函数 | 77–115 | 检测跨契约层导入，确保 sidecar 只通过 contracts 描述跨语言边界。 |
| findSynthesisProductionBoundaryViolations | 函数 | 117–152 | 检测生产路径依赖测试或非生产模块的违规依赖。 |
| inspectSynthesisServiceBoundary | 函数 | 154–167 | 边界巡检入口，汇总禁止模式、契约边界与生产边界三类违规并统一输出。 |
