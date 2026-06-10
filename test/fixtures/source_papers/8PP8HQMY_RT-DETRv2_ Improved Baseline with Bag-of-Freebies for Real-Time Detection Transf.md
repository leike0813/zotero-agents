# RT-DETRv2: Improved Baseline with Bag-of-Freebies for Real-Time Detection Transformer

Technical Report

Wenyu Lv1 Yian Zhao2 Qinyao Chang1 Kui Huang1 Guanzhong Wang1 Yi Liu1

1Baidu Inc. 2Peking University Shenzhen Graduate School

lvwenyu01@baidu.com zhaoyian@stu.pku.edu.cn

## Abstract

In this report, we present RT-DETRv2, an improved Real-Time DEtection TRansformer (RT-DETR). RT-DETRv2 builds upon the previous state-of-the-art real-time detector, RT-DETR, and opens up a set of bag-of-freebies for flexibility and practicality, as well as optimizing the training strategy to achieve enhanced performance. To improve the flexibility, we suggest setting a distinct number of sampling points for features at different scales in the deformable attention to achieve selective multiscale feature extraction by the decoder. To enhance practicality, we propose an optional discrete sampling operator to replace the grid\_sample operator that is specific to RT-DETR compared to YOLOs. This removes the deployment constraints typically associated with DETRs. For the training strategy, we propose dynamic data augmentation and scale-adaptive hyperparameters customization to improve performance without loss of speed. Source code and pre-trained models will be available at https://github.com/lyuwenyu/RT-DETR.

## 1 Introduction

Object detection is a fundamental vision task that involves identifying and localizing objects in an image. Among them, real-time object detection is an important field and has a wide range of applications, such as autonomous driving (Atakishiyev et al. [2024]). With the development of the last few years, YOLO detectors (Redmon and Farhadi [2017, 2018], Bochkovskiy et al. [2020], Glenn. [2022], Xu et al. [2022], Li et al. [2023], Wang et al. [2023], Glenn. [2023], Wang et al. [2024a,b]) are without doubt the most prestigious framework in this field. The reason for this is the reasonable balance achieved by the YOLO detectors.

The advent of RT-DETR (Zhao et al. [2024]) opens up a new technological avenue for real-time object detection, breaking the dependency on the YOLO in this field. RT-DETR proposes an efficient hybrid encoder to replace the vanilla Transformer encoder in DETR (Carion et al. [2020]), which significantly improves the inference speed by decoupling the intra-scale interaction and cross-scale fusion of multi-scale features. To further improve the performance, RT-DETR proposes the uncertainty-minimal query selection, which provides high-quality initial queries to the decoder by explicitly optimizing the uncertainty. Moreover, RT-DETR provides a wide range of detector sizes and supports flexible speed tuning to accommodate various real-time scenarios without retraining. RT-DETR represents a novel, end-to-end, real-time detector that marks a significant advancement for the DETR family.

In this report, we present RT-DETRv2, an improved real-time detection Transformer. This work is built upon the recent RT-DETR and opens up a set of bag-of-freebies for flexibility and practicality within the DETR family, as well as optimizing the training strategy to achieve enhanced performance. Specifically, RT-DETRv2 suggests setting a distinct number of sampling points for features at different scales within the deformable attention module to achieve selective multi-scale feature extraction by the decoder. In the realm of enhancing practicality, RT-DETRv2 provides an optional discrete sampling operator to replace the original grid\_sample operator, which is specific to DETRs, thus eliminating the deployment constraints typically associated with detection Transformers. Furthermore, RT-DETRv2 optimizes the training strategy, including dynamic data augmentation and scale-adaptive hyperparameters customization, with the objective of improving performance without loss of speed. The results demonstrate that RT-DETRv2 provides an improved baseline with bag-of-freebies for RT-DETR, increases the flexibility and practicality, and the proposed training strategies optimize the performance and training cost.

## 2 Method

The framework of RT-DETRv2 remains the same as RT-DETR, with only modifications to the deformable attention module of the decoder.

## 2.1 Framework

