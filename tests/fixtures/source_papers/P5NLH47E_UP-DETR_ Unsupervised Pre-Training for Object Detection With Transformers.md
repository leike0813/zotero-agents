# UP-DETR: Unsupervised Pre-training for Object Detection with Transformers

Zhigang Dai1,2,3\*, Bolun Cai2, Yugeng Lin2, Junying Chen1,3† 1School of Software Engineering, South China University of Technology 2Tencent Wechat AI 3Key Laboratory of Big Data and Intelligent Robot (South China University of Technology), Ministry of Education

zhigangdai@hotmail.com, {arlencai,lincolnlin}@tencent.com, jychense@scut.edu.cn

# Abstract

Object detection with transformers (DETR) reaches competitive performance with Faster R-CNN via a transformer encoder-decoder architecture. Inspired by the great success of pre-training transformers in natural language processing, we propose a pretext task named random query patch detection to Unsupervisedly Pre-train DETR (UP-DETR) for object detection. Specifically, we randomly crop patches from the given image and then feed them as queries to the decoder. The model is pre-trained to detect these query patches from the original image. During the pre-training, we address two critical issues: multi-task learning and multi-query localization. (1) To trade off classification and localization preferences in the pretext task, we freeze the CNN backbone and propose a patch feature reconstruction branch which is jointly optimized with patch detection. (2) To perform multi-query localization, we introduce UP-DETR from single-query patch and extend it to multiquery patches with object query shuffle and attention mask. In our experiments, UP-DETR significantly boosts the performance of DETR with faster convergence and higher average precision on object detection, one-shot detection and panoptic segmentation. Code and pre-training models: https://github.com/dddzg/up-detr.

# 1. Introduction

Object detection with transformers (DETR) [5] is a recent framework that views object detection as a direct prediction problem via a transformer encoder-decoder [39]. Without hand-designed sample selection [46] and nonmaximum suppression, DETR reaches a competitive performance with Faster R-CNN [34]. However, DETR comes with training and optimization challenges, which needs large-scale training data and an extreme long training schedule. As shown in Fig. 1 and Section 4.1, we find that DETR performs poorly in PASCAL VOC [13], which has insufficient training data and fewer instances than COCO [28].

![](Images_EI86WYTF/1bfc71eb5ff1441399a2792ebfc7098b28f8c9a39d1eab35f3d33c7d202b2d3d.jpg)  
Figure 1: The VOC learning curves $\mathrm { ( A P _ { 5 0 } ) }$ of DETR and UP-DETR with ResNet-50 backbone. Here, they are trained on trainva $. 0 7 + 1 2$ and evaluated on test2007. We plot the short and long training schedules, and the learning rate is reduced at 100 and 200 epochs, respectively.

With well-designed pretext tasks, unsupervised pretraining models achieve remarkable progress in both natural language processing (e.g. GPT [32, 33] and BERT [11]) and computer vision (e.g. MoCo [16, 9] and SwAV [7]). In DETR, the CNN backbone (ResNet-50 [19] with ${ \sim } 2 3 . 2 \mathrm { M }$ parameters) has been pre-trained to extract a good visual representation, but the transformer module with ${ \sim } 1 8 . 0 \mathrm { M }$ parameters has not been pre-trained. More importantly, although unsupervised visual representation learning (e.g. contrastive learning) attracts much attention in recent studies [16, 8, 14, 4, 6, 1], existing pretext tasks can not directly apply to pre-train the transformers of DETR. The main reason is that DETR mainly focuses on spatial localization learning instead of image instance-based [16, 8, 14] or cluster-based [4, 6, 1] contrastive learning.

Inspired by the great success of unsupervised pretraining in natural language processing [11], we aim to unsupervisedly pre-train the transformers of DETR on a largescale dataset (e.g. ImageNet), and treat object detection as the downstream task. The motivation is intuitive, but existing pretext tasks seem to be impractical to pre-train the transformers of DETR. To overcome this problem, we propose Unsupervised Pre-training DETR (UP-DETR) with a novel unsupervised pretext task named random query patch detection to pre-train the detector without any human annotations — we randomly crop multiple query patches from the given image, and pre-train the transformers for detection to predict bounding boxes of these query patches in the given image. During the pre-training procedure, we address two critical issues as follows:

(1) Multi-task learning: Object detection is the coupling of object classification and localization. To avoid query patch detection destroying the classification features, we introduce frozen pre-training backbone and patch feature reconstruction to preserve the feature discrimination of transformers.

(2) Multi-query localization: Different object queries focus on different position areas and box sizes. To illustrate this property, we propose a simple single-query pre-training and extend it to a multi-query version. For multi-query patches, we design object query shuffle and attention mask to solve the assignment problems between query patches and object queries.

In our experiments, UP-DETR performs better than DETR on PASCAL VOC [13] and COCO [28] object detection with faster convergence and better average precision. Besides, UP-DETR also transfers well with state-of-the-art performance on one-shot detection and panoptic segmentation. In ablations, we find that freezing the pre-training CNN backbone is the most important procedure to preserve the feature discrimination during the pre-training.

# 2. Related Work

# 2.1. Object Detection

Most object detection methods mainly differ in positive and negative sample assignment. Two-stage detectors [34, 3] and a part of one-stage detectors [27, 29] construct positive and negative samples by hand-crafted multiscale anchors with the IoU threshold and model confidence.

Anchor-free one-stage detectors [38, 48, 22] assign positive and negative samples to feature maps by a grid of object centers. Zhang et al. [46] demonstrate that the performance gap between them is due to the selection of positive and negative training samples. DETR [5] is a recent object detection framework that is conceptually simpler without handcrafted process by direct set prediction [37], which assigns the positive and negative samples automatically.

Apart from the positive and negative sample selection problem, the trade-off between classification and localization is also intractable for object detection. Zhang et al. [45] demonstrate that there is a domain misalignment between classification and localization. Wu et al. [40] and Song et al. [35] design two head structures for classification and localization. They point out that these two tasks may have opposite preferences. For our pre-training model, it maintains shared feature for classification and localization. Therefore, it is essential to take a well trade-off between these two tasks.

# 2.2. Unsupervised Pre-training

Unsupervised pre-training models always follow two steps: pre-training on a large-scale dataset with the pretext task and fine-tuning the parameters on downstream tasks. For unsupervised pre-training, the pretext task is always invented, and we are interested in the learned intermediate representation rather than the final performance of the pretext task.

