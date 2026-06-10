# SOLOv2: Dynamic and Fast Instance Segmentation

Xinlong Wang1 Rufeng Zhang2 Tao Kong3 Lei Li3 Chunhua Shen1

1 The University of Adelaide, Australia

2 Tongji University, China 3 ByteDance AI Lab

## Abstract

In this work, we design a simple, direct, and fast framework for instance segmentation with strong performance. To this end, we propose a novel and effective approach, termed SOLOv2, following the principle of the SOLO method of Wang et al. “SOLO: segmenting objects by locations” [1]. First, our new framework is empowered by an efficient and holistic instance mask representation scheme, which dynamically segments each instance in the image, without resorting to bounding box detection. Specifically, the object mask generation is decoupled into a mask kernel prediction and mask feature learning, which are responsible for generating convolution kernels and the feature maps to be convolved with, respectively. Second, SOLOv2 significantly reduces inference overhead with our novel matrix non-maximum suppression (NMS) technique. Our Matrix NMS performs NMS with parallel matrix operations in one shot, and yields better results. We demonstrate that our SOLOv2 outperforms most state-of-the-art instance segmentation methods in both speed and accuracy. A light-weight version of SOLOv2 executes at 31.3 FPS and yields 37.1% AP on COCO test-dev. Moreover, our state-of-the-art results in object detection (from our mask byproduct) and panoptic segmentation show the potential of SOLOv2 to serve as a new strong baseline for many instancelevel recognition tasks. Code is available at https://git.io/AdelaiDet

## 1 Introduction

Generic object detection demands for the functions of localizing individual objects and recognizing their categories. For representing the object locations, bounding box stands out for its simplicity. Localizing objects using bounding boxes have been extensively explored, including the problem formulation, network architecture, post-processing and all those focusing on optimizing and processing the bounding boxes. The tailored solutions largely boost the performance and efficiency, thus enabling wide downstream applications recently. However, bounding boxes are coarse and unnatural. Human vision can effortlessly localize objects by their boundaries. Instance segmentation, i.e., localizing objects using masks, pushes object localization to the limit at pixel level and opens up opportunities to more instance-level perception and applications. To date, most existing methods deal with instance segmentation in the view of bounding boxes, i.e., segmenting objects in (anchor) bounding boxes. How to develop pure instance segmentation including the supporting facilities, e.g., post-processing, is largely unexplored compared to bounding box detection and instance segmentation methods built on top it.

We are motivated by the recently proposed SOLO (Segmenting Objects by LOcations) [1]. The task of instance segmentation can be formulated as two sub-tasks of pixel-level classification, solvable using standard FCNs, thus dramatically simplifying the formulation of instance segmentation. It takes an image as input, directly outputs instance masks and corresponding class probabilities, in a fully convolutional, box-free and grouping-free paradigm. However, three main bottlenecks limit its performance: a) inefficient mask representation and learning; b) not high enough resolution for finer mask predictions; c) slow mask NMS. In this work, we eliminate the above bottlenecks all at once.

![](Images_ADV7CAWQ/19ca448c94a2ad50c62a99a58b55d2bc2d960bf93f7d73c600b00b3da22890ec.jpg)  
(a) Speed vs. Accuracy

![](Images_ADV7CAWQ/1d9d3419028be9731583a3b7e26a50cb7c62ed5d8687dbd3cf57c5063cb3a3cd.jpg)  
(b) Detail Comparison  
Figure 1 – (a) Speed vs. Accuracy on the COCO test-dev. The proposed SOLOv2 outperforms a range of state-of-the-art algorithms. Inference time of all methods is tested using one Tesla V100 GPU. (b) Detail Comparison. SOLOv2 depicts higher-quality masks compared with Mask R-CNN. Mask R-CNN’s mask head is typically restricted to 28 × 28 resolution, leading to inferior prediction at object boundaries.

We first introduce a dynamic scheme, which enables dynamically segmenting objects by locations. Specifically, the mask learning process can be divided into two parts: convolution kernel learning and feature learning (Figure 2(b)). When classifying the pixels into different location categories, the mask kernels are predicted dynamically by the network and conditioned on the input. We further construct a unified and high-resolution mask feature representation for instance-aware segmentation. As such, we are able to effortless predict high-resolution object masks, as well as learning the mask kernels and mask features separately and efficiently.

We further propose an efficient and effective matrix NMS algorithm. As a post-processing step for suppressing the duplicate predictions, non-maximum suppression (NMS) serves as an integral part in state-of-the-art object detection systems. Take the widely adopted multi-class NMS for example. For each class, the predictions are sorted in descending order by confidence. Then for each prediction, it removes all other highly overlapped predictions. The sequential and recursive operations result in non-negligible latency. For mask NMS, this drawback is further magnified. Compared to bounding box, it takes more time to compute the IoU of each mask pair, thus leading to a large overhead. We address this problem by introducing Matrix NMS, which performs NMS with parallel matrix operations in one shot. Our Matrix NMS outperforms the existing NMS and its varieties in both accuracy and speed. As a result, Matrix NMS processes 500 masks in less than 1 ms in simple python implementation, and outperforms the recently proposed Fast NMS [2] by 0.4% AP.

With these improvements, SOLOv2 outperforms SOLO by 1.9% AP while being 33% faster. The Res-50-FPN SOLOv2 achieves 38.8% mask AP at 18 FPS on the challenging MS COCO dataset, evaluated on a single V100 GPU card. A light-weight version of SOLOv2 executes at 31.3 FPS and yields 37.1% mask AP. Interestingly, although the concept of bounding box is thoroughly eliminated in our method, our bounding box byproduct, i.e., by directly converting the predicted mask to its bounding box, yield 44.9% AP for object detection, which even surpasses many state-of-the-art, highly-engineered object detection methods.

We believe that, with our simple, fast and sufficiently strong solutions, instance segmentation should be a popular alternative to the widely used object bounding box detection, and SOLOv2 may play an important role and predict its wide applications.

## 1.1 Related Work

Instance Segmentation Instance segmentation is a challenging task, as it requires instance-level and pixel-level predictions simultaneously. The existing approaches can be summarized into three categories. Top-down methods [3, 4, 5, 6, 7, 2, 8, 9] solve the problem from the perspective of object detection, i.e., detecting first and then segmenting the object in the box. In particular, recent methods of [8, 9, 10] build their methods on the anchor-free object detectors [11], showing promising performance. Bottom-up methods [12, 13, 14, 15] view the task as a label-then-cluster problem, e.g., learning the per-pixel embeddings and then clustering them into groups. The latest direct method (SOLO) [1] aims at dealing with instance segmentation directly, without dependence on box detection or embedding learning. In this work, we appreciate the basic concept of SOLO and further explore the direct instance segmentation solutions.

We specifically compare our method with the recent YOLACT [2]. YOLACT learns a group of coefficients which are normalized to (-1, 1) for each anchor box. During the inference, it first performs a bounding box detection and then uses the predicted boxes to crop the assembled masks. While our method is evolved from SOLO [1] through directly decoupling the original mask prediction to kernel learning and feature learning. No anchor box is needed. No normalization is needed. No bounding box detection is needed. We directly map the input image to the desired object classes and object masks. Both the training and inference are much simpler. As a result, our proposed framework is much simpler, yet achieving significantly better performance (6% AP better at a comparable speed); and our best model achieves 41.7% AP vs. YOLACT’s best 31.2% AP.