Distinct number of sampling points for different scales. Current DETRs utilize the deformable attention module (Zhu et al. [2020]) to alleviate the high computational overhead caused by the long sequence of inputs composed of multi-scale features. The RT-DETR decoder retains this module, which defines the same number of sampling points at each scale. We argue that this constraint ignores the intrinsic differences in features at different scales and limits the feature extraction capability of the deformable attention module. Therefore, we propose to set distinct numbers of sampling points for different scales to achieve more flexible and efficient feature extraction.

Discrete sampling. To improve the practicality of the RT-DETR and to make it available everywhere. We focus on comparing the deployment requirements of YOLOs and RT-DETR, where the RT-DETR-specific grid\_sample operator limits its broad applicability. Therefore, we propose an optional discrete\_sample operator to replace the grid\_sample, thus removing the deployment constraints of RT-DETR. Specifically, we perform a rounding operation on the predicted sampling offsets, omitting the time-consuming bilinear interpolation. However, the rounding operation is non-differentiable, so we turn off the gradient of the parameters used to predict the sampling offsets. In practice, we first employ the ${ \mathrm { g r i d } } .$ \_sample operator for training and then replace it with the discrete\_sample operator for fine-tuning. For inference and deployment, the model employs the discrete\_sample operator.

## 2.2 Training Scheme

Dynamic data augmentation. To equip the model with robust detection performance, we propose the dynamic data augmentation strategy. Considering the poor generalizability of the detector in the early training period, we apply stronger data augmentation, while in the later training period we decrease its level to adapt the detector to the detection of the target domain. Specifically, we maintain the RT-DETR data augmentation in the early period, while turning off RandomPhotometricDistort, RandomZoomOut, RandomIoUCrop, and MultiScaleInput in the last two epochs.

Scale-adaptive hyperparameters customization. We also observe that the scaled RT-DETRs of different sizes are trained with the same optimizer hyperparameters, resulting in their sub-optimal performance. Therefore, we propose scale-adaptive hyperparameters customization for scaled RT-DETRs. Considering that the pre-trained backbone for light detector (e.g., ResNet18 (He et al. [2016])) has lower feature quality, we increase its learning rate. On the contrary, the pre-trained backbone with large detector (e.g., ResNet101 (He et al. [2016])) has higher feature quality and we decrease its learning rate.

## 3 Experiment

## 3.1 Implementation Details

As with RT-DETR, we use ResNet (He et al. [2016]) pretrained on ImageNet as the backbone and train RT-DETRv2 with the AdamW (Loshchilov and Hutter [2018]) optimizer with a batch size of 16 and apply the exponential moving average (EMA) with ema\_decay = 0.9999. For the optional discrete sampling, we first pre-train 6× with the grid\_sample operator and then finetune 1× with the discrete\_sample operator. For scale-adaptive hyperparameters customization, the hyperparameters are shown in Tab. 1, where lr represents the learning rate.

Table 1: The hyperparameters of RT-DETRv2.
<table><tr><td>Model</td><td>Backbone</td><td> $l r _ { b a c k b o n e }$ </td><td> $l r _ { d e t }$ </td></tr><tr><td>RT-DETRv2-S</td><td>ResNet18</td><td>1e-4</td><td>1e-4</td></tr><tr><td>RT-DETRv2-M</td><td>ResNet34</td><td>5e-5</td><td>1e-4</td></tr><tr><td>RT-DETRv2-L</td><td>ResNet50</td><td>1e-5</td><td>1e-4</td></tr><tr><td>RT-DETRv2-X</td><td>ResNet101</td><td>1e-6</td><td>1e-4</td></tr></table>

## 3.2 Evaluation

RT-DETRv2 is trained on COCO (Lin et al. [2014]) train2017 and validated on COCO val2017 dataset. We report the standard AP metrics (averaged over uniformly sampled IoU thresholds ranging from 0.50 − 0.95 with a step size of 0.05), and $\mathsf { A P } _ { 5 0 } ^ { v a l }$ commonly used in real scenarios.

## 3.3 Results

The comparison with RT-DETR(Zhao et al. [2024]) is shown in Tab. 2. RT-DETRv2 outperforms RT-DETR at different scales of detectors without loss of speed.