To perform unsupervised pre-training, there are various of well-designed pretext tasks. For natural language processing, utilizing time sequence relationship between discrete tokens, masked language model [11], permutation language model [43] and auto regressive model [32, 33] are proposed to pre-train transformers [39] for language representation. For computer vision, unsupervised pre-training models also achieve remarkable progress recently for visual representation learning, which outperform the supervised learning counterpart in downstream tasks. Instancebased discrimination tasks [44, 41] and clustering-based tasks [6] are two typical pretext tasks in recent studies. Instance-based discrimination tasks vary mainly on maintaining different sizes of negative samples [16, 8, 14] with non-parametric contrastive learning [15]. Moreover, instance discrimination can also be performed as parametric instance classification [4]. Clustering-based tasks vary on offline [6, 1] or online clustering procedures [7]. UP-DETR is a novel pretext task, which aims to pre-train transformers based on the DETR architecture for object detection.

# 3. UP-DETR

The proposed UP-DETR contains pre-training and finetuning procedures: (a) the transformers are unsupervisedly pre-trained on a large-scale dataset without any human annotations; (b) the entire model is fine-tuned with labeled data which is same as the original DETR [5] on the downstream tasks. In this section, we mainly describe how to pre-train the transformer encoder and decoder with random query patch detection.

![](Images_EI86WYTF/646237709274e8314f16cc60f25393cc966b45a1b16df2719e59e56f71a214fb.jpg)  
Figure 2: The pre-training procedure of UP-DETR by random query patch detection. (a) There is only a single-query patch which we add to all object queries. (b) For multi-query patches, we add each query patch to $N / M$ object queries with object query shuffle and attention mask. CNN is not drawn in the decoder of (b) for neatness.

As shown in Fig. 2, the main idea of random query patch detection is simple but effective. Firstly, a frozen CNN backbone is used to extract a visual representation with the feature map $f \in \mathbb { R } ^ { C \times H \times W }$ of an input image, where $C$ is the channel dimension and $H \times W$ is the feature map size. Then, the feature map is added with positional encodings and passed to the multi-layer transformer encoder in DETR. For the random cropped query patch, the CNN backbone with global average pooling (GAP) extracts the patch feature $p \in \mathbb { R } ^ { C }$ , which is flatten and supplemented with object queries $q \in \mathbb { R } ^ { C }$ before passing it into a transformer decoder. Noting that the query patch refers to the cropped patch from the original image but object query refers to position embeddings, which are fed to the decoder. The CNN parameters are shared in the whole model.

During the pre-training procedure, the decoder predicts the bounding boxes corresponding to the position of random query patches in the input image. Assuming that there are $M$ query patches by random cropping, the model infers a prediction fixed-set $\hat { y } = \{ \hat { y _ { i } } \} _ { i = 1 } ^ { N }$ corresponding to $N$ object queries $( N > M )$ . For better understanding, we will describe the training details of single-query patch $M = 1$ ) in Section 3.1, and extend it to multi-query patches $( M > 1 )$ with object query shuffle and attention mask in Section 3.2.

# 3.1. Single-Query Patch

DETR learns different spatial specialization for each object query [5], which indicates that different object queries focus on different position areas and box sizes. As we randomly crop the patch from the image, there is no any priors about the position areas and box sizes of the query patch. To preserve the different spatial specialization, we explicitly specify single-query patch $M = 1$ ) to all object queries $N = 3$ ) as shown in Fig. 2a.

During the pre-training procedure, the patch feature $p$ is added to each different object query $q$ , and the decoder generates $N$ pairs of predictions $\hat { y } = \{ \hat { y } _ { i } \} _ { i = 1 } ^ { N }$ to detect the bounding box of query patch in the input image. Following DETR [5], we compute the same match cost between the prediction $\hat { y } _ { \hat { \sigma } ( i ) }$ and the ground-truth $y _ { i }$ using Hungarian algorithm [37], where $\hat { \sigma } ( i )$ is the index of $y _ { i }$ computed by the optimal bipartite matching.

For the loss calculation, the predicted result $\hat { y } _ { i } = ( \hat { c } _ { i } \in$ $\mathbb { R } ^ { 2 } , \hat { b } _ { i } \in \mathbb { R } ^ { 4 } , \hat { p } _ { i } \in \mathbb { R } ^ { C } )$ consists of three elements: $\hat { c } _ { i }$ is the binary classification of matching the query patch $( c _ { i } = 1 )$ ) or not $( c _ { i } ~ = ~ 0 )$ ) for each object query; $\hat { b } _ { i } ^ { - }$ is the vector that defines the box center coordinates, its width and height $\{ x , y , w , h \}$ . They are re-scaled relative to the image size; $\hat { p } _ { i }$ is the reconstructed feature with $C \ = \ 2 0 4 8$ for the ResNet-50 backbone typically. With the above definitions, the Hungarian loss for all matched pairs is defined as:

$$
\begin{array} { r l r } {  { \mathcal { L } ( y , \hat { y } ) = \sum _ { i = 1 } ^ { N } [ \lambda _ { \{ c _ { i } \} } \mathcal { L } _ { c l s } ( c _ { i } , \hat { c } _ { \hat { \sigma } ( i ) } ) + \mathbb { 1 } _ { \{ c _ { i } = 1 \} } \mathcal { L } _ { b o x } ( b _ { i } , \hat { b } _ { \hat { \sigma } ( i ) } ) } } \\ & { } & { ~ + \mathbb { 1 } _ { \{ c _ { i } = 1 \} } \mathcal { L } _ { r e c } ( p _ { i } , \hat { p } _ { \hat { \sigma } ( i ) } ) ] . ~ } \end{array}
$$

Here, $\mathcal { L } _ { c l s }$ is the cross entropy loss over two classes (match the query patch $_ { v s }$ . not match), and the class balance weight $\lambda _ { \{ c _ { i } = 1 \} } = 1$ and $\lambda _ { \{ c _ { i } = 0 \} } = M / N$ . $\mathcal { L } _ { b o x }$ is a linear combination of $\ell _ { 1 }$ loss and the generalized IoU loss with the same weight hyper-parameters as DETR [5]. $\mathcal { L } _ { r e c }$ is the reconstruction loss proposed in this paper to balance classification and localization during the unsupervised pre-training, which will be discussed in detail below.

# 3.1.1 Patch Feature Reconstruction

