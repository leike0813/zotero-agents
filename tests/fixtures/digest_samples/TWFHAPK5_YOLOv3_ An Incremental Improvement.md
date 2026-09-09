## TL;DR

YOLOv3 是 YOLO 系列目标检测算法的第三次迭代，通过在边界框预测、类别预测、多尺度预测和特征提取器四个方面引入多项增量改进，在保持实时检测速度的同时显著提升了检测精度。

在 COCO 数据集上，YOLOv3 在 320×320 分辨率下以 22ms 达到 28.2 mAP，与 SSD 精度相当但速度快三倍；在 AP50 指标上以 51ms 达到 57.9 AP50，与 RetinaNet 精度相近但速度快 3.8 倍。

论文同时探讨了 COCO 评估指标的合理性问题，认为当前 mAP 指标存在与人类感知不一致的缺陷，并呼吁研究者关注目标检测技术可能带来的社会伦理影响。


## 研究问题与贡献

- 研究问题：如何在不牺牲检测速度的前提下，通过增量改进提升 YOLO 系列检测器的精度？


- 提出 Darknet-53 特征提取网络，结合残差连接实现比 ResNet-101 更高精度且快 1.5 倍的骨干网络

- 引入三尺度特征金字塔预测机制，显著改善小目标检测性能

- 采用多标签逻辑分类替代 softmax，支持重叠类别标签场景

- 在 AP50 指标上达到与 RetinaNet 相当的性能，同时推理速度快 3.8 倍


## 方法要点

- 边界框预测：使用维度聚类得到的 anchor boxes，预测 4 个坐标偏移量 (tx, ty, tw, th)，通过 sigmoid 函数预测中心坐标偏移，通过指数变换预测宽高偏移

- 类别预测：采用独立逻辑分类器替代 softmax，使用二元交叉熵损失，适用于 Open Images 等存在重叠标签的数据集

- 多尺度预测：在 3 个不同尺度上预测边界框，采用类似特征金字塔网络 (FPN) 的方法，将深层语义信息与浅层细粒度信息融合

- Darknet-53 骨干网络：53 层卷积网络，结合 3×3 和 1×1 卷积层以及残差快捷连接，在 ImageNet 上达到 77.2% Top-1 精度

- 训练策略：全图像训练、多尺度训练、大量数据增强、批归一化，使用 Darknet 框架


## 关键结果

- COCO 测试集上达到 33.0 mAP (608×608)，与 SSD 变体相当但速度快 3 倍

- AP50 指标上达到 57.9，接近 RetinaNet 的 59.1，但推理时间 51ms vs 198ms

- 小目标检测 (AP_S) 达到 18.3，相比 YOLOv2 的 5.0 有显著提升

- Darknet-53 在 ImageNet 上 Top-1 精度 77.2%，超越 ResNet-101 (77.1) 且速度快 1.5 倍

- Focal Loss 实验导致 mAP 下降约 2 个百分点

- 线性 x,y 预测替代 logistic 激活导致 mAP 下降数个百分点


## 局限与可复现性线索

- 在 COCO 的严格 mAP 指标 (IOU 从 0.5 到 0.95 的平均) 上仍落后于 RetinaNet，表明边界框精准对齐能力不足

- 中等尺寸和大尺寸目标检测性能相对较低 (AP_M=35.4, AP_L=41.9)

- 论文以技术报告形式发布，缺乏详细的消融实验数据

- 所有代码开源在 https://pjreddie.com/yolo/，但训练细节描述较简略

- 作者承认某些失败实验的尝试可能只需要更多调参即可稳定训练


## 分章节总结

### Abstract

- YOLOv3 在 320×320 下 22ms 达到 28.2 mAP，与 SSD 精度相当但快 3 倍

- 在 AP50 指标上 51ms 达到 57.9 AP50，与 RetinaNet 相近但快 3.8 倍

- 代码开源在 https://pjreddie.com/yolo/



### 1. Introduction

- 论文起因是 camera-ready  deadline 需要引用 YOLO 的改进但缺乏正式来源

- 以技术报告形式发布，介绍了 YOLOv3 的改进内容、实验结果、失败尝试和意义思考



### 2. The Deal

- YOLOv3 主要借鉴了其他人的好想法，同时训练了一个新的分类网络

- 整体系统从边界框预测、类别预测、多尺度预测和特征提取器四个方面进行了改进



### 2.1. Bounding Box Prediction

- 使用维度聚类作为 anchor boxes，预测 4 个坐标偏移量

- 使用 logistic 回归预测 objectness 分数，阈值为 0.5

- 每个 ground truth 目标只分配一个 bounding box prior



### 2.2. Class Prediction

- 使用多标签分类而非 softmax，采用独立逻辑分类器

- 训练时使用二元交叉熵损失

- 适用于存在重叠标签的数据集如 Open Images



### 2.3. Predictions Across Scales

- 在 3 个不同尺度上预测边界框，采用特征金字塔网络概念

- 通过上采样和特征拼接融合深层语义与浅层细粒度信息

- 使用 k-means 聚类确定 9 个 bounding box priors，均匀分配到 3 个尺度



### 2.4. Feature Extractor

- 提出 Darknet-53：53 层卷积网络，结合残差连接

- 在 ImageNet 上 Top-1 精度 77.2%，超越 ResNet-101 且快 1.5 倍

- 达到最高 measured FLOP/s，更高效利用 GPU



### 2.5. Training

- 全图像训练，不使用 hard negative mining

- 采用多尺度训练、数据增强、批归一化

- 使用 Darknet 框架进行训练和测试



### 3. How We Do

- COCO mAP 上与 SSD 变体相当但快 3 倍，但落后于 RetinaNet

- AP50 指标上非常强，接近 RetinaNet，远超 SSD 变体

- 小目标检测性能显著提升，得益于多尺度预测

- 中等和大尺寸目标性能相对较差



### 4. Things We Tried That Didn't Work

- 线性 x,y 偏移预测降低了模型稳定性

- 线性激活替代 logistic 激活导致 mAP 下降

- Focal Loss 导致 mAP 下降约 2 个百分点

- 双 IOU 阈值策略未能取得好效果



### 5. What This All Means

- YOLOv3 在 AP50 上表现优秀但在 COCO 严格 mAP 上不够出色

- 质疑 COCO 评估指标的合理性，认为人类难以区分 IOU 0.3 和 0.5

- 指出 mAP 指标的缺陷：只关注类别排序，忽略边界框质量差异

- 呼吁研究者关注目标检测技术的伦理影响和社会责任