#### 按功能归类

**Background（背景方法）**:
- DETR [2]: 端到端检测 Transformer 基础方法，采用一对一分派和二分匹配
- Transformer [37]: 自注意力机制基础架构
- ResNet [13]: CNN 骨干网络基础
- SMCA [8]: 空间调制加速 DETR 收敛

**Baseline（实验基线）**:
- Faster R-CNN [33]: 一对多分配在传统检测中的成功代表
- FCOS [36]: 无锚框一对多检测方法
- Deformable DETR [47]: 可变形注意力稀疏采样
- Conditional DETR [30]: 空间注意力软选择，本文主要基线
- DAB-DETR [25]: 动态锚框查询设计
- DINO [44]: 最强 DETR 变体，对比去噪训练

**Contrast（对比/并发工作）**:
- DN-DETR [20]: 去噪查询稳定分配，与本文正交互补
- H-DETR [16]: 并发工作，混合分配策略，推理需 NMS
- DETA [31]: 并发工作，一对多分配+NMS

**Dataset（数据集）**:
- COCO [24]: 主要评估基准

**Tooling（工具）**:
- FlashAttention [6]: 高效注意力实现

#### 按引用编号列举

- [2] DETR：本文研究的基础框架，首次实现端到端检测无需 NMS
- [6] FlashAttention：用于优化并行解码器效率
- [8] SMCA：修改交叉注意力加速收敛的代表工作
- [13] ResNet：骨干网络基础
- [16] H-DETR：并发工作，采用混合分配但推理需 NMS
- [20] DN-DETR：通过去噪查询稳定分配，与本文方法互补
- [24] COCO：实验评估数据集
- [25] DAB-DETR：动态锚框查询，本文基线之一
- [30] Conditional DETR：主要基线，本文提升 5.0 mAP
- [31] DETA：并发工作，引入 NMS 回 DETR
- [33] Faster R-CNN：一对多分配在传统检测中的成功案例
- [36] FCOS：无锚框一对多检测
- [37] Transformer：注意力机制基础
- [44] DINO：最强基线，本文仍提升 0.7 mAP
- [47] Deformable DETR：可变形注意力加速训练