Object detection is the coupling of object classification and localization, where these two tasks always have different feature preferences [45, 40, 35]. Different from DETR, we propose a feature reconstruction term $\mathcal { L } _ { r e c }$ to preserve classification feature during localization pre-training. The motivation of this term is to preserve the feature discrimination extract by CNN after passing feature to transformers. $\mathcal { L } _ { r e c }$ is the mean squared error between the $\ell _ { 2 }$ -normalized patch feature extracted by the CNN backbone, which is defined as follows:

$$
\mathcal { L } _ { r e c } ( p _ { i } , \hat { p } _ { \hat { \sigma } ( i ) } ) = \left\| \frac { p _ { i } } { \left\| p _ { i } \right\| _ { 2 } } - \frac { \hat { p } _ { \hat { \sigma } ( i ) } } { \left\| \hat { p } _ { \hat { \sigma } ( i ) } \right\| _ { 2 } } \right\| _ { 2 } ^ { 2 } .
$$

# 3.1.2 Frozen Pre-training Backbone

With the patch feature reconstruction, the CNN backbone parameters seriously affect the model training. Our motivation is that the feature after transformer should have similar discrimination as the feature after the CNN backbone. Therefore, we freeze the pre-training backbone and reconstruct the patch feature after the transformers by $\mathcal { L } _ { r e c }$ . Stable backbone parameters are beneficial to transformer pretraining, and accelerate the feature reconstruction.

As described above, we propose and apply feature reconstruction and frozen backbone to preserve feature discrimination for classification. In Section 4.5.1, we will analyze and verify the necessity of them with experiments.

# 3.2. Multi-Query Patches

For general object detection, there are multiple object instances in each image (e.g. average 7.7 object instances per image in the COCO dataset). Moreover, single-query patch may result in the convergence difficulty when the number of object queries $N$ is large. Therefore, singlequery patch pre-training is inconsistent with multi-object detection task, and is unreasonable for the typical object query setting $N ~ = ~ 1 0 0$ . However, extending a singlequery patch to multi-query patches is not straightforward, because the assignment between $M$ query patches and $N$ object queries is a specific negative sampling problem for multi-query patches.

To solve this problem, we divide $N$ object queries into $M$ groups, where each query patch is assigned to $N / M$ object queries. The query patches are assigned to the object queries in order. For example, the first query patch is assigned to the first $N / M$ object queries, the second query patch to the second $N / M$ object queries, and so on. Here, we hypothesize that it needs to satisfy two requirements during the pre-training: (1) Independence of query patches. All the query patches are randomly cropped from the image. Therefore, they are independent without any relations. For example, the bounding box regression of the first cropping is not concerned with the second cropping. (2) Diversity of object queries. There is no explicit group assignment between object queries for the downstream tasks. In other words, the query patch can be added to arbitrary $N / M$ object queries ideally.

# 3.2.1 Attention Mask

To satisfy the independence of query patches, we utilize an attention mask matrix to control the interactions between different object queries. The mask matrix $\mathbf { X } \in \mathbb { R } ^ { N \times N }$ is added to the softmax layer of self-attention in the decoder sof tmax $\left( Q K ^ { \top } / \sqrt { d _ { k } } + \mathbf { X } \right) \mathbf { V } .$ . Similar to the token mask in UniLM [12], the attention mask is defined as:

$$
{ \bf X } _ { i , j } = \left\{ \begin{array} { l l } { { 0 , } } & { { \mathrm { i , j ~ i n ~ t h e ~ s a m e ~ g r o u p } } } \\ { { - \infty , } } & { { \mathrm { o t h e r w i s e } } } \end{array} \right. ,
$$

where $\mathbf { X } _ { i , j }$ determines whether the object query $q _ { i }$ attends to the interaction with the object query $q _ { j }$ . For intuitive understanding, the attention mask in Fig. 2b displays 1 and 0 corresponding to 0 and $- \infty$ in (3), respectively.

# 3.2.2 Object Query Shuffle

Groups of object queries are assigned artificially. However, during the downstream object detection tasks, there are no explicit group assignment between object queries. Therefore, To simulate implicit group assignment between object queries, we randomly shuffle the permutation of all the object query embeddings during pre-training 3.

Fig. 2b illustrates the pre-training of multi-query patches with attention mask and object query shuffle. To improve the generalization, we randomly mask $10 \%$ query patches to zero during pre-training similarly to dropout [36]. In our experiments, two typical values are set to $N = 1 0 0$ and $M = 1 0$ . Apart from such modifications, other training settings are the same as those described in Section 3.1.

# 4. Experiments

We pre-train the UP-DETR using ImageNet [10] and fine-tune the parameters on VOC [13] and COCO [28] for object detection, one-shot detection and panoptic segmentation. In all experiments, we adopt the UP-DETR model (41.3M parameters) with ResNet-50 backbone, 6 transformer encoder, 6 decoder layers of width 256 with 8 attention heads. Referring to the open source of DETR4, we use the same hyper-parameters in the proposed UP-DETR and our DETR re-implementation. We annotate R50 and R101 short for ResNet-50 and ResNet-101.

Pre-training setup. UP-DETR is pre-trained on the ImageNet training set without any labels. The CNN backbone (ResNet-50) is pre-trained with SwAV [7]. As the input image from ImageNet is relatively small, we resize it such that the shortest side is within [320, 480] pixels while the longest side is at most 600 pixels. Given the image, we crop the query patches with random coordinate, height and width, which are resized to $1 2 8 \times 1 2 8$ pixels and transformed with the SimCLR-style [8] without horizontal flipping. AdamW [30] is used to optimize the UP-DETR, with the initial learning rate of $1 \times 1 0 ^ { - 4 }$ and the weight decay of $1 \times 1 0 ^ { - 4 }$ . We use a mini-batch size of 256 on 8 V100 GPUs for 60 epochs with the learning rate multiplied by 0.1 at 40 epochs.

Fine-tuning setup. The model is initialized with pretraining UP-DETR parameters and fine-tuned for all the parameters (including CNN) on VOC and COCO. We finetune the model with the initial learning rate $1 \times 1 0 ^ { - 4 }$ for transformers and $5 \times 1 0 ^ { - 5 }$ for CNN backbone, and the other settings are same as DETR [5] on 8 V100 GPUs. The model is fine-tuned with short/long schedule for 150/300 epochs and the learning rate is multiplied by 0.1 at 100/200 epochs, respectively.

# 4.1. PASCAL VOC Object Detection

Setup. The model is fine-tuned on VOC trainval $0 7 + 1 2$ $( \sim 1 6 . 5 \mathrm { k }$ images) and evaluated on $\mathtt { t e s t 2 0 0 7 }$ . We report COCO-style metrics: AP, $\mathrm { { A P } _ { 5 0 } }$ (default VOC metric) and $\mathsf { A P } _ { 7 5 }$ . For a full comparison, we report the result of Faster R-CNN with the R50-C4 backbone [7], which performs much better than R50 [25]. DETR with R50-C4 significantly increases the computational cost than R50, so we fine-tune UP-DETR with R50 backbone.

<table><tr><td>Model/Epoch</td><td>AP AP50</td><td>AP75</td></tr><tr><td>Faster R-CNN</td><td>56.1 82.6</td><td>62.7</td></tr><tr><td>DETR/150 UP-DETR/150</td><td>49.9 74.5 56.1 (+6.2) 79.7 (+5.2)</td><td>53.1 60.6 (+7.5)</td></tr><tr><td>DETR/300 UP-DETR/300</td><td>54.1 78.0 57.2 (+3.1) 80.1 (+2.1)</td><td>58.3 62.0 (+3.7)</td></tr></table>

Table 1: Object detection results trained on PASCAL VOC trainval $. 0 7 + 1 2$ and evaluated on test2007. DETR and UP-DETR use R50 backbone and Faster R-CNN uses R50-C4 backbone. The values in the brackets are the gaps compared to DETR with the same training schedule.

Results. Table 1 shows the compared results of PASCAL VOC. We find that the DETR performs poorly in PASCAL VOC, which is much worse than Faster R-CNN by a large gap in all metrics. UP-DETR significantly boosts the performance of DETR for both short and long schedules: up to $\mathbf { + 6 . 2 }$ $( + 3 . 1 )$ AP, $+ 5 . 2$ $( + 2 . 1 )$ ) $\mathrm { { A P } _ { 5 0 } }$ and $+ 7 . 5 \ : ( + 3 . 7 ) \ : \mathrm { A P } _ { 7 5 }$ for 150 (300) epochs, respectively. Moreover, UP-DETR (R50) achieves a comparable result to Faster R-CNN (R50-C4) with better AP. We find that both UP-DETR and DETR perform a little worse than Faster R-CNN in $\mathrm { { A P } _ { 5 0 } }$ and $\mathsf { A P } _ { 7 5 }$ . It may come from different ratios of feature maps (C4 for Faster R-CNN) and no NMS post-processing (NMS lowers AP but slightly improves $\mathrm { A P _ { 5 0 } }$ ).

