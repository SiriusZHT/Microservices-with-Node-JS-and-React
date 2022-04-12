// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856#diff-a0e7dc3179111f8a94c03f36a77442b546473831793812c2015da513be7d3c38https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856#diff-a0e7dc3179111f8a94c03f36a77442b546473831793812c2015da513be7d3c38
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const posts = {
    // "123": {
    //     "id": "123",
    //     "title": "First Post by Sirius"
    // }
};

app.get('/posts', (req, res) => {
    res.send(posts);
})

app.post('/posts', async (req, res) => {
    const id = randomBytes(4).toString('hex');
    const { title } = req.body;

    posts[id] = { 
        id, title 
    };

    await axios.post('http://event-bus-clusterip-srv:4005/events', {
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