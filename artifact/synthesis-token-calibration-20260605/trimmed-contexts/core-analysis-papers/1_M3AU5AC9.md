# Faster R-CNN: towards real-time object detection with region proposal networks (2017)

- Paper ref: 1:M3AU5AC9
- Title: Faster R-CNN: towards real-time object detection with region proposal networks
- Year: 2017

## Filtered Digest

#### TL;DR

本文提出了 Faster R-CNN，一种基于深度学习的实时目标检测系统。核心创新是区域提议网络（Region Proposal Network, RPN），它与检测网络共享全图像卷积特征，使区域提议的计算成本几乎为零。RPN 是一个全卷积网络，能够在每个位置同时预测物体边界和物体性分数。作者将 RPN 与 Fast R-CNN 检测器合并为单一网络，通过共享卷积特征实现统一的目标检测框架。在 VGG-16 模型上，该系统在 GPU 上达到 5 fps 的帧率（包含所有步骤），同时在 PASCAL VOC 2007、2012 和 MS COCO 数据集上实现了最先进的检测精度。在 ILSVRC 和 COCO 2015 竞赛中，Faster R-CNN 和 RPN 是多个赛道冠军方案的基础。代码已公开。

#### 研究问题与贡献

- 核心问题 ：现有最先进目标检测网络依赖于区域提议算法来假设物体位置，但区域提议计算成为检测系统的瓶颈。Selective Search 等传统方法在 CPU 上需要 2 秒/图像，EdgeBoxes 需要 0.2 秒/图像，仍与检测网络耗时相当。

- 主要贡献 ：

- 提出区域提议网络（RPN），通过深度卷积神经网络计算提议，与检测网络共享卷积层，使提议计算的边际成本仅为 10 毫秒/图像

- 引入"锚框"（anchor）机制，作为多尺度和纵横比的参考框，避免了图像金字塔或滤波器金字塔的计算开销

- 设计了四步交替训练方案，实现 RPN 与 Fast R-CNN 的特征共享，形成统一的检测网络

- 在多个基准数据集上验证了方法的有效性，代码开源推动领域发展

#### 方法要点

- RPN 架构 ：RPN 接收任意尺寸图像输入，输出带物体性分数的矩形区域提议集合。采用全卷积网络设计，在共享卷积层的特征图上滑动小型网络，每个滑动窗口映射到低维特征（ZF 为 256 维，VGG 为 512 维），然后输入两个全连接层——边界回归层（reg）和边界分类层（cls）。

- 锚框设计 ：在每个滑动窗口位置同时预测多个区域提议，数量记为 k。默认使用 3 种尺度和 3 种纵横比，产生 k=9 个锚框。锚框 centered at 滑动窗口，具有平移不变性，模型参数量远少于 MultiBox 等方法。

- 损失函数 ：采用多任务损失，包含分类损失（log loss）和回归损失（smooth L1）。分类项由 mini-batch 尺寸归一化（N_cls=256），回归项由锚框位置数量归一化（N_reg≈2400），平衡参数λ=10。

- 训练策略 ：采用四步交替训练算法：（1）训练 RPN；（2）用 RPN 提议训练 Fast R-CNN；（3）用检测网络初始化 RPN，固定共享卷积层，仅微调 RPN 独有层；（4）固定共享层，微调 Fast R-CNN 独有层。

- 实现细节 ：图像重缩放使短边为 600 像素，使用三种尺度（128²、256²、512²）和三种纵横比（1:1、1:2、2:1）的锚框。训练时忽略跨越图像边界的锚框，测试时裁剪到图像边界。采用 NMS（IoU 阈值 0.7）减少冗余提议。

#### 关键结果

- PASCAL VOC 2007 性能 ：使用 VGG-16 和共享特征，Faster R-CNN 达到 69.9% mAP（仅用 300 个提议），优于 Selective Search 基线（66.9%）。使用 VOC 2007+2012 联合训练达到 73.2% mAP。

- PASCAL VOC 2012 性能 ：使用 VOC 2007+2012 联合训练达到 70.4% mAP，使用 COCO+VOC 联合训练达到 75.9% mAP。

- MS COCO 性能 ：在 COCO test-dev 集上，使用 COCO trainval 训练达到 42.7% mAP@0.5 和 21.9% mAP@[.5,.95]。

- 速度表现 ：VGG-16 模型总耗时 198 毫秒/图像（5 fps），其中 RPN 仅 10 毫秒；ZF 模型总耗时 59 毫秒/图像（17 fps）。相比之下，SS+Fast R-CNN 需要 1830 毫秒（0.5 fps）。

- 竞赛成果 ：在 ILSVRC 和 COCO 2015 竞赛中，Faster R-CNN 和 RPN 是多个赛道冠军方案的基础，包括 ImageNet 检测、ImageNet 定位、COCO 检测和 COCO 分割。
