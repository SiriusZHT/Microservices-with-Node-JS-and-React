## 响应一致化策略

## 目录

- [**响应一致化策略**](#响应一致化策略)
- [目录](#目录)
  - [创建路由处理](#创建路由处理)
  - [引入更多的路由](#引入更多的路由)
  - [增加验证](#增加验证)
  - [认证错误的处理](#认证错误的处理)
  - [统一不同类型微服务的错误信息](#统一不同类型微服务的错误信息)
  - [其他的错误来源](#其他的错误来源)
  - [Error-处理的解决方案](#Error-处理的解决方案)
  - [创建一个-Error-处理的-middleware](#创建一个-Error-处理的-middleware)
  - [向错误处理程序传达更多信息](#向错误处理程序传达更多信息)
  - [定义并处理更多-Error-信息](#定义并处理更多-Error-信息)
  - [自定义错误-Custom-Errors-的子类化及子类类型](#自定义错误-Custom-Errors-的子类化及子类类型)
  - [确定错误类型-Error-Type](#确定错误类型-Error-Type)
  - [将-Error-转换为-Response](#将-Error-转换为-Response)
  - [将序列化逻辑植入进-Errors-middleware](#将序列化逻辑植入进-Errors-middleware)
  - [验证自定义的-Error](#验证自定义的-Error)
  - [最终-Error-相关的-Code](#最终-Error-相关的-Code)
  - [创建-404-的路由错误](#创建-404-的路由错误)
  - [异步抛出错误](#异步抛出错误)

### 创建路由处理

![](https://img-blog.csdnimg.cn/1434eaa0312d4378ba20fe02f931d620.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// current-user.ts
import express from "express";
// 使用 express.Router
const router = express.Router();
router.get("/api/users/currentuser", () => {});

export { router as currentUserRouter };
```

```typescript
// index.ts
import express from "express";
import { json } from "body-parser";
import { currentUserRouter } from "./routes/current-user";

const app = express();
app.use(json());
app.use(currentUserRouter);

app.listen(3000, () => {
  console.log("Listening on port 3000!!!!!!!!");
});
```

**[⬆ back to top](#table-of-contents)**

### 引入更多的路由

- 这里注意的是，express.Router 负责包装路由
- express 负责 通过 use 整合包装后的路由

```typescript
// index.ts
import express from "express";
import { json } from "body-parser";

import { currentUserRouter } from "./routes/current-user";
import { signinRouter } from "./routes/signin";
import { signoutRouter } from "./routes/signout";
import { signupRouter } from "./routes/signup";

const app = express();
app.use(json());

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.listen(3000, () => {
  console.log("Listening on port 3000!");
});
```

**[⬆ back to top](#table-of-contents)**

### 增加验证

- 使用[express-validator](https://express-validator.github.io/docs/index.html)
- 一句话概括：express-validator 主要提供 express 的验证（到目前只用到过 body）
- 具体用法如下
  - 在 router.post / [xxx method] 中，route 和 callback 前，用数组 或者 `「,」的分割`来传入 body 的 isXXX 验证，最后.withMessage 返回 msg

```typescript
// signup.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";

const router = express.Router();

router.post(
  "/api/users/signup",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20 characters"),
  ],
  (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).send("Provide a valid email");
    }

    // new User({ email, password })
  }
);

export { router as signupRouter };
```

**[⬆ back to top](#table-of-contents)**

### 认证错误的处理

- 用 express-validator 的 [validationResult](https://express-validator.github.io/docs/validation-result-api.html) 接收 Request 的错误信息
- 通过 .array() 就会返回如下格式的错误信息

```json
{
  "msg": "The error message",
  "param": "param.name.with.index[0]",
  "value": "param value",
  // Location of the param that generated this error.
  // It's either body, query, params, cookies or headers.
  "location": "body",

  // nestedErrors only exist when using the oneOf function
  "nestedErrors": [{ ... }]
}
```

![](https://img-blog.csdnimg.cn/7a0a684bae0048b09bca41f77870b97e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";

const router = express.Router();

router.post(
  "/api/users/signup",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20 characters"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(errors.array());
    }

    const { email, password } = req.body;
    console.log("Creating a user...");
    res.send({});
  }
);

export { router as signupRouter };
```

**[⬆ back to top](#table-of-contents)**

### 统一不同类型微服务的错误信息

![](https://img-blog.csdnimg.cn/577acf120350465e89b1fd07c91ad06b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/cdb56876603542269577a686b1ffd906.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### 其他的错误来源

![在这里插入图片描述](https://img-blog.csdnimg.cn/caca1b2b29874eed847fc927dc835193.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### Error 处理的解决方案

| 处理 Error 的困难                                            | 解决方式                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| 无论出现什么问题，我们都必须从所有服务器获得一致的结构化响应 | 编写一个错误处理中间件来处理错误，给它们一个一致的结构，然后返回给浏览器    |
| 不仅仅是验证请求处理程序的输入。还有其他奇奇怪怪的错误要处理 | 确保我们使用 Express 的错误处理机制捕获所有可能的错误（调用 'next' 函数！） |

[expressjs 官网的 Error Handling](https://expressjs.com/en/guide/error-handling.html)

**[⬆ back to top](#table-of-contents)**

### 创建一个 Error 处理的 middleware

```typescript
// error-handler.ts
import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("Something went wrong", err);

  res.status(400).send({
    message: "Something went wrong",
  });
};
```

**[⬆ back to top](#table-of-contents)**

### 向错误处理程序传达更多信息

![](https://img-blog.csdnimg.cn/6619f634efb042bf9f9cc802f7975daa.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

![在这里插入图片描述](https://img-blog.csdnimg.cn/18ee36c872114e0d86b034cadd8247d6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### 定义并处理更多 Error 信息

- 我们想要一个像“ Error ”这样的对象，但我们想向它添加更多自定义属性
- 通常这类信息需要进行子类化继承
- [Custom errors, extending Error](https://javascript.info/custom-errors)

![在这里插入图片描述](https://img-blog.csdnimg.cn/8ebde49eab1046058518f9f246432b64.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/0672e51fa47a41cf914b661269e76331.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### 自定义错误 Custom Errors 的子类化及子类类型

```typescript
// request-validation-error.ts
import { ValidationError } from "express-validator";

export class RequestValidationError extends Error {
  constructor(public errors: ValidationError[]) {
    super();

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }
}
```

```typescript
// database-connection-error copy.ts
export class DatabaseConnectionError extends Error {
  reason = "Error connecting to database";

  constructor() {
    super();

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }
}
```

**[⬆ back to top](#table-of-contents)**

### 确定错误类型 Error Type

- 用 `instanceof`判断继承关系，因为我们之前`Object.setPrototypeOf(this, [CurrentTypeError].prototype)`
- 设置一个指定的对象的原型 ( 即, 内部[[Prototype]]属性）到另一个对象或 null。

```js
if (!Object.setPrototypeOf) {
  // 仅适用于Chrome和FireFox，在IE中不工作：
  Object.prototype.setPrototypeOf = function (obj, proto) {
    if (obj.__proto__) {
      obj.__proto__ = proto;
      return obj;
    } else {
      // 如果你想返回 prototype of Object.create(null):
      var Fn = function () {
        for (var key in obj) {
          Object.defineProperty(this, key, {
            value: obj[key],
          });
        }
      };
      Fn.prototype = proto;
      return new Fn();
    }
  };
}
```

```typescript
import { Request, Response, NextFunction } from "express";
import { RequestValidationError } from "../errors/request-validation-error";
import { DatabaseConnectionError } from "../errors/database-connection-error copy";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof RequestValidationError) {
    console.log("handling this error as a request validation error");
  }

  if (err instanceof DatabaseConnectionError) {
    console.log("handling this error as a database connection error");
  }

  res.status(400).send({
    message: err.message,
  });
};
```

**[⬆ back to top](#table-of-contents)**

### 将 Error 转换为 Response

![f](https://img-blog.csdnimg.cn/4d34cdcdf00a43b490356115808f7b36.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### 将序列化逻辑植入进 Errors middleware

![在这里插入图片描述](https://img-blog.csdnimg.cn/463da89c5192405f9f4d59222fa99905.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

![](https://img-blog.csdnimg.cn/868ca2ca3ecf4a17b7c1989846cce618.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// database-connection-error.ts
export class DatabaseConnectionError extends Error {
  statusCode = 500;
  reason = "Error connecting to database";

  constructor() {
    super();

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  serializeErrors() {
    return [{ message: this.reason }];
  }
}
```

```typescript
// request-validation-error.ts
import { ValidationError } from "express-validator";

export class RequestValidationError extends Error {
  statusCode = 400;

  constructor(public errors: ValidationError[]) {
    super();

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((error) => {
      return { message: error.msg, field: error.param };
    });
  }
}
```

```typescript
// error-handler.ts
import { Request, Response, NextFunction } from "express";
import { RequestValidationError } from "../errors/request-validation-error";
import { DatabaseConnectionError } from "../errors/database-connection-error copy";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof RequestValidationError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  if (err instanceof DatabaseConnectionError) {
    return res.status(err.statusCode).send({ errors: err.serializeErrors() });
  }

  res.status(400).send({
    errors: [{ message: "Something went wrong" }],
  });
};
```

**[⬆ back to top](#table-of-contents)**

### 验证自定义的 Error

![在这里插入图片描述](https://img-blog.csdnimg.cn/3304a826fbbb40d2aa8cebae0bab966b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/922ae098d87f4858b3bd7ae01c0a2fc4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 于是就有了 CommonError 对于继承的子类的 abstract 约束
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/5471620ce63e4357b2fdaf5d8daa788b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
import { ValidationError } from "express-validator";

interface CustomError {
  statusCode: number;
  serializeErrors(): {
    message: string;
    field?: string;
  }[]; // 对象数组的声明
}

export class RequestValidationError extends Error implements CustomError {
  statusCode = 400;

  constructor(public errors: ValidationError[]) {
    super();

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((error) => {
      return { message: error.msg, field: error.param };
    });
  }
}
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/6b49031180be4b10a1636424400ca5d7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#table-of-contents)**

### 最终 Error 相关的 Code

##### custom-error.ts

- 抽象类无法实例化
- 主要对子类进行继承属性的约束（序列归一化的体现）

```typescript
// custom-error.ts
export abstract class CustomError extends Error {
  abstract statusCode: number;

  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, CustomError.prototype);
  }

  abstract serializeErrors(): { message: string; field?: string }[];
}
```

##### database-connection-error.ts

- 报 500 的 DatabaseConnectionError
- 无 field 验证错误字段返回

```typescript
// database-connection-error.ts
import { CustomError } from "./custom-error";

export class DatabaseConnectionError extends CustomError {
  statusCode = 500;
  reason = "Error connecting to database";

  constructor() {
    super("Error connecting to db");

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, DatabaseConnectionError.prototype);
  }

  serializeErrors() {
    return [{ message: this.reason }];
  }
}
```

##### request-validation-error.ts

- 报 400 的 RequestValidationError
- 有错误字段返回

```typescript
// request-validation-error.ts
import { ValidationError } from "express-validator";
import { CustomError } from "./custom-error";

export class RequestValidationError extends CustomError {
  statusCode = 400;

  constructor(public errors: ValidationError[]) {
    super("Invalid request parameters");

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RequestValidationError.prototype);
  }

  serializeErrors() {
    return this.errors.map((error) => {
      return { message: error.msg, field: error.param };
    });
  }
}
```

##### error-handler.ts

```typescript
// error-handler.ts
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

  res.status(400).send({
    errors: [{ message: "Something went wrong" }],
  });
};
```

**[⬆ back to top](#table-of-contents)**
![在这里插入图片描述](https://img-blog.csdnimg.cn/caf73862880544a2b02fd352133046b4.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

### 创建 404 的路由错误

```typescript
import { CustomError } from "./custom-error";

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor() {
    super("Route not found");

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  serializeErrors() {
    return [{ message: "Not Found" }];
  }
}
```

```typescript
import express from "express";
import { json } from "body-parser";

import { currentUserRouter } from "./routes/current-user";
import { signinRouter } from "./routes/signin";
import { signoutRouter } from "./routes/signout";
import { signupRouter } from "./routes/signup";
import { errorHandler } from "./middleware/error-handler";
import { NotFoundError } from "./errors/not-found-error";

const app = express();
app.use(json());

app.use(currentUserRouter);
app.use(signinRouter);
app.use(signoutRouter);
app.use(signupRouter);

app.all("*", () => {
  throw new NotFoundError();
});

app.use(errorHandler);

app.listen(3000, () => {
  console.log("Listening on port 3000!");
});
```

**[⬆ back to top](#table-of-contents)**

### 异步抛出错误

- 可以用 express 的 NextFunction

```typescript
app.all("*", async (req, res, next) => {
  next(new NotFoundError());
});
```

- 也可以`import 'express-async-errors'; `
  [ExpressJS Async Errors](https://github.com/davidbanham/express-async-errors)

```typescript
app.all("*", async (req, res) => {
  throw new NotFoundError();
});
```

**[⬆ back to top](#table-of-contents)**