Dynamic Convolutions In traditional convolution layers, the learned convolution kernels stay fixed and are independent on the input, i.e., the weights are the same for arbitrary image and any location of the image. Some previous works explore the idea of bringing more flexibility into the traditional convolutions. Spatial Transform Networks [16] predicts a global parametric transformation to warp the feature map, allowing the network to adaptively transform feature maps conditioned on the input. Dynamic filter [17] is proposed to actively predict the parameters of the convolution filters. It applies dynamically generated filters to an image in a sample-specific way. Deformable Convolutional Networks [18] dynamically learn the sampling locations by predicting the offsets for each image location. We bring the dynamic scheme into instance segmentation and enable learning instance segmenters by locations. Yang et al. [19] apply conditional batch normalization to video object segmentation and AdaptIS [20] predicts the affine parameters, which scale and shift the features conditioned on each instance. They both belong to the more general scale-and-shift operation, which can roughly be seen as an attention mechanism on intermediate feature maps. Note that the concurrent work in [21] also applies dynamic convolutions for instance segmentation by extending the framework of BlendMask [8]. The dynamic scheme part is somewhat similar, but the methodology is different. CondInst [21] relies on the relative position to distinguish instances as in AdaptIS, while SOLOv2 uses absolute positions as in SOLO. It means that it needs to encode the position information N times for N instances, while SOLOv2 performs it all at once using the global coordinates, regardless how many instances there are. CondInst [21] needs to predict at least a proposal for each instance during inference.

Non-Maximum Suppression NMS is widely adopted in many computer vision tasks and becomes an essential component of object detection and instance segmentation systems. Some recent works [22, 23, 24, 25, 2] are proposed to improve the traditional NMS. They can be divided into two groups, either for improving the accuracy or speeding up. Instead of applying the hard removal to duplicate predictions according to a threshold, Soft-NMS [22] decreases the confidence scores of neighbors according to their overlap with higher scored predictions. Adaptive NMS [23] applies dynamic suppression threshold to each instance, which is tailored for pedestrian detection in a crowd. In [24], the authors use KL-Divergence and reflected it in the refinement of coordinates in the NMS process. To accelerate the inference, Fast NMS [2] enables deciding the predictions to be kept or discarded in parallel. Note that it speeds up at the cost of performance deterioration. Different from the previous methods, our Matrix NMS addresses the issues of hard removal and sequential operations at the same time. As a result, the proposed Matrix NMS is able to process 500 masks in less than 1 ms in simple python implementation, which is negligible compared with the time of network evaluation, and yields 0.4% AP better than Fast NMS.

## 2 Our Method: SOLOv2

An instance segmentation system should separate different instances at pixel level. To distinguish instances, we follow the basic concept of ‘segmenting objects by locations’ [1]. The input image is conceptually divided into $S \times S$ grids. If the center of an object falls into a grid cell, then the grid cell corresponds to a binary mask for that object. As such, the system outputs ${ \check { S } } ^ { 2 }$ masks in total, denoted as $\bar { M } \in \mathbb { R } ^ { H \times W \times S ^ { 2 } }$ . The $k ^ { t h }$ channel is responsible for segmenting instance at position (i, j), where $k = i \cdot S + j$ (see Figure 2(a)).

![](Images_ADV7CAWQ/38b064c952366173726fb20a2dc74bb2175ae2c9f257b5e048b416d12a35dc1d.jpg)  
(a) SOLO

![](Images_ADV7CAWQ/e9f24c5cf648270b8b31b73095a46e5ca254f0387a547186e3d95dd3c972b526.jpg)  
Figure 2 – SOLOv2 compared to SOLO. I is the input feature after FCN-backbone representation extraction. Dashed arrows denote convolutions. $k = i \cdot S + j ;$ and ‘\~’ denotes the dynamic convolution operation.

Such paradigm could generate the instance segmentation results in an elegant way. However, there are three main bottlenecks that limit its performance: a) inefficient mask representation and learning. It takes a lot of memory and computation to predict the output tensor M, which has $S ^ { 2 }$ channels. Besides, as the S is different for different FPN level, the last layer of each level is learned separately and not shared, which results in an inefficient training. b) inaccurate mask predictions. Finer predictions require high-resolution masks to deal with the details at object boundaries. But large resolutions will considerably increase the computational cost. c) slow mask NMS. Compared with box NMS, mask NMS takes more time and leads to a larger overhead.

In this section, we show that these challenges can be effectively solved by our proposed dynamic mask representation and Matrix NMS, and we introduce them as follows.

## 2.1 Dynamic Instance Segmentation

We first revisit the mask generation in SOLO [1]. To generate the instance mask of $S ^ { 2 }$ channels corresponding to $S \times S$ grids, the last layer takes one level of pyramid features $F \in \mathbb { R } ^ { H \times W \times E }$ as input and at last applies a convolution layer with $S ^ { 2 }$ output channels. The operation can be written as:

$$
M _ { i , j } = G _ { i , j } * F ,\tag{1}
$$

where $G _ { i , j } \in \mathbb { R } ^ { 1 \times 1 \times E }$ is the conv kernel, and $M _ { i , j } \in \mathbb { R } ^ { H \times W }$ is the final mask containing only one instance whose center is at location (i, j).

In other words, we need two input $F$ and G to generate the final mask $M .$ . Previous work explicitly output the whole M for training and inference. Note that tensor M is very large, and to directly predict M is memory and computational inefficient. In most cases the objects are located sparsely in the image. M is redundant as only a small part of $S ^ { 2 }$ kernels actually functions during a single inference.

From another perspective, if we separately learn $F$ and G, the final M could be directly generated using the both components. In this way, we can simply pick the valid ones from predicted $\breve { S } ^ { 2 }$ kernels and perform the convolution dynamically. The number of model parameters also decreases. What’s more, as the predicted kernel is generated dynamically conditioned on the input, it benefits from the flexibility and adaptive nature. Additionally, each of $S ^ { 2 }$ kernels is conditioned on the location. It is in accordance with the core idea of segmenting objects by locations and goes a step further by predicting the segmenters by locations.

## 2.1.1 Mask Kernel G

Given the backbone and FPN, we predict the mask kernel G at each pyramid level. We first resize the input feature $F _ { I } \in \mathbb { R } ^ { H _ { I } \times \dot { W } _ { I } \times C }$ into shape of $S \times S \times C$ . Then 4×convs and a final $3 \times 3 \times D$ conv are employed to generate the kernel G. We add the spatial functionality to $F _ { I }$ by giving the first convolution access to the normalized coordinates following CoordConv [26], i.e., concatenating two additional input channels which contains pixel coordinates normalized to $[ - 1 , 1 ]$ . Weights for the head are shared across different feature map levels.

For each grid, the kernel branch predicts the D-dimensional output to indicate predicted convolution kernel weights, where D is the number of parameters. For generating the weights of a 1×1 convolution with E input channels, D equals E. As for $3 { \times } 3$ convolution, D equals 9E. These generated weights are conditioned on the locations, i.e., the grid cells. If we divide the input image into $S { \times } S$ grids, the output space will be $S { \times } S { \times } D$ , There is no activation function on the output.

## 2.1.2 Mask Feature F

Since the mask feature and mask kernel are decoupled and separately predicted, there are two ways to construct the mask feature. We can put it into the head, along with the kernel branch. It means that we predict the mask features for each FPN level. Or, to predict a unified mask feature representation for all FPN levels. We have compared the two implementations in Section 3.1.2 by experiments. Finally, we employ the latter one for its effectiveness and efficiency.

