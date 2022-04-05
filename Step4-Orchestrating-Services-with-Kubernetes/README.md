# 【深入浅出 Node + React 的微服务项目】

## 使用 Kubernetes 部署服务

> 本文格式是针对 github 的 Markdown，所以目录链接 和 代码链接打不开

- 你可以点击这里查看本文的 [Github README 项目链接也是这个哦](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/tree/main/Step4-Orchestrating-Services-with-Kubernetes)

## 目录

- [**第四步: 使用 Kubernetes 部署服务**](#使用-Kubernetes-部署服务)
- [目录](#目录)
  - [安装 Kubernetes](#安装-Kubernetes)
  - [Kubernetes 总览](#Kubernetes-总览)
  - [重要的 Kubernetes 术语](#重要的-Kubernetes-术语)
  - [创建一个 Pod](#创建一个-Pod)
  - [最基础的 Pod 的 yaml 配置](#最基础的-Pod-的-yaml-配置)
  - [Kubernetes 常见命令](#Kubernetes-常见命令)
  - [Deployment 介绍](#Deployment-介绍)
  - [创建 Deployment](#创建-Deployment)
  - [Deployment 常见命令](#Deployment-常见命令)
  - [更新 Deployment](#更新-Deployment)
  - [Service 介绍](#Service-介绍)
  - [创建 NodePort](#创建-NodePort)
  - [给需要开 NodePort 的 feature 创建 Srv](#给需要开-NodePort-的-feature-创建-Srv)
  - [创建剩余项目的 Deployment 和 ClusteIPService](#创建剩余项目的-Deployment-和-ClusteIPService)
  - [修改项目服务的 URL](#修改项目服务的-URL)
  - [优化和部署项目业务代码 以便于 测试](#优化和部署项目业务代码-以便于-测试)
  - [测试 Deployment 和 Service](#测试-Deployment-和-Service)
  - [部署 React App](#部署-React-App)
  - [Load Balancer 和 Ingress Controller 介绍](#Load-Balancer-和-Ingress-Controller-介绍)
  - [使用 Load Balancer 和 Ingress Controller](#使用-Load-Balancer-和-Ingress-Controller)
  - [安装 Ingress-Nginx](#安装-Ingress-Nginx)
  - [查看 Ingress-Nginx 开启状态](#查看-Ingress-Nginx-开启状态)
  - [配置 Ingress Controller 的路由分配](#配置-Ingress-Controller-的路由分配)
  - [编写 Ingress 配置文件](#编写-Ingress-配置文件)
  - [修改 Client 的请求路由](#修改-Client-的请求路由)
  - [部署 Client 和 Ingress 版本优化](#部署-Client-和-Ingress-版本优化)
  - [修改本地 host 文件测试是否能进入 ingress](#修改本地-host-文件测试是否能进入-ingress)
  - [安装 skaffold](#安装-skaffold)
  - [配置 skaffold](#配置-skaffold)

## 安装 Kubernetes

- 在 Linux / CentOS 下，需要使用 minikube ，具体安装请见 [https://minikube.sigs.k8s.io/docs/start/](https://minikube.sigs.k8s.io/docs/start/)
- 启动 minikube - 在 root 账户下，要强制使用 vm 为 docker，因为默认不能在 root 环境下用 docker， `minikube start --force --driver=docker` - 在非 root 账户下
  创建一个普通用户 minikube: `adduser sirius` `passwd sirius`
  将此用户添加到 docke 组：`usermod -aG docker sirius`
  切换到此用户：`su - sirius` `minikube start` - pull image 卡住的解决方式 - 方式一：换成阿里版，请注意更换版本 `# curl -Lo minikube http://kubernetes.oss-cn-hangzhou.aliyuncs.com/minikube/releases/v1.4.0/minikube-linux-amd64 && chmod +x minikube && sudo mv minikube /usr/local/bin/` - 方式二：换源成阿里，❗️ 必须要先把配置文件删除了，不然还要一直卡住
  删除配置 `minikube delete` `rm -f ~/.kube/config` `rm -rf ~/.minikube`
  换源并启动 `minikube start --force --driver=docker --registry-mirror=https://21ilzrh4.mirror.aliyuncs.com`
  --registry-mirror：[阿里云镜像加速器的上给的 url ，https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors](https://cr.console.aliyun.com/cn-hangzhou/instances/mirrors)
  会很慢，☕️ 坐等即可
  另外`sudo mkdir -p /etc/docker && sudo tee /etc/docker/daemon.json <<-'EOF' { "registry-mirrors": ["https://xxxxxx.mirror.aliyuncs.com"] } EOF && sudo systemctl daemon-reload && sudo systemctl restart docker`，把 docker 的镜像也阿里云加速 - 方式三：未尝试过，[手动下镜像包](https://www.cnblogs.com/liuhqsir/p/15528507.html) - 参考文献： - 方式二：https://blog.csdn.net/haohaifeng002/article/details/102478143 - 手动离线包解压方式：https://www.cnblogs.com/liuhqsir/p/15528507.html - 阿里官方方式：https://developer.aliyun.com/article/779813?spm=a2c6h.13813017.content3.1.74a91dd5L9o588
- 配置 kubectl 的命令行快捷启动，前提是你安装了 `on my zsh ` 命令行优化插件
  - 打开 zsh 插件配置文件`vim ~/.zshrc`
  - 插入 `alias k="minikube kubectl -- "`，为什么？因为 minikube 是这样子启动的，每次输命令行很麻烦，简化一下
    - `source ~/.zshrc`
    - 试一试：命令行输入：`k version`

## Kubernetes 总览

流程如下

- 首先创建 docker image
- 然后编写 config file，表示要 run 两个 posts image，并开通服务间交流的 network，交给 kubernetes
- kubernetes 要做的事情：
  - 创建 `Cluster`，并把 config file 送进 `Master` 里解析
  - 在`VM`的`Node`（不是那个 Node...）中创建 `Pods`，包含 n 个 post image 的 container，相当于就是我们之前开的 n 个 post 服务
  - 用 `Deployment` 保证 pods 死了也能重启
  - 用 `Service` 开通通信

![在这里插入图片描述](https://img-blog.csdnimg.cn/494740b01d6644dfba6b2286a9153c9d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_30,color_FFFFFF,t_70,g_se,x_16)

## 重要的 Kubernetes 术语

![在这里插入图片描述](https://img-blog.csdnimg.cn/73a6258a57144ccabbc5c6d95fbcccb7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

> 疑问：Deployment 和 Service 是存在于 Node 中 Pod 外，还是 Node 外 Cluster 里？

## 创建一个 Pod

> 尝试创建一个 Post 服务的 Pod

- 根据前面的 [Kubernetes 总览](#Kubernetes-总览)，首先需要给 posts 的 image build 到 docker 的 images 里面

1. 进入 post 的目录，
   创建镜像`docker build -t heysirius/posts:0.0.1 ./`
   查看镜像`docker images`
   【附】删除镜像`docker rmi -f heysirius/posts:0.0.1`
2. 创建 `./infra/k8s/` 目录
3. 编写 `post.yaml`，让 Kubernetes 知道怎么配置
4. 开始让 Kubernetes 配置，`kubectl apply -f ./`
5. 查看 pod 运行情况 `kubectl get pod posts`，特别关注 STATUS
6. 查看 pod 的 command `kubectl describe pod posts`，特别关注是否有报错信息

## 最基础的 Pod 的 yaml 配置

##### [code-4-01-posts.yaml](./doc/code-4-01-posts.yaml)

```yaml
# k8s 是可扩展的，我们可以添加进自己的项目进去，通过指定是哪个对象让 k8s 看到
apiVersion: v1
# 想创建的对象的 k8s 的 type
# 在这里我们想创建一个 Pod
kind: Pod
# 将要创建的对象的一些配置
metadata:
  name: posts
# 将要创建对象的确切属性
spec:
  # 可以在一个 pod 里创建 n 个 container
  containers:
    # 创建一个名为 posts 的 container
    - name: posts
      # 这个 container 需要使用到的具体的 image
      image: sirius/posts:0.0.1
```

## Kubernetes 常见命令

![在这里插入图片描述](https://img-blog.csdnimg.cn/ae5d45d4f5f142cdace81a43c6d6aa0e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## Deployment 介绍

- 更新版本，先创建出 n 个新版本 pod，再替换
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/b15894c806c94a10bee37a74b97016e4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 创建 Deployment

##### [code-4-02-posts-depl.yaml](./doc/code-4-02-posts-depl.yaml)

路径： `./infra/k8s/code-4-02-posts-depl.yaml`

```yaml
# 将生成 deployment.apps/posts-depl 的一个 depl
apiVersion: apps/v1
kind: Deployment
metadata:
  name: posts-depl
spec:
  # 生成 pod 的数量
  replicas: 1
  # 选择器 找到 label 为 app: posts 这样键值对的
  selector:
    matchLabels:
      app: posts
  # pod 的具体配置
  template:
    metadata:
      labels:
        app: posts
    spec:
      containers:
        - name: posts
          image: heysirius/posts:0.0.1
```

## Deployment 常见命令

![在这里插入图片描述](https://img-blog.csdnimg.cn/ef211283eb044cfd94099dc1f977bf28.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 更新 Deployment

#### 方法一

1. 项目代码更改了
2. 重新构建 image 并改 版本号
3. 在 Deployment 的配置文件里面，升级 image 的版本
4. 重新 run `kubectl apply -f [depl file name]`
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/9f3058b99f824d268b5e9972c33fa4a4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

#### 方法二

> 甚至不用换目录（不用从 posts 换到 k8s）

1. 在 pod 里配置 container 的 image 的版本为 `:latest` 或者不写 默认就是 latest
2. 项目代码改一下（比如在 post 服务的开启阶段 打印一个 V20，如下图）
3. 创建一个 image
4. push 到 docker hub 里
   查看 image `docker images`
   pull 到 docker hub 里`docker pull heysirius/posts`
5. 查看 depl `kubectl get deployments`
6. 重开 depl `kubectl rollout restart deployment posts-depl`
7. 查看 depl 管理的 pod `kubectl get pods`
8. 查看该 pod 的 log 情况 `kubectl logs [pod_name]`
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/91856608f2e94e7683726edad7d5082f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/182c8cb30ac04e24bfd7e6222f0fbfe0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## Service 介绍

![在这里插入图片描述](https://img-blog.csdnimg.cn/f69d0bcba0e64747ab6f5eab3eaa1c45.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- `Cluster IP Service` 设置一个易于记忆的 URL 以便于 pod 和气气访问各个 pod，只在 cluster 中的 pod 们中暴露，cluster 外部不会知道
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/9a6c8580370e4563852f4589769a190e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- `Load Balancer Service`负载均衡器，使 pod 可以从集群外部访问， 这是将 pod 暴露给外界的正确方法
- `Node Port` 使 pod 可以从集群外部访问，通常仅用于开发

![在这里插入图片描述](https://img-blog.csdnimg.cn/12977041ea9f44dea3099e5cfe32a573.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- `External Name` 重定向

## 创建 NodePort

##### [code-4-03-posts-srv.yaml](./doc/code-4-03-posts-srv.yaml)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: posts-srv
spec:
  type: NodePort
  selector:
    app: posts
  ports:
    - name: posts
      protocol: TCP
      # 在 cluster 中的 port
      port: 4000
      # Pod 的 port
      targetPort: 4000
```

- 配置文件写法和之前的 [code-4-02-posts-depl.yaml](./doc/code-4-02-posts-depl.yaml) 类似
- 注意点：
  - kind 和 type 区别：前者是 Kubernetes 中的类型，后者是前者的 type
  - port 和 targetPort 、 NodePort 区别：如下图
    - port 是每个 Node 在 Kubernetes 的 cluster 中的 port
    - targetPort 是 Pod 的 port
    - NodePort 这里指的是对 cluster 外部的 port
- 强调一下：
  - 这里我们只是对于 `name:ports`的 Pod 进行了对 cluster 外的 port 开放，就是说一个 NodePort 管 一个 Pod 的对外接口
  - 后面我们如果要进行 comments 和 query 服务的 postman 测试的话，必须把 comments 和 query 也开个 NodePort，如果不想开的话也需要走 ingress-nginx，我们后面会讲到。

![在这里插入图片描述](https://img-blog.csdnimg.cn/c62af69ce67d4866a995926161fd9714.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 应用配置 `kubectl apply -f .`
- 查看 Service `kubectl get service` `kubectl describe service ports-srv`
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/1aeff9e8efbe4b49afc97959f5a6602b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 访问 NodePort 比如 `http://localhost:30625/posts`，会返回 posts 服务的 get 的 response

## 给需要开 NodePort 的 feature 创建 Srv

- 要注意的是，之前写的代码中开的 express 服务的 port，要跟 Pod 的 port 一样
- 原因是： Pod 其实就是一个 VM，我们 pull 了 image，然后运行的时候相当于是在当前 VM 开了个 port

[commit 链接](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/3f87cfd4382d7fb6e8b5a2087e89a09d8e3a9c88)

##### [ code-4-04-posts-srv.yaml](./doc/code-4-04-posts-srv.yaml)

##### [code-4-05-comments-srv.yaml](./doc/code-4-05-comments-srv.yaml)

##### [code-4-06-query-srv.yaml](./doc/code-4-06-query-srv.yaml)

## 创建剩余项目的 Deployment 和 ClusteIPService

- 要注意的是：
  - 我们在配置文件里面，顺便把 Service 也写进去了，我们知道 Service 和 Deployment 是独立的，但是因为都在一个 Node 里，我们配置文件的时候方便起见，也可以把两者写进一个文件里面，用`---`来划分
  - 注意 Pod 的版本号一定要改成 `:latest`

[commit 链接](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/c4b0c04a2b0a55b1b6ec3207b93836e8ea289170)

##### [code-4-07-comment-depl.yaml](./doc/code-4-07-comment-depl.yaml)

##### [code-4-08-event-bus-depl.yaml](./doc/code-4-08-event-bus-depl.yaml)

##### [code-4-09-moderation-depl.yaml](./doc/code-4-09-moderation-depl.yaml)

##### [code-4-10-query-depl.yaml](./doc/code-4-10-query-depl.yaml)

##### [code-4-11-posts-depl.yaml](./doc/code-4-11-posts-depl.yaml)

```yaml
# https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/c4b0c04a2b0a55b1b6ec3207b93836e8ea289170#diff-0fc4a8b4c4fbbcb7a76add4e004853dcf101522979e15895232886751da6c0f9
apiVersion: apps/v1
kind: Deployment
metadata:
  name: posts-depl
spec:
  # 生成 pod 的数量
  replicas: 1
  # 选择器 找到 label 为 app: posts 这样键值对的
  selector:
    matchLabels:
      app: posts
  # pod 的具体配置
  template:
    metadata:
      labels:
        app: posts
    spec:
      containers:
        - name: posts
          image: heysirius/posts:latest
---
apiVersion: v1
kind: Service
metadata:
  name: posts-clusterip-srv
spec:
  # 默认为 type: ClusterIP 所以可以不用写
  # type: ClusterIP
  selector:
    app: posts
  ports:
    - name: posts
      protocol: TCP
      # 在 cluster 中的 port
      port: 4000
      # Pod 的 port
      targetPort: 4000
```

## 修改项目服务的 URL

- `kubectl get service`可以看到我们开的所有服务
  - 比如 type 为 NodePort 的对外服务
  - 比如 type 为 ClusterIP 的 Pod 交流服务
- Pod 间的服务 除了用虚拟出来的 IP 以外，还可以直接用 Service 的 name 作为域名
  - 比如 `http://posts-clusterip-srv:4000/events`，记得一定要带端口号

![在这里插入图片描述](https://img-blog.csdnimg.cn/14c38ef2ef634f09aa5be67e06cc0308.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
[commit 链接](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856)

##### [code-4-12-event-bus.js](./doc/code-4-12-event-bus.js)

##### [code-4-13-posts.js](./doc/code-4-13-posts.js)

##### [code-4-14-query.js](./doc/code-4-14-query.js)

##### [code-4-15-comments.js](./doc/code-4-15-comments.js)

##### [code-4-16-moderation.js](./doc/code-4-16-moderation.js)

## 优化和部署项目业务代码 以便于 测试

1. 我们之前已经修改了所有服务的 URL，
   比如把：`localhost:4000/events`修改成了`posts-clusterip-srv:4000/events`

##### [code-4-17-Dockerfile](./doc/code-4-17-Dockerfile)

2. 给每个 feature 创建 docker file
3. 在每个 feature 下进行创建 image，并 push 到 docker hub 上 `docker build -t heysirius/[your feature name] . && docker push`
4. 在 k8s 目录下`kubectl rollout restart deployment`批量更新全部 Deployment 或者 `kubectl rollout restart deployment posts-depl`更新单个
5. `k get pods 查看状态` `k logs posts-[上面获取的 pod 的 sha number]`

- 值得优化和继续的地方
  - 我们每个服务中，比如 post comment query eventbus 这几个服务中，都没有初始值，就是说我们刚开启服务，并没有进行服务间数据初始化，我认为这不是很方便调试，因为我们测试的时候，是会发送一个 request 上去，然后用 `k logs xxx`进行查看，但是如果报错了，就不好定位，特别是这几个服务都有相关性，如果一个服务出错，发了个错的 request 给 eventbus，肯定会影响另一个服务，让另一个服务也报错，这个问题浪费了我一下午的时间
  - 所以我们可以在，post comment，这两个项目代码里，
    - 首先缓存中创建一个初始值
    - `app.listen(xxxx, async ()=>{})`加入把这个初始值 axios 请求发送给 event-bus 的操作，即可
    - 我们开服务的时候，就先开 moderation，再依次：event-bus posts comments query
    - 另外，comment 和 post 的 id 要对应上

## 测试 Deployment 和 Service

- 和之前 Step2 的测试方式相同
- 不同的是，NodePort 的 port 才是我们要传入的 port
- 而因为一个 NodePort 对应一个 Pod，所以我们如果要 post comment query 测试的话，这几个的 port 都是不一样的，详见我们刚才那张`kubectl get service`的图
- 最终如下
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/dc2b637e12054894a94dc87bc2cf75c5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 部署 React App

- 按照我们之前的方式
- 每个 feature 开个 NodePort
- React App 也开一个 Pod 和 NodePort
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/29623b3066ab455b83ab32f527cd9b6b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## Load Balancer 和 Ingress Controller 介绍

- Load Balance `负载均衡器` 负责接收外部的请求，保证负载均衡的情况下分配给某一个 Pod
- Ingress Controller `入口管理器` 他是一个 Pod，里面有很多 routing rules 分发请求给 rules 里的 Service
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/13d90061c53744aa8d1c71b9ef5c6854.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 使用 Load Balancer 和 Ingress Controller

- 方法二：
  - 每个 Pod 还是保持有 ClusterIPService
  - 通过 一个 Ingress Controller 控制路由的分发，而不是 n 个 NodePort

![在这里插入图片描述](https://img-blog.csdnimg.cn/87471b9a15094b0c8bfa0cace67e7094.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 安装 Ingress-Nginx

- Ingress-Nginx 给我们提供 Load Balancer 和 Ingress Controller 的集成
- CentOS Linux 下，用 `minikube addons enable ingress`
  - 但是正常情况下，因为镜像问题，pull 的时候会一直卡住
  - 解决方式：参考[https://www.jianshu.com/p/ea88a0ceac19](https://www.jianshu.com/p/ea88a0ceac19)
    因为 ingress-nginx 其实也是通过 yaml 来构造的 kubernetes 结构，所以可以通过 `kubectl apply -f ingress-nginx.yaml` 来实现手动构造，直接从 github 上的 yarm 文件里面复制粘贴到 ingress-nginx.yaml

```shell
wget https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.1.0/deploy/static/provider/baremetal/deploy.yaml
sed -i 's@k8s.gcr.io/ingress-nginx/controller:v1.1.0\(.*\)@willdockerhub/ingress-nginx-controller:v1.1.0@' deploy.yaml
sed -i 's@k8s.gcr.io/ingress-nginx/kube-webhook-certgen:v1.1\(.*\)$@hzde0128/kube-webhook-certgen:v1.1@' deploy.yaml
kubectl apply -f ingress-nginx.yaml
```

##### [code-4-18-ingress-nginx.yaml](./doc/code-4-18-ingress-nginx.yaml)

- macOS 下，可以像 centos Linux 一样的操作 - 同时还可以`helm upgrade --install ingress-nginx ingress-nginx \ --repo https://kubernetes.github.io/ingress-nginx \ --namespace ingress-nginx --create-namespac`
  前提是你已经`brew install helm`
  具体可见 kubernetes ingress-nginx 官网 [https://kubernetes.github.io/ingress-nginx/deploy/#quick-start](https://kubernetes.github.io/ingress-nginx/deploy/#quick-start)

## 查看 Ingress-Nginx 开启状态

![在这里插入图片描述](https://img-blog.csdnimg.cn/c42392535ce849a2bfe515a1825ea468.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/e67df424a62e4cbd9cec4bc8e49a958b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 配置 Ingress Controller 的路由分配

![在这里插入图片描述](https://img-blog.csdnimg.cn/a300cd946ae445d2a246aa3ee0d646b9.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

## 编写 Ingress 配置文件

- 通过编写包含 路由规则的配置文件 给 ingress controller
- ingress controller 会更改自己的路由规则

```csharp
apiVersion: networking.k8s.io/v1beta1
# yaml 类型
kind: Ingress
# 将要创建的对象的一些配置
metadata:
  name: ingress-srv
  # annotations 用来设置 ingress-nginx 实例中 nginx 虚拟主机的相关配置
  # 对应配置的是 nginx 当前虚拟主机的 server 指定域内容
  # by https://www.weixueyuan.net/a/884.html
  #  annotations:
    # nginx.ingress.kubernetes.io/ingress.class: nginx
    # # 使用HTTPS协议代理后端服务器
    # nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    # # 启用SSL透传
    # nginx.ingress.kubernetes.io/ssl-passthrough: "true"
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: "true"
# 将要创建对象的确切属性
spec:
  rules:
    - host: posts.com
      http:
        paths:
          - path: /posts/create
            backend:
              serviceName: posts-clusterip-srv
              servicePort: 4000
          - path: /posts
            backend:
              serviceName: query-srv
              servicePort: 4002
          - path: /posts/?(.*)/comments
            backend:
              serviceName: comments-srv
              servicePort: 4001
            # (.*)贪婪匹配 ?是约束
            # 不加？的话后面所有全都要匹配到
          - path: /?(.*)
            backend:
              serviceName: client-srv
              servicePort: 3000
```

- 有关 ingress-srv 的其他配置 特别是 annotation，可以参考

##### [code-4-19-ingress-https.yaml](./doc/code-4-19-ingress-https.yaml)

## 修改 Client 的请求路由

- 获取 client 页面 `http://posts.com/`
- 创建：`http://posts.com/posts/create`
- 获取：`http://posts.com/posts`
- 创建 comment `http://posts.com/posts/${postId}/comments`

##### [code-4-20-CommentCreate.js](./doc/code-4-20-CommentCreate.js)

##### [code-4-21-PostCreate.js](./doc/code-4-21-PostCreate.js)

##### [code-4-22-PostList.js](./doc/code-4-22-PostList.js)

## 部署 Client 和 Ingress 版本优化

##### [code-4-23-client-depl](./doc/code-4-23-client-depl.yaml)

- `kubectl apply -f xxx`

**另外，现在 Kubernetes 已经升级了，所以之前我们写的 ingress config file 已经不能用 `apiVersion: v1beta1`了
需要修改配置文件**

[具体问题请见这篇文章](https://blog.csdn.net/weixin_43698328/article/details/123940815)

##### [code-4-24-ingress-srv.yaml](./doc/code-4-24-ingress-srv.yaml)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-srv
  namespace: ingress-nginx
  annotations:
    # kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
    nginx.ingress.kubernetes.io/rewrite-target: /
    # service.beta.kubernetes.io/do-loadbalancer-hostname: "siriuszht.com"
spec:
  ingressClassName: nginx
  rules:
    - host: siriuszht.com
      http:
        paths:
          - pathType: Prefix
            path: /posts/create
            backend:
              service:
                name: posts-clusterip-srv
                port:
                  number: 4000
          - pathType: Prefix
            path: /posts
            backend:
              service:
                name: query-clusterip-srv
                port:
                  number: 4002
          - pathType: Prefix
            path: /posts/?(.*)/comments
            backend:
              service:
                name: comments-clusterip-srv
                port:
                  number: 4001
          - pathType: Prefix
            path: /?(.*)
            backend:
              service:
                name: client-clusterip-srv
                port:
                  number: 3000
```

## 修改本地 host 文件测试是否能进入 ingress

- 原因：我们在 Ingress-srv.yaml 里给出的所有域名`heysirius.com`，其实都是本地虚拟出来的，并不是我们直接浏览器输入 URL 后通过各种 DNS 来获取的
- 所以需要修 /etc/hosts：`127.0.0.1 heysirius.com`
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/efa47db15dc94d57ba2ef0da00bfc2d7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

> 🎉🎉🎉 此时，我们之前的项目，已经全部部署到 Kubernetes 里面，且能通过`k describe ingress -n ingress-nginx`查看 ingress 的映射状态
> ![在这里插入图片描述](https://img-blog.csdnimg.cn/c09f536aeff04bb294a36a85b1d65a96.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
> 甚至最终可以通过 `heysirius.com`获取 client 页面了

- **！！！注意**：如果 ingress 的 服务的 backends 的 name 对应的 ip 为`<error: endpoints "xxxxx" not found>`，有一种可能是我们的 namespace 没有对应到 ingress-nginx 上面
- 需要添加 Deployment 和 Service 的 metadata 的 `namespace: ingress-nginx`

## 安装 skaffold

- skaffold 是能够让我们部署的时候变得简单，比如每次更新的时候，之前我们每次都要手动 build push rollout restart
- 现在我们通过 skaffold 关联相关的 image 和 yaml 配置文件，只要修改了他就能知道并帮我们重新部署一遍，而且非常简单方便
- macOS 下 `brew install skaffold`

## 配置 skaffold

##### [code-4-25-skaffold.yaml](./doc/code-4-25-skaffold.yaml)

```yaml
apiVersion: skaffold/v2alpha3
kind: Config
deploy:
  kubectl:
    manifests:
      - ./infra/k8s/*
build:
  local:
    # push: false
  artifacts:
    - image: heysirius/client
      context: client
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "src/**/*.js"
            dest: .
    - image: heysirius/comments
      context: comments
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "*.js"
            dest: .
    - image: heysirius/event-bus
      context: event-bus
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "*.js"
            dest: .
    - image: heysirius/moderation
      context: moderation
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "*.js"
            dest: .
    - image: heysirius/posts
      context: posts
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "*.js"
            dest: .
    - image: heysirius/query
      context: query
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "*.js"
            dest: .
```

- 最后 `skaffold dev`即可完成所有相关 image 和 Kubernetes 配置文件的应用

![在这里插入图片描述](https://img-blog.csdnimg.cn/038f7abbef494df3ac511e196c559413.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
