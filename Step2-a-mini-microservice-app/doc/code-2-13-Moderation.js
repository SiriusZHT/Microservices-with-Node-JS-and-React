// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/5a895bd5bb09ef4a5970ae138bf1051c4704007b

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

app.post('/events', async (req, res) => {
    const { type, data } = req.body;
    
    if(type === 'CommentCreated') {
        const status = data.content.includes('orange') ? 'rejected' : 'approved';

        await axios.post('http://121.5.150.79:4005/events', {
            type: 'CommentModerated',
            data: {
                id: data.id,
                postId: data.postId,
                status,
                content: data.content
            } 
        })
    }
    
    res.send({});
})

app.listen(4003, () => {
  console.log('Listening on 4003');
})

