// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856#diff-d04e4b3c2e54fe1e20e460e241b2c1be2da1b3e0611c8d90553d86f703f68d15
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const posts = {};
// {
//     "d1f7e980": {
//         "id": "d1f7e980",
//         "title": "First Post by Sirius",
//         "comments": [
//             {
//                 "id": "991cf4ee",
//                 "content": "I am a comments by Sirius of posts f94fdc90",
//                 "status": "approved"
//             }
//         ]
//     }
// }
app.get('/posts', (req, res) => {
    res.send(posts);
})

const handleEvent = (type, data) => {
    console.log('Handle:', type);
    if(type === 'PostCreated') {
        const { id, title } = data;
        posts[id] = { id, title, comments: []};
    };

    if(type === 'CommentCreated') {
        // console.log(data);
        const { id, content, postId, status } = data;
        const post = posts[postId];
        post.comments.push({ id, content, status });
    };

    if(type === 'CommentUpdated') {
        const { id, content, postId, status } = data;
        const post = posts[postId];
        const comment = post.comments.find(comment => comment.id === id);
        comment.status = status;
        comment.content = content;
        console.log(comment);
    }
}

app.post('/events', (req, res) => {
    const { type, data } = req.body;
    handleEvent(type, data);
    res.send({});
})

// 4000 post 4001 comments
app.listen(4002, async () => {
    console.log('Listening on port 4002');

    const res = await axios.get('http://event-bus-clusterip-srv:4005/events');

    for(let event of res.data) {
        console.log('Processing event:', event.type);
        console.log(event.data);
        handleEvent(event.type, event.data);
    }
    console.log('Sync Event Finished!');
})