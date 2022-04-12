## 测试独立的微服务

## 目录

- [**测试独立的微服务**](#测试独立的微服务)
- [目录](#目录)
  - [需要测试的范围](#需要测试的范围)
  - [需要测试的目标](#需要测试的目标)
  - [进行测试的架构](#进行测试的架构)
  - [重构项目的 index](#重构项目的-index)
  - [将会用到的一些依赖](#将会用到的一些依赖)
  - [测试环境配置](#测试环境配置)
  - [第一个测试 测试登录](#第一个测试-测试登录)
  - [测试无效输入](#测试无效输入)
  - [email 需要是唯一的](#email-需要是唯一的)
  - [在测试期间更改节点环境](#在测试期间更改节点环境)
  - [测试登录](#测试登录)
  - [登出测试](#登出测试)
  - [测试时遇到的 cookie 不好传递的问题](#测试时遇到的-cookie-不好传递的问题)
  - [认证测试的解决](#认证测试的解决)
  - [Auth Helper Function](#Auth-Helper-Function)
  - [测试没认证的](#测试没认证的)

### 需要测试的范围

| 测试的范围是哪些?              | Example                                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 单独测试一段代码               | 独立的 middleware                                                                                                                               |
| 测试不同的代码片段如何协同工作 | 从多个中间件到单个请求处理器的请求流（这里用英文更直观，中文属实表达不清晰，Request flowing through multiple middlewares to a request handler） |
| 测试不同组件/模块如何协同工作  | 向服务发出请求，确保数据库的写入是完成了的                                                                                                      |
| 测试不同服务如何协同工作       | 在“付款 payment”服务中创建“付款”会影响“订单 order”服务                                                                                          |

![在这里插入图片描述](https://img-blog.csdnimg.cn/6b1ca41470744cfba5a6708bd79b5b55.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 需要测试的目标

- 请求的测试

![在这里插入图片描述](https://img-blog.csdnimg.cn/5ec01d72b1c74565b9e028119aa01abf.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 数据库 model 的测试
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/c02e2f4a11bb4ddbbadc03cb05dfe36e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 事件收发的测试
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/9ea611c4412641eea0401eec6b98d1cf.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 进行测试的架构

![在这里插入图片描述](https://img-blog.csdnimg.cn/9b0eedde986d4f1d9d8e6031db722dc5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

![在这里插入图片描述](https://img-blog.csdnimg.cn/5001bce7624a4cd398cef3e906b68afe.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/0e35497a101c42b48f6936076b2b6a9c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/81e8e8d57de4492cb3339e320c9ebee8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 重构项目的 index

```typescript
// app.ts
import express from "express";
import "express-async-errors";
import { json } from "body-parser";
import cookieSession from "cookie-session";

import { currentUserRouter } from "./routes/current-user";
import { signinRouter } from "./routes/signin";
import { signoutRouter } from "./routes/signout";
import { signupRouter } from "./routes/signup";
import { errorHandler } from "./middlewares/error-handler";
import { NotFoundError } from "./errors/not-found-error";

const app = express();
app.set("trust proxy", true);
app.use(json());
app.use(
  cookieSession({
    signed: false,
    secure: true,
  })
);

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.all("*", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
```

```typescript
// index.ts
import mongoose from "mongoose";

import { app } from "./app";

const start = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error("JWT_KEY must be defined");
  }

  try {
    await mongoose.connect("mongodb://auth-mongo-srv:27017/auth", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("Connected to MongoDb");
  } catch (err) {
    console.log(err);
  }

  app.listen(3000, () => {
    console.log("Listening on port 3000!");
  });
};

start();
```

**[⬆ back to top](#目录)**

### 将会用到的一些依赖

[jest](https://jestjs.io/en/)
[supertest](https://github.com/visionmedia/supertest)
[mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server)

**[⬆ back to top](#目录)**

### 测试环境配置

```json
// package.json
  "scripts": {
    "start": "ts-node-dev --poll src/index.ts",
    "test": "jest --watchAll --no-cache" // --watchAll 观察项目所有测试文件的变化  --no-cache 为了解决 jest 有时候识别不了 TypeScript 的文件变化的问题
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "setupFilesAfterEnv": [
      "./src/test/setup.ts"
    ]
  },
```

```typescript
// ./test/setup.ts
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { app } from "../app";

let mongo: any;
beforeAll(async () => {
  process.env.JWT_KEY = "asdfasdf";

  mongo = new MongoMemoryServer();
  const mongoUri = await mongo.getUri();

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

beforeEach(async () => {
  // 在进行每一个单元测试之前，都要清空每一个 connection 的数据
  const collections = await mongoose.connection.db.collections();

  for (let collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});
```

**[⬆ back to top](#目录)**

### 第一个测试 测试登录

```typescript
// signup.test.ts
import request from "supertest";
import { app } from "../../app";

it("returns a 201 on successful signup", async () => {
  return request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);
});
```

```
npm run test
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/ad323e6a17424fa69623c95c183d1bb6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 这里报错是因为测试环境里没加 JWT
- 之前我们是在 每个 pod 里`kubectl create secret generic jwt-secret --from-literal=JWT_KEY=xxxxxx`
- 所以需要在 beforeAll 里加 JWT 假装有 JWT 即可
- `process.env.JWT_KEY = "asdfasdf";`

**[⬆ back to top](#目录)**

### 测试无效输入

```typescript
// signup.test.ts
import request from "supertest";
import { app } from "../../app";

it("returns a 400 with an invalid email", async () => {
  return request(app)
    .post("/api/users/signup")
    .send({
      email: "alskdflaskjfd",
      password: "password",
    })
    .expect(400);
});

it("returns a 400 with an invalid password", async () => {
  return request(app)
    .post("/api/users/signup")
    .send({
      email: "alskdflaskjfd",
      password: "p",
    })
    .expect(400);
});

it("returns a 400 with missing email and password", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
    })
    .expect(400);

  await request(app)
    .post("/api/users/signup")
    .send({
      password: "alskjdf",
    })
    .expect(400);
});
```

**[⬆ back to top](#目录)**

### email 需要是唯一的

```typescript
// signup.test.ts
it("disallows duplicate emails", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);

  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(400);
});
```

**[⬆ back to top](#目录)**

### 在测试期间更改节点环境

```typescript
// signup.test.ts
it("sets a cookie after successful signup", async () => {
  const response = await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);
  // 测试 cookie 有没有 set 进去，有 cookie 就是 define 的
  expect(response.get("Set-Cookie")).toBeDefined();
});
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/0f6da70785d64c7cbc61c60d3b699e9d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 为什么会出现这种情况？
- 在我们 cookie 的配置中，secure 写的是 true，那么就会开启 https
- supertest 用的是 http 不是 https
- 所以需要根据当前 process.env.NODE_ENV 来判断要不要开 http 和 https

```js
app.use(
  cookieSession({
    signed: false,
    secure: process.env.NODE_ENV !== "test",
  })
);
```

**[⬆ back to top](#目录)**

### 测试登录

```typescript
// signin.test.ts
import request from "supertest";
import { app } from "../../app";

it("fails when a email that does not exist is supplied", async () => {
  await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(400);
});

it("fails when an incorrect password is supplied", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);

  await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "aslkdfjalskdfj",
    })
    .expect(400);
});

it("responds with a cookie when given valid credentials", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);

  const response = await request(app)
    .post("/api/users/signin")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(200);

  expect(response.get("Set-Cookie")).toBeDefined();
});
```

**[⬆ back to top](#目录)**

### 登出测试

- 我们在登出的时候，直接把 session 设为 null 了

```js
router.post("/api/users/signout", (req, res) => {
  req.session = null;

  res.send({});
});
```

```typescript
// signout.test.ts
import request from "supertest";
import { app } from "../../app";

it("clears the cookie after signing out", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);

  const response = await request(app)
    .post("/api/users/signout")
    .send({})
    .expect(200);

  expect(response.get("Set-Cookie")[0]).toEqual(
    "express:sess=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly"
  );
});
```

- 测试小技巧，打印正确的 response，然后测试 response 即可
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/29cd13855d4e4d8d92cd723f00233876.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  **[⬆ back to top](#目录)**

### 测试时遇到的 cookie 不好传递的问题

- 很正常的一个 测试，我们希望登录然后查看 currentuser
- 然后不出意外确实是可以看到 response body 中的 currentuser

```typescript
// current-user.test.ts
import request from "supertest";
import { app } from "../../app";

it("responds with details about the current user", async () => {
  await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);

  const response = await request(app)
    .get("/api/users/currentuser")
    .send()
    .expect(200);

  console.log(response.body);
});
```

- 但是打印出来的是 current null
- 就说明获取不了 我们的登录状态
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/f099a190e9de4f46a2b9103639ad2f52.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 认证测试的解决

- 因为我们登录状态 session 会话（包含 JWT），是通过 cookie 在客户端里存的，还记得之前 express-session 和 cookie-session 的测试吗？
- 所以要获取到存登录状态的 cookie，必须在登录的时候获取 response 的 cookie，缓存下来，在验证 currentuser 的时候加上

```typescript
import request from "supertest";
import { app } from "../../app";

it("responds with details about the current user", async () => {
  const authResponse = await request(app)
    .post("/api/users/signup")
    .send({
      email: "test@test.com",
      password: "password",
    })
    .expect(201);
  const cookie = authResponse.get("Set-Cookie");

  const response = await request(app)
    .get("/api/users/currentuser")
    .set("Cookie", cookie)
    .send()
    .expect(200);

  expect(response.body.currentUser.email).toEqual("test@test.com");
});
```

**[⬆ back to top](#目录)**

### Auth Helper Function

- 因为我们之后都希望测试的时候，能拿到会话的 cookie
- 所以可以将这段代码抽出来复用

```typescript
global.signin = async () => {
  const email = "test@test.com";
  const password = "password";

  const response = await request(app)
    .post("/api/users/signup")
    .send({
      email,
      password,
    })
    .expect(201);

  const cookie = response.get("Set-Cookie");

  return cookie;
};
```

**[⬆ back to top](#目录)**

### 测试没认证的

```typescript
it("responds with null if not authenticated", async () => {
  const response = await request(app)
    .get("/api/users/currentuser")
    .send()
    .expect(200);

  expect(response.body.currentUser).toEqual(null);
});
```

**[⬆ back to top](#目录)**
