
# isRecord
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:isRecord -->

判定值是否为普通对象记录，排除 null 与数组。
类型：函数  
复杂度：简单  
入边数：2  
标签：utility、type-guard、validation  
所属文件：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md)
源码：[workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:64](../../../../../../../workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs#L64)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [applyResult](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:124–171 | hook 主入口：判定运行成功且类型为手稿文献框架时读取产物清单并向 productStorage 注册产品，返回 recorded/skipped 状态与资产统计。 |
| [readArtifactManifest](../../../../../files/workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs.md) | workflows_builtin/synthesis-layer/hooks/applyManuscriptLiteratureFramingResult.mjs:87–113 | 读取并校验产物清单：解析 manifest JSON，要求是对象且每个资产路径非空，否则抛出明确错误。 |

## 调用

该符号没有记录对外调用。