Table 2: Comparison of RT-DETR and RT-DETRv2. The FPS is reported on T4 GPU with TensorRT FP16. For evaluation, all input sizes are fixed on 640 × 640.
<table><tr><td>Model</td><td>Backbone</td><td>Dataset</td><td>#Params (M)</td><td> $\mathbf { F P S } _ { b s = 1 }$ </td><td> $\mathbf { A } \mathbf { P } ^ { v a l }$ </td><td> $\mathbf { A P } _ { 5 0 } ^ { v a l }$ </td></tr><tr><td>RT-DETR-S</td><td>ResNet18</td><td>COCO</td><td>20</td><td>217</td><td>46.5</td><td>63.8</td></tr><tr><td>RT-DETR-M</td><td>ResNet34</td><td>COCO</td><td>31</td><td>161</td><td>48.9</td><td>66.8</td></tr><tr><td>RT-DETR-M*</td><td>ResNet50</td><td>COCO</td><td>36</td><td>145</td><td>51.3</td><td>69.6</td></tr><tr><td>RT-DETR-L</td><td>ResNet50</td><td>COCO</td><td>42</td><td>108</td><td>53.1</td><td>71.3</td></tr><tr><td>RT-DETR-X</td><td>ResNet101</td><td>COCO</td><td>76</td><td>74</td><td>54.3</td><td>72.7</td></tr><tr><td>RT-DETRv2-S</td><td>ResNet18</td><td>COCO</td><td>20</td><td>217</td><td>47.9 (↑ 1.4)</td><td>64.9 (↑ 1.1)</td></tr><tr><td>RT-DETRv2-M</td><td>ResNet34</td><td>COCo</td><td>31</td><td>161</td><td>49.9 (↑ 1.0)</td><td>67.5 (↑0.7)</td></tr><tr><td>RT-DETRv2-M*</td><td>ResNet50</td><td>COCO</td><td>36</td><td>145</td><td>51.9 (↑ 0.6)</td><td>69.9 (↑ 0.3)</td></tr><tr><td>RT-DETRv2-L</td><td>ResNet50</td><td>COCO</td><td>42</td><td>108</td><td>53.4 (↑0.3)</td><td>71.6 (↑ 0.3)</td></tr><tr><td>RT-DETRv2-X</td><td>ResNet101</td><td>COCO</td><td>76</td><td>74</td><td>54.3 (↑ 0.0)</td><td>72.8 (↑ 0.1)</td></tr></table>

## 3.4 Ablations

Ablation on sampling points. We perform an ablation study on the total number of sampling points of the grid\_sample operator. The total number of sampling points is calculated as num\_head×num\_point×num\_query× num\_decoder, where num\_point represents the sum of sampling points for each scale feature in each grid. The results show that reducing the number of sampling points does not cause a significant degradation in the performance, cf. Tab. 3. This means that practical application is unlikely to be affected in most industrial scenarios.

Table 3: Ablation on sampling points.
<table><tr><td>Model</td><td>Sampling method</td><td>#Points</td><td> $\mathbf { A } \mathbf { P } ^ { v a l }$ </td><td> $\mathbf { A P } _ { 5 0 } ^ { v a l }$ </td></tr><tr><td>RT-DETRv2-S</td><td>grid_sample</td><td>86,400</td><td>47.9</td><td>64.9</td></tr><tr><td>RT-DETRv2-S</td><td>grid_sample</td><td>64,800</td><td>47.8</td><td>64.8 (↓0.1)</td></tr><tr><td>RT-DETRv2-S</td><td>grid_sample</td><td>43,200</td><td>47.7</td><td>64.7 (↓0.2)</td></tr><tr><td>RT-DETRv2-S</td><td>grid_sample</td><td>21,600</td><td>47.3</td><td>64.3 (0.6)</td></tr></table>

Ablation on discrete sampling. We then remove the grid\_sample and replace it with discrete\_sample for the ablation. The results show that this operation does not cause a noticeable reduction in $\mathsf { A P } _ { 5 0 } ^ { v a l }$ , but does eliminate the deployment constraints of the DETRs, cf. Tab. 4.

