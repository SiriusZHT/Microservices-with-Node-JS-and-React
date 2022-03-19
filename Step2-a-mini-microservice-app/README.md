
# 【深入浅出 Node + React 的微服务项目】
## 尝试做一个迷你微服务APP
## 目录

- [**第二步: 尝试做一个迷你微服务APP**](#微服务的基本知识)
- [目录](#目录)
  - [App 介绍](#app-介绍)
  - [搭建项目](#搭建项目)
  - [创建 Posts Service](#posts-service-creation)
  - [创建 Comments Service](#implementing-a-comments-service)
  - [创建 React Project](#react-project-setup)
  - [请求次数减小的策略](#request-minimization-strategies)
  - [异步的解决方式](#an-async-solution)
  - [异步 + Events 的一些常见疑问](#common-questions-around-async-events)
  - [Event Bus 介绍](#event-bus-overview)
  - [搭建一个最基础的 Event Bus](#a-basic-event-bus-implementation)
  - [实现发出创建 Post 的 Events](#emitting-post-creation-events)
  - [实现发出创建 Comment 的 Events](#emitting-comment-creation-events)
  - [获取 Events](#receiving-events)
  - [创建 data query 的服务](#creating-the-data-query-service)
  - [对进来的 Events 进行解析](#parsing-incoming-events)
  - [使用 data query 的服务](#using-the-query-service)
  - [再添加一个简单的服务](#adding-a-simple-feature)
  - [过滤 Comments 的一些问题](#issues-with-comment-filtering)
  - [第二种方式](#a-second-approach)
  - [怎样处理更新的事件](#how-to-handle-resource-updates)
  - [创建一个过滤 Service](#creating-the-moderation-service)
  - [Adding Comment Moderation](#adding-comment-moderation)
  - [Handling Moderation](#handling-moderation)
  - [Updating Comment Content](#updating-comment-content)
  - [Dealing with Missing Events](#dealing-with-missing-events)

## APP介绍
##### 图2-01.创建 Post 和 Comments 的业务逻辑
- 功能分别是发送 post 信息和发送 comment 信息
![在这里插入图片描述](https://img-blog.csdnimg.cn/66b75402ea6e4eb6b66c9491ab2b54ef.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-02.服务的拆分 分为 创建信息 和 展示信息
![在这里插入图片描述](https://img-blog.csdnimg.cn/24dacf27b3a14351bd5ee91bc6025b99.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-03.React Client APP 的结构拆分，要对接上述两个服务
![在这里插入图片描述](https://img-blog.csdnimg.cn/6a35a93ad8bc4066a95aead98462666b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
## 搭建项目
> 创建 react 客户端、post 服务、comments 服务
```shell
npx create-react-app client
mkdir posts && npm init -y && npm install express cors axios nodemon
mkdir comments && npm init -y && npm install express cors axios nodemon
```
## 创建 Post 服务
##### 图2-04.Posts 服务架构
![在这里插入图片描述](https://img-blog.csdnimg.cn/d6126ebd45ba40e4b4afefb009473b0a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-01.Posts 结构](./doc/code-2-01-Posts.js)
- post 提供的 get post 服务
- get 负责把 post 缓存的数据 send 出去
-  listen 监听端口
- post id 的随机生成，`const { randombytes } = require('crypto');`
- 对传来的 post 进行解析 [body-parser 源码讲解](https://zhuanlan.zhihu.com/p/78482006)
- 储存 post 的数据结构
- 设置返回状态码

最后设置 package.json

```json
"scripts": {
    "test": "nodemon index.js"
 },
```

## 测试 Posts 服务
> 这里需要用到 postman 的使用
- 新建一个 posts 的 tab
- 在 header 里 配置 Content-Type application/json
- body 中 传入参数 raw -> json 类型的参数
- `{"title": "First Post by Sirius"}`
- 返回 `{"id": "685baefe", "title": "First Post by Sirius"}`

## 创建 Comments 服务
##### 图2-05.Comments 服务架构
![在这里插入图片描述](https://img-blog.csdnimg.cn/622dbac56d024cf88bd32af3c94a1d65.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-06.每个 post 下 都会有 一个 array 类型的 comments
- 这里用 Object 存 post id 的键值对关系，值是 comments 的 array，而 comments 还是之前和 posts 类似的 Object 类型
![在这里插入图片描述](https://img-blog.csdnimg.cn/df63f1495e694ffe884fb5ce538f0cd8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-02.Commnets 结构](./doc/code-2-02-Comments.js)
- 和 post 服务不同的是 
- 因为有个 postId 的键值对关系，所以需要创建一个上述的数据结构
- 每次取出 req 的 comments 进行 push 或 create 操作，然后重新赋值给 postId 对应 id 的 comments
- 其他操作和 post 一样

## 测试 Comments 服务
> 我们在 postman 上的 url 中 要传值
- 两种方法
	-  `localhost:4001/posts/:id/comments` params 传值
	- `localhost:4001/posts/123/comments` 直接 url 上传值
- body 如下数据结构
```json
[
    {
        "id": "7532c5f3",
        "content": "I am a comments by Sirius of posts 123"
    }
]
```

## 创建 React 前端 APP
##### 图2-07.React 页面结构划分
![在这里插入图片描述](https://img-blog.csdnimg.cn/f80d4ca9455c46159aa27b509dfe8283.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 目前将会遇到的一些 bug
	- `npx create-react-app client` 我在这里遇到了很大的坑，花了6个小时+买了一个腾讯云服务器才解决
	- 你在`npm install`的时候报错，比如`Npm Error - No matching version found for`这种，只需要闭着眼睛`npm cache clean --force`再来即可
	- 另外，`yarn`之类的如果没加在全局执行，运行不动的情况下，`vim ~/.bash_profile` 在里面`export PATH=$PATH:/usr/local/bin/node16/lib/node_modules/yarn/bin`这是你yarn被下载的地方引入即可，或者`export PATH="$PATH:`yarn global bin`"
	`，并`source  ~/.bash_profile`
	- 还有问题建议`npm i n && n latest`
## 创建 React 的 Post Create 表单提交
##### [Code-2-03-ClientPostCreate](./doc/code-2-03-ClientPostCreate.js)
- PostCreate 模块主要是创建 posts 的 title
- 功能拆分如下：
	- form + label + button
	- form 的 onSubmit 要阻止提交 并 异步提交给 post 服务

## 创建 React 的 Comment Create 表单提交
> 个人开发习惯：
> 	这里我们从底层组件到外层组件开发
> 所以跳过 PostList，因为他对子组件有依赖性，子组件只有prop的依赖
> ![在这里插入图片描述](https://img-blog.csdnimg.cn/2d31ec60923c4499863d7d53bdc5fe57.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-04-ClientCommentCreate.js](./doc/code-2-04-ClientCommentCreate.js)