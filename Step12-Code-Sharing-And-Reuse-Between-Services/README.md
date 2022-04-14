## 多服务中的代码共享

## 目录

- [**多服务中的代码共享**](#多服务中的代码共享)
- [目录](#目录)

  - [在各个服务中共享代码逻辑](#在各个服务中共享代码逻辑)
  - [代码共享能想到的 Options](#代码共享能想到的-Options)
  - [创建 NPM organization](#创建-NPM-organization)
  - [Publishing NPM Modules](#Publishing-NPM-Modules)
  - [TS 转 JS 设置](#TS-转-JS-设置)
  - [简单的 Publish 命令](#简单的-Publish-命令)
  - [删掉之前项目的相同 lib](#删掉之前项目的相同-lib)
  - [更新 import 参数](#更新-import-参数)
  - [更新 shared lib](#更新-shared-lib)
  - [国内 publish 不上去的解决](#国内-publish-不上去的解决)

### 在各个服务中共享代码逻辑

- 在 Step #7 和 Step #9 中，Auth 认证、request 相关的中间件 和 Error & Error handler
- 这些不仅是 Auth 服务会用到，其他服务同样会用到，原因是微服务架构下的 Auth 认证我们选择了每个服务独立的，详见 Step #9
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/bb8dd77f867c4f5fbb3798efb868db7d.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 代码共享能想到的 Options

Option #1 直接复制粘贴代码
![在这里插入图片描述](https://img-blog.csdnimg.cn/244120f0be00431091a76b8459c9bfa1.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

Option #2 每个服务抽出成单个 single repo 在 git 上管理共享代码
![在这里插入图片描述](https://img-blog.csdnimg.cn/a14b732e132541fb822dc85e4128b984.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
Option #3 【将会使用】

- 很多公司都是使用的 monorepo 来管理，因为单个 repo 管理实在是麻烦，因为会涉及到 git 的一些协同，特别是版本问题
- 所以我们将 common code 直接发布到一个能方便版本号管理的 lib 里，git 上的代码直接通过版本号来管理就行了
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/a0b546edd1ec4cd0ba9db5e8aac99c4c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### 创建 NPM organization

- Goto https://www.npmjs.com/
- create public organization

**[⬆ back to top](#目录)**

### Publishing NPM Modules

```console
npm init -y
git init
git add .
git commit -m "initial commit"
npm login
npm publish --access public
```

**[⬆ back to top](#目录)**

### TS 转 JS 设置

- 公共库和我们的服务之间的 TS 设置可能存在差异 - 这种差异我们不想处理
- 服务可能根本不是用 TS 编写的！
- 所以我们的公共库将以 Typescript 编写并以 Javascript 发布

```ts
// tsconfig.json
    "declaration": true,                   /* Generates corresponding '.d.ts' file. */
```

```console
cd ticketing/common
tsc --init
```

**[⬆ back to top](#目录)**

### 简单的 Publish 命令

```console
git status
git add .
git commit -m "additional config"
npm version patch
npm run build
npm login
npm publish --access public
```

- https://www.npmjs.com/package/@heysirius-common/common

**[⬆ back to top](#目录)**

### 删掉之前项目的相同 lib

- 将 errors 和 middlewares 从 auth services 移动到 common npm module

```json
// package.json
  "name": "@heysirius-common/common",
  "version": "1.0.3",
  "description": "",
  "main": "./build/index.js",
  "types": "./build/index.d.ts",
  "files": [
    "build/**/*"
  ],
  "scripts": {
    "clean": "del ./build/*",
    "build": "npm run clean && tsc",
    "pub": "git add . && git commit -m \"Updates\" && npm version patch && npm run build && npm publish --access public"
  },
```

```
npm i express express-validator cookie-session jsonwebtoken @types/cookie-session @types/express @types/jsonwebtoken
npm run pub
```

![在这里插入图片描述](https://img-blog.csdnimg.cn/c093a0b9b9ec4ad094495310caf372af.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
**[⬆ back to top](#目录)**

### 更新 import 参数

```console
npm i @heysirius-common/common
```

```typescript
import { errorHandler, NotFoundError } from "@heysirius-common/common";
```

**[⬆ back to top](#目录)**

### 更新 shared lib

```console
cd ticketing/common
npm run pub
cd ../auth
npm update @heysirius-common/common
```

- 看下我们的 pod 里面有没有更新成功

```console
kubectl get pods
kubectl exec -it auth-depl-86c85d4895-n4bp4 sh
/app # cd node_modules/@heysirius-common/common
/app # cat package.json
```

**[⬆ back to top](#目录)**

### 国内 publish 不上去的解决

- Option #1 用 nvm 换成国外的源
- Option #2 selected 直接手动换源 npm config set registry https://registry.npmjs.org/

到现在一切正常
![在这里插入图片描述](https://img-blog.csdnimg.cn/c425520d6f8c41de8146377b386f3f79.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
