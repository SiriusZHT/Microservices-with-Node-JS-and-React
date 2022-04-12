# 【深入浅出 Node + React 的微服务项目】

## 微服务的基本知识

## 目录

- [**第一步: 微服务的基本知识**](#微服务的基本知识)
- [目录](#目录)
  - [什么是微服务](#什么是微服务)
  - [数据在微服务中怎样传递](#数据在微服务中怎样传递)
  - [数据传输遇到的问题](#数据传输遇到的问题)
  - [服务间的同步交流](#服务间的同步策略)
  - [异步: 各服务基于 event 交流](#异步-各服务基于-event-交流)
  - [异步: 存取数据的方式](#异步-存取数据的方式)
  - [异步交流中的优缺点](#异步交流中的优缺点)

### 什么是微服务

一个单块服务（monolith server）包含：

- Routing 路由
- Middleware 中间件
- Business Logic 业务逻辑
- Database access to implement all features of our app 服务于所有服务的数据库

##### 图 1-01.一个单块服务的架构

![请添加图片描述](https://img-blog.csdnimg.cn/0f704224178142918066b5522aedcdc0.png)

一个独立的微服务包含：

- Routing 路由
- Middleware 中间件
- Business Logic 业务逻辑
- Database access to implement one feature of our app 服务于单个服务的数据库

##### 图 1-02.一堆微服务的架构

![请添加图片描述](https://img-blog.csdnimg.cn/8dd55e8b0a484a78b84d841e1c22210b.png)

- 微服务是分解成功能组件的程序，这些组件是独立的、自治的过程并且不依赖于其他组件。
- 你不再拥有一个庞大的应用程序和一个数据库，而是拥有分散的数据管理。每个组件都应该是可更换和可升级的。
- [Microservices](https://martinfowler.com/articles/microservices.html)
- [Microservices Guide](https://martinfowler.com/microservices/)

**[⬆ back to top](#目录)**

### 数据在微服务中怎样传递

服务间的数据管理

- 数据怎样存储？每个 service 都有自己的 DB
- 怎么使用这些服务？ 当前 service 不能存在另一个 service 的 DB 中

##### 图 1-03.每个微服务都有自己的 DB

![请添加图片描述](https://img-blog.csdnimg.cn/5a12fdb961ed42c48f52d3e4eabfa1ec.png)

##### 图 1-04.当前 service 不能存在另一个 service 的 DB 中

![请添加图片描述](https://img-blog.csdnimg.cn/7c635b18f23346db976e2f5df97095b9.png)
为什么要用 Database-Per-Service 这种模式?

> 我们希望每个 service 独立于其他服务运行

- ↓↓↓ 下面是服务不独立的时候遇到的问题

##### 图 1-05.没用微服务的时候的数据库的架构，看上去挺乱的

![请添加图片描述](https://img-blog.csdnimg.cn/4aaef8bd82574905b6a63f0d8690c1cf.png)

##### 图 1-06.如果服务间有依赖，比如共享数据库，也会出问题

![请添加图片描述](https://img-blog.csdnimg.cn/a84d6b95dd4146f9be990f0a84166c8e.png)

##### 图 1-07.数据库的表和结构可能会因为另一个服务的操作而改变，这是不可预测的

![请添加图片描述](https://img-blog.csdnimg.cn/c120c60fb05d4b849b5fb494c8e9836b.png)

- 每个服务可能有不同类型的数据库 (sql vs nosql)，如果不同服务共享自己的数据库，要兼容 sql 和 nosql 就会导致代码更复杂

**[⬆ back to top](#目录)**

### 数据传输遇到的问题

##### 图 1-08.经典的电商 app

![请添加图片描述](https://img-blog.csdnimg.cn/24fc20a76706444c9ba656c82b50ff93.png)

##### 图 1-09.单块服务的架构（涵盖以下 服务 + database）

![请添加图片描述](https://img-blog.csdnimg.cn/78bc877bc4cf41c5acc9f5cdd0aa3f95.png)

##### 图 1-10.单块服务架构中，插入一个依赖前三个服务数据的服务，这个服务会直接对其他几个服务的 DB 进行操作

![请添加图片描述](https://img-blog.csdnimg.cn/521d311d112641ef8695091b21a9c984.png)

##### 图 1-11.微服务架构中，插入一个服务，再怎么也不会对其他服务的数据库进行直接影响

![请添加图片描述](https://img-blog.csdnimg.cn/dd0b27ad610b4318bc78fac0f61c8e9c.png)

**[⬆ back to top](#目录)**

### 服务间的同步策略

- 同步: 服务间的通信使用准确的 request 请求
- 异步: 服务间的通信用的 events 事件

- Request 请求 是某方直接请求信息
- Event 事件 是向注册该事件的用户通知信息

两者怎么选择？

- 如果要通知很多订阅者，就要用 Event 事件
- 有很多聚合类的服务的时候就用 Request 请求

> ↓↓↓ 下面是同步交流的优缺点
>
> | 优点                                                           | 缺点                                     |
> | -------------------------------------------------------------- | ---------------------------------------- |
> | 概念上容易理解                                                 | 会引入很多服务的依赖，拆分很折磨         |
> | 新开的服务不需要再加一个数据库，不像拆分微服务需要加一个数据库 | 如果任何服务间请求失败，则整个请求将失败 |
> |                                                                | 整个请求的速度仅与最慢的请求相同         |
> |                                                                | 会有很多次请求                           |

##### 图 1-12.同步交流中，服务时间延迟的情况（20s）

![请添加图片描述](https://img-blog.csdnimg.cn/d8604744d2cd4c3493b823df717b58b8.png)

##### 图 1-13.同步交流中，服务的请求太多了的情况，数据流呈树状一个接一个

![请添加图片描述](https://img-blog.csdnimg.cn/b9dd91669f654abca68c481cadb7748d.png)

**[⬆ back to top](#目录)**

### 异步-各服务基于 event 交流

- 这里我们多了个 service D，他的作用是展示一个用户订购的信息

##### 图 1-14.使用 event-bus 对 event 进行处理

- Step1：service D 想要 service A 的 user 信息，于是给 event-bus 发一个 UserQuery 订阅事件，event-bus 转发给 service A
- Step2：service A 发个 UserQueryResult 发布事件
- Step3：service D 接收到这个 UserQueryResult 发布事件
  ![请添加图片描述](https://img-blog.csdnimg.cn/33624146d017493fa34ab58f0b81ed7f.png)
  **[⬆ back to top](#目录)**

### 异步-存取数据的方式

##### 图 1-15.service D 的 DB 结构，直接是根据之前的功能需求划分：user 和 对应的 products

![请添加图片描述](https://img-blog.csdnimg.cn/ba04e7cd94a44bdf97147ba5fbea5c45.png)

##### 图 1-16.service D 的 DB 总体结构

![请添加图片描述](https://img-blog.csdnimg.cn/d81e25ee212d4412a2324710639d8347.png)

##### 图 1-17.创建 product 的时候，不仅 product 服务要创建自己的 DB，同时还要发一个 event，给 service D 创建 product

![请添加图片描述](https://img-blog.csdnimg.cn/5fe3e8f8e8b54d8792a122c30ef61811.png)

##### 图 1-18.创建一个用户也是一样，D 创建 user

![请添加图片描述](https://img-blog.csdnimg.cn/a4860eb6fa084668b11b6e1108cc8ba3.png)

##### 图 1-19.这个用户发生购买行为时，D 创建 user 对应的 product 约束

![请添加图片描述](https://img-blog.csdnimg.cn/97199169f6b64d1cb4e3a57b9c5ab762.png)

**[⬆ back to top](#目录)**

### 异步交流中的优缺点

| 优点                        | 缺点                                                          |
| --------------------------- | ------------------------------------------------------------- |
| Service D 和其他服务 0 依赖 | 因为要存储每次事件发生的信息，所以数据和原生的 service 有重复 |
| Service D 性能变快          | 难以理解                                                      |

**[⬆ back to top](#目录)**
