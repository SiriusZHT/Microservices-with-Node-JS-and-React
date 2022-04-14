## 集成服务器端渲染的 React APP

## 目录

- [**集成服务器端渲染的 React APP**](#集成服务器端渲染的-React-APP)
- [目录](#目录)

  - [Starting the React App](#Starting-the-React-App)
  - [客户端渲染和服务端渲染](#客户端渲染和服务端渲染)
  - [Next JS 基础知识](#Next-JS-基础知识)
  - [构建 Next 镜像](#构建-Next-镜像)
  - [在 Kubernetes 中运行 Next](#在-Kubernetes-中运行-Next)
  - [文件更改检测](#文件更改检测)
  - [添加全局 CSS](#添加全局-CSS)
  - [新增注册的表单](#新增注册的表单)
  - [处理 Email 和 Password 输入](#处理-Email-和-Password-输入)
  - [Successful Account Signup](#Successful-Account-Signup)
  - [处理登录 Errors](#处理登录-Errors)
  - [The useRequest Hook](#The-useRequest-Hook)
  - [使用 useRequest Hook](#使用-useRequest-Hook)
  - [新增 onSuccess Callback](#新增-onSuccess-Callback)
  - [服务器端渲染的简介](#服务器端渲染的简介)
  - [为什么会报错?](#为什么会报错)
  - [两种解决方案](#两种解决方案)
  - [跨 namespace 的交流](#跨-namespace-的交流)
  - [getInitialProps 什么时候被调用？](#getInitialProps-什么时候被调用)
  - [判断在 server 还是在 browser](#判断在-server-还是在-browser)
  - [记得带上 host](#记得带上-host)
  - [带上 Cookies](#带上-Cookies)
  - [可复用的 SSR getInitialProps 请求](#可复用的-SSR-getInitialProps-请求)
  - [登陆页面上的内容](#登陆页面上的内容)
  - [登录的表单](#登录的表单)
  - [可复用的 Header](#可复用的-Header)
  - [增加 GetInitialProps](#增加-GetInitialProps)
  - [自定义 Custom APP GetInitialProps 的问题](#自定义-Custom-APP-GetInitialProps-的问题)
  - [处理多个-GetInitialProps](#处理多个-GetInitialProps)
  - [传递 Props](#传递-Props)
  - [构建 Header](#构建-Header)
  - [header 中根据条件分配 Link](#header-中根据条件分配-Link)
  - [Sign out](#登出)

### Starting the React App

![在这里插入图片描述](https://img-blog.csdnimg.cn/f5c47f9c87fe49c1b9b0caa208a2d09e.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 客户端渲染和服务端渲染

客户端渲染
![在这里插入图片描述](https://img-blog.csdnimg.cn/8428c86f613142b3a911fdf3ce4cf2d1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
服务端渲染

![在这里插入图片描述](https://img-blog.csdnimg.cn/0b767593afcd43669549d8a10632e52b.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Next JS 基础知识

- install react, react-dom, next
- create pages folder and add page components
  - next 在第一次启动的时候，会遍历一遍 page 的文件，其中 index 会被作为根路由，而其他同级文件和文件夹将一次作为 `/` 的路由
- npm run dev

**[⬆ back to top](#目录)**

### 构建 Next 镜像

```docker
FROM node:alpine

WORKDIR /app
COPY package.json .
RUN npm install
COPY . .

CMD ["npm", "run", "dev"]
```

```console
docker build -t heysirius/client .
docker push heysirius/client
```

**[⬆ back to top](#目录)**

### 在 Kubernetes 中运行 Next

```yaml
# client-depl.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-depl
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client
  template:
    metadata:
      labels:
        app: client
    spec:
      containers:
        - name: client
          image: heysirius/client
---
apiVersion: v1
kind: Service
metadata:
  name: client-srv
spec:
  selector:
    app: client
  ports:
    - name: client
      protocol: TCP
      port: 3000
      targetPort: 3000
```

```yaml
# skaffold.yaml
apiVersion: skaffold/v2alpha3
kind: Config
deploy:
  kubectl:
    manifests:
      - ./infra/k8s/*
build:
  local:
    push: false
  artifacts:
    - image: heysirius/auth
      context: auth
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "src/**/*.ts"
            dest: .
    - image: heysirius/client
      context: client
      docker:
        dockerfile: Dockerfile
      sync:
        manual:
          - src: "**/*.js"
            dest: .
```

```yaml
# ingress-srv.yaml.old
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  rules:
    - host: ticketing.dev
      http:
        paths:
          - path: /api/users/?(.*)
            backend:
              serviceName: auth-srv
              servicePort: 3000
          - path: /?(.*)
            backend:
              serviceName: client-srv
              servicePort: 3000
```

```yaml
# ingress-srv.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ingress-service
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/use-regex: 'true'
spec:
  rules:
    - host: ticketing.dev
      http:
        paths:
 		  - path: /?(.*)
            pathType: Prefix
            backend:
              service:
                name: client-srv
                port:
                  number: 3000
```

```console
skaffold dev
```

- Goto chrome - `https://ticketing.dev/`
- Type 'thisisunsafe'

**[⬆ back to top](#目录)**

### 文件更改检测

```javascript
// next.config.js
module.exports = {
  webpackDevMiddleware: (config) => {
    config.watchOptons.poll = 300;
    return config;
  },
};
```

```console
kubectl get pods
kubectl delete pod client-depl-b955695bf-8ws8j
kubectl get pods
```

**[⬆ back to top](#目录)**

### 添加全局 CSS

[Global CSS Must Be in Your Custom《 App》](https://github.com/vercel/next.js/blob/canary/errors/css-global.md)

```javascript
// _app.js
import "bootstrap/dist/css/bootstrap.css";

export default ({ Component, pageProps }) => {
  return <Component {...pageProps} />;
};
```

**[⬆ back to top](#目录)**

### 新增注册的表单

```javascript
// signup.js
export default () => {
  return (
    <form>
      <h1>Sign Up</h1>
      <div className="form-group">
        <label>Email Address</label>
        <input className="form-control" />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" className="form-control" />
      </div>
      <button className="btn btn-primary">Sign Up</button>
    </form>
  );
};
```

**[⬆ back to top](#目录)**

### 处理 Email 和 Password 输入

```javascript
// signup.js
import { useState } from "react";

export default () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();

    console.log(email, password);
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Sign Up</h1>
      <div className="form-group">
        <label>Email Address</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="form-control"
        />
      </div>
      <button className="btn btn-primary">Sign Up</button>
    </form>
  );
};
```

**[⬆ back to top](#目录)**

### Successful Account Signup

![在这里插入图片描述](https://img-blog.csdnimg.cn/58f7060c76e54a56bcaee1a894396ea8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
// signup.js
const onSubmit = async (event) => {
  event.preventDefault();

  const response = await axios.post("/api/users/signup", {
    email,
    password,
  });

  console.log(response.data);
};
```

**[⬆ back to top](#目录)**

### 处理登录 Errors

```javascript
// signup.js
const [errors, setErrors] = useState([]);

const onSubmit = async (event) => {
  event.preventDefault();

  try {
    const response = await axios.post("/api/users/signup", {
      email,
      password,
    });

    console.log(response.data);
  } catch (err) {
    setErrors(err.response.data.errors);
  }
};
```

**[⬆ back to top](#目录)**

### The useRequest Hook

![在这里插入图片描述](https://img-blog.csdnimg.cn/cc1ceb7d5b104b44a6725c2050233a98.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
// use-request.js
import axios from "axios";
import { useState } from "react";

export default ({ url, method, body }) => {
  const [errors, setErrors] = useState(null);

  const doRequest = async () => {
    try {
      setErrors(null);
      const response = await axios[method](url, body);
      return response.data;
    } catch (err) {
      setErrors(
        <div className="alert alert-danger">
          <h4>Ooops....</h4>
          <ul className="my-0">
            {err.response.data.errors.map((err) => (
              <li key={err.message}>{err.message}</li>
            ))}
          </ul>
        </div>
      );
    }
  };

  return { doRequest, errors };
};
```

**[⬆ back to top](#目录)**

### 使用 useRequest Hook

```javascript
// signup.js
const { doRequest, errors } = useRequest({
  url: "/api/users/signup",
  method: "post",
  body: {
    email,
    password,
  },
});

const onSubmit = async (event) => {
  event.preventDefault();

  doRequest();
};
```

**[⬆ back to top](#目录)**

### 新增 onSuccess Callback

```javascript
// use-request.js
import axios from "axios";
import { useState } from "react";

export default ({ url, method, body, onSuccess }) => {
  const [errors, setErrors] = useState(null);

  const doRequest = async () => {
    try {
      setErrors(null);
      const response = await axios[method](url, body);

      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;
    } catch (err) {
      setErrors(
        <div className="alert alert-danger">
          <h4>Ooops....</h4>
          <ul className="my-0">
            {err.response.data.errors.map((err) => (
              <li key={err.message}>{err.message}</li>
            ))}
          </ul>
        </div>
      );
    }
  };

  return { doRequest, errors };
};
```

```javascript
// signup.js
const { doRequest, errors } = useRequest({
  url: "/api/users/signup",
  method: "post",
  body: {
    email,
    password,
  },
  onSuccess: () => Router.push("/"),
});

const onSubmit = async (event) => {
  event.preventDefault();

  await doRequest();
};
```

**[⬆ back to top](#目录)**

### 服务器端渲染的简介

- 用户请求的时候，只返回完全渲染好了的 html
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/68a2e496ae354ca88ba51e98e0b46fd8.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- nextjs 客户端
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/4ee53073c5044a31965d96bb1cab6933.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
// index.js
const LandingPage = ({ color }) => {
  console.log("I am in the component", color);
  return <h1>Landing Page</h1>;
};

LandingPage.getInitialProps = () => {
  console.log("I am on the server!");

  return { color: "red" };
};

export default LandingPage;
```

**[⬆ back to top](#目录)**

### 在 SSR 期间获取数据

- 如果写在 component 的话，就是在浏览器里面获取的，不是服务端

```javascript
LandingPage.getInitialProps = async () => {
  const response = await axios.get("/api/users/currentuser");

  return response.data;
};
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/2437f0ca4eff441b845ab83d51a254e9.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 为什么会报错

- ssr Request from browser

```javascript
const LandingPage = ({ currentUser }) => {
  console.log(currentUser);
  axios.get("/api/users/currentuser");

  return <h1>Landing Page</h1>;
};
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/f948d718d8de40a79ce678cc5fdf9a07.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- ssr Request from server

```javascript
LandingPage.getInitialProps = async () => {
  const response = await axios.get("/api/users/currentuser");

  return response.data;
};
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/791d90a9876544b0a5f3f1171f33a963.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/94a2003caa194f2387658e8acaa92aa1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 服务端渲染的时候，因为没在 xx 域名下，所以请求的路由自动转为 localhost
- 在 k8s 中，每个 container 都有 localhost，所以请求的路由请求的其实是 client container 该 port 的服务
- 并没请求到 Auth Service，所以才会报 127.0.0.1:80 的错

![在这里插入图片描述](https://img-blog.csdnimg.cn/4eecd97eb2544e7fa3f7fdb9faeece03.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 两种解决方案

1. 发送到 ingress 里面，ingress 帮忙转发
2. 直接发送给 单独的 Pod 的 srv
   ![在这里插入图片描述](https://img-blog.csdnimg.cn/3cc56f458f1a41c5a888b2556a179578.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 不管是直接发 还是 间接发 都需要带上 cookie

![在这里插入图片描述](https://img-blog.csdnimg.cn/5fb6fc2acb7243e290ec0bcdd765851a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 跨 namespace 的交流

这里用方案一 直接发给 ingress nginx 更好，所以采取 Request Option #1

```console
kubectl get services -n ingress-nginx
kubectl get namespace
```

- service.namespace.svc.cluster.local
- http://ingress-nginx-controller.ingress-nginx.svc.cluster.local
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/3ee72099263c4ce490bd2a541f7b80fd.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

![在这里插入图片描述](https://img-blog.csdnimg.cn/7adcb8a587e74cc797afdcf967f61ba7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/42939489fb784249a865716048246026.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### getInitialProps 什么时候被调用

| Request from a component                 | Request from getInitialProps                   |
| ---------------------------------------- | ---------------------------------------------- |
| 总是从浏览器中发出，所以直接默认带上域名 | 有可能是浏览器和服务器，所以需要进行环境的判断 |

![在这里插入图片描述](https://img-blog.csdnimg.cn/3bb03372ed15471f8d33dc89ed84bd36.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 判断在 server 还是在 browser

```javascript
LandingPage.getInitialProps = async () => {
  if (typeof window === "undefined") {
    // we are on the server!
    // requests should be made to http://ingress-nginx-controller.ingress-nginx.svc.cluster.local
  } else {
    // we are on the browser!
    // requests should be made with a base url of ''
  }
  return {};
};
```

**[⬆ back to top](#目录)**

### 记得带上 host

```console
kubectl get services -n ingress-nginx
kubectl get namespace
```

- service.namespace.svc.cluster.local
- http://ingress-nginx-controller.ingress-nginx.svc.cluster.local

```javascript
LandingPage.getInitialProps = async () => {
  if (typeof window === "undefined") {
    // we are on the server!
    // requests should be made to http://ingress-nginx-controller.ingress-nginx.svc.cluster.local
    const { data } = await axios.get(
      "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser",
      {
        headers: {
          Host: "ticketing.dev",
        },
      }
    );

    return data;
  } else {
    // we are on the browser!
    // requests should be made with a base url of ''
    const { data } = await axios.get("/api/users/currentuser");

    return data;
  }
  return {};
};
```

**[⬆ back to top](#目录)**

### 带上 Cookies

- 所有的会话信息都在 header.cookie 里
- 而 host 信息其实也在 header 里
- 所以直接换成带 header

![在这里插入图片描述](https://img-blog.csdnimg.cn/5fb6fc2acb7243e290ec0bcdd765851a.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/159888ff92b84e74805c63a18216b5de.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
LandingPage.getInitialProps = async ({ req }) => {
  if(typeof window === 'undefined') {
    // we are on the server!
    // requests should be made to http://ingress-nginx-controller.ingress-nginx.svc.cluster.local
    const { data } = await axios.get(
      'http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser',
      {
        headers: req.headers
      }
    );

    return data;
  } else { ... }
  return {};
};
```

**[⬆ back to top](#目录)**

### 可复用的 SSR getInitialProps 请求

![在这里插入图片描述](https://img-blog.csdnimg.cn/025a83cc499d4d269b6f93da917f65d6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
// build-client.js
import axios from "axios";

export default ({ req }) => {
  if (typeof window === "undefined") {
    // we are on the server

    return axios.create({
      baseURL:
        "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local",
      headers: req.headers,
    });
  } else {
    // we are on the browser

    return axios.create({
      baseURL: "",
    });
  }
};
```

```javascript
// index.js
LandingPage.getInitialProps = async (context) => {
  const client = buildClient(context);
  const { data } = await client.get("/api/users/currentuser");

  return data;
};
```

**[⬆ back to top](#目录)**

### 登陆页面上的内容

```javascript
const LandingPage = ({ currentUser }) => {
  return currentUser ? (
    <h1>You are signed in</h1>
  ) : (
    <h1>You are NOT signed in</h1>
  );
};
```

**[⬆ back to top](#目录)**

### 登录的表单

```javascript
// signin.js
import { useState, useEffect } from "react";
import Router from "next/router";
import useRequest from "../../hooks/use-request";

export default () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { doRequest, errors } = useRequest({
    url: "/api/users/signin",
    method: "post",
    body: {
      email,
      password,
    },
    onSuccess: () => Router.push("/"),
  });

  const onSubmit = async (event) => {
    event.preventDefault();

    await doRequest();
  };

  return (
    <form onSubmit={onSubmit}>
      <h1>Sign In</h1>
      <div className="form-group">
        <label>Email Address</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          className="form-control"
        />
      </div>
      {errors}
      <button className="btn btn-primary">Sign In</button>
    </form>
  );
};
```

**[⬆ back to top](#目录)**

### 可复用的 Header

```javascript
// _app.js
import "bootstrap/dist/css/bootstrap.css";

export default ({ Component, pageProps }) => {
  return (
    <div>
      <h1>Header!</h1>
      <Component {...pageProps} />
    </div>
  );
};
```

**[⬆ back to top](#目录)**

### 增加 GetInitialProps

```javascript
// _app.js
import "bootstrap/dist/css/bootstrap.css";
import buildClient from "../api/build-client";

const AppComponent = ({ Component, pageProps }) => {
  return (
    <div>
      <h1>Header!</h1>
      <Component {...pageProps} />
    </div>
  );
};

AppComponent.getInitialProps = () => {};

export default AppComponent;
```

**[⬆ back to top](#目录)**

### 自定义 Custom APP GetInitialProps 的问题

- 不同 component 的 getInitialProps 是不一样的
- 因为我们自定义 APP component 下会包裹 page component
- 所以 nextjs 的 getInitialProps 会有不同参数类型
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/00360f74bcc148899626dac5a3b6f0b7.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/a7dd2643ba46494389e57092a1d31894.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 在添加 AppComponent.getInitialProps 的时候。LandingPage.getInitialProps 不会被调用

```javascript
AppComponent.getInitialProps = async (appContext) => {
  const client = buildClient(appContext.ctx);
  const { data } = await client.get("/api/users/currentuser");

  return data;
};
```

**[⬆ back to top](#目录)**

### 处理多个 GetInitialProps

![在这里插入图片描述](https://img-blog.csdnimg.cn/e6afce0ac7a142859b3862129b9a911c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
![在这里插入图片描述](https://img-blog.csdnimg.cn/21a72b200f8f44c5b62c37554f694dc6.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

```javascript
AppComponent.getInitialProps = async (appContext) => {
  const client = buildClient(appContext.ctx);
  const { data } = await client.get("/api/users/currentuser");

  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx);
  }

  console.log(pageProps);

  return data;
};
```

**[⬆ back to top](#目录)**

### 传递 Props

```javascript
import "bootstrap/dist/css/bootstrap.css";
import buildClient from "../api/build-client";

const AppComponent = ({ Component, pageProps, currentUser }) => {
  return (
    <div>
      <h1>Header! {currentUser.email} </h1>
      <Component {...pageProps} />
    </div>
  );
};

AppComponent.getInitialProps = async (appContext) => {
  const client = buildClient(appContext.ctx);
  const { data } = await client.get("/api/users/currentuser");

  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx);
  }

  return {
    pageProps,
    ...data,
  };
};

export default AppComponent;
```

**[⬆ back to top](#目录)**

### 构建 Header

```javascript
// header.js
import Link from "next/link";

export default ({ currentUser }) => {
  return (
    <nav className="navbar navbar-light bg-light">
      <Link href="/">
        <a className="navbar-brand">GitTix</a>
      </Link>

      <div className="d-flex justify-content-end">
        <ul className="nav d-flex align-items-center">
          {currentUser ? "Sign out" : "Sign in/up"}
        </ul>
      </div>
    </nav>
  );
};
```

**[⬆ back to top](#目录)**

### header 中根据条件分配 Link

```javascript
import Link from "next/link";

export default ({ currentUser }) => {
  const links = [
    !currentUser && { label: "Sign Up", href: "/auth/signup" },
    !currentUser && { label: "Sign In", href: "/auth/signin" },
    currentUser && { label: "Sign Out", href: "/auth/signout" },
  ]
    .filter((linkConfig) => linkConfig)
    .map(({ label, href }) => {
      return (
        <li key={href} className="nav-item">
          <Link href={href}>
            <a className="nav-link">{label}</a>
          </Link>
        </li>
      );
    });

  return (
    <nav className="navbar navbar-light bg-light">
      <Link href="/">
        <a className="navbar-brand">GitTix</a>
      </Link>

      <div className="d-flex justify-content-end">
        <ul className="nav d-flex align-items-center">{links}</ul>
      </div>
    </nav>
  );
};
```

**[⬆ back to top](#目录)**

### 登出

```javascript
import { useEffect } from "react";
import Router from "next/router";
import useRequest from "../../hooks/use-request";

export default () => {
  const { doRequest } = useRequest({
    url: "/api/users/signout",
    method: "post",
    body: {},
    onSuccess: () => Router.push("/"),
  });

  useEffect(() => {
    doRequest();
  }, []);

  return <div>Signing you out...</div>;
};
```

**[⬆ back to top](#目录)**