Fig. 3a shows the AP (COCO style) learning curves on VOC. UP-DETR significantly speeds up the model convergence. After the learning rate reduced, UP-DETR significantly boosts the performance of DETR with a large AP improvement. Noting that UP-DETR obtains 56.1 AP after 150 epochs, however, its counterpart DETR (scratch transformers) only obtains 54.1 AP even after 300 epochs and does not catch up even training longer. It suggests that pretraining transformers is indispensable on insufficient training data $( i . e . \sim 1 6 . 5 K$ images on VOC).

# 4.2. COCO Object Detection

Setup. The model is fine-tuned on COCO train2017 $( \sim 1 1 8 \mathrm { k }$ images) and evaluated on val2017. There are lots of small objects in COCO dataset, where DETR performs poorly [5]. Therefore, we report AP, $\mathsf { A P } _ { 5 0 }$ , $\mathsf { A P } _ { 7 5 }$ , $\mathsf { A P } _ { S }$ , $\mathsf { A P } _ { M }$ and $\mathsf { A P } _ { L }$ for a comprehensive comparison. Moreover, we also report the results of highly optimized Faster R-CNN-FPN with short $( 3 \times )$ and long $( 9 \times )$ training schedules, which are known to improve the performance results [17].

Results. Table 2 shows the results on COCO with other methods. With 150 epoch schedule, UP-DETR outperforms DETR by $0 . 8 ~ \mathrm { A P }$ and achieves a comparable performance as compared with Faster R-CNN-FPN $3 \times$ schedule). With 300 epoch schedule, UP-DETR obtains 42.8 AP on COCO, which is 0.7 AP better than DETR (SwAV CNN) and 0.8 AP better than Faster R-CNN-FPN $9 \times$ schedule). Overall, UP-DETR comprehensively outperforms DETR in detection of small, medium and large objects with both short and long training schedules. Regrettably, UP-DETR is still slightly lagging behind Faster R-CNN in $\mathsf { A P } _ { S }$ , because of the lacking of FPN-like architecture [26] and the high-cost attention operation.

Fig. 3b shows the AP learning curves on COCO. UPDETR outperforms DETR for both 150 and 300 epoch schedules with faster convergence. The performance improvement is more noticeable before reducing the learning rate. After reducing the learning rate, UP-DETR still holds the lead of DETR by $\sim 0 . 7$ AP improvement. It suggests that pre-training transformers is still indispensable even on sufficient training data $( i . e . \sim 1 1 8 \mathsf { K }$ images on COCO).

