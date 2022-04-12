// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856#diff-97c15ff072f670bad97c52772f06f473714b459097e0ca142657354a023eaa54
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors())
app.use(bodyParser.json());

const commentsByPostId = {};

app.post('/posts/:id/comments', async (req, res) => {
    const commentsId = randomBytes(4).toString('hex');
    const { content } = req.body;
    // comments 的 添加操作 并 重新赋值给 commentsByPostId
    const comments = commentsByPostId[req.params.id] || [];
    comments.push({ 
        id: commentsId, 
        content,
        status: "pending"
    });
    commentsByPostId[req.params.id] = comments;

    await axios.post('http://event-bus-clusterip-srv:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentsId,
            content,
            postId: req.params.id,
            status: "pending"
        }
    })
    res.status(201).send(comments);
})

app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log(`Received ${type} Event`);
    if(type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        const comments = commentsByPostId[postId];

        const comment = comments.find(comment => {
            return comment.id === id;
        });
        comment.status = status;

        await axios.post('http://event-bus-clusterip-srv:4005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                status,
                postId,
                content
            }
        });
    }

    res.send({});
})

app.listen(4001, () => {
    console.log('listening on 4001');
})