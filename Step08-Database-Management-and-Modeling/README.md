## 引入 MongoDB

## 目录

- [**引入 MongoDB**](#引入-MongoDB)
- [目录](#目录)
  - [在 K8S 中创建 MongoDB](#在-K8S-中创建-MongoDB)
  - [连接到 MongoDB](#连接到-MongoDB)
  - [用户登录的工作流](#用户登录的工作流)
  - [让 TypeScript 和 Mongoose 搭配](#让-TypeScript-和-Mongoose-搭配)
  - [创建 User Model](#创建-User-Model)
  - [用户属性的类型检查](#用户属性的类型检查)
  - [给 Model 增加静态属性](#给-Model-增加静态属性)
  - [约束 User Document 中的属性](#约束-User-Document-中的属性)
  - [model 的泛型是什么意思](#model-的泛型是什么意思)
  - [创建用户](#创建用户)
  - [新增 400 请求错误 Error ](#新增-400-请求错误-Error)
  - [记得给 Password 加 hash](#记得给-Password-加-hash)
  - [增加 Password Hashing 功能](#增加-Password-Hashing-功能)
  - [比较 Hashed Password](#比较--hashed-password)
  - [Mongoose Pre-Save Hooks](#mongoose-pre-save-hooks)

### 在 K8S 中创建 MongoDB

- 无需手动本地安装，直接用我们之前的 docker image -> pod.container 的技术
- pod 的 container 配置 image，K8S 将给我们自动 pull 进来
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/328c98487f684a0d976f03158e1189c7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-mongo-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: auth-mongo
  template:
    metadata:
      labels:
        app: auth-mongo
    spec:
      containers:
        - name: auth-mongo
          # pull image
          image: mongo
---
apiVersion: v1
kind: Service
metadata:
  name: auth-mongo-srv
spec:
  selector:
    app: auth-mongo
  ports:
    - name: db
      protocol: TCP
      # port 是每个 Node 在 Kubernetes 的 cluster 中的 port
      # targetPort 是 Pod 的 port
      port: 27017
      targetPort: 27017
```

```console
cd ticketing/infra/k8s/
skaffold dev
kubectl get pods
```

- skaffold 一直在 watch `./infra/k8s/*` 变化，所以直接 skaffold 自动化启动即可

**[⬆ back to top](#目录)**

### 连接到 MongoDB

```typescript
// index.ts
import express from "express";
import "express-async-errors";
import { json } from "body-parser";
// 引入
import mongoose from "mongoose";

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

app.all("*", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

const start = async () => {
  try {
    // 连接到 K8S 内部的 srv 的 clusterDomain 和 serviceIPPort
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

### 用户登录的工作流

![在这里插入图片描述](https://img-blog.csdnimg.cn/ae50f32ff9fd4e9c8129ad18dea05973.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 让 TypeScript 和 Mongoose 搭配

![在这里插入图片描述](https://img-blog.csdnimg.cn/db362b764c7e4af0b0aaddfc9e5e6e37.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

目前遇到的问题 #1 with TS + Mongoose

- 创建一个 Document
  Typescript 能确保我们提供正确的属性，但 MongoDB 要确保约束我们传入的属性是比较困难的

```typescript
new User({ email: "test@test.com", password: "lk325kj2" });
```

目前遇到的问题 #2 with TS + Mongoose
我们传递给 User 构造函数的属性不一定与用户可用的属性匹配
如下：MongoDB 不仅要存我们给定的字段，还要自动生成其他字段

```typescript
const user = new User({ email: "test@test.com", password: "lk325kj2" });
console.log(user);
// { email: '..', password: '..', createdAt: '..', updatedAt: '..' }
```

**[⬆ back to top](#目录)**

### 创建 User Model

```typescript
// user.ts
import mongoose from "mongoose";
// 创建一个新的 schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
// .model()方法会生成 shcema 的副本，在调用.model()方之前，请确保已添加了要使用的的所有 shcema。
// 集合 User 在数据库中的 name 是 User
const User = mongoose.model("User", userSchema);

export { User };
```

**[⬆ back to top](#目录)**

### 用户属性的类型检查

解决遇到的问题 #1 with TS + Mongoose
Typescript 能确保我们提供正确的属性，但 MongoDB 要确保约束我们传入的属性是比较困难的
`约束 new User(attrs) 的 attrs 属性即可`

```typescript
// user.ts
import mongoose from "mongoose";

// 一个 interface，描述了在
// 创建用户（传值到数据库）的时候需要做到那些约束
interface UserAttrs {
  email: string;
  password: string;
}
// !!!!!注意 这不是 TypeScript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

// 以后 在 要创建 User 的场景中，用 buildUser 进行创建
const buildUser = (attrs: UserAttrs) => {
  return new User(attrs);
};

export { User, buildUser };
```

**[⬆ back to top](#目录)**

### 给 Model 增加静态属性

- 因为我们需要在创建的时候进行传入值的类型约束，所以需要给 model 抽象出一个 build 方法的 interface，每次通过 build 来创建，build 里面有类型约束
- Q：怎么给 model 抽象出一个 build 方法的 interface？
- A：先继承 Model，在继承后的 UserModel 静态属性中新增 build，最后因为 UserModel 仍然是一个抽象的，需要传给 `mongoose.model<Doc, Model>` 让他理解，所以 UserModel 应该是一个 interface

```typescript
// user.ts
import mongoose from "mongoose";

// 一个 interface，描述了在
// 创建用户（传值到数据库）的时候需要做到哪些传参约束
interface UserAttrs {
  email: string;
  password: string;
}

// 一个 interface，描述了
// 对于 User Model 的属性 的约束
interface UserModel extends mongoose.Model<any> {
  build(attrs: UserAttrs): any;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<any, UserModel>("User", userSchema);

export { User };
```

**[⬆ back to top](#目录)**

### 约束 User Document 中的属性

解决遇到的问题 #2 with TS + Mongoose
我们传递给 User 构造函数的属性不一定与用户可用的属性匹配
MongoDB 不仅要存我们给定的字段，还要自动生成其他字段
`约束 User Document 中的字段即可`

```typescript
import mongoose from "mongoose";

// 一个 interface，描述了在
// 创建用户（传值到数据库）的时候需要做到哪些传参约束
interface UserAttrs {
  email: string;
  password: string;
}

// 一个 interface，描述了
// 对于 User Model 用户集合 的属性 的约束
interface UserModel extends mongoose.Model<UserDoc> {
  build(attrs: UserAttrs): UserDoc;
}

// 一个 interface，描述了
// 对于 User Document 单个独立的用户 的属性 的约束
interface UserDoc extends mongoose.Document {
  email: string;
  password: string;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
});
userSchema.statics.build = (attrs: UserAttrs) => {
  return new User(attrs);
};

const User = mongoose.model<UserDoc, UserModel>("User", userSchema);

export { User };
```

**[⬆ back to top](#目录)**

### model 的泛型是什么意思

- 有对 Document 和 Model（因为 Model 中有 N 个 Document，所以要依赖 于 Document） 的约束
- 返回值是 Model 约束后的结果，返回的是` Model xx集合`

```typescript
// index.d.ts
export function model<T extends Document, U extends Model<T>>(
  name: string,
  schema?: Schema,
  collection?: string,
  skipInit?: boolean
): U;
```

**[⬆ back to top](#目录)**

### 创建用户

```typescript
// signup.ts
import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { User } from "../models/user";
import { RequestValidationError } from "../errors/request-validation-error";

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
  async (req: Request, res: Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new RequestValidationError(errors.array());
    }

    const { email, password } = req.body;
    // 查找有无用户创建
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("Email in use");
      return res.send({});
    }

    const user = User.build({ email, password });
    await user.save();

    res.status(201).send(user);
  }
);

export { router as signupRouter };
```

**[⬆ back to top](#目录)**

### 新增 400 请求错误 Error

```typescript
// bad-request-error.ts
import { CustomError } from "./custom-error";

export class BadRequestError extends CustomError {
  statusCode = 400;

  constructor(public message: string) {
    super(message);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  serializeErrors() {
    return [{ message: this.message }];
  }
}
```

```typescript
// signup.ts
if (existingUser) {
  throw new BadRequestError("Email in use");
}
```

**[⬆ back to top](#目录)**

### 记得给 Password 加 hash

- 创建用户
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/df696c74fda74967a45e38c533f53ef0.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 密码验证
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/c2fdd7f6c7324878b8a5fbbddee56de7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 增加 Password Hashing 功能

- 密码加密要用到 `crypto` ，因为是异步进行的，所以需要 `promisify化`，这里我们来复习下 `Promisify、PromisifyAll、Promise.all` 吧

```js
// 1.promisify

function toPrimisify(fn) {
 return function(...args) {
     return new Promise(function(resolve, reject) {
         fn(...args, (err, data) => { err ? reject(err) : resolve(data)})
     })
 }
 let read = toPrimisify(fs.readFile);
 read ('./1.txt',
 'utf8').then(res = >{
     console.log(res)
 });

// 2.promisifyAll

function toPromisifyAll(obj) {

    Object.keys(obj).forEach((item, index) = >{

        if (typeof obj[item] == 'function') obj[item + 'Async'] = toPrimisify(obj[item])
    })
}
toPromisifyAll(fs);
fs.readFileAsync('./2.txt', 'utf8').then(res = >{
    console.log(res)
});

// 3.promise.all

function promiseAll(promises) {
	return new Promise(function(resolve, reject) {
	    if (!Array.isArray(promises)) {
	        return reject(new TypeError("argument must be anarray"))
	    }
	    var countNum = 0;
	    var promiseNum = promises.length;
	    var resolvedvalue = new Array(promiseNum);
	    for (var i = 0; i < promiseNum; i++) { (function(i) {
	            Promise.resolve(promises[i]).then(function(value) {
	                countNum++;
	                resolvedvalue[i] = value;
	                if (countNum === promiseNum) {
	                    return resolve(resolvedvalue)
	                }
	            },
	            function(reason) {
	                return reject(reason))
	            })(i)
	        }
	    })
	}

var p1 = Promise.resolve(1),
p2 = Promise.resolve(2),
p3 = Promise.resolve(3);

promiseAll([p1, p2, p3]).then(function(value) {
    console.log(value)

})
```

- 同时，也要用到 nodejs 的 内置类 Buffer
  JavaScript 语言自身只有字符串数据类型，没有二进制数据类型。
  但在处理像 TCP 流或文件流时，必须使用到二进制数据。因此在 Node.js 中，定义了一个 Buffer 类，该类用来创建一个专门存放二进制数据的缓存区。
  在 Node.js 中，Buffer 类是随 Node 内核一起发布的核心库。Buffer 库为 Node.js 带来了一种存储原始数据的方法，可以让 Node.js 处理二进制数据，每当需要在 Node.js 中处理 I/O 操作中移动的数据时，就有可能使用 Buffer 库。原始数据存储在 Buffer 类的实例中。一个 Buffer 类似于一个整数数组，但它对应于 V8 堆内存之外的一块原始内存。

```typescript
// password.ts
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// convert callback scrypt function to async await use
const scryptAsync = promisify(scrypt);

export class Password {
  static async toHash(password: string) {
    const salt = randomBytes(8).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;

    return `${buf.toString("hex")}.${salt}`;
  }
}
```

**[⬆ back to top](#目录)**

### 比较 Hashed Password

```typescript
// password.ts
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// convert callback scrypt function to async await use
const scryptAsync = promisify(scrypt);

export class Password {
  static async compare(storedPassword: string, suppliedPassword: string) {
    const [hashedPassword, salt] = storedPassword.split(".");
    const buf = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;

    return buf.toString("hex") === hashedPassword;
  }
}
```

**[⬆ back to top](#目录)**

### Mongoose Pre-Save Hooks

- 这个 hooks 主要是在 做`[xxx action]`操作之前，需要做的事情
- 我们这里当然是在保存 password 之前，进行 toHash 操作

```typescript
// user.ts
userSchema.pre("save", async function (done) {
  if (this.isModified("password")) {
    const hashed = await Password.toHash(this.get("password"));
    this.set("password", hashed);
  }
  done(); // complete async work
});
```

**[⬆ back to top](#目录)**
