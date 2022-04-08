# 【深入浅出 Node + React 的微服务项目】

## 多服务应用的架构设计

## 目录

- [**多服务应用的架构设计**](#多服务应用的架构设计)
- [目录](#目录)
  - [上一个项目遗留问题和解决方式](#上一个项目遗留问题和解决方式)
  - [Ticketing App Overview](#ticketing-app-overview)
  - [数据资源 变量 字段 类型 定义](#数据资源-变量-字段-类型-定义)
  - [Service 类型](#service-类型)
  - [事件和架构设计](#事件和架构设计)
  - [创建 Auth Service](#创建-Auth-Service)
  - [Auth K8s Setup](#auth-k8s-setup)
  - [添加 Skaffold 自动化](#添加-Skaffold-自动化)
  - [Ingress-Nginx Setup](#ingress-nginx-setup)
  - [Hosts File and Security Warning](#hosts-file-and-security-warning)

### 上一个项目遗留问题和解决方式

回顾 App #1

- 之前的微服务 blog 项目，最大的挑战就是 data
- 之前我们想到了使用 同步 和 异步 的方式
  - 在上层使用同步，最终逐渐会变成单体服务的样子，加了一个服务仍然会有其他服务的依赖 数据 和 延迟
    ![请添加图片描述](https://img-blog.csdnimg.cn/d8604744d2cd4c3493b823df717b58b8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 异步交流主要是通过发送事件信息给事件总线来交流
- 异步通信鼓励每个服务 100% 自给自足。相对容易处理临时停机或新服务创建
- Docker 让服务打包部署更容易
- Kubernetes 配置起来很麻烦，但它使部署和扩展服务变得非常容易

| App #1 遇到的痛苦的事情                                                        | 解决方式！                                                  |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 很多复杂冗余的代码                                                             | 构建一个中央库作为 NPM 模块，以在我们不同的项目之间共享代码 |
| 很难构思服务之间的事件流                                                       | 在这个共享库中精确定义我们所有的事件。                      |
| 很难记住一个事件应该有什么属性                                                 | 使用 Typescript 规定一切 type                               |
| 真的很难测试一些事件流                                                         | 竭尽所能的写我们的测试文件                                  |
| 本地机器在运行 kubernetes 和其他所有东西时变得越来越迟钝......                 | 转到云上                                                    |
| 如果有人在编辑 comment 后又编辑了另外 5 个 comment，要处理这些并发该怎么办.... | 引入大量代码处理并发问题                                    |

**[⬆ back to top](#目录)**

### Ticketing App Overview

- 用户可以列出要出售的活动（音乐会、体育）的门票
- 其他用户可以购买此票
- 任何用户都可以获取 出售 和 购买 的 lists
- 当用户尝试购票时，该票会被“锁定”15 分钟。用户有 15 分钟的时间输入他们的付款信息。
- 锁定时，其他用户无法购买门票。 15 分钟后，票应该“解锁”
- 如果票价未锁定，则可以编辑票价
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/04d9a176c24e4e678dc9756395ff0cfb.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/67ffaa2fa49745a78103e6a04a68f71b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 数据资源 变量 字段 类型 定义![在这里插入图片描述](https://img-blog.csdnimg.cn/9ee06a9a71904eb9a415ecb9c9c367b3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Service 类型

![在这里插入图片描述](https://img-blog.csdnimg.cn/59875296b04b407cbb3f77ce6039d321.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 使用单独的服务来管理每种类型的资源
- Q：我们应该为每个微服务应用程序都这样做吗？
- 可能不是？取决于您的用例、资源数量、与每个资源相关的业务逻辑等
- 也许 'feature-based' 的设计会更好

**[⬆ back to top](#目录)**

### 事件和架构设计

- 架构设计
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/d9d62576a5e446c2bc135597f76797dd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 事件设计
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/0afbd9b18f5b4c70817f890c9d8c2ec7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 创建 Auth Service

- 接口设计
  ![[外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-7R7ZtvkP-1649396487230)(section-05/auth.jpg)]](https://img-blog.csdnimg.cn/2eb9e62447c04d50ad7dc8a0ce968e7f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Auth K8S Setup

- 经典 docker -> k8s 命令一顿搞

```console
cd ticketing/auth/
docker build -t heysirius/auth .
docker login
docker push heysirius/auth
cd ../infra/k8s/
kubectl apply -f auth-depl.yaml
kubectl rollout restart deployment auth-depl
kubectl get deployment
kubectl get pod
kubectl logs auth-depl-7c7879db66-mwz79
kubectl describe pod auth-depl-7c7879db66-mwz79
kubectl exec -it auth-depl-7c7879db66-mwz79 -- cat index.js
kubectl get services
```

**[⬆ back to top](#目录)**

### 添加 Skaffold 自动化

See ticketing/skaffold.yaml

```console
cd ticketing/
skaffold dev
```

**[⬆ back to top](#目录)**

### Ingress-Nginx Setup

```console
kubectl get ingress
kubectl describe ingress ingress-service
```

**[⬆ back to top](#目录)**

### Hosts File and Security Warning

Hosts File

- Open hosts file

```console
code /etc/hosts
```

- Add 127.0.0.1 ticketing.dev to hosts file

Security Warning

- Goto Chrome - https://ticketing.dev/api/users/currentuser
- Unskippable HTTPS warning in Chrome?
  - 解决方式：type thisisunsafe

**[⬆ back to top](#目录)**
