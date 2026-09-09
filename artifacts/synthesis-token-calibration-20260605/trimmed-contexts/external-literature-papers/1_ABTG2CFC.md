# YOLOv7: Trainable Bag-of-Freebies Sets New State-of-the-Art for Real-Time Object Detectors (2023)

- Paper ref: 1:ABTG2CFC
- Title: YOLOv7: Trainable Bag-of-Freebies Sets New State-of-the-Art for Real-Time Object Detectors
- Year: 2023

## Compact References

_No references artifact rows available._

## Citation Analysis Report

#### 按功能归类

**Background（背景文献）:**
- 模型重参数化技术：[11,12,28] - RepVGG、Diverse Branch Block、在线卷积重参数化等方法成为网络训练和目标检测的重要研究方向
- 动态标签分配技术：[16,19,40] - TOOD、OTA、双权重标签分配方案等方法成为研究热点
- 特征融合方法：[8,21,29,36,43,56,71,94] - Dynamic Head、NAS-FPN、A²-FPN、Panoptic FPN、EfficientDet 等方法
- 应用领域文献：多目标跟踪 [90,91]、自动驾驶 [17,39]、机器人 [34,55]、医学图像分析 [33,44]

**Baseline（基线方法）:**
- YOLO 系列：[2] YOLOv4、[20] YOLOX、[22] YOLOv5、[76] Scaled-YOLOv4、[79] YOLOR、[83] PP-YOLOE
- 面向边缘 CPU 的方法：[46,47] MCUNet、[51] NanoDet
- 面向 GPU 的方法：[20] YOLOX、[79] YOLOR、[94] CenterNet

**Component（组件/架构）:**
- 轻量级骨干网络：MobileNet [26,27,63]、ShuffleNet [52,89]、GhostNet [24]
- GPU 导向架构：ResNet [25]、DarkNet [60]、DLA [85]、CSPNet [77]

#### 按引用编号列举

- **[2] YOLOv4**: 作为当前最先进的实时目标检测器之一，是重要的基线方法，本文方法在 YOLOv4 基础上进行改进。
- **[11,12,28] 模型重参数化**: RepVGG、Diverse Branch Block、在线卷积重参数化等方法成为网络训练的重要技术，本文分析了重参数化在不同网络结构中的适用性并提出计划重参数化模型。
- **[16,19,40] 动态标签分配**: TOOD、OTA、双权重标签分配等方法成为研究热点，本文针对多输出层模型的标签分配问题提出新的解决方案。
- **[20] YOLOX / [79] YOLOR**: 作为面向 GPU 优化的实时检测器代表，与本文方法属于同一研究方向，是最重要的基线方法。
- **[46,47] MCUNet / [51] NanoDet**: 作为面向边缘 CPU 优化的方法，与本文面向 GPU 的方法形成对比，代表不同的优化方向。
- **[25] ResNet / [77] CSPNet**: 作为 GPU 导向检测器的常用架构，CSPNet 是本文作者团队之前的工作，对本文架构设计有重要影响。
