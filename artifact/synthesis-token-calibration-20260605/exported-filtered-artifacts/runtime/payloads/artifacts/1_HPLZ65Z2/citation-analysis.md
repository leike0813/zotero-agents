#### 按功能归类

**Background（背景与基础）：**
- DETR [3]：开创性端到端 Transformer 检测器，消除手工组件，建模为集合预测任务
- Faster R-CNN [30]：经典两阶段检测器代表，使用 RPN 生成候选框
- Efficient DETR [39]：通过密集先验改进检测器，选择 top-K 特征增强查询
- Conditional DETR [25]：解耦查询的位置和内容信息，加速训练收敛

**Component（DINO 的组成基础）：**
- Deformable DETR [41]：提出可变形注意力机制和查询选择技术，DINO 直接采用
- DAB-DETR [21]：将查询公式化为 4D 动态锚框，DINO 跟随此表示方法
- DN-DETR [17]：引入去噪训练稳定二分匹配，DINO 扩展为对比去噪
- Swin Transformer [23]：提供层次化 Transformer 骨干，DINO 使用 SwinL 变体
- ResNet [14]：基础卷积骨干网络，DINO 使用 ResNet-50 进行基准实验

**Contrast（对比与超越目标）：**
- DyHead [7]：改进后的经典卷积检测器，COCO 上顶尖性能，DETR 需超越的目标
- HTC++ [4]：另一经典 SOTA 检测器框架，与 DyHead 同为 DINO 超越目标
- SwinV2-G [22]：超大模型 SOTA（30 亿参数，70M 私有数据），DINO 以 1/15 参数量实现更好性能
- Florence [40]：海量数据 SOTA（9 亿图像 - 文本对），DINO 以 1/60 骨干数据 +1/5 检测数据实现更好性能

**Dataset（数据集）：**
- COCO [20]：目标检测标准基准，所有主要实验在此进行
- Objects365 [33]：大规模公开检测数据集（1.7M 图像），DINO 预训练使用

#### 按引用编号列举

- [3] DETR：作为 DETR 类检测器的开创性工作被多次引用，定义查询结构、集合预测范式
- [4] HTC++：作为经典 SOTA 检测器被引用，代表 DINO 需超越的目标
- [7] DyHead：作为经典 SOTA 检测器被引用，与 HTC++ 同为性能对比基线
- [14] ResNet：作为基础骨干网络被引用，用于 DINO 基础实验
- [17] DN-DETR：作为 DINO 的直接基础被频繁引用，去噪训练方法被扩展为对比去噪
- [20] COCO：作为标准基准数据集被引用，所有实验在此进行
- [21] DAB-DETR：作为 DINO 的直接基础被引用，4D 锚框表示被采用
- [22] SwinV2-G：作为 SOTA 对比目标被引用，DINO 以更小模型实现更好性能
- [23] Swin Transformer：作为骨干网络被引用，SwinL 变体用于大规模实验
- [25] Conditional DETR：作为查询结构分析的基础被引用
- [30] Faster R-CNN：作为经典检测器代表被引用，性能对比基线
- [33] Objects365：作为预训练数据集被引用，DINO 实现 SOTA 的关键
- [39] Efficient DETR：作为查询选择技术的早期探索被引用
- [40] Florence：作为海量数据 SOTA 被引用，DINO 以更少数据实现更好性能
- [41] Deformable DETR：作为 DINO 的直接基础被频繁引用，可变形注意力和查询选择被采用
