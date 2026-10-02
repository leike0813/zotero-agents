
# parseLiteratureScore
<!-- node: function:src/shared/literatureScore.ts:parseLiteratureScore -->

校验并解析评分 payload 为结构化分数摘要。
类型：函数  
复杂度：简单  
入边数：2  
标签：literature-score、parsing、validation  
所属文件：[src/shared/literatureScore.ts](../../../../files/src/shared/literatureScore.ts.md)
源码：[src/shared/literatureScore.ts:70](../../../../../../src/shared/literatureScore.ts#L70)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [validateLiteratureScoreArtifact](../../../../files/packages/synthesis-contracts/src/literatureArtifacts.ts.md) | packages/synthesis-contracts/src/literatureArtifacts.ts:128–142 | 校验 literature score artifact 的 payload 类型、schema 引用与必填字段，返回结构化问题列表。 |
| [evaluateGeneratedNoteArtifact](../../../../files/src/modules/zoteroHost/libraryArtifactReadiness.ts.md) | src/modules/zoteroHost/libraryArtifactReadiness.ts:533–583 | 遍历并评估一个产物定义对应的全部受管笔记。 |

## 调用

该符号没有记录对外调用。
