// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/ad411056e8c5b294997ebd1020d1445a03bf1856#diff-df2a58d454280f63e384b8a1df101630dcb399473684d6896f91d746071d2639
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    console.log(type)
    if(type === 'CommentCreated') {
        const status = data.content.includes('orange') ? 'rejected' : 'approved';
        console.log(data.type, status);
        await axios.post('http://event-bus-clusterip-srv:4005/events', {
            type: 'CommentModerated',
            data: {
                id: data.id,
                postId: data.postId,
                status: status,
                content: data.content
            } 
        })
    }
    
    res.send({});
})

app.listen(4003, () => {
  console.log('Listening on 4003');
})

