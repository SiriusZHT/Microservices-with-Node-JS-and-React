

# 【深入浅出 Node + React 的微服务项目】
## 尝试做一个迷你微服务APP
## 目录

- [**第二步: 尝试做一个迷你微服务APP**](#微服务的基本知识)
- [目录](#目录)
  - [App 介绍](#APP-Preview)
  - [搭建项目](#搭建项目)
  - [创建 Posts Service](#创建-Post-服务)
  - [测试 Posts Service](#测试-Posts-服务)
  - [创建 Comments Service](#创建-Comments-服务)
  - [测试 Comments Service](#测试-Comments-服务)
  - [创建 React 前端APP](#创建-React-前端-APP)
  - [创建 React 的 Post Create 表单提交](#创建-React-的-Post-Create-表单提交)
  - [创建 React 的 Comment Create 表单提交](#创建-React-的-Comment-Create-表单提交)
  - [创建 React 的 Comment List 表单展示](#创建-React-的-Comment-List-表单展示)
  - [创建 React 的 Post List 表单展示](#创建-React-的-Post-List-表单展示)
  - [请求次数减小的策略](#请求次数减少的策略)
  - [异步的解决方式](#异步的解决方式)
  - [Event Bus 介绍](#Event-Bus-介绍)
  - [搭建一个最基础的 Event Bus](#搭建一个最基础的-Event-Bus)
  - [实现发出创建 Post 的 Events](#实现发出创建-Post-的-Events)
  - [实现发出创建 Comment 的 Events](#实现发出创建-Comment-的-Events)
  - [获取 Events](#获取-Events)
  - [创建 data query 的服务](#创建-data-query-的服务)
  - [对进来的 Events 进行解析](#对进来的-Events-进行解析)
  - [使用 data query 的服务](#使用-data-query-的服务)
  - [使用之前 query 服务的方式](#使用之前-query-服务的方式)
  - [优化不同类型事件的传递](#优化不同类型事件的传递)
  - [怎样处理更新的事件](#怎样处理更新的事件)
  - [创建一个审核服务](#创建一个审核服务)
  - [增加评论审核的状态](#增加评论审核的状态)
  - [处理审核](#处理审核)
  - [更新评论内容](更新评论内容)
  - [通过status渲染评论](#通过status渲染评论)
  - [处理错过了的事件](#处理错过了的事件)
  - [实现事件存储修复query服务启动问题](#实现事件存储修复query服务启动问题)

## APP-Preview
##### 图2-01-创建 Post 和 Comments 的业务逻辑
- 功能分别是发送 post 信息和发送 comment 信息
![在这里插入图片描述](https://img-blog.csdnimg.cn/66b75402ea6e4eb6b66c9491ab2b54ef.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-02-服务的拆分 分为 创建信息 和 展示信息
![在这里插入图片描述](https://img-blog.csdnimg.cn/24dacf27b3a14351bd5ee91bc6025b99.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-03-React Client APP 的结构拆分，要对接上述两个服务
![在这里插入图片描述](https://img-blog.csdnimg.cn/6a35a93ad8bc4066a95aead98462666b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 搭建项目
> 创建 react 客户端、post 服务、comments 服务
```shell
npx create-react-app client
mkdir posts && npm init -y && npm install express cors axios nodemon
mkdir comments && npm init -y && npm install express cors axios nodemon
```
## 创建 Post 服务
##### 图2-04-Posts 服务架构
![在这里插入图片描述](https://img-blog.csdnimg.cn/d6126ebd45ba40e4b4afefb009473b0a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-01-Posts 结构](./doc/code-2-01-Posts.js)
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

**[⬆ back to top](#目录)**

## 创建 Comments 服务
##### 图2-05-Comments 服务架构
![在这里插入图片描述](https://img-blog.csdnimg.cn/622dbac56d024cf88bd32af3c94a1d65.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-06-每个 post 下 都会有 一个 array 类型的 comments
- 这里用 Object 存 post id 的键值对关系，值是 comments 的 array，而 comments 还是之前和 posts 类似的 Object 类型
![在这里插入图片描述](https://img-blog.csdnimg.cn/df63f1495e694ffe884fb5ce538f0cd8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-02-Commnets 结构](./doc/code-2-02-Comments.js)
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

**[⬆ back to top](#目录)**


## 创建 React 前端 APP
##### 图2-07-React 页面结构划分
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

**[⬆ back to top](#目录)**

## 创建 React 的 Comment Create 表单提交
> 个人开发习惯：
> 	这里我们从底层组件到外层组件开发
> 所以跳过 PostList，因为他对子组件有依赖性，子组件只有prop的依赖
> ![在这里插入图片描述](https://img-blog.csdnimg.cn/2d31ec60923c4499863d7d53bdc5fe57.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### [Code-2-04-ClientCommentCreate.js](./doc/code-2-04-ClientCommentCreate.js)
- 和 Post create 几乎一样

**[⬆ back to top](#目录)**

## 创建 React 的 Comment List 表单展示
##### [Code-2-05-ClientCommentList.js](./doc/code-2-05-ClientCommentList.js)
- useEffect，第二个参数为空数组，第一个函数里表示需要在 componentDidMount 执行的内容
- 这里在组件挂载完执行 fetch 网络请求
- 获取父组件 post 传进的 postId
- 模板字符串拼接成参数传进 get 请求的 url 里

**[⬆ back to top](#目录)**

## 创建 React 的 Post List 表单展示
##### [Code-2-06-ClientPostList](code-2-06-ClientPostList.js)
- 这里用 Object.values(posts).map 返回渲染后的 posts 列表
- 包含 Comment create 和 Comment list 组件 并 传 postId
- flex 布局，让超出视口的每个 Post card 换行：`display: 'flex', flexWrap: 'wrap'`

**[⬆ back to top](#目录)**

##### 图2-08-四个服务的最终交互效果
![在这里插入图片描述](https://img-blog.csdnimg.cn/a069aaed628a475d9f9a0b9e8e04fcee.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 请求次数减少的策略
##### 图2-09-最终实现的请求集合
- 可以看出每一个 post 我们都需要请求一次他们对应的 comments
- post 如果无限 请求次数就会无限

![在这里插入图片描述](https://img-blog.csdnimg.cn/103c39bd6b4d4246af97b83e43035549.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-10-方法一
>对于单体同步服务的优化：一次请求，获得所有 postId 下的 comments 集合
![在这里插入图片描述](https://img-blog.csdnimg.cn/d6af58696b2b45f889b72f5ed223aef1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-11-单体同步服务的弊端
![在这里插入图片描述](https://img-blog.csdnimg.cn/88bd50b681b7453ca61181bc6b1efc8f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 异步的解决方式
##### 图2-12-事件代理的原理
- 比如我们的 Post 和 Comment 服务，每次创建都 emit 一个事件，事件代理负责接收事件并发送给对这个事件感兴趣（或者之前订阅过的）服务
- 如果要想获取 Post 或 Comment 服务，就比如用 Query 服务进行获取，Query 负责收集每次服务的数据
![在这里插入图片描述](https://img-blog.csdnimg.cn/5f0aa58637aa4948a16bfb03e5cee268.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## Event bus 介绍
##### 图2-13-异步事件总线的步骤
- Step1：Post 发起创建的事件的操作，负责 Query 的服务负责处理存储事件的操作
- 这里并没有存 Comment
- Step2：Comment 发起创建的事件的操作，负责 Query 的服务也负责处理
- 这里根据之前的 Post 进行对应的 Comment 存储
- Step3：用户想获取就从 Query 服务进行
![在这里插入图片描述](https://img-blog.csdnimg.cn/aa03489c3bf94bb686b862ca928140be.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-14-异步事件代理、事件总线 的优点
![在这里插入图片描述](https://img-blog.csdnimg.cn/7694af01dbf0407da4d42626bdb5d0a8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 搭建一个最基础的 Event bus
##### [Code-2-07-EventBus 结构](./doc/code-2-07-EventBus.js)
> 最基础的 event-bus 只需要提供 post 服务将 event 转发给 其他 service
> 所以，需要接收（express） 和 发送（axios），发送给每一个订阅 events 的服务

**[⬆ back to top](#目录)**

## 实现发出创建 Post 的 Events
##### [Code-2-08-Posts 结构](./doc/code-2-08-Posts.js)
> 根据[图2-13-异步事件总线的步骤](#图2-13-异步事件总线的步骤)
> 创建后，只需要再发给 EventBus 一份即可

**[⬆ back to top](#目录)**

##  实现发出创建 Comment 的 Events
##### [Code-2-09-Comments 结构](./doc/code-2-09-Comments.js)
> 根据[图2-13-异步事件总线的步骤](#图2-13-异步事件总线的步骤)
> 创建后，只需要再发给 EventBus 一份即可

## 获取 Events
##### [Code-2-10-Event-bus 结构](./doc/code-2-10-EventBus.js)
## 创建 data query 的服务
##### [Code-2-11-Query 结构](./doc/code-2-11-Query.js)
- 只需要提供 post 服务，把 Query 里的 post 送出去

**[⬆ back to top](#目录)**

## 对进来的 Events 进行解析
##### [Code-2-12-Query 结构](./doc/code-2-12-Query.js)
> 根据[图2-13-异步事件总线的步骤](#图2-13-异步事件总线的步骤)
> - event 的数据结构中，包含 type 和 data
> - 根据 type 就能进行解析
> - type 不同，处理方式不同

**[⬆ back to top](#目录)**

##  使用 data query 的服务
1.  [🚩【git commit】移除 CommentList 中 Comment 请求操作，转而接收 post.comment 的 props（之前是 postId）](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/027d191f3c24a7832af1ce129f5d8d5bdd6d5795#diff-ccad984695276f7ffc89853cdcad24c01d60d92f4324cb2c7e4508fa79ab0c01)
2. [🚩【git commit】PostList 换成 Query 接口，传递 post.comment 到 CommentList 里](https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/027d191f3c24a7832af1ce129f5d8d5bdd6d5795#diff-c2098ba8863e77270ca13041efa796220749bc94ef7a6727e90bee79278d3159)

**[⬆ back to top](#目录)**

 ## 再添加一个简单的服务
 ##### 图2-15-评论审核服务的介绍 
![在这里插入图片描述](https://img-blog.csdnimg.cn/2bf677d2f01c4fa7b8a131acc73e1803.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
 ##### 图2-16-加上评论审核服务的ReactAPP效果图
 - 发出去的 comment 有三个状态：等待、展示、拒绝。
![在这里插入图片描述](https://img-blog.csdnimg.cn/91359d3adfc549b1b7ef66c58d5c81e2.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 使用之前 query 服务的方式
#### 方法一
##### 图2-17-创建审核更新到查询一条龙
  - 每当 comment 服务发送 CommentCreated 类型的 events 的时候
  - 先送给负责审核的 moderation service
  - 审核（不确定的时间）过后，再添加 status 通过 event-bus返回给 query 和 comment service
![在这里插入图片描述](https://img-blog.csdnimg.cn/ffda2d2df4af4a28ab463e7099e607b0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_40,color_FFFFFF,t_70,g_se,x_16)
> **存在的问题：**
> 在审核的过程中，用户并不知道发的 comment 的状态
> 因为必须审核好了过后才能知道

#### 方法二

##### 图2-18-创建时通知查询服务更新状态为pending
![在这里插入图片描述](https://img-blog.csdnimg.cn/a2f25a1c8d804edda26f92dc561038d8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_40,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 优化不同类型事件的传递
##### 图2-19-修改的事件类型复杂
- 会让 query service 的代码变得复杂
![在这里插入图片描述](https://img-blog.csdnimg.cn/4ce1e7eb829d4373aade189c08d85153.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_40,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 怎样处理更新的事件
##### 图2-20-复杂业务逻辑抽象成简单逻辑
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/646e23b8a9e04aa9af829b0c3cdbadae.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-21-对于query服务只需监听更新事件
- 审核服务还是保持原有的事件类型，因为如果同样抽象事件类型的话，会对审核服务的具体模块受到影响
- 对于审核功能：query 服务只需监听 `comment 服务`那边的更新事件，做到跟`审核服务`无直接交互
- 同时 query 还要监听创建事件，如果有更新，就从之前创建的来更新
![在这里插入图片描述](https://img-blog.csdnimg.cn/b43963744d4b4d0eb85001c2418896bd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-22-有关comment的三种事件类型
1. CommentCreated：创建 comment 的时候，给`审核服务`和`query 服务`发
2. CommentModerated：审核过后，给`comment 服务`发
3. CommentUpdated：`comment`更新后，给` query 服务`发
![在这里插入图片描述](https://img-blog.csdnimg.cn/8c33a1f296fd4b609bf716c918465925.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 创建一个审核服务
##### [Code-2-13-Moderation 结构](./doc/code-2-13-Moderation.js)
- 接收 type 为 `CommentCreated` 的事件
- 进行 judge 审核
- 审核好过后返回 type 为 `CommentModerated` 的事件
## 增加评论审核的状态
##### [Code-2-14-Comments 结构](./doc/code-2-14-Comments.js)
- comment 服务在创建的时候 就设置 status 为 `pending`

##### [Code-2-15-Query 结构](./doc/code-2-15-Query.js)
- 同时 query 服务在 comment 创建过后，也同步 comment 的 status

**[⬆ back to top](#目录)**

## 处理审核
##### [Code-2-16-Comments 结构](./doc/code-2-16-Comments.js)
- 给 comment 服务增加一个监听 event 的接口
- 一旦 event-bus 有 event 是 `CommentModerated`，就更新自己的 comment，并发出 `CommentUpdated`事件

**[⬆ back to top](#目录)**

## 更新评论内容
##### [Code-2-17-Query.js](./doc/code-2-17-Query.js)
- query 服务收到 comment 发的 `CommentModerated`事件，取出对应的 comment，并替换内容`直接替换 无需修改`，[原因之前讲过](#优化不同类型事件的传递)

**[⬆ back to top](#目录)**

## 通过status渲染评论
##### [Code-2-18-CommentList](./doc/code-2-18-CommentList.js)
- 在 CommentList 每次渲染 comment 的时候加一个 status 判断即可
## 处理错过了的事件
##### 图2-23-moderation服务某一段时间挂了
- moderation服务某一段时间挂了
- moderation 服务会错过 Event 2 3 
- 此时 2 和 3 会一直阻塞住，处于 pending 的状态
![在这里插入图片描述](https://img-blog.csdnimg.cn/e64070e0f3ae41089f06a2dae658709b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

##### 图2-24-query服务某一段时间挂了或者还没开放
- query 服务将不知道前几个服务发生了什么事件
- query 服务将会错过之前的 `PostCreated` `CommentCreated` `CommentUpdated`
![在这里插入图片描述](https://img-blog.csdnimg.cn/1cf4c451ca2e431d81b5c42995e19549.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-25-通过请求相关服务进行同步
- 这样做等于还是进行了几个服务间的依赖关系
- 且要在每个服务中开相关接口，很烦

![](https://img-blog.csdnimg.cn/90cb8b9fd9eb4f92981a13b1f4f2d2fb.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

##### 图2-26-直接定位到相关数据库取数据
- 但如果数据库格式（sql，nosql）不一样，同样就很复杂
![在这里插入图片描述](https://img-blog.csdnimg.cn/73cd10db03304a60b5220c33f584afa4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

##### 图2-27-用event-bus存储事件
- 存储每一次的事件
1. query 服务开放过后，直接获取全部事件，复原即可
2. moderation 服务挂了又修复了之后，拉取挂之后的事件，复原即可
- 虽然会占空间，但花费不了多少
![在这里插入图片描述](https://img-blog.csdnimg.cn/e2e6cbb7cd304b0b95f66bebd3820f79.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/6bdf383e84c64235b717f6683e1c25f1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_30,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

## 实现事件存储修复query服务启动问题
##### [Code-2-19-EventBus](./doc/code-2-19-EventBus.js)
- 存储每一个 event，并开个 get 接口返回所有 event

##### [Code-2-20-Query](./doc/code-2-20-Query.js)
- 整合对 n 个 type 的反应成 `handleEvent`方法
- 在自身接收 event 的服务中，每次调用该方法即可
- 在开始服务的时候，同步所有 event，并同样调用该方法
##### 图2-28-最终实现的效果图
![在这里插入图片描述](https://img-blog.csdnimg.cn/fb69a7bb044745ac8303b01e04b6178a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
##### 图2-29-最终的Query服务发生了什么
- 如果重启Query服务，将会把这张图下的所有 event `handle`了
- 再打印 `Sync Event Finished!`
![在这里插入图片描述](https://img-blog.csdnimg.cn/322df878dd80475284969e7eb16078b4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**