For learning a unified and high-resolution mask feature representation, we apply feature pyramid fusion inspired by the semantic segmentation in [27]. After repeated stages of $\dot { 3 } \times 3$ conv, group norm [28], ReLU and $2 \times$ bilinear upsampling, the FPN features P2 to P5 are merged into a single output at 1/4 scale. The last layer after the element-wise summation consists of $1 \times 1$ convolution, group norm and ReLU. More details can be referred to supplementary material. It should be noted that we feed normalized pixel coordinates to the deepest FPN level (at 1/32 scale), before the convolutions and bilinear upsamplings. The provided accurate position information is important for enabling position sensitivity and predicting instance-aware features.

## 2.1.3 Forming Instance Mask

For each grid cell at $( i , j )$ , we first obtain the mask kernel $G _ { i , j , \mathrm { : } } \in \mathbb { R } ^ { D }$ . Then $G _ { i , j , : }$ is convolved with F to get the instance mask. In total, there will be at most $S ^ { 2 }$ masks for each prediction level. Finally, we use the proposed Matrix NMS to get the final instance segmentation results.

## 2.1.4 Learning and Inference

The training loss function is defined as follows:

$$
L = L _ { c a t e } + \lambda L _ { m a s k } ,\tag{2}
$$

where $L _ { c a t e }$ is the conventional Focal Loss [29] for semantic category classification, $L _ { m a s k }$ is the Dice Loss for mask prediction. For more details, we refer readers to [1].

During the inference, we forward input image through the backbone network and FPN, and obtain the category score $\mathbf { p } _ { i , j }$ at grid $( i , j )$ . We first use a confidence threshold of 0.1 to filter out predictions with low confidence. The corresponding predicted mask kernels are then used to perform convolution on the mask feature. After the sigmoid operation, we use a threshold of 0.5 to convert predicted soft masks to binary masks. The last step is the Matrix NMS.

Table 1 – Instance segmentation mask AP (%) on COCO test-dev. All entries are single-model results. Mask R-CNN∗ is our improved version with scale augmentation and longer training time $( 6 \times )$ . ‘DCN’ means deformable convolutions used.
<table><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=2>backbone</td><td rowspan=1 colspan=1> $\mathbf { A P }$     $\mathrm { A P _ { 5 0 } }$     $\mathrm { A P _ { 7 5 } }$     $\mathsf { A P } _ { S }$     $\mathsf { A P } _ { M }$     $\mathrm { A P } _ { L }$ </td></tr><tr><td rowspan=8 colspan=1>box-based:Mask R-CNN [4]Mask R-CNN*MaskLab+ [30]TensorMask [7]YOLACT [2]MEInst [9]CenterMask [31]BlendMask [8]</td><td rowspan=1 colspan=2>Res-101-FPN</td><td rowspan=1 colspan=1>35.7  58.0  37.8  15.5  38.1  52.4</td></tr><tr><td rowspan=1 colspan=2>Res-101-FPN</td><td rowspan=1 colspan=1>37.8  59.8  40.7  20.5  40.4  49.3</td></tr><tr><td rowspan=2 colspan=2>Res-101-FPN</td><td rowspan=1 colspan=1>Res-101-C4</td><td rowspan=1 colspan=1>37.3  59.8   39.6  16.9  39.9  53.5</td></tr><tr><td rowspan=1 colspan=1>37.1  59.3   39.4   17.4  39.1  51.6</td></tr><tr><td rowspan=2 colspan=2>Res-101-FPNRes-101-FPN</td><td rowspan=1 colspan=1>31.2  50.6  32.8  12.1  33.3  47.1</td></tr><tr><td rowspan=1 colspan=1>33.9  56.2   35.4  19.8  36.1  42.3</td></tr><tr><td rowspan=2 colspan=2>Hourglass-104Res-101-FPN</td><td rowspan=1 colspan=1>34.5  56.1   36.3   16.3  37.4  48.4</td></tr><tr><td rowspan=1 colspan=1>38.4  60.7  41.3  18.2  41.5  53.3</td></tr><tr><td rowspan=5 colspan=1>box-free:PolarMask [10]SOLO[1]SOLOv2SOLOv2SOLOv2</td><td rowspan=1 colspan=2>Res-101-FPN</td><td rowspan=1 colspan=1>32.1  53.7   33.1  14.7  33.8  45.3</td></tr><tr><td rowspan=2 colspan=2>Res-101-FPNRes-50-FPN</td><td rowspan=1 colspan=1>37.8  59.5   40.4  16.4  40.6  54.2</td></tr><tr><td rowspan=1 colspan=1>38.8  59.9   41.7  16.5  41.7  56.2</td></tr><tr><td rowspan=2 colspan=2>Res-101-FPNRes-DCN-101-FPN</td><td rowspan=1 colspan=1>39.7  60.7   42.9  17.3  42.9  57.4</td></tr><tr><td rowspan=1 colspan=1>41.7  63.2  45.1  18.0  45.0  61.6</td></tr></table>

## 2.2 Matrix NMS

Motivation Our Matrix NMS is motivated by Soft-NMS [22]. Soft-NMS decays the other detection scores as a monotonic decreasing function $f ( \mathbf { i } \mathsf { o u } )$ of their overlaps. By decaying the scores according to IoUs recursively, higher IoU detections will be eliminated with a minimum score threshold. However, such process is sequential like traditional Greedy NMS and could not be implemented in parallel.

Matrix NMS views this process from another perspective by considering how a predicted mask $m _ { j }$ being suppressed. For $m _ { j }$ , its decay factor is affected by: (a) The penalty of each prediction $m _ { i }$ on $m _ { j }$ $( s _ { i } > s _ { j } )$ , where $s _ { i }$ and $s _ { j }$ are the confidence scores; and (b) the probability of $m _ { i }$ being suppressed. For (a), the penalty of each prediction $m _ { i }$ on $m _ { j }$ could be easily computed by $f ( \mathrm { i } \circ \mathrm { u } _ { i , j } )$ . For (b), the probability of $m _ { i }$ being suppressed is not so elegant to be computed. However, the probability usually has positive correlation with the IoUs. So here we directly approximate the probability by the most overlapped prediction on $m _ { i }$

$$
f ( \mathop { \tt i o u . } , \mathop { i } ) = \operatorname* { m i n } _ { \forall s _ { k } > s _ { i } } f ( \mathop { \tt i o u } _ { k , i } ) .\tag{3}
$$

To this end, the final decay factor becomes

$$
d e c a y _ { j } = \operatorname* { m i n } _ { \forall s _ { i } > s _ { j } } \frac { f ( \mathrm { i o u } _ { i , j } ) } { f ( \mathrm { i o u } . _ { , i } ) } ,\tag{4}
$$

and the updated score is computed by $s _ { j } = s _ { j } \cdot d e c a y _ { j }$ . We consider two most simple decremented functions, denoted as linear $f ( \mathrm { i o u } _ { i , j } ) = 1 - \mathrm { i o u } _ { i , j }$ , and Gaussian $\begin{array} { r } { f ( \mathrm { i o u } _ { i , j } ) = \mathrm { e x p } \left( - \frac { \mathrm { i } \circ \mathrm { u } _ { i , j } ^ { 2 } } { \sigma } \right) } \end{array}$

Implementation All the operations in Matrix NMS could be implemented in one shot without recurrence. We first compute a $N \times N$ pairwise IoU matrix for the top N predictions sorted descending by score. For binary masks, the IoU matrix could be efficiently implemented by matrix operations. Then we get the most overlapping IoUs by column-wise max on the IoU matrix. Next, the decay factors of all higher scoring predictions are computed, and the decay factor for each prediction is selected as the most effect one by column-wise min (Eqn. (4)). Finally, the scores are updated by the decay factors. For usage, we just need thresholding and selecting top-k scoring masks as the final predictions.

