## 连接 NATS Streaming Server

- [连接 NATS Streaming Server](#连接-NATS-Streaming-Server)
- [目录](#目录)
  - [可复用的 NATS Listener](#可复用的-NATS-Listener)
  - [Listener 的 Abstract Class](#Listener-的-Abstract-Class)
  - [继承 Listener 类](#继承-Listener-类)
  - [重构 Listener 代码](#重构-Listener-代码)
  - [使用 TypeScript 进行 Listener Validation](#使用-TypeScript-进行-Listener-Validation)
  - [Subjects 的枚举](#Subjects-的枚举)
  - [TicketCreatedEvent 的 interface](#TicketCreatedEvent-的-interface)
  - [强制 Listener 应用自定义的 Event 和 Event 内部的参数](#强制-Listener-应用自定义的-Event-和-Event-内部的参数)
  - [Quick Note: 'readonly' in Typescript](#Quick-Note:-'readonly'-in-Typescript)
  - [在 Create Listener 中 对 Create Event 的 data 进行约束](#在-Create-Listener-中-对-Create-Event-的-data-进行约束)
  - [现在的架构](#现在的架构)
  - [Publisher 的 abstract 和 extends](#Publisher-的-abstract-和-extends)
  - [使用 Publisher](#使用-Publisher)
  - [Event Publication 的 异步操作](#Event-Publication-的-异步操作)
  - [对于该项目通用事件模块缺点分析](#对于该项目通用事件模块缺点分析)
  - [更新 npm 的 Common Module](#更新-npm-的-Common-Module)
  - [重启 NATS](#重启-NATS)



### 可复用的 NATS Listener

- Listener 响应目前我们还只是 console.log

```js
// listener.ts
subscription.on("message", (msg: Message) => {
  const data = msg.getData();

  if (typeof data === "string") {
    console.log(`Received event #${msg.getSequence()}, with data: ${data}`);
  }

  msg.ack();
});
```

- 有很多样式和配置来 publish/receive 我们的 event 信息
- 所以我们想重新写一个通用的 NATS Listener 抽象类 来重构 NATS Listener，实现定制化 publish/receive，并处理之后的操作

**[⬆ back to top](#目录)**

### Listener 的 Abstract Class

![在这里插入图片描述](https://img-blog.csdnimg.cn/47dd9d1288364703ba34072e114761e1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
abstract class Listener {
  abstract subject: string;
  abstract queueGroupName: string;
  abstract onMessage(data: any, msg: Message): void;
  private client: Stan;
  protected ackWait = 5 * 1000;

  constructor(client: Stan) {
    this.client = client;
  }

  subscriptionOptions() {
    return this.client
      .subscriptionOptions()
      .setDeliverAllAvailable()
      .setManualAckMode(true)
      .setAckWait(this.ackWait)
      .setDurableName(this.queueGroupName);
  }

  listen() {
    const subscription = this.client.subscribe(
      this.subject,
      this.queueGroupName,
      this.subscriptionOptions()
    );

    subscription.on("message", (msg: Message) => {
      console.log(`Message received: ${this.subject} / ${this.queueGroupName}`);

      const parsedData = this.parseMessage(msg);
      this.onMessage(parsedData, msg);
    });
  }

  parseMessage(msg: Message) {
    const data = msg.getData();
    return typeof data === "string"
      ? JSON.parse(data)
      : JSON.parse(data.toString("utf8"));
  }
}
```

**[⬆ back to top](#目录)**

### 继承 Listener 类

![在这里插入图片描述](https://img-blog.csdnimg.cn/5f171bdb14bd4a918e9ae6d53a2224be.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
class TicketCreatedListener extends Listener {
  subject = "ticket:created";
  queueGroupName = "payments-service";

  onMessage(data: any, msg: Message) {
    console.log("Event data!", data);

    msg.ack();
  }
}
```

**[⬆ back to top](#目录)**

### 重构 Listener 代码

![在这里插入图片描述](https://img-blog.csdnimg.cn/12493c26a87a4ba5aa3963047a6d03f5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// listener.ts
import nats from "node-nats-streaming";
import { randomBytes } from "crypto";
import { TicketCreatedListener } from "./events/ticket-created-listener";

console.clear();

const stan = nats.connect("ticketing", randomBytes(4).toString("hex"), {
  url: "http://localhost:4222",
});

stan.on("connect", () => {
  console.log("Listener connected to NATS");

  stan.on("close", () => {
    console.log("NATS connection closed!");
    process.exit();
  });

  new TicketCreatedListener(stan).listen();
});

process.on("SIGINT", () => stan.close());
process.on("SIGTERM", () => stan.close());
```

**[⬆ back to top](#目录)**

### 使用 TypeScript 进行 Listener Validation

![在这里插入图片描述](https://img-blog.csdnimg.cn/3b5dcc62baa747f99468e4f4ca75fab3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 所以在 TicketCreatedListener 中，需要 subject 和 data 强关联
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/ecdb80b8c9eb4b93bf999ee959fc21cc.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 并且如果 subject 和 data 并不关联，TypeScript 还需要进行报错
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/fde9121239054c30a775e8ddd907c912.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Subjects 的枚举

> enum 类型，用自定义的 key 记录值，以后 访问 key、或者[xxx] 就行了

```typescript
// events/subjects.ts
export enum Subjects {
  TicketCreated = "ticket:created",
  OrderUpdated = "order:updated",
}

// const printSubject = (subject: Subjects) => {
//
// }
// printSubject(Subjects.TicketCreated)
// printSubject(Subjects[0])
```

**[⬆ back to top](#目录)**

### TicketCreatedEvent 的 interface

```typescript
// ticket-created-event.ts
import { Subjects } from "./subjects";

export interface TicketCreatedEvent {
  subject: Subjects.TicketCreated;
  data: {
    id: string;
    title: string;
    price: number;
  };
}
```

**[⬆ back to top](#目录)**

### 强制 Listener 应用自定义的 Event 和 Event 内部的参数

```typescript
// base-listener.ts
import { Subjects } from "./subjects";

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Listener<T extends Event> {
  abstract subject: T["subject"];
  abstract onMessage(data: T["data"], msg: Message): void;
}
```

```typescript
// ticket-created-listener.ts
import { TicketCreatedEvent } from './ticket-created-event'
import { Subjects } from './subjects';

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  subject: Subjects.TicketCreated = Subjects.TicketCreated;
  ...
}
```

**[⬆ back to top](#目录)**

### Quick Note: 'readonly' in Typescript

- `subject = Subjects.TicketCreated;`会报错，为什么？
- 因为 TypeScript 会认为我们以后会对 subject 进行修改
- 而现在其实是 Subject 类型，`abstract subject: T['subject'];`
- 如果不带上 type 的话，可能以后会被我们强制 `this.subject = Subjects.OrderCreated;`
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/1b80f1bf7e11460796a9715d0f2a5527.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 所以，要么就带上 type，要么就需要用 readonly 表示不能被修改

```typescript
export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = Subjects.TicketCreated;

  // ...everything else
}
```

**[⬆ back to top](#目录)**

### 在 Create Listener 中 对 Create Event 的 data 进行约束

`data: TicketCreatedEvent['data']`

```typescript
// ticket-created-listener.ts
export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  onMessage(data: TicketCreatedEvent["data"], msg: Message) {
    console.log("Event data!", data);

    console.log(data.id);
    console.log(data.title);
    console.log(data.price);

    msg.ack();
  }
}
```

**[⬆ back to top](#目录)**

### 现在的架构

![在这里插入图片描述](https://img-blog.csdnimg.cn/34e86bf63ca84dbeb622a5922318ddbb.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/8e4b1c8474464acdb3ae1b53ef0a8ba8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

![在这里插入图片描述](https://img-blog.csdnimg.cn/361e78ad7d66489983a1fececaf9c9a7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Publisher 的 abstract 和 extends

```typescript
// base-publisher.ts
import { Stan } from "node-nats-streaming";
import { Subjects } from "./subjects";

interface Event {
  subject: Subjects;
  data: any;
}

export abstract class Publisher<T extends Event> {
  abstract subject: T["subject"];
  private client: Stan;

  constructor(client: Stan) {
    this.client = client;
  }

  publish(data: T["data"]) {
    this.client.publish(this.subject, JSON.stringify(data), () => {
      console.log("Event published.");
    });
  }
}
```

```typescript
// ticket-created-publisher.ts
import { Publisher } from "./base-publisher";
import { TicketCreatedEvent } from "./ticket-created-event";
import { Subjects } from "./subjects";

export class TicketCreatedPublisher extends Publisher<TicketCreatedEvent> {
  readonly subject = Subjects.TicketCreated;
}
```

**[⬆ back to top](#目录)**

### 使用 Publisher

```typescript
// publisher.ts
stan.on("connect", () => {
  console.log("Publisher connected to NATS");

  const publisher = new TicketCreatedPublisher(stan);
  publisher.publish({
    id: "123",
    title: "concert",
    price: 20,
  });
});
```

**[⬆ back to top](#目录)**

### Event Publication 的 异步操作

- 目前使用异步的原因是为了 publish 过后，捕获 Error 的信息
- 封装 Promise

```typescript
// base-publisher.ts
  publish(data: T['data']): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(this.subject, JSON.stringify(data), (err) => {
        if (err) {
          return reject(err);
        }
        console.log('Event published to subject', this.subject);
        resolve();
      });
    });
  }
```

- await 执行 resolve()

```typescript
// publisher.ts
stan.on("connect", async () => {
  console.log("Publisher connected to NATS");

  const publisher = new TicketCreatedPublisher(stan);
  try {
    await publisher.publish({
      id: "123",
      title: "concert",
      price: 20,
    });
  } catch (err) {
    console.error(err);
  }
});
```

**[⬆ back to top](#目录)**

### 对于该项目通用事件模块缺点分析

![在这里插入图片描述](https://img-blog.csdnimg.cn/77edfbae56fb40f88a3cb82766c75672.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/400bcfbaff6d4bffa34785bcc02d0805.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 更新 npm 的 Common Module

- base-listener.ts
- base-publisher.ts
- subjects.ts
- ticket-created-event.ts
- ticket-updated-event.ts
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/3e8ac50ef47d4b03a92dcb122a519e4a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 重启 NATS

```console
kubectl get pods
kubectl delete pod nats-depl-786b8cff8d-xd4tn
```

**[⬆ back to top](#目录)**
