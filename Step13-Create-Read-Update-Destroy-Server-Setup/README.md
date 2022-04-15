## CRUD & Test server

## 目录

- [**CRUD & Test server**](#CRUD-&-Test-server)
- [目录](#目录)
  - [Ticketing Service](#Ticketing-Service)
  - [Project Setup](#Project-Setup)
  - [Running the Ticket Service](#Running-the-Ticket-Service)
  - [Mongo Connection URI](#Mongo-Connection-URI)
  - [Auth 服务同样修改 MONGO_URI 配置](#Auth-服务同样修改-MONGO_URI-配置)
  - [先写 test 再写业务代码的习惯](#先写-test-再写业务代码的习惯)
  - [创建 Router](#创建-Router)
  - [增加单个微服务的 Auth 认证机制](#增加单个微服务的-Auth-认证机制)
  - [在测试期间伪造身份验证](#在测试期间伪造身份验证)
  - [Building a Session](#Building-a-Session)
  - [测试无效请求](#测试无效请求)
  - [Title 和 Price 的验证](#Title-和-Price-的验证)
  - [用 TypeScript 对 Mongoose 进行约束](#用-TypeScript-对-Mongoose-进行约束)
  - [定义 Ticket Model](#定义-Ticket-Model)
  - [在 Route Handler 的进行数据库操作](#在-Route-Handler-的进行数据库操作)
  - [测试 Show Tickets 的 Routes](#测试-Show-Tickets-的-Routes)
  - [不可预料的错误](#不可预料的错误)
  - [What's that Error?!](#What's-that-Error?!)
  - [更好的 Error Logging 以便于测试](#更好的-Error-Logging-以便于测试)
  - [index 路由 和 测试](#index-路由-和-测试)
  - [Ticket Updating](#Ticket-Updating)
  - [Handling Updates](#Handling-Updates)
  - [权限判断](#权限判断)
  - [最后 Update 的 Code](#最后-Update-的-Code)

### Ticketing Service

![在这里插入图片描述](https://img-blog.csdnimg.cn/d7103ebf32c54ebfa6d4e46449e589a4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/89c52c2dbfdb46109c76ac1595591d39.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

创建服务的步骤

- Create package.json, install deps
- Write Dockerfile
- Create index.ts to run project
- Build image, push to docker hub
- Write k8s file for deployment, service
- Update skaffold.yaml to do file sync for tickets
- Write k8s file for Mongodb deployment, service

为了节约时间，直接从 auth 服务里 copy 即可，然后

- Create package.json, install deps
- Write Dockerfile
- Create index.ts to run project

**[⬆ back to top](#table-of-contents)**

### Project Setup

- Build image, push to docker hub

```console
docker build -t heysirius/tickets .
docker push heysirius/tickets
```

**[⬆ back to top](#table-of-contents)**

### Running the Ticket Service

- Write k8s file for deployment, service
- Update skaffold.yaml to do file sync for tickets
- Write k8s file for Mongodb deployment, service

```console
kubectl get pods
cd ticketing
skaffold dev
```

如果已经在 skaffold 下了，其实可以直接跳过这两个 Step，因为自动化部署
**[⬆ back to top](#table-of-contents)**

### Mongo Connection URI

和 JWT 一样，我们直接在 container 的环境中，配置 MONGO_URI

```yaml
# infra/k8s/tickets-mongo-depl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tickets-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tickets
  template:
    metadata:
      labels:
        app: tickets
    spec:
      containers:
        - name: tickets
          image: heysirius/tickets
          env:
            - name: MONGO_URI
              value: "mongodb://tickets-mongo-srv:27017/tickets"
            - name: JWT_KEY
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: JWT_KEY
---
```

```typescript
// index.ts
try {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log("Connected to MongoDb");
} catch (err) {
  console.log(err);
}
```

**[⬆ back to top](#table-of-contents)**

### Auth 服务同样修改 MONGO_URI 配置

```yaml
- name: MONGO_URI
  value: "mongodb://auth-mongo-srv:27017/auth"
```

```typescript
try {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });
  console.log("Connected to MongoDb");
} catch (err) {
  console.log(err);
}
```

**[⬆ back to top](#table-of-contents)**

### 先写 test 再写业务代码的习惯

```typescript
// routes/__test__/new.test.ts
import request from "supertest";
import { app } from "../../app";

it("has a route handler listening to /api/tickets for post requests", async () => {});

it("can only be accessed if the user is signed in", async () => {});

it("returns an error if an invalid title is provided", async () => {});

it("returns an error if an invalid price is provided", async () => {});

it("creates a ticket with valid inputs", async () => {});
```

**[⬆ back to top](#table-of-contents)**

### 创建 Router

```typescript
// routes/__test__/new.test.ts
it("has a route handler listening to /api/tickets for post requests", async () => {
  const response = await request(app).post("/api/tickets").send({});

  expect(response.status).not.toEqual(404);
});
```

```typescript
// routes/new.ts
import express, { Request, Response } from "express";

const router = express.Router();

router.post("/api/tickets", (req: Request, res: Response) => {
  res.sendStatus(200);
});

export { router as createTicketRouter };
```

```typescript
// app.ts
app.use(createTicketRouter);
```

**[⬆ back to top](#table-of-contents)**

### 增加单个微服务的 Auth 认证机制

```typescript
// routes/__test__/new.test.ts
it("can only be accessed if the user is signed in", async () => {
  await request(app).post("/api/tickets").send({}).expect(401);
});
```

```typescript
// app.ts
app.use(currentUser);
```

- 引入 Auth 中间件

```typescript
// routes/new.ts
import express, { Request, Response } from "express";
import { requireAuth } from "@heysirius-common/common";

const router = express.Router();

router.post("/api/tickets", requireAuth, (req: Request, res: Response) => {
  res.sendStatus(200);
});

export { router as createTicketRouter };
```

**[⬆ back to top](#table-of-contents)**

### 在测试期间伪造身份验证

```typescript
// routes/__test__/new.test.ts
it("returns a status other than 401 if the user is signed in", async () => {
  const response = await request(app).post("/api/tickets").send({});

  expect(response.status).not.toEqual(401);
});
```

cookie: express:sess=eyJqd3QiOiJleUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcFpDSTZJalZtTVRRd016Y3lPRFUyWkdRek1EQXhPV1U1TkdFd1pTSXNJbVZ0WVdsc0lqb2lkR1Z6ZEVCMFpYTjBMbU52YlNJc0ltbGhkQ0k2TVRVNU5URTBOekV5TW4wLkVicVlVVmY5SjIyUjlOa3k5dVhKdHl3WEh2MVI4ZURuQUlSWFl3RWw4UkEifQ==

https://www.base64decode.org/
![在这里插入图片描述](https://img-blog.csdnimg.cn/cfd723ae58c041b0b28f398277909ab6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- Build a JWT payload. { id, email }
- Create the JWT!
- Build Session object. { jwt: MY_JWT }
- Turn that session into JSON
- Take JSON and encode it as base64
- return a string thats the cookie with encoded data

**[⬆ back to top](#table-of-contents)**

### Building a Session

```typescript
it("returns a status other than 401 if the user is signed in", async () => {
  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({});

  expect(response.status).not.toEqual(401);
});
```

```typescript
// test/setup.ts
global.signin = () => {
  // Build a JWT payload. { id, email }
  const payload = {
    id: "5f140372856dd30019e94a0e",
    email: "test@test.com",
  };

  // Create the JWT!
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  // Build Session object. { jwt: MY_JWT }
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString("base64");

  // return a string thats the cookie with encoded data
  return [`express:sess=${base64}`];
};
```

**[⬆ back to top](#table-of-contents)**

### 测试无效请求

- 这里要无效，是 price 和 title

```typescript
// routes/__test__/new.test.ts
it("returns an error if an invalid title is provided", async () => {
  await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title: "",
      price: 10,
    })
    .expect(400);

  await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      price: 10,
    })
    .expect(400);
});

it("returns an error if an invalid price is provided", async () => {
  await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title: "asldkjf",
      price: -10,
    })
    .expect(400);

  await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title: "laskdfj",
    })
    .expect(400);
});
```

**[⬆ back to top](#table-of-contents)**

### Title 和 Price 的验证

- 回顾下我们有的 middleware
  ![](https://img-blog.csdnimg.cn/79378b09cf4345a59b48cc3da74f738c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/f5a0d917b0a34c16a8435f47ff1c6e10.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// routes/new.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, validateRequest } from "@heysirius-common/common";

const router = express.Router();

router.post(
  "/api/tickets",
  requireAuth,
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
  ],
  validateRequest,
  (req: Request, res: Response) => {
    res.sendStatus(200);
  }
);

export { router as createTicketRouter };
```

**[⬆ back to top](#table-of-contents)**

### 用 TypeScript 对 Mongoose 进行约束

![在这里插入图片描述](https://img-blog.csdnimg.cn/2945351a45e34d58b083623af0237d85.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// models/ticket.ts
import mongoose from "mongoose";

interface TicketAttrs {
  title: string;
  price: number;
  userId: string;
}

interface TicketDoc extends mongoose.Document {
  title: string;
  price: number;
  userId: string;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}
```

**[⬆ back to top](#table-of-contents)**

### 定义 Ticket Model

```typescript
const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket(attrs);
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket };
```

**[⬆ back to top](#table-of-contents)**

### 在 Route Handler 的进行数据库操作

```typescript
// routes/__test__/new.test.ts
it("creates a ticket with valid inputs", async () => {
  let tickets = await Ticket.find({});
  expect(tickets.length).toEqual(0);

  const title = "asldkfj";

  await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title,
      price: 20,
    })
    .expect(201);

  tickets = await Ticket.find({});
  expect(tickets.length).toEqual(1);
  expect(tickets[0].price).toEqual(20);
  expect(tickets[0].title).toEqual(title);
});
```

```typescript
// routes/new.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";
import { requireAuth, validateRequest } from "@heysirius-common/common";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.post(
  "/api/tickets",
  requireAuth,
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, price } = req.body;

    const ticket = Ticket.build({
      title,
      price,
      userId: req.currentUser!.id,
    });
    await ticket.save();

    res.sendStatus(201).send(ticket);
  }
);

export { router as createTicketRouter };
```

**[⬆ back to top](#table-of-contents)**

### 测试 Show Tickets 的 Routes

```typescript
// routes/show.ts
it("returns a 404 if the ticket is not found", async () => {
  await request(app).get("/api/tickets/laskdjfalksfdlkakj").send().expect(404);
});

it("returns the ticket if the ticket is found", async () => {
  const title = "concert";
  const price = 20;

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title,
      price,
    })
    .expect(201);

  const ticketResponse = await request(app)
    .get(`/api/tickets/${response.body.id}`)
    .send()
    .expect(200);

  expect(ticketResponse.body.title).toEqual(title);
  expect(ticketResponse.body.price).toEqual(price);
});
```

**[⬆ back to top](#table-of-contents)**

### 不可预料的错误

```typescript
// routes/show.ts
import express, { Request, Response } from "express";
import { NotFoundError } from "@heysirius-common/common";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    throw new NotFoundError();
  }

  res.send(ticket);
});

export { router as showTicketRouter };
```

```typescript
app.use(showTicketRouter);
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/786c083e447b44e7a3d81d5bc843a099.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### What's that Error?!

- 直接在 `node_module/heysirius-common/build/middlewares/error-handler` 新增 `console.log(error)`
- 这样就能跳过 npm publish 的环节，毕竟是调试而不是正式发布
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/83369ee7f34c474197fe24c4398befe0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 修复

```typescript
// routes/__test__/show.test.ts
it("returns a 404 if the ticket is not found", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();

  await request(app).get(`/api/tickets/${id}`).send();

  console.log(response.body);
});
```

**[⬆ back to top](#table-of-contents)**

### 更好的 Error Logging 以便于测试

```typescript
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../errors/custom-error";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  console.error(err);
  res.status(400).send({
    errors: [{ message: "Something went wrong" }],
  });
};
```

**[⬆ back to top](#table-of-contents)**

### index 路由 和 测试

![在这里插入图片描述](https://img-blog.csdnimg.cn/d7103ebf32c54ebfa6d4e46449e589a4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// routes/__test__/index.test.ts
import request from "supertest";
import { app } from "../../app";

const createTicket = () => {
  return request(app).post("/api/tickets").set("Cookie", global.signin()).send({
    title: "asldkf",
    price: 20,
  });
};

it("can fetch a list of tickets", async () => {
  await createTicket();
  await createTicket();
  await createTicket();

  const response = await request(app).get("/api/tickets").send().expect(200);

  expect(response.body.length).toEqual(3);
});
```

```typescript
// routes/index.ts
import express, { Request, Response } from "express";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.get("/api/tickets", async (req: Request, res: Response) => {
  const tickets = await Ticket.find({});

  res.send(tickets);
});

export { router as indexTicketRouter };
```

```typescript
// app.ts
app.use(indexTicketRouter);
```

**[⬆ back to top](#table-of-contents)**

### Ticket Updating

![在这里插入图片描述](https://img-blog.csdnimg.cn/d7103ebf32c54ebfa6d4e46449e589a4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// routes/__test__/update.test.ts
it("returns a 404 if the provided id does not exist", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .set("Cookie", global.signin())
    .send({
      title: "aslkdfj",
      price: 20,
    })
    .expect(404);
});

it("returns a 401 if the user is not authenticated", async () => {
  const id = new mongoose.Types.ObjectId().toHexString();
  await request(app)
    .put(`/api/tickets/${id}`)
    .send({
      title: "aslkdfj",
      price: 20,
    })
    .expect(401);
});
```

**[⬆ back to top](#table-of-contents)**

### Handling Updates

```typescript
// routes/update.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";
import {
  validateRequest,
  NotFoundError,
  requireAuth,
  NotAuthorizedError,
} from "@heysirius-common/common";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.put(
  "/api/tickets/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      throw new NotFoundError();
    }

    res.send(ticket);
  }
);

export { router as updateTicketRouter };
```

**[⬆ back to top](#table-of-contents)**

### 权限判断

- 如果该用户没有拥有 ticket，就不能 update

```typescript
// routes/__test__/update.test.ts
it("returns a 401 if the user does not own the ticket", async () => {
  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", global.signin())
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", global.signin())
    .send({
      title: "alskdjflskjdf",
      price: 1000,
    })
    .expect(401);
});
```

![](https://img-blog.csdnimg.cn/79378b09cf4345a59b48cc3da74f738c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// routes/update.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";
import {
  validateRequest,
  NotFoundError,
  requireAuth,
  NotAuthorizedError,
} from "@heysirius-common/common";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.put(
  "/api/tickets/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      throw new NotFoundError();
    }

    if (ticket.userId !== req.currentUser!.id) {
      throw new NotAuthorizedError();
    }

    res.send(ticket);
  }
);

export { router as updateTicketRouter };
```

```typescript
const payload = {
  id: new mongoose.Types.ObjectId().toHexString(),
  email: "test@test.com",
};
```

**[⬆ back to top](#table-of-contents)**

### 最后 Update 的 Code

```typescript
// routes/__test__/update.test.ts
it("returns a 400 if the user provides an invalid title or price", async () => {
  const cookie = global.signin();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "",
      price: 20,
    })
    .expect(400);

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "alskdfjj",
      price: -10,
    })
    .expect(400);
});

it("updates the ticket provided valid inputs", async () => {
  const cookie = global.signin();

  const response = await request(app)
    .post("/api/tickets")
    .set("Cookie", cookie)
    .send({
      title: "asldkfj",
      price: 20,
    });

  await request(app)
    .put(`/api/tickets/${response.body.id}`)
    .set("Cookie", cookie)
    .send({
      title: "new title",
      price: 100,
    })
    .expect(200);

  const ticketResponse = await request(app)
    .get(`/api/tickets/${response.body.id}`)
    .send();

  expect(ticketResponse.body.title).toEqual("new title");
  expect(ticketResponse.body.price).toEqual(100);
});
```

```typescript
// routes/update.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";
import {
  validateRequest,
  NotFoundError,
  requireAuth,
  NotAuthorizedError,
} from "@heysirius/common";
import { Ticket } from "../models/ticket";

const router = express.Router();

router.put(
  "/api/tickets/:id",
  requireAuth,
  [
    body("title").not().isEmpty().withMessage("Title is required"),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be provided and must be greater than 0"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      throw new NotFoundError();
    }

    if (ticket.userId !== req.currentUser!.id) {
      throw new NotAuthorizedError();
    }

    ticket.set({
      title: req.body.title,
      price: req.body.price,
    });
    await ticket.save();

    res.send(ticket);
  }
);

export { router as updateTicketRouter };
```

**[⬆ back to top](#table-of-contents)**
