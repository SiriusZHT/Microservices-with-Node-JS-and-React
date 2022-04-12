const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const posts = {};

app.get('/posts', (req, res) => {
    res.send(posts);
})

app.post('/posts', async (req, res) => {
    const id = randomBytes(4).toString('hex');
    const { title } = req.body;

    posts[id] = { 
        id, title 
    };

    await axios.post('http://121.5.150.79:4005/events', {
        type: 'PostCreated',
        data: {
            id, title
        }
    })

    res.status(201).send(posts); // 201: created 已根据请求需要建立; 202: accepted 无法及时建立
})

app.post('/events', (req, res) => {
    console.log(`Received ${req.body.type} Event`);

    res.send({});
})

app.listen(4000, () => {
    console.log('listening on port 4000');
})