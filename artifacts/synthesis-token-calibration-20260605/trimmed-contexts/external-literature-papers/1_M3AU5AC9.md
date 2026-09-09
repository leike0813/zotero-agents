# Faster R-CNN: towards real-time object detection with region proposal networks (2017)

- Paper ref: 1:M3AU5AC9
- Title: Faster R-CNN: towards real-time object detection with region proposal networks
- Year: 2017

## Compact References

| id | year | authors | title |
| --- | --- | --- | --- |
| ref-1 | 2014 | He, K.; Zhang, X.; et al. | Spatial pyramid pooling in deep convolutional networks for visual recognition |
| ref-2 | 2015 | Girshick, R. | Fast R-CNN |
| ref-3 | 2015 | Simonyan, K.; Zisserman, A. | Very deep convolutional networks for large-scale image recognition |
| ref-4 | 2013 | Uijlings, J. R.; van de Sande, K. E.; et al. | Selective search for object recognition |
| ref-5 | 2014 | Girshick, R.; Donahue, J.; et al. | Rich feature hierarchies for accurate object detection and semantic segmentation |
| ref-6 | 2014 | Zitnick, C. L.; Dollar, P. | Edge boxes: Locating object proposals from edges |
| ref-7 | 2015 | Long, J.; Shelhamer, E.; et al. | Fully convolutional networks for semantic segmentation |
| ref-8 | 2010 | Felzenszwalb, P. F.; Girshick, R. B.; et al. | Object detection with discriminatively trained part-based models |
| ref-9 | 2014 | Sermanet, P.; Eigen, D.; et al. | Overfeat: Integrated recognition, localization and detection using convolutional networks |
| ref-10 | 2015 | Ren, S.; He, K.; et al. | Faster R-CNN: Towards real-time object detection with region proposal networks |
| ref-11 | 2007 | Everingham, M.; Van Gool, L.; et al. | The PASCAL Visual Object Classes Challenge Results |
| ref-12 | 2014 | Lin, T.-Y.; Maire, M.; et al. | Microsoft COCO: Common objects in context |
| ref-13 | 2015 | Song, S.; Xiao, J. | Deep sliding shapes for amodal 3d object detection in RGB-D images |
| ref-14 | 2015 | Zhu, J.; Chen, X.; et al. | DeePM: A deep part-based model for object detection and semantic part localization |
| ref-15 | 2015 | Dai, J.; He, K.; et al. | Instance-aware semantic segmentation via multi-task network cascades |
| ref-16 | 2015 | Johnson, J.; Karpathy, A.; et al. | Densecap: Fully convolutional localization networks for dense captioning |
| ref-17 | 2015 | Kislyuk, D.; Liu, Y.; et al. | Human curation and convnets: Powering item-to-item recommendations on pinterest |
| ref-18 | 2015 | He, K.; Zhang, X.; et al. | Deep residual learning for image recognition |
| ref-19 | 2014 | Hosang, J.; Benenson, R.; et al. | How good are detection proposals, really? |
| ref-20 | 2015 | Hosang, J.; Benenson, R.; et al. | What makes for effective detection proposals? |
| ref-21 | 2015 | Chavali, N.; Agrawal, H.; et al. | Object-proposal evaluation protocol is 'gameable' |
| ref-22 | 2012 | Carreira, J.; Sminchisescu, C. | CPMC: Automatic object segmentation using constrained parametric min-cuts |
| ref-23 | 2014 | Arbelaez, P.; Pont-Tuset, J.; et al. | Multiscale combinatorial grouping |
| ref-24 | 2012 | Alexe, B.; Deselaers, T.; et al. | Measuring the objectness of image windows |
| ref-25 | 2013 | Szegedy, C.; Toshev, A.; et al. | Deep neural networks for object detection |
| ref-26 | 2014 | Erhan, D.; Szegedy, C.; et al. | Scalable object detection using deep neural networks |
| ref-27 | 2015 | Szegedy, C.; Reed, S.; et al. | Scalable, high-quality object detection |
| ref-28 | 2015 | Pinheiro, P. O.; Collobert, R.; et al. | Learning to segment object candidates |
| ref-29 | 2015 | Dai, J.; He, K.; et al. | Convolutional feature masking for joint object and stuff segmentation |
| ref-30 | 2015 | Ren, S.; He, K.; et al. | Object detection networks on convolutional feature maps |
| ref-31 | 2015 | Chorowski, J. K.; Bahdanau, D.; et al. | Attention-based models for speech recognition |
| ref-32 | 2014 | Zeiler, M. D.; Fergus, R. | Visualizing and understanding convolutional neural networks |
| ref-33 | 2010 | Nair, V.; Hinton, G. E. | Rectified linear units improve restricted Boltzmann machines |
| ref-34 | 2015 | Szegedy, C.; Liu, W.; et al. | Going deeper with convolutions |
| ref-35 | 1989 | LeCun, Y. | Backpropagation applied to handwritten zip code recognition |
| ref-36 | 2015 | Russakovsky, O. | ImageNet Large Scale Visual Recognition Challenge |
| ref-37 | 2012 | Krizhevsky, A.; Sutskever, I.; et al. | Imagenet classification with deep convolutional neural networks |
| ref-38 | 2014 | Jia, Y.; Shelhamer, E.; et al. | Caffe: Convolutional architecture for fast feature embedding |
| ref-39 | 2015 | Lenc, K.; Vedaldi, A. | R-CNN minus R |
| ref-40 | 2012 | Hoiem, D.; Chodpathumwan, Y.; et al. | Diagnosing error in object detectors |