<table><tr><td>Model</td><td>Backbone</td><td>Epochs</td><td>AP</td><td>AP50</td><td>AP75</td><td>APs</td><td>APM</td><td>APL</td></tr><tr><td>Faster R-CNN + [26]</td><td>R101-FPN</td><td></td><td>36.2</td><td>59.1</td><td>39.0</td><td>18.2</td><td>39.0</td><td>48.2</td></tr><tr><td>Mask R-CNN † [18]</td><td>R101-FPN</td><td></td><td>38.2</td><td>60.3</td><td>41.7</td><td>20.1</td><td>41.1</td><td>50.2</td></tr><tr><td>Grid R-CNN † [31]</td><td>R101-FPN</td><td></td><td>41.5</td><td>60.9</td><td>44.5</td><td>23.3</td><td>44.9</td><td>53.1</td></tr><tr><td>Double-head R-CNN [40]</td><td>R101-FPN</td><td></td><td>41.9</td><td>62.4</td><td>45.9</td><td>23.9</td><td>45.2</td><td>55.8</td></tr><tr><td>RetinaNet † [27]</td><td>R101-FPN</td><td></td><td>39.1</td><td>59.1</td><td>42.3</td><td>21.8</td><td>42.7</td><td>50.2</td></tr><tr><td>FCOS † [38]</td><td>R101-FPN</td><td>=</td><td>41.5</td><td>60.7</td><td>45.0</td><td>24.4</td><td>44.8</td><td>51.6</td></tr><tr><td>DETR [5]</td><td>R50</td><td>500</td><td>42.0</td><td>62.4</td><td>44.2</td><td>20.5</td><td>45.8</td><td>61.1</td></tr><tr><td>FasterR-CNN</td><td>R50-FPN</td><td>3×</td><td>40.2</td><td>61.0</td><td>43.8</td><td>24.2</td><td>43.5</td><td>52.0</td></tr><tr><td>DETR (Supervised CNN)</td><td>R50</td><td>150</td><td>39.5</td><td>60.3</td><td>41.4</td><td>17.5</td><td>43.0</td><td>59.1</td></tr><tr><td>DETR (SwAV CNN) [7]</td><td>R50</td><td>150</td><td>39.7</td><td>60.3</td><td>41.7</td><td>18.5</td><td>43.8</td><td>57.5</td></tr><tr><td>UP-DETR</td><td>R50</td><td>150</td><td>40.5 (+0.8)</td><td>60.8</td><td>42.6</td><td>19.0</td><td>44.4</td><td>60.0</td></tr><tr><td>Faster R-CNN</td><td>R50-FPN</td><td>9×</td><td>42.0</td><td>62.1</td><td>45.5</td><td>26.6</td><td>45.4</td><td>53.4</td></tr><tr><td>DETR (Supervised CNN)</td><td>R50</td><td>300</td><td>40.8</td><td>61.2</td><td>42.9</td><td>20.1</td><td>44.5</td><td>60.3</td></tr><tr><td>DETR (SwAV CNN) [7]</td><td>R50</td><td>300</td><td>42.1</td><td>63.1</td><td>44.5</td><td>19.7</td><td>46.3</td><td>60.9</td></tr><tr><td>UP-DETR</td><td>R50</td><td>300</td><td>42.8 (+0.7)</td><td>63.0</td><td>45.3</td><td>20.8</td><td>47.1</td><td>61.7</td></tr></table>

Table 2: Object detection results trained on COCO train2017 and evaluated on val2017. Faster R-CNN, DETR and UP-DETR are performed under comparable settings. $\dagger$ for values evaluated on COCO test-dev, which are always slightly higher than val2017. The values in the brackets are the gaps compared to DETR.

![](Images_EI86WYTF/33f8337e4df8dc5c52c4506a5c32b699949e0d6c97e3900c9035b5742da367cc.jpg)  
Figure 3: AP (COCO style) learning curves with DETR and UP-DETR on VOC and COCO. Models are trained with the SwAV pre-training ResNet-50 for 150 and 300 epochs, and the learning rate is reduced at 100 and 200 epochs, respectively.

# 4.3. One-Shot Detection

Given a query image patch whose class label is not included in the training data, one-shot detection aims to detect all instances with the same class in a target image. One-shot detection is a promising research direction that can detect unseen instances. With feeding query patches to the decoder, UP-DETR is naturally compatible to one-shot detection task. Therefore, one-shot detection can also be treated as a downstream fine-tuning task of UP-DETR.

Following the same one-shot detection setting as [20], we crop the query image patch as the query patch to the DETR decoder. we train DETR and UP-DETR on VOC 2007train val and 2012train val sets with 300 epochs then evaluate on VOC 2007test set. Table 3 shows the comparison to the state-of-the-art one-shot detection methods. Compared with DETR, UP-DETR significantly boosts the performance of DETR on both seen $( + 2 2 . 8$ $\mathsf { A P } ^ { 5 0 }$ gain) and unseen $( { \bf + 1 5 . 8 \ A P ^ { 5 0 } }$ gain) classes. Moreover, we show that UP-DETR outperforms all methods in both seen $( + 7 . 9 \ \mathrm { A P ^ { 5 0 } }$ gain) and unseen $( + 4 . \mathbf { 0 } \ \mathrm { A P ^ { 5 0 } }$ gain)

Table 3: One-shot detection results on VOC 2007test set.   

<table><tr><td>Model</td><td colspan="10"></td><td colspan="7"></td><td colspan="5">unseen class</td></tr><tr><td></td><td>plant 3.2</td><td>sofa</td><td>tv 5.0</td><td>car 16.7</td><td>bottle 0.5</td><td>boat 8.1</td><td>chair 1.2</td><td>person</td><td>bus 22.2</td><td>train 22.6</td><td></td><td>horse 35.4</td><td>bike 14.2</td><td>dog</td><td>bird 11.7</td><td>mbike 19.7</td><td>table</td><td>AP50</td><td>cow</td><td>sheep 2.28</td><td>cat</td><td>aero</td><td></td><td>Ap50</td></tr><tr><td>SiamFC [2]</td><td>1.9</td><td>22.8 15.7</td><td></td><td></td><td></td><td>1.1</td><td></td><td>4.2 8.7</td><td>7.9</td><td></td><td></td><td></td><td></td><td>25.8</td><td></td><td></td><td>27.8 5.1</td><td>15.1</td><td>6.8 15.9</td><td>15.7</td><td></td><td>31.6</td><td>12.4</td><td>13.3</td></tr><tr><td>SiamRPN [23]</td><td></td><td></td><td>4.5</td><td>12.8</td><td>1.0</td><td></td><td>6.1</td><td></td><td></td><td></td><td>6.9</td><td>17.4</td><td>17.8</td><td>20.5</td><td>7.2</td><td>18.5</td><td></td><td>9.6</td><td></td><td></td><td>60.0</td><td>21.7 47.9</td><td>3.5</td><td>14.2</td></tr><tr><td>CompNet [47]</td><td>28.4 30.0</td><td>41.5</td><td>65.0 64.1</td><td>66.4</td><td>37.1 40.1</td><td>49.8</td><td>16.2</td><td>31.7</td><td>69.7</td><td></td><td>73.1</td><td>75.6 77.9</td><td>71.6 73.2</td><td>61.4 80.5</td><td>52.3 70.8</td><td>63.4</td><td>39.8</td><td>52.7</td><td>75.3</td><td></td><td></td><td>75.6</td><td>25.3 46.2</td><td>52.1 68.2</td></tr><tr><td>CoAE[20]</td><td>33.7</td><td>54.9 58.2</td><td>67.5</td><td>66.7 72.7</td><td>40.8</td><td>54.1 48.2</td><td>14.7 20.1</td><td>60.9</td><td>77.5 78.2</td><td>78.3</td><td>79.0</td><td>76.2</td><td>74.6</td><td>81.3</td><td>71.6</td><td>72.4 72.0</td><td>46.2 48.8</td><td>60.1</td><td>83.9</td><td>67.1</td><td></td><td>81.0</td><td>52.4</td><td>69.1</td></tr><tr><td>Li et al. [24] DETR</td><td>11.4</td><td>42.2</td><td>44.1</td><td>63.4</td><td>14.9</td><td>40.6</td><td>20.6</td><td>55.4 63.7</td><td>62.7</td><td>71.5</td><td></td><td>59.6</td><td>52.7</td><td>60.6</td><td>53.6</td><td>54.9</td><td>22.1</td><td>61.1 46.2</td><td>74.3 62.7</td><td>68.5 55.2</td><td>65.4</td><td></td><td>45.9</td><td>57.3</td></tr><tr><td>UP-DETR</td><td>46.7</td><td>61.2</td><td>75.7</td><td>81.5</td><td>54.8</td><td>57.0</td><td>44.5</td><td>80.7</td><td>74.5</td><td></td><td>86.8</td><td>79.1</td><td>80.3</td><td>80.6</td><td>72.0</td><td>70.9</td><td>57.8</td><td>69.0</td><td>80.9</td><td>71.0</td><td>80.4</td><td>59.9</td><td></td><td>73.1</td></tr></table>

