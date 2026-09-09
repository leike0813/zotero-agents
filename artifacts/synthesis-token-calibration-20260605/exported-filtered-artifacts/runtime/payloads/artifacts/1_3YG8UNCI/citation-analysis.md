#### 按功能归类

**Background（背景工作）:**
- DETR 系列基础：[3] DETR（开创性工作，消除 NMS 需求）、[78] Deformable-DETR（多尺度变形注意力，提升小目标性能）
- 查询公式改进：[44] DAB-DETR（动态锚框）、[34] DN-DETR（查询去噪加速训练）
- 架构改进：[48] Conditional DETR（加速收敛）等 9 篇工作
- 排序相关先验：[31] IoU-Net（IoU 预测器）、[37] Generalized Focal Loss（质量焦点损失）、[76] VarifocalNet（IoU 感知分类分数）、[10] TOOD（高阶组合度量）
- 基于排序的损失：[53] DR loss、[4] AP-loss、[49][50] Oksuz 等 ranking-based loss、[32] Correlation loss
- 动态网络背景：[15] Dynamic neural networks survey

**Baseline（基线方法）:**
- [30] H-DETR（混合匹配，主要基线）
- [75] DINO-DETR（去噪锚框，SOTA 方法）

**Contrast（对比/并发工作）:**
- [1] Align-DETR、[45] Stable-DINO：并发工作，同样应用 IoU 感知分类分数，但本文额外引入架构设计

**Dataset（数据集）:**
- [42] COCO：实验基准数据集

**Tooling（工具）:**
- [54] detrex：实验实现工具箱

#### 按引用编号列举

- [3] DETR：定位为现代目标检测系统转型的起点，消除 NMS 需求的基础方法
- [78] Deformable-DETR：引入多尺度变形注意力，H-DETR 的继承基础
- [75] DINO-DETR：SOTA 方法，通过改进去噪锚框解决一对一匹配低效问题
- [30] H-DETR：主要基线方法，引入混合匹配方案
- [31] IoU-Net：早期探索分类分数与定位一致性工作
- [37] Generalized Focal Loss：联合表示 IoU 和分类分数
- [76] VarifocalNet：IoU 感知分类分数，本文对比实验显示 GCL 优于 VFL
- [10] TOOD：高阶组合锚点对齐度量
- [45] Stable-DINO、[1] Align-DETR：并发工作，共享洞察但本文额外引入架构设计
- [42] COCO、[54] detrex：实验设置
