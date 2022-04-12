// https://github.com/SiriusZHT/Microservices-with-Node-JS-and-React/commit/e083e8d047dd228d61a7d0e39555c503bb7a93c6

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const events = [];

app.get('/events', (req, res) => {
    res.send(events);
})

app.post('/events', (req, res) => {
    const event = req.body;
    console.log('event bus received ', event);
    events.push(event);
    axios.post('http://121.5.150.79:4000/events', event); // post
    axios.post('http://121.5.150.79:4001/events', event); // comment 
    axios.post('http://121.5.150.79:4002/events', event); // query
    axios.post('http://121.5.150.79:4003/events', event); // moderation

    res.send({status: 'OK'});
})


app.listen(4005, () => {
    console.log('listening on port 4005');
}) 