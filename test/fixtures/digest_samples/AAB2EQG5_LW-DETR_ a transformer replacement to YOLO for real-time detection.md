## TL;DR

本文提出了 LW-DETR，一种轻量级检测 transformer，在实时目标检测任务上超越了 YOLO 系列方法。该架构由 ViT 编码器、投影器和浅层 DETR 解码器组成，利用了多级特征聚合、交错窗口与全局注意力、IoU 感知分类损失以及 Objects365 预训练等先进技术。

实验表明，LW-DETR 在 COCO 数据集上以相当的推理速度显著优于现有实时检测器（如 YOLOv8、RTMDet、YOLO-NAS），并且在跨域评估（UVO）和多域微调（RF100）上展现出更强的泛化能力。

## 研究问题与贡献

- 研究问题：能否用基于 Vision Transformer 的 DETR 架构替代 YOLO 系列卷积方法，实现更优的实时目标检测性能？

- 提出了简单的 LW-DETR 基线架构：ViT 编码器 + 卷积投影器 + 浅层 DETR 解码器

- 引入多级特征聚合与窗口优先特征图组织方法，提升编码器表达能力与推理效率

- 系统验证了预训练、更多监督、IoU 感知损失等训练技术对 DETR 的显著提升效果

- 在 COCO、UVO、RF100 等多个数据集上证明了 LW-DETR 优于现有实时检测器的性能与泛化能力

## 方法要点

- 采用 ViT 作为检测编码器，通过交错窗口与全局注意力层降低计算复杂度

- 提出窗口优先特征图组织方式，避免行优先到窗口优先的昂贵内存重排操作

- 聚合 ViT 编码器中间层与最终层的特征图，形成更丰富的特征表示

- 使用可变形交叉注意力的 3 层浅层 DETR 解码器，降低推理延迟

- 采用 IoU 感知分类损失（IA-BCE loss）提升分类与定位的一致性

- 使用 Group DETR（13 个并行解码器）在训练阶段提供更多监督

- 采用两阶段 Objects365 预训练策略：先 MIM 预训练 ViT，再监督预训练整个检测器

## 关键结果

- LW-DETR-small 在 COCO val2017 上达到 48.0 mAP，推理速度 340+ FPS（T4 GPU），优于 YOLOv8s（45.2 mAP）和 RTMDet-s（44.9 mAP）

- LW-DETR-medium 达到 52.5 mAP / 178+ FPS，优于 YOLOv8m（50.6 mAP）和 YOLO-NAS-m（51.6 mAP）

- LW-DETR-large 达到 56.1 mAP / 113 FPS，显著优于 RT-DETR-R50（55.3 mAP / 101 FPS）和 YOLOv10-X（54.4 mAP）

- Objects365 预训练带来平均 5.5 mAP 的显著提升，证明大规模数据对 DETR 的重要性

- 在 UVO 跨域评估中，LW-DETR-small 比最佳竞争者高 1.3 mAP 和 4.1 AR

- 在 RF100 多域微调中，LW-DETR 在文档和电磁域比现有方法高 5.6-5.7 AP

## 局限与可复现性线索

- 目前仅在实时检测任务上验证了有效性，尚未扩展到开放世界检测、多人姿态估计、多视角 3D 检测等任务

- 代码和模型已开源：https://github.com/Atten4Vis/LW-DETR

- 实验使用 TensorRT-8.6.1、CUDA-11.6、CuDNN-8.7.0，在 T4 GPU 上以 fp16 精度测量推理延迟

- 预训练和微调的超参数配置在补充材料中详细给出

## 分章节总结

### Introduction

- 实时目标检测是当前视觉识别领域的重要问题，主流方法以 YOLO 系列卷积网络为主

- DETR 类方法虽然取得显著进展，但在实时检测领域的应用尚未充分探索

- 本文提出简单的 LW-DETR 架构：ViT 编码器 + 卷积投影器 + DETR 解码器

- 通过多级特征聚合、交错窗口与全局注意力、IoU 感知损失、Objects365 预训练等技术提升性能

- LW-DETR 在 COCO 上以端到端推理时间（含 NMS）优于 YOLOv8、RTMDet、YOLO-NAS 等现有方法

### Related Work

- 实时检测领域：YOLO 系列通过架构设计、数据增强、训练技术、损失函数等持续改进，但均基于卷积

- ViT 用于目标检测：通常采用窗口注意力或层次架构降低计算成本；ViTDet 采用交错窗口与全局注意力

- DETR 及其变体：通过架构设计、查询设计、训练技术、损失函数改进、计算优化等方向提升性能

- 与本文并行的工作 RT-DETR 也基于 DETR 框架构建实时检测器，但侧重于 CNN 骨干网络

### LW-DETR

- 架构：ViT 编码器采用交错窗口与全局注意力降低复杂度；聚合多级特征图增强表达能力

- 解码器：3 层 transformer 解码器，采用可变形交叉注意力；混合查询选择策略

- 投影器：C2f 块连接编码器与解码器；大模型采用双尺度投影器

- 实例化：5 个模型尺度（tiny/small/medium/large/xlarge），参数量从 12.1M 到 118M

- 有效训练：Group DETR（13 个并行解码器）、两阶段 Objects365 预训练（MIM + 监督）

- 高效推理：窗口优先特征图组织避免内存重排开销，延迟从 3.7ms 降至 2.9ms

### Experiments

- COCO 结果：LW-DETR 在所有尺度上均优于 YOLOv8、RTMDet、YOLO-NAS，且无需 NMS 后处理

- 与并行工作比较：优于 YOLO-MS、Gold-YOLO、RT-DETR、YOLOv10，实现更好的精度-延迟平衡

- NMS 分析：YOLO 类方法 NMS 延迟占比较大（可达 4-5ms），LW-DETR 端到端检测无需 NMS

- 预训练效果：Objects365 预训练带来 5.5 mAP 平均提升；对非端到端检测器提升有限

- 跨域评估（UVO）：LW-DETR 展现出更强的泛化能力，AP 和 AR 均领先

- 多域微调（RF100）：在 7 个图像域上均优于现有实时检测器，特别是在文档和电磁域

### Limitation and future works

- 目前仅在实时检测任务上验证有效性

- 未来工作包括扩展到开放世界检测、多人姿态估计、多视角 3D 检测等任务

### Conclusion

- 检测 transformer 在实时目标检测上可取得优于现有方法的结果

- 成功源于多级特征聚合以及训练/推理高效技术

- 希望为视觉任务中构建实时 transformer 模型提供经验参考