Table 4: Ablation on discrete sampling.
<table><tr><td>Model</td><td>Backbone</td><td>Sampling method</td><td> $\mathbf { A } \mathbf { P } ^ { v a l }$ </td><td> $\mathbf { A P } _ { 5 0 } ^ { v a l }$ </td></tr><tr><td>RT-DETRv2-S</td><td>ResNet18</td><td>discrete_sample</td><td>47.4</td><td>64.8 (↓0.1)</td></tr><tr><td>RT-DETRv2-M</td><td>ResNet34</td><td>discrete_sample</td><td>49.2</td><td>67.1 (↓0.4)</td></tr><tr><td>RT-DETRv2-M*</td><td>ResNet50</td><td>discrete_sample</td><td>51.4</td><td>69.7 (↓0.2)</td></tr><tr><td>RT-DETRv2-L</td><td>ResNet50</td><td>discrete_sample</td><td>52.9</td><td>71.3 (↓0.3)</td></tr></table>

## 4 Conclusion

In this report, we propose RT-DETRv2, an improved real-time detection Transformer. RT-DETRv2 opens up a set of bag-of-freebies to increase the flexibility and practicality of RT-DETR, optimizing the training strategy to achieve enhanced performance without loss of speed. We hope that this report will provide insights for the DETR family and broaden the scope of RT-DETR applications.

## References

Shahin Atakishiyev, Mohammad Salameh, Hengshuai Yao, and Randy Goebel. Explainable artificial intelligence for autonomous driving: A comprehensive overview and field guide for future research directions. IEEE Access, 2024.

Joseph Redmon and Ali Farhadi. Yolo9000: better, faster, stronger. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 7263–7271, 2017.

Joseph Redmon and Ali Farhadi. Yolov3: An incremental improvement. arXiv preprint arXiv:1804.02767, 2018.

Alexey Bochkovskiy, Chien-Yao Wang, and Hong-Yuan Mark Liao. Yolov4: Optimal speed and accuracy of object detection. arXiv preprint arXiv:2004.10934, 2020.

Jocher Glenn. Yolov5 release v7.0. https: // github. com/ ultralytics/ yolov5/ tree/ v7. 0 , 2022.

Shangliang Xu, Xinxin Wang, Wenyu Lv, Qinyao Chang, Cheng Cui, Kaipeng Deng, Guanzhong Wang, Qingqing Dang, Shengyu Wei, Yuning Du, et al. Pp-yoloe: An evolved version of yolo. arXiv preprint arXiv:2203.16250, 2022.

Chuyi Li, Lulu Li, Yifei Geng, Hongliang Jiang, Meng Cheng, Bo Zhang, Zaidan Ke, Xiaoming Xu, and Xiangxiang Chu. Yolov6 v3.0: A full-scale reloading. arXiv preprint arXiv:2301.05586, 2023.

Chien-Yao Wang, Alexey Bochkovskiy, and Hong-Yuan Mark Liao. Yolov7: Trainable bag-of-freebies sets new stateof-the-art for real-time object detectors. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 7464–7475, 2023.

Jocher Glenn. Yolov8. https: // github. com/ ultralytics/ ultralytics/ tree/ main , 2023.

Chien-Yao Wang, I-Hau Yeh, and Hong-Yuan Mark Liao. Yolov9: Learning what you want to learn using programmable gradient information. arXiv preprint arXiv:2402.13616, 2024a.

Ao Wang, Hui Chen, Lihao Liu, Kai Chen, Zijia Lin, Jungong Han, and Guiguang Ding. Yolov10: Real-time end-toend object detection. arXiv preprint arXiv:2405.14458, 2024b.

Yian Zhao, Wenyu Lv, Shangliang Xu, Jinman Wei, Guanzhong Wang, Qingqing Dang, Yi Liu, and Jie Chen. Detrs beat yolos on real-time object detection. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 16965–16974, 2024.

Nicolas Carion, Francisco Massa, Gabriel Synnaeve, Nicolas Usunier, Alexander Kirillov, and Sergey Zagoruyko. Endto-end object detection with transformers. In European Conference on Computer Vision, pages 213–229. Springer, 2020.

Xizhou Zhu, Weijie Su, Lewei Lu, Bin Li, Xiaogang Wang, and Jifeng Dai. Deformable detr: Deformable transformers for end-to-end object detection. In International Conference on Learning Representations, 2020.

Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun. Deep residual learning for image recognition. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 770–778, 2016.

Ilya Loshchilov and Frank Hutter. Decoupled weight decay regularization. In International Conference on Learning Representations, 2018.

Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollár, and C Lawrence Zitnick. Microsoft coco: Common objects in context. In European Conference on Computer Vision, pages 740–755. Springer, 2014.