
# rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs
所属分层：[Synthesis 领域与侧车](../../../../../../layers/synthesis-domain.md)  
所属目录：[rust/synthesis-sidecar/crates/synthesis-citation-layout/src](../../../../../../modules/rust/synthesis-sidecar/crates/synthesis-citation-layout/src.md)
<!-- node: file:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs -->

引用图谱布局计算 crate，依据图谱结构与度量计算 Sigma 节点位置、相机参数等布局身份。
源码：[rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs](../../../../../../../../rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs)

## 符号（11）
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:compute_components -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:compute_force -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:compute_radial -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:compute_value -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:ForceParams -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:importance_cmp -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:LayoutResult -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:Request -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:result -->
<!-- node: class:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:ResultNode -->
<!-- node: function:rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs:validate_request -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compute_components | 函数 | 476–545 | 复杂 | layout、连通分量、网格排布 | 0 | 连通分量布局：把每个连通分量独立布局后再平移到画布网格位置。 |
| compute_force | 函数 | 329–415 | 复杂 | layout、力导向、ForceAtlas2、取消、孤立节点处理 | 0 | 力导向布局：连通节点跑 ForceAtlas2 迭代，孤立节点按螺旋排布到右侧空白区。 |
| compute_radial | 函数 | 417–474 | 复杂 | layout、径向布局、同心环、螺旋排布 | 0 | 径向布局：库内文献按重要度排成同心螺旋，外部引用按其来源文献的角位置定位。 |
| compute_value | 函数 | 547–559 | 简单 | layout、退化路径、一维排布 | 0 | 按节点重要度数值排布的一维布局，供小规模或退化输入使用。 |
| ForceParams | 类 | 81–94 | 中等 | layout、参数、力导向 | 1 | 力导向布局参数集，theta、gravity、overlap 规避与初始坐标等可调项。 |
| [importance_cmp](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs/importance_cmp.md) | 函数 | 249–294 | 复杂 | layout、排序、重要性、径向布局 | 1 | 按入度/出度与初始坐标确定节点重要度排序，驱动径向布局的同心环分配。 |
| LayoutResult | 类 | 123–130 | 中等 | 类型定义、layout、结果、identity | 0 | 布局结果，持有节点坐标、布局引擎标识、layoutVersion 与参数回显。 |
| Request | 类 | 64–69 | 中等 | 类型定义、layout、请求 | 1 | 布局计算请求，携带节点、边、graphHash、算法选择与 Sigma camera 相关参数。 |
| [result](../../../../../../symbols/rust/synthesis-sidecar/crates/synthesis-citation-layout/src/lib.rs/result.md) | 函数 | 296–327 | 中等 | layout、结果装配、identity | 4 | 装配 LayoutResult，附加布局引擎标识与 layoutVersion，并按参数归一化坐标。 |
| ResultNode | 类 | 73–77 | 简单 | layout、类型定义、坐标 | 0 | 布局结果中的节点坐标，携带 nodeId 与归一化后的 x/y。 |
| validate_request | 函数 | 139–189 | 复杂 | 输入校验、layout、唯一性检查、安全边界 | 0 | 校验布局请求：节点 ID 唯一、边端点存在、图哈希一致、参数取值在允许区间内。 |
