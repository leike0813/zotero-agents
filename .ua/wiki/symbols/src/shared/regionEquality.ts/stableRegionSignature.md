
# stableRegionSignature
<!-- node: function:src/shared/regionEquality.ts:stableRegionSignature -->

为区域 selection 生成稳定字符串签名，序列化失败时降级为安全文本。
类型：函数  
复杂度：简单  
入边数：5  
标签：signature、serialization、memoization  
所属文件：[src/shared/regionEquality.ts](../../../../files/src/shared/regionEquality.ts.md)
源码：[src/shared/regionEquality.ts:16](../../../../../../src/shared/regionEquality.ts#L16)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [ArtifactReader.tsx](../../../../files/src/synthesis/components/reader/ArtifactReader.tsx.md) | src/synthesis/components/reader/ArtifactReader.tsx:— | artifact 原文阅读面板：在宿主交付 artifact payload 而非 topic detail 时渲染原始 markdown 与复制动作。 |
| [DigestModal.tsx](../../../../files/src/synthesis/components/reader/DigestModal.tsx.md) | src/synthesis/components/reader/DigestModal.tsx:— | 论文 digest 模态：正文、大纲与导语块（来源变更警告 + 代表图）作为一个命令式 island 渲染。 |
| [sections.tsx](../../../../files/src/synthesis/components/reader/sections.tsx.md) | src/synthesis/components/reader/sections.tsx:— | Topic detail 的八个分区组件（overview / taxonomy / claims / compare / future / coverage / references / report 等）。 |
| [TimelineIsland.tsx](../../../../files/src/synthesis/components/reader/TimelineIsland.tsx.md) | src/synthesis/components/reader/TimelineIsland.tsx:— | 主题时间线 island：仅在时间线数据签名或选中证据变化时重建共享命令式渲染器的产出 DOM。 |
| [messageCountsEqualityInput](../../../../files/src/sidebar/components/regionEquality.ts.md) | src/sidebar/components/regionEquality.ts:77–92 | 构造消息计数区域的比较输入，只包含用户可见计数。 |

## 调用

该符号没有记录对外调用。