The pseudo-code of Matrix NMS is provided in supplementary material. In our code base, Matrix NMS is 9×faster than traditional NMS and being more accurate (Table 3(c)). We show that Matrix NMS serves as a superior alternative of traditional NMS both in accuracy and speed, and can be easily integrated into the state-of-the-art detection/segmentation systems.

Table 2 – Instance segmentation results on the LVISv0.5 validation dataset. ∗ means re-implementation.
<table><tr><td></td><td>backbone</td><td> $\operatorname { A P } _ { r }$ </td><td> $\mathsf { A P } _ { c }$ </td><td> $\mathsf { A P } _ { f }$ </td><td> $\mathsf { A P } _ { S }$ </td><td> $\mathsf { A P } _ { M }$ </td><td> $\mathsf { A P } _ { L }$ </td><td> $\mathbf { A P }$ </td></tr><tr><td>Mask-RCNN[33]</td><td>Res-50-FPN</td><td>14.5</td><td>24.3</td><td>28.4</td><td>-</td><td>-</td><td>-</td><td> $\overline { { 2 4 . 4 } }$ </td></tr><tr><td>Mask-RCNN*-3× SOLOv2</td><td>Res-50-FPN Res-50-FPN</td><td>12.1 13.4</td><td>25.8 26.6</td><td>28.1 28.9</td><td>18.7 15.9</td><td>31.2 34.6</td><td>38.2 44.9</td><td>24.6 25.5</td></tr><tr><td>SOLOv2</td><td>Res-101-FPN</td><td>16.3</td><td>27.6</td><td>30.1</td><td>16.8</td><td>35.8</td><td>47.0</td><td>26.8</td></tr></table>

## 3 Experiments

To evaluate the proposed method SOLOv2, we conduct experiments on three basic tasks, instance segmentation, object detection, and panoptic segmentation on MS COCO [32]. We also present experimental results on the recently proposed LVIS dataset [33], which has more than 1K categories and thus is considerably more challenging.

## 3.1 Instance segmentation

For instance segmentation, we report lesion and sensitivity studies by evaluating on the COCO 5K val2017 split. We also report COCO mask AP on the test-dev split, which is evaluated on the evaluation server. SOLOv2 is trained with stochastic gradient descent (SGD). We use synchronized SGD over 8 GPUs with a total of 16 images per mini-batch. Unless otherwise specified, all models are trained for 36 epochs (i.e., 3×) with an initial learning rate of 0.01, which is then divided by 10 at 27th and again at 33th epoch. We use scale jitter where the shorter image side is randomly sampled from 640 to 800 pixels.

## 3.1.1 Main Results

We compare SOLOv2 to the state-of-the-art methods in instance segmentation on MS COCO testdev in Table 1. SOLOv2 with ResNet-101 achieves a mask AP of 39.7%, which is much better than other state-of-the-art instance segmentation methods. Our method shows its superiority especially on large objects (e.g., +5.0 APL than Mask R-CNN).

We also provide the speed-accuracy trade-off on COCO to compare with some dominant instance segmenters (Figure 1 (a)). We show our models with ResNet-50, ResNet-101, ResNet-DCN-101 and two light-weight versions described in Section 3.1.2. The proposed SOLOv2 outperforms a range of state-of-the-art algorithms, both in accuracy and speed. The running time is tested on our local machine, with a single V100 GPU. We download code and pre-trained models to test inference time for each model on the same machine. Further, as described in Figure 1 (b), SOLOv2 predicts much finer masks than Mask R-CNN which performs on the local region.

Beside the MS COCO dataset, we also demonstrate the effectiveness of SOLOv2 on LVIS dataset. Table 5 reports the performances on the rare (1∼10 images), common (11∼100), and frequent (> 100) subsets, as well as the overall AP. Both the reported Mask R-CNN and SOLOv2 use data resampling training strategy, following [33]. Our SOLOv2 outperforms the baseline method by about 1% AP. For large-size objects $( \mathrm { A P } _ { L } ) .$ , our SOLOv2 achieves 6.7% AP improvement, which is consistent with the results on the COCO dataset.

## 3.1.2 Ablation Experiments

We investigate and compare the following five aspects in our methods.

Kernel shape We consider the kernel shape from two aspects: number of input channels and kernel size. The comparisons are shown in Table 3(a). 1 × 1 conv shows equivalent performance to $3 \times 3$ conv. Changing the number of input channels from 128 to 256 attains 0.4% AP gains. When it grows beyond 256, the performance becomes stable. In this work, we set the number of input channels to be 256 in all other experiments.

Effectiveness of coordinates Since our method segments objects by locations, or specifically, learns the object segmenters by locations, the position information is very important. For example, if the mask kernel branch is unaware of the positions, the objects with the same appearance may have the same predicted kernel, leading to the same output mask. On the other hand, if the mask feature branch is unaware of the position information, it would not know how to assign the pixels to different feature channels in the order that matches the mask kernel. As shown in Table 3(b), the model achieves 36.3% AP without explicit coordinates input. The results are reasonably good because that CNNs can implicitly learn the absolute position information from the commonly used zero-padding operation, as revealed in [34]. The pyramid zero-paddings in our mask feature branch should have contributed considerably. However, the implicitly learned position information is coarse and inaccurate. When making the convolution access to its own input coordinates through concatenating extra coordinate channels, our method enjoys 1.5% absolute AP gains.

Table 3 – Ablation experiments for SOLOv2. All models are trained on MS COCO train2017, test on val2017 unless noted.  
(a) Kernel shape. The performance is stable when the shape goes beyond $1 \times 1 \times 2 5 6 .$
<table><tr><td>Kernel shape</td><td>AP</td><td> $\mathrm { { A P } _ { 5 0 } }$ </td><td> $\mathrm { A P } _ { 7 5 }$ </td></tr><tr><td> $3 \times 3 \times 6 4$ </td><td>37.4</td><td>58.0</td><td>39.9</td></tr><tr><td> $1 \times 1 \times 6 4$ </td><td>37.4</td><td>58.1</td><td>40.1</td></tr><tr><td> $1 \times 1 \times 1 2 8$ </td><td>37.4</td><td>58.1</td><td>40.2</td></tr><tr><td> $1 \times 1 \times 2 5 6$ </td><td>37.8</td><td>58.5</td><td>40.4</td></tr><tr><td> $1 \times 1 \times 5 1 2$ </td><td>37.7</td><td>58.3</td><td>40.4</td></tr></table>

(b) Explicit coordinates. Precise coordinates input can considerably improve the results.
<table><tr><td>Kernel Feature</td><td>AP</td><td> $\mathrm { { A P } _ { 5 0 } }$ </td><td></td><td> $\mathrm { A P _ { 7 5 } }$ </td></tr><tr><td rowspan="3">√</td><td></td><td>36.3</td><td>57.4</td><td>38.6</td></tr><tr><td></td><td>36.3</td><td>57.3</td><td>38.5</td></tr><tr><td></td><td>37.1</td><td>58.0</td><td>39.4</td></tr><tr><td>√</td><td>：</td><td>37.8</td><td>58.5</td><td>40.4</td></tr></table>

