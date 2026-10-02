
# scripts/content-package/check-builtin-workflow-manifest.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/content-package](../../../modules/scripts/content-package.md)
<!-- node: file:scripts/content-package/check-builtin-workflow-manifest.ts -->

校验内置工作流包清单与实际文件树是否一致，检查路径规范化、必需文件存在性与清单条目匹配。
源码：[scripts/content-package/check-builtin-workflow-manifest.ts](../../../../../scripts/content-package/check-builtin-workflow-manifest.ts)

## 符号（2）
<!-- node: function:scripts/content-package/check-builtin-workflow-manifest.ts:collectBuiltinFiles -->
<!-- node: function:scripts/content-package/check-builtin-workflow-manifest.ts:main -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| collectBuiltinFiles | 函数 | 19–43 | 简单 | content-package、filesystem、path-resolution、discovery | 0 | 递归枚举内置工作流包目录下的实际文件，并把 Windows 分隔符归一化为 POSIX 相对路径。 |
| main | 函数 | 45–138 | 中等 | validation、content-package、manifest、entry-point | 0 | 比对内置工作流包清单声明与磁盘实际文件树，报告缺失、冗余与路径不一致的条目。 |
