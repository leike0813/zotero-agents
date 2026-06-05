#### 按功能归类

**Background（背景工作）:**
- YOLO 系列 [1, 11-13, 22, 24, 26]：作为基于 CNN 的单阶段实时检测器主流方法被引用，采用一到多标签分配策略
- DETR [2, 3]：首个基于 Transformer 的端到端目标检测算法，采用集合预测和匈牙利匹配
- RT-DETR [32] 和 RT-DETRv2 [19]：本文方法的基础框架，首个实时端到端 Transformer 检测器及其改进版本
- DETR 变体 [14, 16, 29]：DAB-DETR、DINO、DN-DETR 等通过迭代细化和去噪训练加速收敛
- PPYOLO 系列 [10, 18]：百度基于 PaddlePaddle 的实时检测解决方案

**Component（组件/方法来源）:**
- Co-DETR [33]：提出多并行一到多标签分配辅助头训练策略，直接影响本文设计
- ViT-CoMer [27]：与 Co-DETR 结合达到 SOTA 性能的成功案例
- DAC-DETR [9]、MSDETR [31]、GroupDETR [4]：通过给解码器添加一到多监督加速收敛
- ATSS [30] 和 Faster RCNN [20]：Co-DETR 采用的辅助头策略
- PP-YOLOE [28]：本文 CNN 辅助分支直接采用的密集监督方法
- CSPNet [25]、PAN [17]、RepVGG [6]、SimOTA [7]：YOLO 系列采用的架构组件
- ResNet [8]：本文可使用的 CNN 骨干网络

**Dataset（数据集）:**
- MS COCO [15]：本文实验评估基准数据集
- Objects365 [21]：用于解决过拟合问题的额外训练数据

**Contrast（对比方法）:**
- YOLO-MS [5]、Gold-YOLO [23]：CNN 基实时检测器对比方法

#### 按引用编号列举

- [1] YOLOv4：作为 YOLO 系列代表，说明 CNN 单阶段检测器主流方法
- [2, 3] DETR：首个 Transformer 端到端检测器，无需 NMS 后处理
- [4] GroupDETR：通过分组一到多分配加速 DETR 训练
- [5] YOLO-MS：多尺度表示学习实时检测，对比方法
- [6] RepVGG：YOLOv6 采用的骨干网络组件
- [7] SimOTA：YOLOv6 采用的有效训练策略
- [8] ResNet：本文可使用的 CNN 骨干
- [9] DAC-DETR：通过注意力层分割加速收敛
- [10, 18] PPYOLO 系列：百度 PaddlePaddle 实时检测方案
- [11] YOLOv8：提出 C2f 模块进行特征提取融合
- [12] YOLOv5：采用 CSPNet 和 PAN 优化架构
- [13] YOLOv6：引入 RepVGG 骨干、解耦头、SimOTA
- [14] DN-DETR：通过查询去噪加速 DETR 训练
- [15] MS COCO：实验评估基准数据集
- [16] DAB-DETR：动态锚框作为更好查询
- [17] PAN：特征金字塔聚合网络
- [19] RT-DETRv2：RT-DETR 改进版本，优化训练策略
- [20] Faster R-CNN：经典两阶段检测器，Co-DETR 辅助策略之一
- [21] Objects365：额外训练数据解决过拟合
- [22] YOLOv10：实时端到端检测，YOLO 系列最新工作
- [23] Gold-YOLO：聚集 - 分发机制高效检测器，对比方法
- [24] YOLOv7：E-ELAN 注意力模块和自适应锚点机制
- [25] CSPNet：增强 CNN 学习能力的骨干网络
- [26] YOLOv9：GELAN 架构和 PGI 增强训练
- [27] ViT-CoMer：与 Co-DETR 结合达到 SOTA
- [28] PP-YOLOE：本文 CNN 辅助分支采用的方法
- [29] DINO：改进去噪锚框的 DETR
- [30] ATSS：自适应训练样本选择，Co-DETR 辅助策略
- [31] MSDETR：混合监督高效 DETR 训练
- [32] RT-DETR：本文基础框架，首个实时端到端 Transformer 检测器
- [33] Co-DETR：协作混合分配训练，核心参考工作
