## **使用 Docker 运行服务**

## 目录

- [**使用 Docker 运行服务**](#部署中的一些问题)
- [目录](#目录)
  - [部署中的一些问题](#deployment-issues)
  - [Why Docker?](#why-docker)
  - [Why Kubernetes?](#why-kubernetes)
  - [Dockerizing the Posts Service](#dockerizing-the-posts-service)
  - [Docker 的一些基础命令](#Docker-的一些基础命令)
  - [Dockering Other Services](#dockering-other-services)

### 部署中的一些问题

- 在之前的项目中，我们部署都是在本地计算机或者服务器上，直接开一个 port 进行的

![在这里插入图片描述](https://img-blog.csdnimg.cn/3c8fdede1354435b8706f8dae40d1eac.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

- 在上线后，可能会遇到某一种服务的 port 请求次数太多 比如 comment 服务，那就再开一个 port 吧！
- 可能这个 machine 的性能也直接降低了，那就再来第二个 virtual machine 吧！
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/b7f0a0860281470aa7db69c047cbd221.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
- 于是，我们就在 event-bus 中，增加很多接口咯，每多开一个，就手动多加一个接口，可见非常的笨拙

```javascript
// event-bus/index.js
app.post("/events", (req, res) => {
  const event = req.body;
  events.push(event);

  axios.post("http://localhost:4000/events", event);
  axios.post("http://localhost:4001/events", event);
  axios.post("http://localhost:4002/events", event);
  axios.post("http://localhost:4003/events", event);

  axios.post("http://localhost:4006/events", event);
  axios.post("http://localhost:4007/events", event);

  res.send({ status: "OK" });
});
```

- 或者，想优化的话，就固定某时间开几个 port 咯？还是很笨

```javascript
// event-bus/index.js
app.post('/events', (req, res) => {
  const event = req.body;
  events.push(event);

  axios.post('http://localhost:4000/events', event);
  axios.post('http://localhost:4001/events', event);
  axios.post('http://localhost:4002/events', event);
  axios.post('http://localhost:4003/events', event);

  if(it is not 1 am) {
    axios.post('http://181.143.203.151/events', event);
    axios.post('http://181.143.203.152/events', event);
  }

  res.send({ status: 'OK' });
});
```

**[⬆ back to top](#目录)**

### Why Docker

现在遇到的问题

- 运行我们的 app 需要很多环境 和 配置 (npm start)

Docker 就能解决这些问题

- Containers 容器包含了程序所需的一切 + 如何启动和运行它
  ![在这里插入图片描述](https://img-blog.csdnimg.cn/0d7c39d54fcc4c1d82000a8fcb2e9aa3.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)
  **[⬆ back to top](#目录)**

### Why Kubernetes

Kubernetes 是一个运行一堆不同容器 container 的工具 我们给它一些配置来描述希望我们的容器如何运行和相互交互

![[外链图片转存失败,源站可能有防盗链机制,建议将图片保存下来直接上传(img-0eztaTAm-1649388058957)(section-03/06-kubernetes-cluster.jpg)]](https://img-blog.csdnimg.cn/8b2280433e6946d79a76b22816a9a94c.png?x-oss-process=image/watermark,type_d3F5LXplbmhlaQ,shadow_50,text_Q1NETiBA5ZeoU2lyaXVz,size_20,color_FFFFFF,t_70,g_se,x_16)

**[⬆ back to top](#目录)**

### Dockerizing the Posts Service

下面这个表格是 Dockerfile 的结构:

| 操作指令 | 配置参数         | 解释                                                                                                                                                       |
| -------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FROM     | node:alpine      | 指定基础镜像是那种操作系统，比如 Ubuntu，node:alpine 是专为 nodejs 的 alpine 系统                                                                          |
| WORKDIR  | /app             | 在 container 中将工作目录设置为“/app”，就是说只关注 /app 下的代码                                                                                          |
| COPY     | package.json ./  | 只拷贝 package.json 到 container，如果和下面那个拷贝合并，那么每次修改非 package.json 的代码 build 和 run 的时候就会重新拉取 package.json 的依赖，为了性能 |
| RUN      | npm install      | Install all dependencies                                                                                                                                   |
| COPY     | ./ ./            | 复制所有 非 package.json 的代码                                                                                                                            |
| CMD      | ["npm", "start"] | 在 container 启动的时候 需要执行的命令，而非 构建镜像的时候要执行的命令                                                                                    |

**[⬆ back to top](#目录)**

### Docker 的一些基础命令

| Docker Commands                              | 解释                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| docker build -t heysirius/posts .            | 根据当前目录下的 dockerfile 构建镜像。将其标记为“heysirius/posts”                                 |
| docker run [image id or image tag]           | 根据提供的镜像 id 或标签创建并启动容器                                                            |
| docker run -it [image id or image tag] [cmd] | 创建和启动 container，但会覆盖我们在 Dockerfile 里的命令                                          |
| docker ps                                    | 查看所有正在运行的 container 的信息                                                               |
| docker exec -it [container id] [cmd]         | 在正在运行的 container 中，执行给定的命令，一般是加个 sh 开启 shell，-i 是 input，-t 是能显示出来 |
| docker logs [container id]                   | container 运行肯定会有 logs 吧                                                                    |

```shell
docker build -t heysirius/posts .
docker run heysirius/posts
docker run -it heysirius/posts sh
docker ps
docker exec -it a643fdbf134e sh
docker logs a643fdbf134e
```

**[⬆ back to top](#目录)**

### Dockering Other Services

```shell
cd app/blog/event-bus
docker build -t heysirius/event-bus .
docker run heysirius/event-bus
docker run -it heysirius/event-bus sh
docker ps
docker exec -it a643fdbf134e sh
docker logs a643fdbf134e
```

- 至此，我们所有服务都有了一个 image 和 运行过后的 container
  **[⬆ back to top](#目录)**