(c) Matrix NMS. Matrix NMS outperforms other methods in both speed and accuracy.
<table><tr><td>Method</td><td>Iter?</td><td>Time(ms)</td><td>AP</td></tr><tr><td>Hard-NMS</td><td>√</td><td>9</td><td>36.3</td></tr><tr><td>Soft-NMS</td><td>√</td><td>22</td><td>36.5</td></tr><tr><td>Fast NMS</td><td>X</td><td>&lt;1</td><td>36.2</td></tr><tr><td>Matrix NMS</td><td>X</td><td>&lt;1</td><td>36.6</td></tr></table>

(f) Real-time SOLOv2. The speed is reported on a single V100 GPU by averaging 5 runs (on COCO test-dev).

(d) Mask feature representation. We compare the separate mask feature representation in parallel heads and the unified representation.  
(e) Training schedule. 1× means 12 epochs using single-scale training. 3× means 36 epochs with multi-scale training.
<table><tr><td>Mask Feature</td><td>AP</td><td> $\underline { { \mathsf { A P } _ { 5 0 } } }$ </td><td>AP75</td></tr><tr><td>Separate</td><td>37.3</td><td>58.2</td><td>40.0</td></tr><tr><td>Unified</td><td>37.8</td><td>58.5</td><td>40.4</td></tr></table>

<table><tr><td>Schedule</td><td>AP</td><td> $\mathrm { { A P } _ { 5 0 } }$ </td><td> $\mathrm { A P } _ { 7 5 }$ </td></tr><tr><td>1×</td><td>34.8</td><td>54.8</td><td>36.8</td></tr><tr><td>3x</td><td>37.8</td><td>58.5</td><td>40.4</td></tr></table>

<table><tr><td>Model</td><td>AP</td><td>AP50</td><td>AP75</td><td>fps</td></tr><tr><td>SOLOv2-448</td><td>34.0</td><td>54.0</td><td>36.1</td><td>46.5</td></tr><tr><td>SOLOv2-512</td><td>37.1</td><td>57.7</td><td>39.7</td><td>31.3</td></tr></table>

Unified Mask Feature Representation For mask feature learning, we have two options: to learn the feature in the head separately for each FPN level or to construct a unified representation. For the former one, we implement as SOLO and use seven 3 × 3 conv to predict the mask features. For the latter one, we fuse the FPN’s features in a simple way and obtain the unified mask representations. The detailed implementation is in supplementary material. We compare these two modes in Table 3(d). As shown, the unified representation achieves better results, especially for the medium and large objects. This is easy to understand: In separate way, the large-size objects are assigned to high-level feature maps of low spatial resolutions, leading to coarse boundary prediction.

Matrix NMS Our Matrix NMS can be implemented totally in parallel. Table 3(c) presents the speed and accuracy comparison of Hard-NMS, Soft-NMS, Fast NMS and our Matrix NMS. Since all methods need to compute the IoU matrix, we pre-compute the IoU matrix in advance for fair comparison. The speed reported here is that of the NMS process alone, excluding computing IoU matrices. Hard-NMS and Soft-NMS are widely used in current object detection and segmentation models. Unfortunately, both methods are recursive and spend much time budget (e.g.22 ms). Our Matrix NMS only needs < 1 ms and is almost cost free! Here we also show the performance of Fast NMS, which utilizes matrix operations but with performance penalty. To conclude, our Matrix NMS shows its advantages on both speed and accuracy.

Real-time setting We design two light-weight models for different purposes. 1) Speed priority, the number of convolution layers in the prediction head is reduced to two and the input shorter side is 448. 2) Accuracy priority, the number of convolution layers in the prediction head is reduced to three and the input shorter side is 512. Moreover, deformable convolution [18] is used in the backbone and the last layer of prediction head. We train both models with the 3× schedule, with shorter side randomly sampled from [352, 512]. Results are shown in Table 3(f). SOLOv2 can not only push state-of-the-art, but has also been ready for real-time applications.

## 3.2 Extensions: Object Detection and Panoptic Segmentation

Although our instance segmentation solution removes the dependence of bounding box prediction, we are able to produce the 4-d object bounding box from each instance mask. The best model of ours achieve 44.9 AP on COCO test-dev. SOLOv2 beats most recent methods in both accuracy and speed, as shown in Figure 3(a). Here we emphasize that our results are directly generated from the off-the-shelf instance mask, without any box based supervised training or engineering.

![](Images_ADV7CAWQ/2f41e3978472966aad018b33683468f4e8d1d7ade3efa7b6bfbe4f6a50adeb98.jpg)  
(a) Speed-accuracy trade-off of bounding-box object detection on the COCO test-dev.

<table><tr><td rowspan=1 colspan=1></td><td rowspan=1 colspan=1>PQ</td><td rowspan=1 colspan=1>PQThPQSt</td></tr><tr><td rowspan=2 colspan=1>box-based:AUNet [35]UPSNet [36]Panoptic-FPN [27]Panoptic-FPN*-1×Panoptic-FPN*-3×</td><td rowspan=1 colspan=1>39.642.5</td><td rowspan=1 colspan=1>49.1 25.248.5 33.4</td></tr><tr><td rowspan=1 colspan=1>39.038.740.8</td><td rowspan=1 colspan=1>45.9 28.745.9 27.848.3 29.4</td></tr><tr><td rowspan=1 colspan=1>box-free:AdaptIS [20]SSAP[15]Pano-DeepLab [37]SOLOv2</td><td rowspan=1 colspan=1>35.936.539.742.1</td><td rowspan=1 colspan=1>40.3 29.31    一43.9 33.249.6 30.7</td></tr></table>

(b) Panoptic segmentation results on COCO val2017. ∗ means re-implementation.  
Figure 3 – Extensions on object detection and panoptic segmentation.

Besides, we also demonstrate the effectiveness of SOLOv2 on the problem of panoptic segmentation. The proposed SOLOv2 can be easily extended to panoptic segmentation by adding the semantic segmentation branch, analogue to the mask feature branch. We use annotations of COCO 2018 panoptic segmentaiton task. All models are trained on train2017 subset and tested on val2017. We use the same strategy as in Panoptic-FPN to combine instance and semantic results. As shown in Figure 3(b), our method achieves state-of-the-art results and outperforms other recent box-free methods by a large margin. All methods listed use the same backbone (ResNet50-FPN) except SSAP (ResNet101) and Pano-DeepLab (Xception-71). Note that UPSNet has used deformable convolution [18] for better performance.

## 4 Conclusion

In this work, we have introduced a dynamic and fast instance segmentation solution with strong performance, from three aspects.

• We have proposed to learn adaptive, dynamic convolutional kernels for the mask prediction, conditioned on the location, leading to a much more compact yet more powerful head design, and achieving better results.

• We have re-designed the object mask generation in a simple and unified way, which predicts more accurate boundaries.

• Moreover, unlike box NMS as in object detection, for direct instance segmentation a bottleneck in inference efficiency is the NMS of masks. We have designed a simple and much faster NMS strategy, termed Matrix NMS, for NMS processing of masks, without sacrificing mask AP.

Our experiments on the MS COCO and LVIS datasets demonstrate the superior performance in terms of both accuracy and speed of the proposed SOLOv2. Being versatile for instance-level recognition tasks, we show that without any modification to the framework, SOLOv2 performs competitively for panoptic segmentation. Thanks to its simplicity (being proposal free, anchor free, FCN-like), strong performance in both accuracy and speed, and potentially being capable of solving many instance-level tasks, we hope that SOLOv2 can be a strong baseline approach to instance recognition, and inspires future work such that its full potential can be exploited as we believe that there is still much room for improvement.

T. Kong and C. Shen are the corresponding authors. C. Shen and his employer received no financial support for the research, authorship, and/or publication of this article.

## Appendix