Table 4: Panoptic segmentation results on the COCO val dataset with the same ResNet-50 backbone. The PanopticF $\mathrm { P N } { + } { + }$ , UPSNet and DETR results are re-implemented by Carion et al. [5].   

<table><tr><td>Model</td><td>PQ</td><td>SQ</td><td>RQ</td><td>PQth</td><td>SQth</td><td>RQth</td><td>PQst</td><td>SQst</td><td>RQst</td><td>Apseg</td></tr><tr><td rowspan="4">PanopticFPN++ [21] UPSNet [42] UPSNet-M [42]</td><td>42.4</td><td>79.3</td><td>51.6</td><td>49.2</td><td>82.4</td><td>58.8</td><td>32.3</td><td>74.8</td><td>40.6</td><td>37.7</td></tr><tr><td>42.5</td><td>78.0</td><td>52.5</td><td>48.6</td><td>79.4</td><td>59.6</td><td>33.4</td><td>75.9</td><td>41.7</td><td>34.3</td></tr><tr><td>43.0</td><td>79.1</td><td>52.8</td><td>48.9</td><td>79.7</td><td>59.7</td><td>34.1</td><td>78.2</td><td>42.3</td><td>34.3</td></tr><tr><td>44.3</td><td>80.0</td><td>54.5</td><td>49.2</td><td>80.6</td><td>60.3</td><td>37.0</td><td>79.1</td><td>45.9</td><td>32.9</td></tr><tr><td>DETR [5] UP-DETR</td><td>44.5</td><td>80.3</td><td>54.7</td><td>49.6</td><td>80.7</td><td>60.7</td><td>36.9</td><td>78.9</td><td>45.8</td><td>34.0</td></tr></table>

Table 5: Ablation study on frozen CNN and feature reconstruction for pre-training models with $\mathrm { { A P } _ { 5 0 } }$ . The experiments are fine-tuned on PASCAL VOC with 150 epochs.   

<table><tr><td>Case</td><td colspan="2">Frozen CNN Feature Reconstruction</td><td>AP50</td></tr><tr><td>DETR</td><td colspan="2">scratch transformers</td><td>74.5</td></tr><tr><td>(a)</td><td colspan="2"></td><td>74.0</td></tr><tr><td>(b)</td><td colspan="2">√</td><td>78.7</td></tr><tr><td>(c)</td><td colspan="2">√</td><td>62.0</td></tr><tr><td>(d)</td><td colspan="2">√ √</td><td>78.7</td></tr></table>

classes of one-hot detection. It further verifies the effectiveness of our pre-training pretext task.

# 4.4. Panoptic Segmentation

Panoptic segmentation [21] is a natural extension to DETR by adding a mask head on the top of the decoder outputs. Following the same panoptic segmentation training schema as DETR [5], we fine-tune UP-DETR for box only annotations with 300 epochs. Then, we freeze all the weights of DETR and train the mask head for 25 epochs.

Table 4 shows the comparison to state-of-the-art methods on panoptic segmentation with the ResNet-50 backbone. As seen, UP-DETR outperforms DETR5 with $\mathbf { + 0 . 2 }$ PQ, ${ \bf + 0 . 4 }$ $\mathrm { P Q } ^ { t h }$ and $\mathbf { + 1 . 1 \ A P ^ { \mathit { s e g } } }$ .

# 4.5. Ablations

For ablation experiments, we pre-train UP-DETR for 15 epochs with the learning rate multiplied by 0.1 at the 10- th epoch on ImageNet. We fine-tune models on VOC ob

![](Images_EI86WYTF/8cc8b6bc8e8c532df4201d799c373500982bcfdd56c03299e6d1521288584d3b.jpg)  
Figure 4: Learning curves of VOC $\mathrm { ( A P _ { 5 0 } ) }$ ) with four different pre-training UP-DETR models and DETR. The models trained with 150 epochs corresponds to the models in Table 5 one-to-one.

ject detection following the setup in Section 4.1 with 150 epochs6.

# 4.5.1 Frozen CNN and Feature Reconstruction

To illustrate the importance of patch feature reconstruction and frozen CNN backbone of UP-DETR, we pre-train four different UP-DETR models with different combinations of whether freezing CNN and whether adding feature reconstruction.

![](Images_EI86WYTF/9992fe9a3827a591ca8fcd2765972fccaa0e5e48a9b8968f78d75e119dbd8b6f.jpg)  
Figure 5: The unsupervised localization of patch queries with UP-DETR. The first line is the original image with predicted bounding boxes. The second line is query patches cropped from the original image with data augmentation. The value in the upper left corner of the bounding box is the model confidence.

Table 5 shows AP and $\mathrm { { A P } _ { 5 0 } }$ of four different pre-training models and DETR on VOC with 150 epochs. As shown in Table 5, not all pre-trained models are better than DETR, and pre-training models (b) and (d) perform better than the others. More importantly, without frozen CNN, pre-training models (a) and (c) even perform worse than DETR. It confirms that freezing pre-trained CNN is essential to pre-train transformers. In addition, it further confirms the pretext (random query patch detection) may weaken the feature discrimination without the freezing pre-training CNN weights.

Fig. 4 plots the $\mathrm { { A P } _ { 5 0 } }$ learning curves of four different pre-training models and DETR, where the models in Fig. 4 correspond to the models in Table 5 one-to-one. As shown in Fig. 4, model (d) UP-DETR achieves faster convergence at the early training stage with feature reconstruction. The experiments suggest that random query patch detection is complementary to the contrastive learning for a better visual representation. The former is designed for the spatial localization with position embeddings, and the latter is designed for instance or cluster classification.

