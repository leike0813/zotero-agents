
# result
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:result -->

装配 LayoutResult，附加布局引擎标识与 layoutVersion，并按参数归一化坐标。
类型：函数  
复杂度：中等  
入边数：4  
标签：layout、结果装配、identity  
所属文件：[rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs.md)
源码：[rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:296](../../../../../../../../../rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs#L296)

## 被调用

| 调用方 | 位置 | 摘要 |
| --- | --- | --- |
| [compute_components](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:476–545 | 连通分量布局：把每个连通分量独立布局后再平移到画布网格位置。 |
| [compute_force](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:329–415 | 力导向布局：连通节点跑 ForceAtlas2 迭代，孤立节点按螺旋排布到右侧空白区。 |
| [compute_radial](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:417–474 | 径向布局：库内文献按重要度排成同心螺旋，外部引用按其来源文献的角位置定位。 |
| [compute_value](../../../../../../../files/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs.md) | rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:547–559 | 按节点重要度数值排布的一维布局，供小规模或退化输入使用。 |

## 调用

该符号没有记录对外调用。