## A Matrix NMS

The pseudo-code of Matrix NNS is shown in Figure 4. All the operations in Matrix NMS could be implemented in one shot without recurrence. In our code base, Matrix NMS is 9× times faster than traditional NMS and being more accurate. We show that Matrix NMS serves as a superior alternative of traditional NMS both in accuracy and speed, and can be easily integrated into the state-of-the-art detection/segmentation systems.

```python
def matrix_nms(scores, masks, method=’gauss’, sigma=0.5):
# scores: mask scores in descending order (N)
# masks: binary masks (NxHxW)
# method: ’linear’ or ’gauss’
# sigma: std in gaussian method
# reshape for computation: Nx(HW)
masks = masks.reshape(N, HxW)
# pre−compute the IoU matrix: NxN
intersection = mm(masks, masks.T)
areas = masks.sum(dim=1).expand(N, N)
union = areas + areas.T − intersection
ious = (intersection / union).triu(diagonal=1)
# max IoU for each: NxN
ious_cmax = ious.max(0)
ious_cmax = ious_cmax.expand(N, N).T
# Matrix NMS, Eqn.(4): NxN
if method == ’gauss’: # gaussian
decay = exp(−(ious^2 − ious_cmax^2) / sigma)
else: # linear
decay = (1 − ious) / (1 − ious_cmax)
# decay factor: N
decay = decay.min(dim=0)
return scores ∗ decay
```  
Figure 4 – Python code of Matrix NMS. mm: matrix multiplication; T: transpose; triu: upper triangular part

## B Unified Mask Feature Representation

The detailed implementation is illustrated in Figure 5. For learning a unified and high-resolution mask feature representation, we apply feature pyramid fusion inspired by the semantic segmentation in [27]. After repeated stages of 3 × 3 conv, group norm [28], ReLU and 2× bilinear upsampling, the FPN features P2 to P5 are merged into a single output at 1/4 scale. The last layer after the element-wise summation consists of 1 × 1 convolution, group norm and ReLU. It should be noted that we feed normalized pixel coordinates to the deepest FPN level (at 1/32 scale), before the convolutions and bilinear upsamplings. The provided accurate position information is important for enabling position sensitivity and predicting instance-aware features. Compared with the separated alternative, the unified mask feature representation is more effective and time efficient.

## C Visualization

We visualize what our SOLOv2 has learnt from two aspects: mask feature behavior and the final outputs after being convolved by the dynamically learned convolution kernels.

We visualize the outputs of mask feature branch. We use a model which has 64 output channels (i.e., E = 64 for the last feature map prior to mask prediction) for easy visualization. Here we plot each of the 64 channels (recall the channel spatial resolution is $H \times W )$ as shown in Figure 6.

There are two main patterns. The first and the foremost, the mask features are position-aware. It shows obvious behavior of scanning the objects in the image horizontally and vertically. The other obvious pattern is that some feature maps are responsible for activating all the foreground objects, e.g., the one in white boxes.

![](Images_ADV7CAWQ/828afc8ca6d2617448400c93b2e29c9387c683b097a3e90490adf99af7ef134b.jpg)  
Figure 5 – Unified mask feature branch. Each FPN level (left) is upsampled by convolutions and bilinear upsampling until it reaches 1/4 scale (middle). In the deepest FPN level, we concatenate the x, y coordinates and the original features to encode spatial information. After element-wise summation, a $. 1 \times 1$ convolution is attached to transform to designated output mask feature $F \in \mathbb { R } ^ { H \times W \times E }$

The final outputs are shown in Figure 8. Different objects are in different colors. Our method shows promising results in diverse scenes. It is worth pointing out that the details at the boundaries are segmented well, especially for large objects.

We also provide three videos for better visualization of our instance segmentation results. These videos are generated from frame-by-frame inference, without any temporal processing. Though only trained on MS COCO, our model generalizes well across various scenes.

## D Bounding-box Object Detection

Although our instance segmentation solution removes the dependence of bounding box prediction, we are able to produce the 4D object bounding box from each instance mask. In Table 4, we compare the generated box detection performance with other object detection methods on COCO. All models are trained on the train2017 subset and tested on test-dev.

As shown in Table 4, our detection results outperform most methods, especially for objects of large scales, demonstrating the effectiveness of SOLOv2 in object box detection. Similar to instance segmentation, we also plot the speed/accuracy trade-off curve for different methods in Figure 7. We show our models with ResNet-101 and two light-weight versions described above. The plot reveals that the bounding box performance of SOLOv2 beats most recent object detection methods in both accuracy and speed. Here we emphasis that our results are directly generated from the off-the-shelf instance mask, without any box based supervised training or engineering.

![](Images_ADV7CAWQ/1d67a2126867ad02bb58d8a9b89a0730be020b6c59a1b75cb4e1bf6b72b78a39.jpg)  
Figure 6 – Mask Feature Behavior. Each plotted subfigure corresponds to one of the 64 channels of the last feature map prior to mask prediction. The mask features appear to be position-sensitive (orange box), while a few mask features are position-agnostic and activated on all instances (white box). Best viewed on screens.

![](Images_ADV7CAWQ/13a3fe452198b357ec458018f1e5efaaed0822ebc2d55d06d294c8c38428337b.jpg)  
Figure 7 – Speed-accuracy trade-off of bounding-box object detection on the COCO test-dev.

An observation from Figure 7 is as follows. If one does not care much about the cost difference between mask annotation and bounding box annotation, it appears to us that there is no reason to use box detectors for downstream applications, considering the fact that our SOLOv2 beats most modern detectors in both accuracy and speed.

<table><tr><td></td><td>backbone</td><td>AP</td><td> $\mathrm { A P _ { 5 0 } }$ </td><td> $\mathsf { A P } _ { 7 5 }$ </td><td> $\mathsf { A P } _ { S }$ </td><td> $\mathsf { A P } _ { M }$ </td><td> $\mathsf { A P } _ { L }$ </td></tr><tr><td>YOLOv3[38]</td><td>DarkNet53</td><td>33.0</td><td>57.9</td><td>34.4</td><td>18.3</td><td>35.4</td><td>41.9</td></tr><tr><td>SSD513 [39]</td><td>ResNet-101</td><td>31.2</td><td>50.4</td><td>33.3</td><td>10.2</td><td>34.5</td><td>49.8</td></tr><tr><td>DSSD513 [39]</td><td>ResNet-101</td><td>33.2</td><td>53.3</td><td>35.2</td><td>13.0</td><td>35.4</td><td>51.1</td></tr><tr><td>RefineDet [40]</td><td>ResNet-101</td><td>36.4</td><td>57.5</td><td>39.5</td><td>16.6</td><td>39.9</td><td>51.4</td></tr><tr><td>Faster R-CNN [41]</td><td>Res-101-FPN</td><td>36.2</td><td>59.1</td><td>39.0</td><td>18.2</td><td>39.0</td><td>48.2</td></tr><tr><td>RetinaNet [29]</td><td>Res-101-FPN</td><td>39.1</td><td>59.1</td><td>42.3</td><td>21.8</td><td>42.7</td><td>50.2</td></tr><tr><td>FoveaBox [42]</td><td>Res-101-FPN</td><td>40.6</td><td>60.1</td><td>43.5</td><td>23.3</td><td>45.2</td><td>54.5</td></tr><tr><td>RPDet [43]</td><td>Res-101-FPN</td><td>41.0</td><td>62.9</td><td>44.3</td><td>23.6</td><td>44.1</td><td>51.7</td></tr><tr><td>FCOS [11]</td><td>Res-101-FPN</td><td>41.5</td><td>60.7</td><td>45.0</td><td>24.4</td><td>44.8</td><td>51.6</td></tr><tr><td>CenterNet [44]</td><td>Hourglass-104</td><td>42.1</td><td>61.1</td><td>45.9</td><td>24.1</td><td>45.5</td><td>52.8</td></tr><tr><td>SOLOv2</td><td>Res-50-FPN</td><td>40.4</td><td>59.8</td><td>42.8</td><td>20.5</td><td>44.2</td><td>53.9</td></tr><tr><td>SOLOv2</td><td>Res-101-FPN</td><td>42.6</td><td>61.2</td><td>45.6</td><td>22.3</td><td>46.7</td><td>56.3</td></tr><tr><td>SOLOv2</td><td>Res-DCN-101-FPN</td><td>44.9</td><td>63.8</td><td>48.2</td><td>23.1</td><td>48.9</td><td>61.2</td></tr></table>

