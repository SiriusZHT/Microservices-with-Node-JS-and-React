const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');

const app = express();
app.use(cors())
app.use(bodyParser.json());

const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id]);
})

app.post('/posts/:id/comments', (req, res) => {
    const commentsId = randomBytes(4).toString('hex');
    const { content } = req.body;
    // commnets 的 添加操作 并 重新赋值给 commentsByPostId
    const comments = commentsByPostId[req.params.id] || [];
    comments.push({ id: commentsId, content });
    commentsByPostId[req.params.id] = comments;
    res.status(201).send(comments);
})

app.listen(4001, () => {
    console.log('listening on 4001');
})