It is worth noting that UP-DETR with frozen CNN and feature reconstruction heavily relies on a pre-trained CNN model, e.g. SwAV. Therefore, we believe that it is a promising direction for further investigating UP-DETR with random query patch detection and contrastive learning together to pre-train the whole DETR model from scratch.

# 4.6. Visualization

To further illustrate the ability of the pre-training model, we visualize the unsupervised localization results of given patch queries. Specifically, for the given image, we manually crop several object patches and apply the data augmentation to them. Then, we feed these patches as queries to the model. Finally, we visualize the model output with bounding boxes, whose classification confidence is greater than 0.9. This procedure can be treated as unsupervised one-shot detection or deep learning based template matching.

As shown in Fig. 5, pre-trained with random query patch detection, UP-DETR successfully learns to locate the bounding box of given query patches and suppress the duplicated bounding boxes 7. It suggests that UP-DETR with random query patch detection is effective to learns the ability of object localization.

# 5. Conclusion

We present a novel pretext task called random query patch detection to pre-train the transformers in DETR. With unsupervised pre-training, UP-DETR significantly outperforms DETR on object detection, one-shot detection and panoptic segmentation. We find that, even on the COCO with sufficient training data, UP-DETR still performs better than DETR.

From the perspective of unsupervised pre-training models, pre-training CNN backbone and pre-training transformers are separated now. Recent studies of unsupervised pretraining mainly focus on feature discrimination with contrastive learning instead of specialized modules for spatial localization. However, for UP-DETR pre-training, the pretext task is mainly designed for patch localization by positional encodings and learn-able object queries. We hope that an advanced method can integrate CNN and transformers pre-training into a unified end-to-end framework and apply our pre-training tasks to more detection related frameworks.

# Acknowledgement

This work was supported by the Guangdong Natural Science Foundation under Grant 2019A1515012152.

# References