Table 4 – Object detection box AP (%) on the COCO test-dev. Although our bounding boxes are directly generated from the predicted masks, the accuracy outperforms most state-of-the-art methods. Speed-accuracy trade-off of typical methods is shown in Figure 7.

## E Results on the LVIS dataset

LVIS [33] is a recently proposed dataset for long-tail object segmentation, which has more than 1000 object categories. In LVIS, each object instance is segmented with a high-quality mask that surpasses the annotation quality of the relevant COCO dataset. Since LVIS is new, only the results of Mask R-CNN are publicly available. Therefore we only compare SOLOv2 against the Mask R-CNN baseline.

Table 5 reports the performances on the rare (1∼10 images), common (11∼100), and frequent $( > 1 0 0 )$ subsets, as well as the overall AP. Both the reported Mask R-CNN and SOLOv2 use data resampling training strategy, following [33]. Our SOLOv2 outperforms the baseline method by about 1% AP. For large-size objects $( \mathrm { A P } _ { L } ) .$ , our SOLOv2 achieves 6.7% AP improvement, which is consistent with the results on the COCO dataset.

<table><tr><td></td><td>backbone</td><td> $\operatorname { A P } _ { r }$ </td><td> $\mathsf { A P } _ { c }$ </td><td> $\mathsf { A P } _ { f }$ </td><td> $\mathsf { A P } _ { S }$ </td><td> $\mathsf { A P } _ { M }$ </td><td> $\mathsf { A P } _ { L }$ </td><td>AP</td></tr><tr><td>Mask-RCNN [33] Mask-RCNN*-3×</td><td>Res-50-FPN Res-50-FPN</td><td>14.5 12.1</td><td>24.3 25.8</td><td>28.4 28.1</td><td>- 18.7</td><td>- 31.2</td><td>1 38.2</td><td>24.4 24.6</td></tr><tr><td>SOLOv2 SOLOv2</td><td>Res-50-FPN Res-101-FPN</td><td>13.4 16.3</td><td>26.6 27.6</td><td>28.9 30.1</td><td>15.9 16.8</td><td>34.6 35.8</td><td>44.9 47.0</td><td>25.5 26.8</td></tr></table>

Table 5 – Instance segmentation results on the LVISv0.5 validation dataset.

## F Panoptic Segmentation

The proposed SOLOv2 can be easily extended to panoptic segmentation by adding the semantic segmentation branch, analogue to the mask feature branch. We use annotations of COCO 2018 panoptic segmentaiton task. All models are trained on train2017 subset and tested on val2017. We use the same strategy as in Panoptic-FPN to combine instance and semantic results. As shown in Table 6, our method achieves state-of-the-art results and outperforms other recent box-free methods by a large margin. All methods listed use the same backbone (ResNet50-FPN) except SSAP (ResNet101) and Panoptic-DeepLab (Xception-71).