## Citation Analysis Report

#### 按功能归类

**Background（背景文献）:**
- [5] R-CNN：作为基于区域的 CNN 检测方法的开创性工作，主要作为分类器使用
- [19], [20], [21]：物体提议方法的综合调查和比较文献
- [30]：反向传播基础方法

**Baseline（基线方法）:**
- [4] Selective Search：最流行的区域提议方法，但 CPU 实现速度比检测网络慢一个数量级（2 秒/图像）
- [6] EdgeBoxes：提供提议质量和速度的最佳权衡（0.2 秒/图像），但区域提议步骤仍消耗与检测网络相当的运行时间

**Contrast（对比方法）:**
- [8] DPM：使用图像/特征金字塔处理多尺度，与本文基于锚框的方案形成对比
- [9] OverFeat：使用全连接层预测边界框坐标用于单物体定位，与本文全卷积方案不同
- [26], [27] MultiBox：使用 k-means 生成 800 个锚框，不具有平移不变性，不共享提议和检测网络特征

**Component（技术组件）:**
- [1] SPPnet：通过共享卷积减少检测网络运行时间的关键进展
- [2] Fast R-CNN：本文方法的直接基础，RPN 设计用于与 Fast R-CNN 共享卷积特征
- [3] VGG-16：实验中使用的主要深度 backbone 网络（13 个可共享卷积层）
- [7] FCN：全卷积网络概念被用于 RPN 设计
- [32] ZF 网络：实验中使用的另一 backbone 网络（5 个可共享卷积层）
- [38] Caffe：实现框架

**Dataset（数据集）:**
- [11] PASCAL VOC：主要评估基准之一
- [12] MS COCO：主要评估基准之一，用于验证大规模多类别检测

**Tooling（工具/后续工作）:**
- [18] ResNet：用于 ILSVRC 和 COCO 2015 竞赛冠军方案，证明 RPN 可从更深网络受益

#### 按引用编号列举

- [1] SPPnet：本文定位为通过共享卷积减少检测网络运行时间的关键进展，是 Faster R-CNN 方法的重要技术基础
- [2] Fast R-CNN：本文方法的直接基础，RPN 设计用于与 Fast R-CNN 共享卷积特征，形成统一检测网络
- [3] VGG-16：作为实验中使用的主要深度 backbone 网络之一
- [4] Selective Search：作为主要对比基线，速度慢（2 秒/图像）
- [5] R-CNN：作为基于区域的 CNN 检测方法的开创性工作
- [6] EdgeBoxes：提供质量和速度最佳权衡但仍消耗大量时间
- [7] FCN：用于 RPN 设计的全卷积网络概念
- [8] DPM：使用图像金字塔的对比方法
- [9] OverFeat：使用全连接层的对比方法
- [12] MS COCO：主要评估数据集
- [18] ResNet：竞赛冠军方案使用的更深网络
- [19-21]：物体提议方法综述
- [26-27] MultiBox：不具平移不变性的对比方法
- [32] ZF 网络：实验用 backbone
- [37-38]：训练参数和实现框架
