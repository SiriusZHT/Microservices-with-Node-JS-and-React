## 身份认证

### 目录

- [**身份认证**](#身份认证)
- [目录](#目录)
  - [身份认证功能](#身份认证功能)
  - [身份验证策略存在的问题](#身份验证策略存在的问题)
  - [选择哪个 Option](#选择哪个-Option)
  - [解决 Option #2 存在的问题](#解决-Option-#2-存在的问题)
  - [回顾 Cookies 和 JWT's 区别](#回顾-Cookies-和-JWT's-区别)
  - [在 微服务 中 Auth 认证的一些细节](#在-微服务-中-Auth-认证的一些细节)
  - [JWT 在 SSR 中遇到的问题](#JWT-在-SSR-中遇到的问题)
  - [Cookie 和 加密](#Cookie-和-加密)
  - [cookie-session 和 express-session 的区别](#cookie-session-和-express-session-的区别)
  - [添加 Cookie-Session](#添加-Cookie-Session)
  - [生成 JWT](#生成-JWT)
  - [使用 Kubernetes 安全地存储 secret](#使用-Kubernetes-安全地存储-secret)
  - [创建和访问 Secrets](#创建和访问-Secrets)
  - [访问 Pod 中的环境变量](#访问-Pod-中的环境变量)
  - [通用的 Response 属性](#通用的-Response-属性)
  - [格式化 JSON 属性](#格式化-JSON-属性)
  - [用户登录的工作流](#用户登录的工作流)
  - [通用的请求验证中间件](#通用的请求验证中间件)
  - [登录的代码逻辑](#登录的代码逻辑)
  - [处理当前用户](#处理当前用户)
  - [返回当前用户](#返回当前用户)
  - [Signing Out](#Signing-Out)
  - [创建处理当前用户的 Middleware](#创建处理当前用户的-Middleware)
  - [Augmenting Type 扩充类型的定义](#Augmenting-Type-扩充类型的定义)
  - [路由访问权限](#路由访问权限)

### 身份认证功能

![在这里插入图片描述](https://img-blog.csdnimg.cn/5ce361ccb076491e9a6d87b84fa16fbb.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 在 microservice 中 User auth 是一个很难的问题
- 有很多方法可以解决，没有一种方法是“绝对正确的”
- 下面是一些解决方案

**[⬆ back to top](#目录)**

### 身份验证策略存在的问题

- 根据需求，我们需要每次服务的操作都进行身份验证
- 首先看`是否登录`再看是否能进行该服务
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/79d3570b22ba4688b7bebea094f18c6c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

1.  Option #1 单个服务依赖于 Auth 服务进行验证

- 每次都请求一遍 Auth
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/129181d29c054bb98fdfcd5599b8c7e6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

  1.1 单个服务 通过 “网关 gateway” 形式依赖 Auth 服务

- 但其实和 Option #1 差不多
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/1345313bb958453bb7062afa9412c730.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

2. 单个服务同样和 Auth 一样有「如何验证用户」的逻辑

- 这样就符合微服务的架构
- 因为 即使 Auth 挂了，我们也能进行 单个服务的 认证功能
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/cc677202e32347dbad37f9808452787f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 选择哪个 Option

Option #1

- 单个服务依赖 auth 服务
- 对身份验证状态的更改会立即反映
- Auth 服务宕机？整个应用程序将破坏

Option #2

- 单个服务同样和 Auth 一样有「如何验证用户」的逻辑
- Auth 服务宕机？NBCS！
- 有的用户被封号了？可是我 5 分钟前刚把认证过后的 Key 给了他们...

**[⬆ back to top](#目录)**

### 解决 Option #2 存在的问题

- 用户创建的流程：认证成功了，就发认证 JWT Cookie 等，以后所有请求都用它
- 注意：其他服务都是「认证」功能，只需要按照代码给定的固定的认证方式认证即可，只有 Auth 是发认证

![在这里插入图片描述](https://img-blog.csdnimg.cn/8ccefcc88e834ab78edec6a789dd5b2b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 场景：管理员想 ban 掉某一个用户

![在这里插入图片描述](https://img-blog.csdnimg.cn/d5a988a01b0b4a79b1836ddf6d942650.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 但这个时候，虽然 Auth 里面 ban 了，其他 Service 并没有 ban
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/356cbf17b7bb4100954d0e0f7eb4b4ee.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 被 ban 的用户还是可以用 JWT/Cookie 对非 Auth 的服务进行认证，这样等于没被 ban，所以是个大问题

**[⬆ back to top](#目录)**

### 回顾 Cookies 和 JWT's 区别

![在这里插入图片描述](https://img-blog.csdnimg.cn/cc677202e32347dbad37f9808452787f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- cookie

![在这里插入图片描述](https://img-blog.csdnimg.cn/c91c0557534549a3871edeee4a0d86df.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- JWT
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/17e3a6e2c6704efc8a790bd257ec0bc2.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

| Cookies                                | JWT's                                       |
| -------------------------------------- | ------------------------------------------- |
| 传输机制                               | Authentication/Authorization 认证/授权 机制 |
| 在浏览器和服务器之间移动任何类型的数据 | 存储我们想要的任何数据                      |
| 由浏览器自动管理                       | 必须手动服务端上管理                        |

**[⬆ back to top](#目录)**

### 在 微服务 中 Auth 认证的一些细节

- 普通用户发起购买请求的时候，需要 Auth 认证
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/54d112ca4bdd4bbcbe32291ced4683bd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- Admin 用户有创建免费优惠券的请求时，需要 Auth 的用户权限认证
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/59b62f72b9184a43acca5dd4693ec0d2.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- Admin 要 封号 的时候，需要同步给 MongoDB![在这里插入图片描述](https://img-blog.csdnimg.cn/f526eee232ed499c95fbfb6a35c69ada.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- Auth 服务发认证的时候，有一个 expiring 过期机制
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/3e272b4a9d144608ac0ebb16c795f6e3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/c7e52d7160134b5499e2e8edd3c1a6be.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

于是我们之前设想的认证机制脱颖而出 -> JWT

- 必须能告诉我们用户的详细信息
- 必须能够处理授权信息
- 必须有一个内置的、防篡改的方式来过期或 - 使自己失效
- 必须在不同语言之间易于理解
- 不需要任何后台数据存储

**[⬆ back to top](#目录)**

### JWT 在 SSR 中遇到的问题

- 普通 React APP 发送认证数据的时机
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/8b13327f6f5e4bcb9063b22d2feaa65b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- SSR 中，我们需要在第一次 request 的时候 就加入 Auth 认证
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/a80d3709a457453d9c243235dd6afc13.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 为了解决 SSR 第一次请求必须要客户端带上 Auth 认证相关数据的问题
- 我们使用 Cookie 存储 JWT 信息，因为 Cookie 是浏览器管理的，能够持续存储，且每次请求的时候浏览器都会主动带上 Cookie
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/70aa14a38d574fa68a916299db098ae6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Cookie 和 加密

- 下面是 signup 的工作流
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/e4f5fd0a5a6846e98dbb0daefe32a30c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

Auth 必须满足的条件：

- 必须携带并告诉用户信息
- 必须能够处理授权信息
- 必须有一个内置的、防篡改的方式来过期或 - 使自己失效
- 必须在不同语言之间易于理解

  - 当我们 encrypt 加密 cookie 中的数据时，跨语言处理 cookie 通常是一个问题
  - 不会对 Cookie 本身加密
  - JWT 是防篡改的
    - 但可以加密 Cookie 的 content 内容，如果有必要的话

- 不需要任何后台数据存储

**[⬆ back to top](#目录)**

### cookie-session 和 express-session 的区别

express-session 服务器上的中间件存储会话数据; 它只在 cookie 本身中保存会话 ID，而不是会话数据。默认情况下，它使用内存存储并且不是为生产环境设计的。在生产中，您需要设置一个可扩展的会话存储；查看兼容的会话存储列表。
express-session 中间件将会话数据存储在服务器上；它仅将会话标识（而非会话数据）保存在 cookie 中。从 1.5.0 版本开始, express-session 不再依赖 cookie-parser,直接通过 req/res 读取/写入;默认存储位置内存存储(服务器端),

相比之下，cookie-session 中间件实现了 cookie 支持的存储：它将整个会话序列化到 cookie，而不仅仅是一个会话密钥。仅当会话数据相对较小且易于编码为原始值（而不是对象）时才使用它。尽管浏览器应该支持每个 cookie 至多 4096 字节，但为确保不超过限制，每个域的大小不要超过 4093 字节。此外，请注意 cookie 数据将对客户端可见，因此如果有任何理由使其安全或隐蔽，那么 express-session 可能是更好的选择。

- 下面这段代码用于测试
  - cookie-session 的 Session 信息存在 浏览器的 cookie 中，服务器不会存储且获取不到
  - express-session 的 Session 信息存在 服务器的 req 缓存中，浏览器的 cookie 只有会话的 session connect id

```js
// ./doc/cookie/cookie-session
// ./doc/cookie/express-session
var express = require("express");
// var session = requile('cookie-session');
var session = require("express-session");
var app = express(); // Use the session middleware
app.use(
  session({
    ////这里的name值得是cookie的name，默认cookie的name是：connect.sid
    //name: 'hhw',
    secret: "keyboard cat",
    cookie:
      ("name",
      "value",
      { path: "/", httpOnly: true, secure: false, maxAge: 60000 }), //重新保存：强制会话保存即使是未修改的。默认为true但是得写上
    resave: true,
    //强制“未初始化”的会话保存到存储。
    saveUninitialized: true,
  })
);
// 只需要用express app的use方法将session挂载在‘/’路径即可，这样所有的路由都可以访问到session。//可以给要挂载的session传递不同的option参数，来控制session的不同特性
app.get("/", function (req, res, next) {
  var sess = req.session; //用这个属性获取session中保存的数据，而且返回的JSON数据
  if (sess.views) {
    sess.views++;
    res.setHeader("Content-Type", "text/html");
    res.write(
      "<p>欢迎第 " +
        sess.views +
        "次访问       " +
        "expires in:" +
        sess.cookie.maxAge / 1000 +
        "s</p>"
    );
    res.end();
  } else {
    sess.views = 1;
    res.end("welcome to the session demo. refresh!");
  }
  console.log(sess.cookie);
});

app.listen(3001);
```

> 测试 express-session
>
> - 服务端中，能通过 req 缓存获取 session.cookie 中的 session 信息
>   ![在这里插入图片描述](https://img-blog.csdnimg.cn/6b04a88d8c11445b9e7e77c9c8a21d5b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
> - 客户端中，cookie 只保存了 session 的 connect id
>   ![在这里插入图片描述](https://img-blog.csdnimg.cn/a094b197f3934dbeae23f3439e802e3f.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

> 测试 cookie-session
>
> - 服务端中，不能获取到 cookie
>   ![在这里插入图片描述](https://img-blog.csdnimg.cn/63465c0d48e34167b4d836aa19ddd9d5.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
> - 客户端，Session 信息存在 浏览器的 cookie 中
>   ![在这里插入图片描述](https://img-blog.csdnimg.cn/c403518cc9c547ac86ded30cfde8580c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- [参考文章](https://blog.51cto.com/u_15127576/2668159)

### 添加 Cookie-Session

[cookie-session](https://github.com/expressjs/cookie-session)
显然，我们在 SSR 中，并不想让 服务端保存 会话信息，特备是 Auth 信息，这是客户端才要保存的，所以要用 `cookie-session`

```typescript
// index.ts
app.set("trust proxy", true);
app.use(json());
app.use(
  cookieSession({
    signed: false, // 默认登录 tag，服务端保存
    secure: true, // 仅通过 https 发送
  })
);
```

**[⬆ back to top](#目录)**

### 生成 a JWT

[jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)

```typescript
// signup.ts
// Generate JWT
const userJwt = jwt.sign(
  {
    id: user.id,
    email: user.email,
  },
  "asdf"
);

// Store it on session object
req.session = {
  jwt: userJwt,
};
```

**[⬆ back to top](#目录)**

### JWT Signing Keys

[BASE64 Decode](https://www.base64decode.org/)
[JWT](https://jwt.io/)
![在这里插入图片描述](https://img-blog.csdnimg.cn/579436a8c0c742979cebad5ede61b31e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/03998410652e4eb8aad71171cfbaf7f8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 使用 Kubernetes 安全地存储 secret

![在这里插入图片描述](https://img-blog.csdnimg.cn/b414c39464e441508fce022400939e74.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/5ead40a2c14940d0a340a210ddb7860c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 创建和访问 Secrets

- 看情况加 -n [xxx namespace]

```console
kubectl create secret generic jwt-secret --from-literal=JWT_KEY=asdf
kubectl get secrets
kubectl describe secret jwt-secret
```

**[⬆ back to top](#目录)**

### 访问 Pod 中的环境变量

```typescript
if (!process.env.JWT_KEY) {
  throw new Error("JWT_KEY must be defined");
}
```

**[⬆ back to top](#目录)**

### 通用的 Response 属性

不同 DB 的属性加到 Response 是不一样的，如图，本来是 id，但 MongoDB 是\_id，而且还有个\_v
![在这里插入图片描述](https://img-blog.csdnimg.cn/03c81c30ca164036af8d807074d8099b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/70be7dbe71a74222bdf8c5bbfb933e49.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 格式化 JSON 属性

```typescript
const person = { name: "alex" };
JSON.stringify(person);
// {"name": "alex"}

const personTwo = {
  name: "alex",
  toJSON() {
    return 1;
  },
};
JSON.stringify(personTwo);
// {1}
```

```typescript
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.__v;
      },
    },
  }
);
```

**[⬆ back to top](#目录)**

### 用户登录的工作流

![在这里插入图片描述](https://img-blog.csdnimg.cn/bf40402db0434a05be912a961d15f597.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
// signin.ts
import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";

import { RequestValidationError } from "../errors/request-validation-error";

const router = express.Router();

router.post(
  "/api/users/signin",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("You must supply a password"),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new RequestValidationError(errors.array());
    }
  }
);

export { router as signinRouter };
```

**[⬆ back to top](#目录)**

### 通用的请求验证中间件

- 在 Step 7 中，我们进行了错误响应一致化，然后每次处理请求的时候，就 express-validator 进行 body 的校验
- 然后 validationResult 捕获错误
- 判断错误是否为空，是就抛出自定义的 Error
- 中间件拆分原因：signup signin 都要进行以上 请求验证 的错误捕获操作，所以还不如直接把`「错误捕获的功能」`拆分成一个中间件

下面是原代码

```typescript
// signup.ts
router.post(
  "/api/users/signup",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20 characters"),
  ],
  async (req: Request, res: Response) => {
    // !!!
    const errors = validationResult(req);
    // !!!
    if (!errors.isEmpty()) {
      throw new RequestValidationError(errors.array());
    }

    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new BadRequestError("Email in use");
    }

    const user = User.build({ email, password });
    await user.save();

    res.status(201).send(user);
  }
);
```

```typescript
// validate-request.ts
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { RequestValidationError } from "../errors/request-validation-error";

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new RequestValidationError(errors.array());
  }

  next();
};
```

```typescript
// signin.ts
import express, { Request, Response } from "express";
import { body } from "express-validator";

import { validateRequest } from "../middleware/validate-request";

const router = express.Router();

router.post(
  "/api/users/signin",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("You must supply a password"),
  ],
  validateRequest,
  (req: Request, res: Response) => {}
);

export { router as signinRouter };
```

**[⬆ back to top](#目录)**

### 登录的代码逻辑

![在这里插入图片描述](https://img-blog.csdnimg.cn/bf40402db0434a05be912a961d15f597.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```typescript
import express, { Request, Response } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";

import { Password } from "../services/password";
import { User } from "../models/user";
import { validateRequest } from "../middlewares/validate-request";
import { BadRequestError } from "../errors/bad-request-error";

const router = express.Router();

router.post(
  "/api/users/signin",
  [
    body("email").isEmail().withMessage("Email must be valid"),
    body("password")
      .trim()
      .notEmpty()
      .withMessage("You must supply a password"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new BadRequestError("Invalid credentials");
    }

    const passwordsMatch = await Password.compare(
      existingUser.password,
      password
    );
    if (!passwordsMatch) {
      throw new BadRequestError("Invalid Credentials");
    }

    // 生成 JWT
    const userJwt = jwt.sign(
      {
        id: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY!
    );

    // Store it on session object
    req.session = {
      jwt: userJwt,
    };

    res.status(200).send(existingUser);
  }
);

export { router as signinRouter };
```

**[⬆ back to top](#目录)**

### 处理当前用户

- 为什么要进行当前用户的处理 - 因为在每一次进行 ReactAPP 的时候，header 上面我们需要按照用户的登录状态，展现 signin signup 还是 signout，详见第 11 章
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/436ccdc540734683abdedbf3945de54b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 返回当前用户

```typescript
import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/api/users/currentuser", (req, res) => {
  if (!req.session?.jwt) {
    return res.send({ currentUser: null });
  }

  try {
    const payload = jwt.verify(req.session.jwt, process.env.JWT_KEY!);
    res.send({ currentUser: payload });
  } catch (err) {
    res.send({ currentUser: null });
  }
});

export { router as currentUserRouter };
```

**[⬆ back to top](#目录)**

### Signing Out

```typescript
import express from "express";

const router = express.Router();

router.post("/api/users/signout", (req, res) => {
  req.session = null;

  res.send({});
});

export { router as signoutRouter };
```

**[⬆ back to top](#目录)**

### 创建处理当前用户的 Middleware

- 这个功能也可以复用

```typescript
// current-user.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const currentUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(req.session.jwt, process.env.JWT_KEY!);
    req.currentUser = payload;
  } catch (err) {}

  next();
};
```

**[⬆ back to top](#目录)**

### Augmenting Type 扩充类型的定义

```typescript
// ./middleware/current-user.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface UserPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const currentUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(
      req.session.jwt,
      process.env.JWT_KEY! // 强制
    ) as UserPayload;
    req.currentUser = payload;
  } catch (err) {}

  next();
};
```

```typescript
// ./routes/current-user
import express from "express";
import jwt from "jsonwebtoken";

import { currentUser } from "../middlewares/current-user";

const router = express.Router();

router.get("/api/users/currentuser", currentUser, (req, res) => {
  res.send({ currentUser: req.currentUser || null });
});

export { router as currentUserRouter };
```

**[⬆ back to top](#目录)**

### 路由访问权限

- 每一个单独的服务，都需要在请求的时候就 「提取 JWT 用户信息」「未认证就报错」
- 所以就有了这两个中间件
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/cd8128284d544dc9997ea50929c669bd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 到目前我们的中间件 以及 作用如下

![在这里插入图片描述](https://img-blog.csdnimg.cn/79378b09cf4345a59b48cc3da74f738c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 新增未认证的错误类型

```typescript
import { CustomError } from "./custom-error";

export class NotAuthorizedError extends CustomError {
  statusCode = 401;

  constructor() {
    super("Not Authorized");

    Object.setPrototypeOf(this, NotAuthorizedError.prototype);
  }

  serializeErrors() {
    return [{ message: "Not authorized" }];
  }
}
```

- 抛出未认证错误的中间件

```typescript
import { Request, Response, NextFunction } from "express";
import { NotAuthorizedError } from "../errors/not-authorized-error";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser) {
    throw new NotAuthorizedError();
  }

  next();
};
```

```typescript
// ./routes/current-user.ts
import express from "express";
import jwt from "jsonwebtoken";

import { currentUser } from "../middlewares/current-user";
import { requireAuth } from "../middlewares/require-auth";

const router = express.Router();

router.get("/api/users/currentuser", currentUser, requireAuth, (req, res) => {
  res.send({ currentUser: req.currentUser || null });
});

export { router as currentUserRouter };
```

**[⬆ back to top](#目录)**
