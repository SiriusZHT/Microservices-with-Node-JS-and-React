## 目录
- [**CRUD & Test server**](#CRUD-&-Test-server)
- [目录](#目录)
  - [现在该做什么](#现在该做什么)
  - [NATS Streaming Server 介绍](#NATS-Streaming-Server-介绍)
  - [创建 NATS Streaming 的 Deployment](#创建-NATS-Streaming-的-Deployment)
  - [NATS Streaming 的工作流程](#NATS-Streaming-的工作流程)
  - [创建一个 NATS 测试项目](#创建一个-NATS-测试项目)
  - [连接到 NATS Pod 的几种方式](#连接到-NATS-Pod-的几种方式)
  - [Publishing Events](#Publishing-Events)
  - [Listening For Data](#Listening-For-Data)
  - [访问 Events 的 Data](#访问-Events-的-Data)
  - [生成 Client ID](#生成-Client-ID)
  - [Queue Groups](#Queue-Groups)
  - [手动开启 Ack Mode](#手动开启-Ack-Mode)
  - [查看 Client 的健康状态](#查看-Client-的健康状态)
  - [优雅的关闭 Client](#优雅的关闭-Client)
  - [很重要-并发遇到的问题](#很重要-并发遇到的问题)
  - [很重要-常见问题](#很重要-常见问题)
  - [很重要-更多可能的并发解决方案](#很重要-更多可能的并发解决方案)
  - [很重要-解决并发问题](#很重要-解决并发问题)
  - [在 Tickets App 中进行并发控制](#在-Tickets-App-中进行并发控制)
  - [Event Redelivery](#Event-Redelivery)
  - [持久 Subscription 订阅](#持久-Subscription-订阅)

### 现在该做什么
![在这里插入图片描述](https://img-blog.csdnimg.cn/4bbda45569ac4457b8270a8f0a520579.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



**[⬆ back to top](#目录)**

### NATS Streaming Server 介绍

NATS Streaming Server
![在这里插入图片描述](https://img-blog.csdnimg.cn/66ea7b283a414eb0b6e5a6612c66722a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- nats 的  w: docs.nats.io
- NATS 和 NATS Streaming Server 是两个东西
  - [NATS Streaming Concepts](https://docs.nats.io/nats-streaming-concepts/intro)
- 在 docker 中使用 '[nats-streaming](https://hub.docker.com/_/nats-streaming)' 的镜像
- [Event-Driven Microservices With NATS Streaming](https://www.slideshare.net/shijucv/eventdriven-microservices-with-nats-streaming-95207688)

**[⬆ back to top](#目录)**

### 创建 NATS Streaming 的 Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats-streaming:latest
          args:
            [
              '-p',
              '4222',
              '-m',
              '8222',
              '-hbi',
              '5s',
              '-hbt',
              '5s',
              '-hbf',
              '2',
              '-SD',
              '-cid',
              'ticketing',
            ]
---
apiVersion: v1
kind: Service
metadata:
  name: nats-srv
spec:
  selector:
    app: nats
  ports:
    - name: client
      protocol: TCP
      port: 4222
      targetPort: 4222
    - name: monitoring
      protocol: TCP
      port: 8222
      targetPort: 8222
```

```console
cd ticketing
skaffold dev
kubectl get pods
```

**[⬆ back to top](#目录)**

### NATS Streaming 的工作流程

[Stan.js - Node.js client for NATS Streaming](https://github.com/nats-io/stan.js)

![在这里插入图片描述](https://img-blog.csdnimg.cn/f24860f9bb4640e594bd413be233592b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 之前的 Blog 项目中，使用的 memory 存储events
- 而 NATS Streaming 也是 default 存在 memory 中的
- 我们要把 event 存到 DB 上
![在这里插入图片描述](https://img-blog.csdnimg.cn/c9d86a68ac9c4c759d67f3f871cc487e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


**[⬆ back to top](#目录)**

### 创建一个 NATS 测试项目
该项目的目的
- 用 ts 创建一个小项目作为 NATS 的测试
- Install node-nats-streaming 然后 connect nats streaming server
- 需要些两个 npm scripts，一个 emit 一个 listen
- This program will be ran outside of kubernetes!

```typescript
// publisher.ts
import nats from 'node-nats-streaming';

const stan = nats.connect('ticketing', 'abc', {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Publisher connected to NATS');
});
```

**[⬆ back to top](#目录)**

### 连接到 NATS Pod 的几种方式
Option #1
用 ingress-nginx 连接 NATS Pod 的 Service 的 ClusterIP
就像之前我们写的 其他服务 Auth Client 服务等
![在这里插入图片描述](https://img-blog.csdnimg.cn/dc6782ec219747d7bdb14b07a947bdb6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
Option #2
通过 NodePort 把 Pod 暴露出来
我们之前调试 Blog App 的时候也写过
![在这里插入图片描述](https://img-blog.csdnimg.cn/e3f53715032e45aeb5fc49e07dcca47c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
Option #3
也可以通过 kubectl 来创建 Port-Forward
![在这里插入图片描述](https://img-blog.csdnimg.cn/f6ec05ce9f664018aa8c1afc2964e017.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



- 我们选择 Option #3 
- 因为很简便，只用一句命令行完事，而不是要创建 yaml 文件 写配置

```console
kubectl get pods
kubectl port-forward nats-depl-7cf98f65b8-p8nk6 4222:4222
cd ticketing/nats-test
npm run publish
```

**[⬆ back to top](#目录)**

### Publishing Events



```typescript
// publisher.ts
import nats from 'node-nats-streaming';
// name id url
const stan = nats.connect('ticketing', 'abc', {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Publisher connected to NATS');

  const data = JSON.stringify({
    id: '123',
    title: 'concert',
    price: 20
  });

  stan.publish('ticket:created', data, () => {
    console.log('Event published');
  })
});
```

**[⬆ back to top](#目录)**

### Listening For Data

```typescript
// listener.ts
import nats from 'node-nats-streaming';

console.clear();

const stan = nats.connect('ticketing', '123', {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Listener connected to NATS');

  const subscription = stan.subscribe('ticket:created');

  subscription.on('message', (msg) => {
    console.log('Message recieved');
  });
});
```


[ts-node-dev](https://www.npmjs.com/package/ts-node-dev)
- type rs and enter to re-start publisher
![在这里插入图片描述](https://img-blog.csdnimg.cn/cb23ce6dd55448c384f584f5f2d65bf3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



**[⬆ back to top](#目录)**

### 访问 Events 的 Data

```typescript
// listener.ts
import nats, { Message } from 'node-nats-streaming';

console.clear();

const stan = nats.connect('ticketing', '123', {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Listener connected to NATS');

  const subscription = stan.subscribe('ticket:created');

  subscription.on('message', (msg: Message) => {
    const data = msg.getData();

    if (typeof data === 'string') {
      console.log(`Received event #${msg.getSequence()}, with data: ${data}`);
    }
  });
});
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/149c8bca817a4119ae05fd90f9092d53.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 生成 Client ID
![在这里插入图片描述](https://img-blog.csdnimg.cn/3407d0965b0e4cacba70b593b9c86cd9.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/4ad120c49cff4c49a3259aabf73021ef.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



```typescript
// listener.ts
import { randomBytes } from 'crypto';

const stan = nats.connect('ticketing', randomBytes(4).toString('hex'), {
  url: 'http://localhost:4222',
});
```
现在就不会报错啦！
![在这里插入图片描述](https://img-blog.csdnimg.cn/6af06e3507df4329ac42ad4611094a17.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
**[⬆ back to top](#目录)**

### Queue Groups
由于后期 Listener 的种类太多，所以不得不进行 Listener 的分组
![在这里插入图片描述](https://img-blog.csdnimg.cn/ed094bdae4d94fcd91962eec45ea8012.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


```typescript
  const subscription = stan.subscribe(
    'ticket:created', 
    'orders-service-queue-group'
  );
```
1. listener 加入 'orders-service-queue-group'
2. publisher 发送一个 event
3. 只有一个 listener 在 'orders-service-queue-group' 里 能 receive 到 event `1次`

![在这里插入图片描述](https://img-blog.csdnimg.cn/bf50cf4c55924e9b8af75ec87fe41d78.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


**[⬆ back to top](#目录)**

### 手动开启 Ack Mode
- 有一种可能，event 到达的服务突然挂了，没接收到 event 或者 event 处理的时候出现问题
- 那么就需要一个 Ack 确认操作
![在这里插入图片描述](https://img-blog.csdnimg.cn/da1d63a8d6b447f5aa61bed971d6114a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
通过设置 nats 的 options，开启一些 mode
可以单独抽出 options 
然后传给 subscribe 的 第三个参数 options 里
```js
  const options = stan
    .subscriptionOptions()
    .setManualAckMode(true);
  const subscription = stan.subscribe(
    'ticket:created', 
    'orders-service-queue-group',
    options
  );
```
- 尽管我们开启了 Ack 确认 mode
- 但是如果我们 的 Listener 没有 Ack 确认 response
- nats 自动就会`超时重传`相同的 event

这里我们两个 Listener 都没有设置对 Ack 的响应，所以轮回收到了 未应答的 event
![在这里插入图片描述](https://img-blog.csdnimg.cn/8e1b33a9123048f2ad74db8b483b9800.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 通过设置`msg.ack();`来设置应答
```typescript
stan.on('connect', () => {
  console.log('Listener connected to NATS');

  const options = stan
    .subscriptionOptions()
    .setManualAckMode(true);
  const subscription = stan.subscribe(
    'ticket:created', 
    'orders-service-queue-group',
    options
  );

  subscription.on('message', (msg: Message) => {
    const data = msg.getData();

    if (typeof data === 'string') {
      console.log(`Received event #${msg.getSequence()}, with data: ${data}`);
    }

    msg.ack();
  });
});
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/7cae4ced038f496883310dcf7f989142.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
这个时候没有得到 Ack 的 event #22 也在 #23 Ack 过后收到并 Ack 了

**[⬆ back to top](#目录)**

### 查看 Client 的健康状态

- 可以通过 查看 monitoring 监控 port 8222 来进行调试和查看健康状态
```console
kubectl get pods -n ingress-nginx
kubectl port-forward -n ingress-nginx nats-depl-679b97d7b-l8l9h 8222:8222
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/a7734b9108e94966abb7592c59e50705.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- open chrome
- goto localhost:8222/streaming

goto http://localhost:8222/streaming/channelsz?subs=1
![在这里插入图片描述](https://img-blog.csdnimg.cn/d4cdef2aecb64e1a9f0e22891676480c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 2 listeners are available
- if re-start one listener, within 30s there are 3 listeners
![在这里插入图片描述](https://img-blog.csdnimg.cn/d9f3e171fb5744e3a84e5988644b7333.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- after 30s, drops back to 2 listeners
![在这里插入图片描述](https://img-blog.csdnimg.cn/cd8fee51a0a446879746539f205ec2b0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
> 为什么会出现这种，某个 subscriptions 重启之后会出现两个 然后过一段时间又变成一个呢？
> - 因为 nats 认为可能只是暂时断开了，所以给了个暂时存活时间

**[⬆ back to top](#目录)**

### 优雅的关闭 Client 

```typescript
const stan = nats.connect('ticketing', randomBytes(4).toString('hex'), {
  url: 'http://localhost:4222',
});

stan.on('connect', () => {
  console.log('Listener connected to NATS');

  stan.on('close', () => {
    console.log('NATS connection closed!');
    process.exit();
  });
  
  const options = stan
    .subscriptionOptions()
    .setManualAckMode(true);
  const subscription = stan.subscribe(
    'ticket:created', 
    'orders-service-queue-group',
    options
  );

  subscription.on('message', (msg: Message) => {
    const data = msg.getData();

    if (typeof data === 'string') {
      console.log(`Received event #${msg.getSequence()}, with data: ${data}`);
    }

    msg.ack();
  });
});

process.on('SIGINT', () => stan.close());
process.on('SIGTERM', () => stan.close());
```

**[⬆ back to top](#目录)**

### 很重要-并发遇到的问题
举一个 银行 存钱 deposit 取钱 withdraw 的例子
- 下面是 Success 的情况

![请添加图片描述](https://img-blog.csdnimg.cn/87c98d6368d84ccfadcd63533431a379.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/9aec8f2b309345e2aa2a33974b1dd8bb.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/9e4289cf87b54ddba0bdfa44d09a829b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)![请添加图片描述](https://img-blog.csdnimg.cn/6c55533d19354312b54d0490aae8df90.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


- Fail to update +$70 at file storage
![请添加图片描述](https://img-blog.csdnimg.cn/a40e77ae932f4407935578230b621572.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/df84406b206444d5bc5947cb77b2dfa3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/3bc32e6cc3354a3c97d2bc9b9fc3130b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



- One listener might run more quicker than another
- -$100 is done faster than +$70 and +$40

![请添加图片描述](https://img-blog.csdnimg.cn/5d8fb06608664829941a72d3a3cf12c1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


- NATS might think a client is still alive when it is dead

![请添加图片描述](https://img-blog.csdnimg.cn/5229ace07a9143b1b6e4293441a5d860.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- We might receive the same event twice

![请添加图片描述](https://img-blog.csdnimg.cn/18047789831b407082aa053ba0f2a71d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


**[⬆ back to top](#目录)**

### 很重要-常见问题
这种并发问题
不仅会在 异步通信（基于 Events）发生
还会在单体服务中发生![请添加图片描述](https://img-blog.csdnimg.cn/99e47c96c69f4d73b1ba406e9b444ab4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)



- Instance A and B are busy
- Instance C do -$100 before +$70 and +$40 complete

![请添加图片描述](https://img-blog.csdnimg.cn/d2bcab21e5264b58abba95b5a1374217.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- receive +$70, +$40 and -$100 events, any event can fail too
- bottleneck for listener
- hard to scale
  - vertically: increase specification per service
  - horizontally: add more instance of the service

Solution that won't work #2 - Figure out every possible error case and write code to handle it

- An infinite number of things can fail
- Engineering time = $$$$$
- Does it matter if two tweets are out of order?

**[⬆ back to top](#目录)**

### 很重要-更多可能的并发解决方案

- Share state between services of last event processed

![请添加图片描述](https://img-blog.csdnimg.cn/28d7d2326ce84685a25d0baaf3321473.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/70802ae75d454a1f972e0447ce09a4cd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/b498b6f707674e718a09a7d9b890bbc3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/8168a7f01a394516b3fa4c10b8cfff2d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


- Event #1 fail. Cannot +$70 to User A account
- Event #2: +$40 to User B account will be delay

![请添加图片描述](https://img-blog.csdnimg.cn/299801c045eb409988c6a142892632c2.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)


- Last event processed tracked by resource ID

![请添加图片描述](https://img-blog.csdnimg.cn/39f4e1b8e721413d9d6512ba8316808f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![请添加图片描述](https://img-blog.csdnimg.cn/f20456ab93d94c7b934ea4aa77c3e7b5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- Last Sequence ID







![在这里插入图片描述](https://img-blog.csdnimg.cn/6127ebe9ea2f4f499dc703c7eb257210.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/046d6427787d4a31b4badf8cb8dfe43a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/19eff309c07045e0a7d93672c14c562e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/8a2a0d7ca74242789f83fa0c506aeb8d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/bab371858e184632b8dd15a89beee306.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/efd4f6d67ae44ea4b6932038cfd160d6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/200a6b58ec5b4adaa6c7429537af4fae.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)

**[⬆ back to top](#目录)**

### 很重要-解决并发问题

- We are working with a poorly designed system and relying on NATS to somehow save us
- We should revisit the service design.
- If we redesign the system, a better solution to this concurrency stuff will present itself









![在这里插入图片描述](https://img-blog.csdnimg.cn/694a429c06bb45b997435c778e6f55e0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/23ae835b075a4d1abc4e2e96331feb9c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/e9e06ce175054d09a92000066378882a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)

![在这里插入图片描述](https://img-blog.csdnimg.cn/45c1cb30bc8b4d36a50e63f60068fb9c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/0fe25d5f312e4a8a894385ee9ded73a0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/4b17ebc9c0854df2a0a20a0b89e1c4c9.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)
![在这里插入图片描述](https://img-blog.csdnimg.cn/7dd7417df83a48829a3524739fb7fe80.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)

![在这里插入图片描述](https://img-blog.csdnimg.cn/5de8b9bbacf346c596b61aa8ea17cef3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)


**[⬆ back to top](#目录)**

### 在 Tickets App 中进行并发控制

![在这里插入图片描述](https://img-blog.csdnimg.cn/49b80efae344458199aa76ab99fe3965.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)

**[⬆ back to top](#目录)**

### Event Redelivery
![在这里插入图片描述](https://img-blog.csdnimg.cn/52221a74d7a14df4b07fbd9076bf0936.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_19,color_FFFFFF,t_70,g_se,x_16#pic_center)


```typescript
const options = stan
  .subscriptionOptions()
  .setManualAckMode(true)
  .setDeliverAllAvailable();
```

**[⬆ back to top](#目录)**

### 持久 Subscription 订阅
![在这里插入图片描述](https://img-blog.csdnimg.cn/239b8b5a380a4f61b33374439bdbf633.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16#pic_center)


```typescript
const options = stan
  .subscriptionOptions()
  .setManualAckMode(true)
  .setDeliverAllAvailable()
  .setDurableName('accounting-service');

const subscription = stan.subscribe(
  'ticket:created',
  'queue-group-name',
  options
);
```

**[⬆ back to top](#目录)**