[1] YM Asano, C Rupprecht, and A Vedaldi. Self-labelling via simultaneous clustering and representation learning. In International Conference on Learning Representations, 2019. 2   
[2] Luca Bertinetto, Jack Valmadre, Joao F Henriques, Andrea Vedaldi, and Philip HS Torr. Fully-convolutional siamese networks for object tracking. In European conference on computer vision, pages 850–865. Springer, 2016. 7   
[3] Zhaowei Cai and Nuno Vasconcelos. Cascade R-CNN: Delving into high quality object detection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 6154–6162, 2018. 2   
[4] Yue Cao, Zhenda Xie, Bin Liu, Yutong Lin, Zheng Zhang, and Han Hu. Parametric instance classification for unsupervised visual feature learning. Advances in Neural Information Processing Systems, 33, 2020. 2   
[5] Nicolas Carion, Francisco Massa, Gabriel Synnaeve, Nicolas Usunier, Alexander Kirillov, and Sergey Zagoruyko. Endto-end object detection with transformers. arXiv preprint arXiv:2005.12872, 2020. 1, 2, 3, 5, 6, 7   
[6] Mathilde Caron, Piotr Bojanowski, Armand Joulin, and Matthijs Douze. Deep clustering for unsupervised learning of visual features. In Proceedings of the European Conference on Computer Vision (ECCV), pages 132–149, 2018. 2   
[7] Mathilde Caron, Ishan Misra, Julien Mairal, Priya Goyal, Piotr Bojanowski, and Armand Joulin. Unsupervised learning of visual features by contrasting cluster assignments. Advances in Neural Information Processing Systems, 33, 2020. 1, 2, 5, 6   
[8] Ting Chen, Simon Kornblith, Mohammad Norouzi, and Geoffrey Hinton. A simple framework for contrastive learning of visual representations. arXiv preprint arXiv:2002.05709, 2020. 2, 5   
[9] Xinlei Chen, Haoqi Fan, Ross Girshick, and Kaiming He. Improved baselines with momentum contrastive learning. arXiv preprint arXiv:2003.04297, 2020. 1   
[10] Jia Deng, Wei Dong, Richard Socher, Li-Jia Li, Kai Li, and Li Fei-Fei. Imagenet: A large-scale hierarchical image database. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 248–255. Ieee, 2009. 4   
[11] Jacob Devlin, Ming-Wei Chang, Kenton Lee, and Kristina Toutanova. Bert: Pre-training of deep bidirectional transformers for language understanding. arXiv preprint arXiv:1810.04805, 2018. 1, 2   
[12] Li Dong, Nan Yang, Wenhui Wang, Furu Wei, Xiaodong Liu, Yu Wang, Jianfeng Gao, Ming Zhou, and Hsiao-Wuen Hon. Unified language model pre-training for natural language understanding and generation. In Advances in Neural Information Processing Systems, pages 13063–13075, 2019. 4   
[13] Mark Everingham, Luc Van Gool, Christopher KI Williams, John Winn, and Andrew Zisserman. The pascal visual object classes (voc) challenge. International journal of computer vision, 88(2):303–338, 2010. 1, 2, 4   
[14] Jean-Bastien Grill, Florian Strub, Florent Altche, Corentin ´ Tallec, Pierre Richemond, Elena Buchatskaya, Carl Doersch, Bernardo Avila Pires, Zhaohan Guo, Mohammad Gheshlaghi Azar, et al. Bootstrap your own latent-a new approach to self-supervised learning. Advances in Neural Information Processing Systems, 33, 2020. 2   
[15] Raia Hadsell, Sumit Chopra, and Yann LeCun. Dimensionality reduction by learning an invariant mapping. In 2006 IEEE Computer Society Conference on Computer Vision and Pattern Recognition (CVPR’06), volume 2, pages 1735–1742. IEEE, 2006. 2   
[16] Kaiming He, Haoqi Fan, Yuxin Wu, Saining Xie, and Ross Girshick. Momentum contrast for unsupervised visual representation learning. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 9729– 9738, 2020. 1, 2   
[17] Kaiming He, Ross Girshick, and Piotr Dollar. Rethinking ´ imagenet pre-training. In Proceedings of the IEEE International Conference on Computer Vision, pages 4918–4927, 2019. 5   
[18] Kaiming He, Georgia Gkioxari, Piotr Dollar, and Ross Gir- ´ shick. Mask r-cnn. In Proceedings of the IEEE International Conference on Computer Vision, pages 2961–2969, 2017. 6   
[19] Kaiming He, Xiangyu Zhang, Shaoqing Ren, and Jian Sun. Deep residual learning for image recognition. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 770–778, 2016. 1   
[20] Ting-I Hsieh, Yi-Chen Lo, Hwann-Tzong Chen, and TyngLuh Liu. One-shot object detection with co-attention and co-excitation. arXiv preprint arXiv:1911.12529, 2019. 6, 7   
[21] Alexander Kirillov, Kaiming He, Ross Girshick, Carsten Rother, and Piotr Dollar. Panoptic segmentation. In ´ Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 9404–9413, 2019. 7   
[22] Hei Law and Jia Deng. Cornernet: Detecting objects as paired keypoints. In Proceedings of the European conference on computer vision (ECCV), pages 734–750, 2018. 2   
[23] Bo Li, Junjie Yan, Wei Wu, Zheng Zhu, and Xiaolin Hu. High performance visual tracking with siamese region proposal network. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 8971–8980, 2018. 7   
[24] Xiang Li, Lin Zhang, Yau Pun Chen, Yu-Wing Tai, and ChiKeung Tang. One-shot object detection without fine-tuning. arXiv preprint arXiv:2005.03819, 2020. 7   
[25] Yi Li, Haozhi Qi, Jifeng Dai, Xiangyang Ji, and Yichen Wei. Fully convolutional instance-aware semantic segmentation. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 2359–2367, 2017. 5   
[26] Tsung-Yi Lin, Piotr Dollar, Ross Girshick, Kaiming He, ´ Bharath Hariharan, and Serge Belongie. Feature pyramid networks for object detection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 2117–2125, 2017. 5, 6   
[27] Tsung-Yi Lin, Priya Goyal, Ross Girshick, Kaiming He, and Piotr Dollar. Focal loss for dense object detection. In ´ Proceedings of the IEEE International Conference on Computer Vision, pages 2980–2988, 2017. 2, 6   
[28] Tsung-Yi Lin, Michael Maire, Serge Belongie, James Hays, Pietro Perona, Deva Ramanan, Piotr Dollar, and C Lawrence ´ Zitnick. Microsoft coco: Common objects in context. In European Conference on Computer Vision, pages 740–755. Springer, 2014. 1, 2, 4   
[29] Wei Liu, Dragomir Anguelov, Dumitru Erhan, Christian Szegedy, Scott Reed, Cheng-Yang Fu, and Alexander C Berg. Ssd: Single shot multibox detector. In European Conference on Computer Vision, pages 21–37. Springer, 2016. 2   
[30] Ilya Loshchilov and Frank Hutter. Decoupled weight decay regularization. In International Conference on Learning Representations, 2018. 5   
[31] Xin Lu, Buyu Li, Yuxin Yue, Quanquan Li, and Junjie Yan. Grid r-cnn. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 7363–7372, 2019. 6   
[32] Alec Radford, Karthik Narasimhan, Tim Salimans, and Ilya Sutskever. Improving language understanding by generative pre-training, 2018. 1, 2   
[33] Alec Radford, Jeffrey Wu, Rewon Child, David Luan, Dario Amodei, and Ilya Sutskever. Language models are unsupervised multitask learners. OpenAI Blog, 1(8):9, 2019. 1, 2   
[34] Shaoqing Ren, Kaiming He, Ross Girshick, and Jian Sun. Faster r-cnn: Towards real-time object detection with region proposal networks. In Advances in Neural Information Processing Systems, pages 91–99, 2015. 1, 2   
[35] Guanglu Song, Yu Liu, and Xiaogang Wang. Revisiting the sibling head in object detector. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 11563–11572, 2020. 2, 4   
[36] Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever, and Ruslan Salakhutdinov. Dropout: a simple way to prevent neural networks from overfitting. The journal of machine learning research, 15(1):1929–1958, 2014. 4   
[37] Russell Stewart, Mykhaylo Andriluka, and Andrew Y Ng. End-to-end people detection in crowded scenes. In Proceedings of the IEEE conference on computer vision and pattern recognition, pages 2325–2333, 2016. 2, 3   
[38] Zhi Tian, Chunhua Shen, Hao Chen, and Tong He. Fcos: Fully convolutional one-stage object detection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 9627–9636, 2019. 2, 6   
[39] Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N Gomez, Łukasz Kaiser, and Illia Polosukhin. Attention is all you need. In Advances in Neural Information Processing Systems, pages 5998–6008, 2017. 1, 2   
[40] Yue Wu, Yinpeng Chen, Lu Yuan, Zicheng Liu, Lijuan Wang, Hongzhi Li, and Yun Fu. Rethinking classification and localization for object detection. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 10186–10195, 2020. 2, 4, 6   
[41] Zhirong Wu, Yuanjun Xiong, Stella X Yu, and Dahua Lin. Unsupervised feature learning via non-parametric instance discrimination. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 3733– 3742, 2018. 2   
[42] Yuwen Xiong, Renjie Liao, Hengshuang Zhao, Rui Hu, Min Bai, Ersin Yumer, and Raquel Urtasun. Upsnet: A unified panoptic segmentation network. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition, pages 8818–8826, 2019. 7   
[43] Zhilin Yang, Zihang Dai, Yiming Yang, Jaime Carbonell, Russ R Salakhutdinov, and Quoc V Le. Xlnet: Generalized autoregressive pretraining for language understanding. In Advances in Neural Information Processing Systems, pages 5753–5763, 2019. 2   
[44] Mang Ye, Xu Zhang, Pong C Yuen, and Shih-Fu Chang. Unsupervised embedding learning via invariant and spreading instance feature. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 6210– 6219, 2019. 2   
[45] Haichao Zhang and Jianyu Wang. Towards adversarially robust object detection. In Proceedings of the IEEE International Conference on Computer Vision, pages 421–430, 2019. 2, 4   
[46] Shifeng Zhang, Cheng Chi, Yongqiang Yao, Zhen Lei, and Stan Z Li. Bridging the gap between anchor-based and anchor-free detection via adaptive training sample selection. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition, pages 9759–9768, 2020. 1, 2   
[47] Tengfei Zhang, Yue Zhang, Xian Sun, Hao Sun, Menglong Yan, Xue Yang, and Kun Fu. Comparison network for one-shot conditional object detection. arXiv e-prints, pages arXiv–1904, 2019. 7   
[48] Xingyi Zhou, Dequan Wang, and Philipp Krahenb ¨ uhl. Ob-¨ jects as points. arXiv preprint arXiv:1904.07850, 2019. 2