<table><tr><td>box-based:</td><td>PQ</td><td>PQTh</td><td>PQSt</td></tr><tr><td>AUNet [35] UPSNet [36] Panoptic-FPN [27] Panoptic-FPN*-1× Panoptic-FPN*-3×</td><td>39.6 42.5 39.0 38.7 40.8</td><td>49.1 48.5 45.9 45.9 48.3</td><td>25.2 33.4 28.7 27.8 29.4</td></tr><tr><td>box-free: AdaptIS[20] SSAP (Res101) [15] Pano-DeepLab (Xcept71）[37] SOLOv2</td><td>35.9 36.5 39.7 42.1</td><td>40.3 1 43.9 49.6</td><td>29.3 1 33.2 30.7</td></tr></table>

Table 6 – Panoptic results on COCO val2017. Here Panoptic-FPN∗ is our re-implemented version in mmdetection [45] with 12 and 36 training epochs (1× and 3×) and multi-scale training. All model’s backbones are Res50, except SSAP and Pano-DeepLab. Note that UPSNet has used deformable convolution [18] for better performance.

![](Images_ADV7CAWQ/a12c5e769dac3dadeec028fcf2f0dc07ee3ac5b699a2c1238d49a3ed16e7389c.jpg)  
Figure 8 – Visualization of instance segmentation results using the Res-101-FPN backbone. The model is trained on the COCO train2017 dataset, achieving a mask AP of 39.7% on the COCO test-dev.

## Broader Impact

One of the primary goals of computer vision is understanding of visual scenes. Scene understanding involves numerous tasks (e.g., recognition, detection, segmentation, etc.). Among them, instance segmentation is probably one of the most challenging tasks, which requires to detect object instances at the pixel level.

Albeit being challenging, instance segmentation is beneficial to a wide range of applications, including autonomous driving, augmented reality, medical image analysis, and image/video editing. The proposed accurate and fast instance segmentation solution benefits broader applications. Autonomous driving becomes safer Doctors could find the lesion part in medical images with less effort.

Moreover, we believe that our method can serve as a strong baseline for researchers and engineers in the field. This new paradigm may encourage future work to deeply analyze and further enhance research along this direction. Practitioners may develop interesting applications built upon our approach.

## References

[1] Xinlong Wang, Tao Kong, Chunhua Shen, Yuning Jiang, and Lei Li. SOLO: Segmenting objects by locations. In Proc. Eur. Conf. Comp. Vis., 2020.

[2] Daniel Bolya, Chong Zhou, Fanyi Xiao, and Yong Jae Lee. YOLACT: Real-time instance segmentation. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[3] Yi Li, Haozhi Qi, Jifeng Dai, Xiangyang Ji, and Yichen Wei. Fully convolutional instance-aware semantic segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2017.

[4] Kaiming He, Georgia Gkioxari, Piotr Dollár, and Ross B. Girshick. Mask R-CNN. In Proc. IEEE Int. Conf. Comp. Vis., 2017.

[5] Shu Liu, Lu Qi, Haifang Qin, Jianping Shi, and Jiaya Jia. Path aggregation network for instance segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2018.

[6] Zhaojin Huang, Lichao Huang, Yongchao Gong, Chang Huang, and Xinggang Wang. Mask scoring R-CNN. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[7] Xinlei Chen, Ross Girshick, Kaiming He, and Piotr Dollar. TensorMask: A foundation for dense object segmentation. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[8] Hao Chen, Kunyang Sun, Zhi Tian, Chunhua Shen, Yongming Huang, and Youliang Yan. BlendMask: Top-down meets bottom-up for instance segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2020.

[9] Rufeng Zhang, Zhi Tian, Chunhua Shen, Mingyu You, and Youliang Yan. Mask encoding for single shot instance segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2020.

[10] Enze Xie, Peize Sun, Xiaoge Song, Wenhai Wang, Xuebo Liu, Ding Liang, Chunhua Shen, and Ping Luo. PolarMask: Single shot instance segmentation with polar representation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2020.

[11] Zhi Tian, Chunhua Shen, Hao Chen, and Tong He. FCOS: Fully convolutional one-stage object detection. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[12] Alejandro Newell, Zhiao Huang, and Jia Deng. Associative embedding: End-to-end learning for joint detection and grouping. In Proc. Advances in Neural Inf. Process. Syst., 2017.

[13] Bert De Brabandere, Davy Neven, and Luc Van Gool. Semantic instance segmentation with a discriminative loss function. arXiv:1708.02551, 2017.

[14] Shu Liu, Jiaya Jia, Sanja Fidler, and Raquel Urtasun. Sequential grouping networks for instance segmentation. In Proc. IEEE Int. Conf. Comp. Vis., 2017.

[15] Naiyu Gao, Yanhu Shan, Yupei Wang, Xin Zhao, Yinan Yu, Ming Yang, and Kaiqi Huang. SSAP: Single-shot instance segmentation with affinity pyramid. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[16] Max Jaderberg, Karen Simonyan, Andrew Zisserman, and Koray Kavukcuoglu. Spatial transformer networks. In Proc. Advances in Neural Inf. Process. Syst., 2015.

[17] Xu Jia, Bert De Brabandere, Tinne Tuytelaars, and Luc Van Gool. Dynamic filter networks. In Proc. Advances in Neural Inf. Process. Syst., 2016.

[18] Jifeng Dai, Haozhi Qi, Yuwen Xiong, Yi Li, Guodong Zhang, Han Hu, and Yichen Wei. Deformable convolutional networks. In Proc. IEEE Int. Conf. Comp. Vis., 2017.

[19] Linjie Yang, Yanran Wang, Xuehan Xiong, Jianchao Yang, and Aggelos K. Katsaggelos. Efficient video object segmentation via network modulation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2018.

[20] Konstantin Sofiiuk, Olga Barinova, and Anton Konushin. AdaptIS: Adaptive instance selection network. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[21] Zhi Tian, Chunhua Shen, and Hao Chen. Conditional convolutions for instance segmentation. In Proc. Eur. Conf. Comp. Vis., 2020.

[22] Navaneeth Bodla, Bharat Singh, Rama Chellappa, and Larry Davis. Soft-NMS: improving object detection with one line of code. In Proc. IEEE Int. Conf. Comp. Vis., 2017.

[23] Songtao Liu, Di Huang, and Yunhong Wang. Adaptive NMS: Refining pedestrian detection in a crowd. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[24] Yihui He, Chenchen Zhu, Jianren Wang, Marios Savvides, and Xiangyu Zhang. Bounding box regression with uncertainty for accurate object detection. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[25] Lile Cai, Bin Zhao, Zhe Wang, Jie Lin, Chuan Sheng Foo, Mohamed M. Sabry Aly, and Vijay Chandrasekhar. Maxpoolnms: Getting rid of NMS bottlenecks in two-stage object detectors. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[26] Rosanne Liu, Joel Lehman, Piero Molino, Felipe Petroski Such, Eric Frank, Alex Sergeev, and Jason Yosinski. An intriguing failing of convolutional neural networks and the coordconv solution. In Proc. Advances in Neural Inf. Process. Syst., 2018.

[27] Alexander Kirillov, Ross Girshick, Kaiming He, and Piotr Dollár. Panoptic feature pyramid networks. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[28] Yuxin Wu and Kaiming He. Group normalization. In Proc. Eur. Conf. Comp. Vis., 2018.

[29] Tsung-Yi Lin, Priya Goyal, Ross Girshick, Kaiming He, and Piotr Dollár. Focal loss for dense object detection. In Proc. IEEE Int. Conf. Comp. Vis., 2017.

[30] Liang-Chieh Chen, Alexander Hermans, George Papandreou, Florian Schroff, Peng Wang, and Hartwig Adam. Masklab: Instance segmentation by refining object detection with semantic and direction features. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2018.

[31] Yuqing Wang, Zhaoliang Xu, Hao Shen, Baoshan Cheng, and Lirong Yang. Centermask: single shot instance segmentation with point representation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2020.

[32] Tsung-Yi Lin, Michael Maire, Serge J. Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollár, and C. Lawrence Zitnick. Microsoft COCO: common objects in context. In Proc. Eur. Conf. Comp. Vis., 2014.

[33] Agrim Gupta, Piotr Dollar, and Ross Girshick. LVIS: A dataset for large vocabulary instance segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[34] Md Amirul Islam, Sen Jia, and Neil D. B. Bruce. How much position information do convolutional neural networks encode? In Proc. Int. Conf. Learn. Representations, 2020.

[35] Yanwei Li, Xinze Chen, Zheng Zhu, Lingxi Xie, Guan Huang, Dalong Du, and Xingang Wang. Attentionguided unified network for panoptic segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[36] Yuwen Xiong, Renjie Liao, Hengshuang Zhao, Rui Hu, Min Bai, Ersin Yumer, and Raquel Urtasun. UPSNet: A unified panoptic segmentation network. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2019.

[37] Bowen Cheng, Maxwell Collins, Yukun Zhu, Ting Liu, Thomas Huang, Hartwig Adam, and Liang-Chieh Chen. Panoptic-deeplab: A simple, strong, and fast baseline for bottom-up panoptic segmentation. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2020.

[38] Joseph Redmon and Ali Farhadi. Yolov3: An incremental improvement. arXiv:1804.02767, 2018.

[39] Wei Liu, Dragomir Anguelov, Dumitru Erhan, Christian Szegedy, Scott Reed, Cheng-Yang Fu, and Alexander C Berg. Ssd: Single shot multibox detector. In Proc. Eur. Conf. Comp. Vis., 2016.

[40] Shifeng Zhang, Longyin Wen, Xiao Bian, Zhen Lei, and Stan Z Li. Single-shot refinement neural network for object detection. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2018.

[41] Tsung-Yi Lin, Piotr Dollár, Ross B. Girshick, Kaiming He, Bharath Hariharan, and Serge J. Belongie. Feature pyramid networks for object detection. In Proc. IEEE Conf. Comp. Vis. Patt. Recogn., 2017.

[42] Tao Kong, Fuchun Sun, Huaping Liu, Yuning Jiang, and Jianbo Shi. Foveabox: Beyond anchor-based object detector. arXiv:1904.03797, 2019.

[43] Ze Yang, Shaohui Liu, Han Hu, Liwei Wang, and Stephen Lin. Reppoints: Point set representation for object detection. In Proc. IEEE Int. Conf. Comp. Vis., 2019.

[44] Xingyi Zhou, Dequan Wang, and Philipp Krähenbühl. Objects as points. arXiv:1904.07850, 2019.

[45] Kai Chen, Jiaqi Wang, Jiangmiao Pang, Yuhang Cao, Yu Xiong, Xiaoxiao Li, Shuyang Sun, Wansen Feng, Ziwei Liu, Jiarui Xu, Zheng Zhang, Dazhi Cheng, Chenchen Zhu, Tianheng Cheng, Qijie Zhao, Buyu Li, Xin Lu, Rui Zhu, Yue Wu, Jifeng Dai, Jingdong Wang, Jianping Shi, Wanli Ouyang, Chen Change Loy, and Dahua Lin. MMDetection: Open mmlab detection toolbox and benchmark. arXiv:1906.07155, 2019.